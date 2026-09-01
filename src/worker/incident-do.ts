// One Durable Object per incident: authoritative state, versioned for polling.
// Every mutation is validated here against the current state — client gating is UX only.

import type { IncidentData, ThreadMessage } from '../shared/types';
import { compileAttention } from '../shared/attention';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const MESSAGE_KINDS = ['comment', 'clarification', 'resource-offer', 'update'] as const;

export class IncidentDO {
  constructor(private ctx: DurableObjectState) {}

  private load(): Promise<IncidentData | undefined> {
    return this.ctx.storage.get<IncidentData>('data');
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'POST' && url.pathname === '/init') {
      const seed = (await req.json()) as IncidentData;
      const existing = await this.load();
      if (!existing) await this.ctx.storage.put('data', seed);
      return json({ ok: true, incidentId: (existing ?? seed).incident.id });
    }

    const data = await this.load();
    if (!data) return json({ error: 'incident not found' }, 404);

    if (req.method === 'GET' && url.pathname === '/state') {
      const participantId = url.searchParams.get('participantId') ?? '';
      const since = Number(url.searchParams.get('since') ?? '-1');
      const me = data.participants.find((p) => p.id === participantId);
      if (!me) return json({ error: 'unknown participant' }, 403);
      if (since === data.incident.version) return json({ unchanged: true, version: since });
      const attention = Object.fromEntries(
        data.needs.map((n) => [n.id, compileAttention(me.responseProfile, n)]),
      );
      return json({
        version: data.incident.version,
        incident: data.incident,
        needs: data.needs,
        threads: data.threads,
        participants: data.participants.map((p) => ({
          id: p.id, displayName: p.displayName, role: p.role,
        })),
        me: { id: me.id, displayName: me.displayName, role: me.role, responseProfile: me.responseProfile },
        attention,
        drafts: data.drafts.filter((d) => d.participantId === participantId),
        commitments: data.commitments,
      });
    }

    if (req.method === 'POST' && url.pathname === '/message') {
      const body = (await req.json()) as {
        participantId: string; needId?: string; text?: string; kind?: string; actor?: string;
      };
      const me = data.participants.find((p) => p.id === body.participantId);
      if (!me) return json({ error: 'unknown participant' }, 403);
      const text = (body.text ?? '').trim();
      if (!text) return json({ error: 'empty message' }, 400);
      if (text.length > 2000) return json({ error: 'message too long (max 2000 chars)' }, 400);
      const kind = MESSAGE_KINDS.includes(body.kind as never) ? body.kind as ThreadMessage['kind'] : 'comment';
      if (body.needId && !data.needs.some((n) => n.id === body.needId)) {
        return json({ error: 'unknown needId' }, 400);
      }
      const msg: ThreadMessage = {
        id: crypto.randomUUID().slice(0, 8),
        needId: body.needId,
        authorActorId: me.id,
        text,
        kind,
        createdAt: new Date().toISOString(),
      };
      data.threads.push(msg);
      data.incident.version += 1;
      data.audit.push({
        at: msg.createdAt,
        participantId: me.id,
        actor: body.actor === 'agent' ? 'agent' : 'human',
        action: `message:${kind}`,
        needId: body.needId,
      });
      await this.ctx.storage.put('data', data);
      return json({ ok: true, message: msg, version: data.incident.version });
    }

    return json({ error: 'not found' }, 404);
  }
}
