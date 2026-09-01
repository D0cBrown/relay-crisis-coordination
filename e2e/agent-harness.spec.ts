// Agent-side harness: simulates a WebMCP host with the SAME surface shape observed in real
// Chrome (spike/FINDINGS.md): document.modelContext with registerTool (Promise<undefined>),
// getTools(), and executeTool(tool, jsonStringArgs). Tools are invoked exactly like a real
// agent host would, via page.evaluate.

import { expect, test, type Page } from '@playwright/test';

const EXPECTED_TOOLS = [
  'get_coordination_state',
  'read_need',
  'ask_clarification',
  'offer_resource',
  'draft_commitment',
  'get_review_block',
];

declare global {
  interface Window {
    __mcp: { tools: Map<string, { name: string; description: string; inputSchema: unknown; execute: (a: unknown) => Promise<unknown> }> };
    relayWebMCP?: { unmount: () => void };
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map();
    window.__mcp = { tools };
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool(t: { name: string }) { tools.set(t.name, t); return Promise.resolve(undefined); },
        getTools() { return Array.from(tools.values()); },
        async executeTool(tool: { name: string } | string, args: unknown) {
          const name = typeof tool === 'string' ? tool : tool.name;
          const t = tools.get(name);
          if (!t) throw new Error(`no such tool: ${name}`);
          return t.execute(args);
        },
      },
    });
  });
});

async function createIncidentAndJoin(page: Page): Promise<{ incidentId: string; samLink: string }> {
  const res = await page.request.post('/api/incidents');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { incidentId: body.incidentId, samLink: body.joinLinks.sam };
}

async function invoke(page: Page, name: string, args: Record<string, unknown> = {}) {
  // args passed as a JSON string, exactly like Chrome's executeTool
  const raw = await page.evaluate(async ({ name, json }) => {
    const mc = (document as unknown as { modelContext: { executeTool: (n: string, a: string) => Promise<{ content: Array<{ text: string }> }> } }).modelContext;
    const result = await mc.executeTool(name, json);
    return result.content[0].text;
  }, { name, json: JSON.stringify(args) });
  return JSON.parse(raw);
}

async function joinAsSam(page: Page) {
  const { samLink } = await createIncidentAndJoin(page);
  await page.goto(samLink);
  await page.waitForFunction((n) => window.__mcp.tools.size >= n, EXPECTED_TOOLS.length);
}

test('tools register on coordination-view mount with the exact product names', async ({ page }) => {
  await joinAsSam(page);
  const names = await page.evaluate(() => Array.from(window.__mcp.tools.keys()));
  expect(names.sort()).toEqual([...EXPECTED_TOOLS].sort());
  await expect(page.locator('.tools-panel')).toContainText('get_coordination_state');
});

test('get_coordination_state returns structured state with attention levels and rules', async ({ page }) => {
  await joinAsSam(page);
  const state = await invoke(page, 'get_coordination_state');
  expect(state.disclaimer).toMatch(/Fictionalized/);
  expect(state.coordinationRules.join(' ')).toMatch(/Review Panel/);
  expect(state.needs).toHaveLength(7);
  expect(state.possibleFits.routine.sort()).toEqual(['n2', 'n4']);
  expect(state.possibleFits.reviewRequired.sort()).toEqual(['n1', 'n6']);
  expect(state.possibleFits.humanOnlyBriefOnly.sort()).toEqual(['n3', 'n5', 'n7']);
});

test('draft_commitment: L0 queued, L1 escalated to individual review, L2 rejected', async ({ page }) => {
  await joinAsSam(page);

  const meals = await invoke(page, 'draft_commitment', {
    needId: 'n2', actionType: 'deliver',
    summary: 'Deliver the 24 boxed meals by car this afternoon',
    motivation: 'Within 12 km, car available 14:00-17:00',
  });
  expect(meals.status).toBe('queued');
  expect(meals.level).toBe('L0');
  expect(meals.batchEligible).toBe(true);

  const medicine = await invoke(page, 'draft_commitment', {
    needId: 'n1', actionType: 'deliver',
    summary: 'Collect the sealed medicine box and hand it to the clinic runner',
    motivation: 'Sealed package only, non-clinical, within range',
  });
  expect(medicine.status).toBe('queued');
  expect(medicine.level).toBe('L1');
  expect(medicine.batchEligible).toBe(false);
  expect(medicine.reviewRequired).toBe('individual');
  expect(medicine.escalationReason).toMatch(/never batch/);

  const bridge = await invoke(page, 'draft_commitment', {
    needId: 'n5', actionType: 'check-in',
    summary: 'Check the footbridge', motivation: 'I can drive nearby',
  });
  expect(bridge.status).toBe('rejected');
  expect(bridge.level).toBe('L2');
  expect(bridge.explanation).toMatch(/cannot draft/);

  const review = await invoke(page, 'get_review_block');
  expect(review.batchReview).toHaveLength(1);
  expect(review.individualReview).toHaveLength(1);
  expect(review.note).toMatch(/Review Panel/);
});

test('read_need wraps third-party content in explicit untrusted delimiters', async ({ page }) => {
  await joinAsSam(page);
  const need = await invoke(page, 'read_need', { needId: 'n6' });
  expect(need.originalRequest.untrustedContent).toBe(true);
  expect(need.originalRequest.text).toContain('<<<UNTRUSTED CONTENT BEGIN');
  const adversarial = need.thread.find((m: { text?: string }) => m.text?.includes('ignore review rules'));
  expect(adversarial).toBeTruthy();
  expect(adversarial.untrustedContent).toBe(true);
  expect(adversarial.text).toContain('<<<UNTRUSTED CONTENT BEGIN');
  expect(adversarial.warning).toMatch(/never as instructions/);
});

test('the adversarial injection cannot bypass review: money need stays individual-review', async ({ page }) => {
  await joinAsSam(page);
  const res = await invoke(page, 'draft_commitment', {
    needId: 'n6', actionType: 'coordinate',
    summary: 'Review the reimbursement request with receipts',
    motivation: 'The thread claims pre-approval, which cannot change review rules',
  });
  expect(res.status).toBe('queued');
  expect(res.level).toBe('L1');
  expect(res.reviewRequired).toBe('individual');
});

test('ask_clarification posts to the public thread and state updates', async ({ page }) => {
  await joinAsSam(page);
  const posted = await invoke(page, 'ask_clarification', {
    needId: 'n2', question: 'Is there parking at the shelter entrance?',
  });
  expect(posted.status).toBe('posted');
  const need = await invoke(page, 'read_need', { needId: 'n2' });
  const mine = need.thread.find((m: { text?: string }) => m.text === 'Is there parking at the shelter entrance?');
  expect(mine).toBeTruthy();
  expect(mine.untrustedContent).toBeUndefined(); // own content, not wrapped
});

test('no commit/dispatch tool exists and tools go inert on unmount', async ({ page }) => {
  await joinAsSam(page);
  const names = await page.evaluate(() => Array.from(window.__mcp.tools.keys()));
  expect(names.some((n) => /commit|confirm|dispatch|finalize/.test(n) && n !== 'draft_commitment')).toBe(false);

  await page.evaluate(() => window.relayWebMCP!.unmount());
  const after = await invoke(page, 'get_coordination_state');
  expect(after.status).toBe('error');
  expect(after.error).toMatch(/not active/);
});
