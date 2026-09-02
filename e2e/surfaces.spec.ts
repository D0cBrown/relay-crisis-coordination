// Surface-shape coverage: the paths NOT exercised by the Chrome-shaped harness —
// a provideContext-only host, a host that injects the API after page load, and
// observe-only participants getting read tools only.

import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window { __mcp: { tools: Map<string, { name: string }>; via: string } }
}

async function createIncident(page: Page) {
  const res = await page.request.post('/api/incidents');
  return (await res.json()) as { incidentId: string; joinLinks: Record<string, string> };
}

test('provideContext-only host: tools are declared via provideContext', async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map();
    window.__mcp = { tools, via: '' };
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        provideContext(opts: { tools: Array<{ name: string }> }) {
          tools.clear();
          for (const t of opts.tools) tools.set(t.name, t);
          window.__mcp.via = 'provideContext';
        },
      },
    });
  });
  const { joinLinks } = await createIncident(page);
  await page.goto(joinLinks.sam);
  await page.waitForFunction(() => window.__mcp.tools.size >= 6);
  expect(await page.evaluate(() => window.__mcp.via)).toBe('provideContext');
  await expect(page.locator('.tools-panel')).toContainText('provideContext()');
});

test('late-injected surface (after page load) is detected and tools register', async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map();
    window.__mcp = { tools, via: '' };
    // simulate a host attaching the API ~1.2s after load (e.g. after the user grants access)
    setTimeout(() => {
      Object.defineProperty(navigator, 'modelContext', {
        configurable: true,
        value: {
          registerTool(t: { name: string }) { tools.set(t.name, t); window.__mcp.via = 'registerTool'; return Promise.resolve(undefined); },
        },
      });
    }, 1200);
  });
  const { joinLinks } = await createIncident(page);
  await page.goto(joinLinks.sam);
  await expect(page.locator('.tools-panel')).toContainText('No WebMCP surface');
  await page.waitForFunction(() => window.__mcp.tools.size >= 6, null, { timeout: 10_000 });
  await expect(page.locator('.tools-panel')).toContainText('navigator.modelContext');
});

test('observe-only participant gets read tools only', async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map();
    window.__mcp = { tools, via: '' };
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: { registerTool(t: { name: string }) { tools.set(t.name, t); return Promise.resolve(undefined); } },
    });
  });
  const { joinLinks } = await createIncident(page);
  await page.goto(joinLinks.lena);
  await page.waitForFunction(() => window.__mcp.tools.size >= 3);
  await page.waitForTimeout(500);
  const names = (await page.evaluate(() => Array.from(window.__mcp.tools.keys()))).sort();
  expect(names).toEqual(['get_coordination_state', 'get_review_block', 'read_need']);
  await expect(page.locator('.tools-panel')).not.toContainText('draft_commitment');
});
