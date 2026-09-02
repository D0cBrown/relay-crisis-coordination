// Protected demo reset: coordinator only, re-seeds the incident in place.

import { expect, test } from '@playwright/test';

test('reset is coordinator-only and restores the seed', async ({ page }) => {
  const res = await page.request.post('/api/incidents');
  const { incidentId, joinLinks } = await res.json();
  const tokenOf = (link: string) => new URL(link, 'http://localhost:8787').searchParams.get('p')!;

  // mutate state: sam posts a message
  const post = await page.request.post(`/api/incidents/${incidentId}/messages`, {
    headers: { 'x-relay-token': tokenOf(joinLinks.sam) },
    data: { needId: 'n2', text: 'temp message before reset', kind: 'comment' },
  });
  expect((await post.json()).version).toBe(2);

  // volunteer cannot reset
  const denied = await page.request.post(`/api/incidents/${incidentId}/reset`, {
    headers: { 'x-relay-token': tokenOf(joinLinks.sam) },
  });
  expect(denied.status()).toBe(403);

  // coordinator can
  const ok = await page.request.post(`/api/incidents/${incidentId}/reset`, {
    headers: { 'x-relay-token': tokenOf(joinLinks.arun) },
  });
  expect(ok.status()).toBe(200);

  const state = await page.request.get(
    `/api/incidents/${incidentId}/state?since=-1&p=${tokenOf(joinLinks.sam)}`,
  );
  const body = await state.json();
  expect(body.version).toBe(1);
  expect(body.threads.some((t: { text: string }) => t.text.includes('temp message'))).toBe(false);
  expect(body.needs).toHaveLength(7);
});
