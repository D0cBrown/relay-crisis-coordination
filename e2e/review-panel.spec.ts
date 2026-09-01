// The human side of the loop: the agent drafts, the Review Panel confirms.
// Also proves commits are impossible without the panel's one-time token.

import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __mcp: { tools: Map<string, { name: string; execute: (a: unknown) => Promise<unknown> }> };
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

async function invoke(page: Page, name: string, args: Record<string, unknown> = {}) {
  const raw = await page.evaluate(async ({ name, json }) => {
    const mc = (document as unknown as { modelContext: { executeTool: (n: string, a: string) => Promise<{ content: Array<{ text: string }> }> } }).modelContext;
    const result = await mc.executeTool(name, json);
    return result.content[0].text;
  }, { name, json: JSON.stringify(args) });
  return JSON.parse(raw);
}

async function setupWithDrafts(page: Page) {
  const res = await page.request.post('/api/incidents');
  const body = await res.json();
  await page.goto(body.joinLinks.sam);
  await page.waitForFunction(() => window.__mcp.tools.size >= 6);
  await invoke(page, 'draft_commitment', {
    needId: 'n2', actionType: 'deliver',
    summary: 'Deliver the 24 boxed meals by car', motivation: 'Fits car + window',
  });
  await invoke(page, 'draft_commitment', {
    needId: 'n1', actionType: 'deliver',
    summary: 'Collect the sealed medicine box', motivation: 'Sealed package only',
  });
  return body as { incidentId: string; joinLinks: Record<string, string> };
}

test('judge path: agent drafts → human batch-confirms L0 and individually confirms L1', async ({ page }) => {
  await setupWithDrafts(page);

  const panel = page.locator('.review-panel');
  await expect(panel).toContainText('Routine — batch review');
  await expect(panel).toContainText('Review required — confirm each item individually');
  await expect(panel).toContainText('Source request (verbatim)');

  await panel.getByRole('button', { name: /Confirm 1 routine commitment/ }).click();
  await expect(page.locator('.activity')).toContainText('Deliver the 24 boxed meals by car');

  await panel.getByRole('button', { name: 'Confirm this commitment' }).click();
  await expect(page.locator('.activity')).toContainText('Collect the sealed medicine box');

  // both needs now matched, panel disappears, agent sees the outcome
  await expect(page.locator('.review-panel')).toHaveCount(0);
  const review = await invoke(page, 'get_review_block');
  expect(review.batchReview).toHaveLength(0);
  expect(review.individualReview).toHaveLength(0);
  expect(review.confirmedCommitments).toHaveLength(2);
});

test('commit endpoint refuses requests without a valid one-time panel token', async ({ page }) => {
  const { incidentId, joinLinks } = await setupWithDrafts(page);
  const token = new URL(joinLinks.sam, 'http://localhost:8787').searchParams.get('p')!;
  const state = await invoke(page, 'get_coordination_state');
  const draftId = state.queuedDrafts[0].id as string;

  const commit = (panelToken: string) => page.request.post(`/api/incidents/${incidentId}/commit`, {
    headers: { 'x-relay-token': token },
    data: { panelToken, confirmDraftIds: [draftId], discardDraftIds: [] },
  });

  const noToken = await commit('');
  expect(noToken.status()).toBe(403);
  const badToken = await commit('made-up-token');
  expect(badToken.status()).toBe(403);

  // a real token works exactly once
  const pt = await page.request.post(`/api/incidents/${incidentId}/panel-token`, {
    headers: { 'x-relay-token': token },
  });
  const { panelToken } = await pt.json();
  const first = await commit(panelToken);
  expect(first.status()).toBe(200);
  expect((await first.json()).status).toBe('applied');
  const replay = await commit(panelToken);
  expect(replay.status()).toBe(403);
});

test('discard removes a draft without creating a commitment', async ({ page }) => {
  await setupWithDrafts(page);
  const panel = page.locator('.review-panel');
  await panel.locator('.draft-row.l1').getByRole('button', { name: 'Discard' }).click();
  await expect(panel.locator('.draft-row.l1')).toHaveCount(0);
  await expect(page.locator('.activity')).toHaveCount(0);
  const review = await invoke(page, 'get_review_block');
  expect(review.individualReview).toHaveLength(0);
  expect(review.confirmedCommitments).toHaveLength(0);
});
