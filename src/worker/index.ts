// Relay worker: routes /api/* to the per-incident Durable Object; everything else is
// static assets (SPA). No server-side LLM calls anywhere — the server is a deterministic arbiter.

import { buildLangtangSeed } from './seed';
import { signParticipantToken, verifyParticipantToken } from './auth';

export { IncidentDO } from './incident-do';

export interface Env {
  INCIDENTS: DurableObjectNamespace;
  ASSETS: Fetcher;
  MAGIC_SECRET?: string; // wrangler secret in production; dev fallback below
}

const DEV_SECRET = 'relay-dev-secret-not-for-production';
const secretOf = (env: Env) => env.MAGIC_SECRET || DEV_SECRET;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/api/incidents' && req.method === 'POST') {
      return createIncident(env);
    }

    const m = url.pathname.match(/^\/api\/incidents\/([\w-]+)\/(state|messages)$/);
    if (m) {
      const [, incidentId, resource] = m;
      const token = url.searchParams.get('p') ?? req.headers.get('x-relay-token') ?? '';
      const participantId = await verifyParticipantToken(secretOf(env), incidentId, token);
      if (!participantId) return json({ error: 'invalid or missing participant token' }, 401);
      const stub = env.INCIDENTS.get(env.INCIDENTS.idFromName(incidentId));

      if (resource === 'state' && req.method === 'GET') {
        const since = url.searchParams.get('since') ?? '-1';
        return stub.fetch(`https://do/state?participantId=${encodeURIComponent(participantId)}&since=${encodeURIComponent(since)}`);
      }
      if (resource === 'messages' && req.method === 'POST') {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        return stub.fetch('https://do/message', {
          method: 'POST',
          body: JSON.stringify({ ...body, participantId }),
          headers: { 'content-type': 'application/json' },
        });
      }
      return json({ error: 'method not allowed' }, 405);
    }

    if (url.pathname.startsWith('/api/')) return json({ error: 'not found' }, 404);
    return env.ASSETS.fetch(req);
  },
};

async function createIncident(env: Env): Promise<Response> {
  const id = crypto.randomUUID().slice(0, 8);
  const seed = buildLangtangSeed(id);
  const stub = env.INCIDENTS.get(env.INCIDENTS.idFromName(id));
  const res = await stub.fetch('https://do/init', { method: 'POST', body: JSON.stringify(seed) });
  if (!res.ok) return json({ error: 'failed to seed incident' }, 500);

  const joinLinks: Record<string, string> = {};
  for (const p of seed.participants) {
    const token = await signParticipantToken(secretOf(env), id, p.id);
    joinLinks[p.id] = `/i/${id}?p=${token}`;
  }
  return json({ incidentId: id, title: seed.incident.title, joinLinks });
}
