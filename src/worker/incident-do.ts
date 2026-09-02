// One Durable Object per incident: authoritative state, versioned for polling.
// Every mutation is validated here against the current state — client gating is UX only.

import type { IncidentData, ThreadMessage } from '../shared/types';
import { compileAttention } from '../shared/attention';
import { decideDraft, type DraftInput } from './draft-logic';
import { buildLangtangSeed } from './seed';
import {
  decideCommit, validatePanelToken, type CommitInput, type PanelTokenRecord,
} from './commit-logic';

const PANEL_TOKEN_TTL_MS = 5 * 60 * 1000;

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

    if (req.method === 'POST' && url.pathname === '/draft') {
      const body = (await req.json()) as DraftInput & { participantId: string };
      const now = new Date().toISOString();
      const decision = decideDraft(data, body.participantId, body, now);
      if (decision.kind === 'queued') {
        data.drafts.push(decision.draft);
        data.incident.version += 1;
        data.audit.push({
          at: now, participantId: body.participantId, actor: 'agent',
          action: 'draft-queued', needId: decision.draft.needId, level: decision.draft.level,
        });
        await this.ctx.storage.put('data', data);
      } else if (decision.kind === 'rejected') {
        data.audit.push({
          at: now, participantId: body.participantId, actor: 'agent',
          action: 'draft-rejected', needId: typeof body.needId === 'string' ? body.needId : undefined,
        });
        await this.ctx.storage.put('data', data);
      }
      return json(decision.body);
    }

    if (req.method === 'POST' && url.pathname === '/panel-token') {
      const body = (await req.json()) as { participantId: string };
      if (!data.participants.some((p) => p.id === body.participantId)) {
        return json({ error: 'unknown participant' }, 403);
      }
      const record: PanelTokenRecord = {
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + PANEL_TOKEN_TTL_MS).toISOString(),
      };
      await this.ctx.storage.put(`panelToken:${body.participantId}`, record);
      return json({ panelToken: record.token, expiresAt: record.expiresAt });
    }

    if (req.method === 'POST' && url.pathname === '/commit') {
      const body = (await req.json()) as CommitInput & { participantId: string; panelToken?: unknown };
      const now = new Date().toISOString();
      const key = `panelToken:${body.participantId}`;
      const record = await this.ctx.storage.get<PanelTokenRecord>(key);
      await this.ctx.storage.delete(key); // single-use: consumed on any attempt
      const tokenCheck = validatePanelToken(record, body.panelToken, now);
      if (!tokenCheck.ok) {
        return json({ status: 'rejected', reason: `invalid panel token: ${tokenCheck.reason}` }, 403);
      }

      const decision = decideCommit(data, body.participantId, body, now);
      if (decision.kind === 'rejected') return json(decision.body);

      for (const d of decision.confirmed) {
        d.status = 'confirmed';
        const need = data.needs.find((n) => n.id === d.needId);
        if (need && need.status === 'open') need.status = 'matched';
        data.audit.push({
          at: now, participantId: body.participantId, actor: 'human',
          action: 'commitment-confirmed', needId: d.needId, level: d.level,
        });
      }
      for (const d of decision.discarded) {
        d.status = 'discarded';
        data.audit.push({
          at: now, participantId: body.participantId, actor: 'human',
          action: 'draft-discarded', needId: d.needId, level: d.level,
        });
      }
      data.commitments.push(...decision.commitments);
      data.incident.version += 1;
      await this.ctx.storage.put('data', data);
      return json({
        status: 'applied',
        confirmed: decision.confirmed,
        discarded: decision.discarded,
        commitments: decision.commitments,
        version: data.incident.version,
      });
    }

    if (req.method === 'POST' && url.pathname === '/reset') {
      const body = (await req.json()) as { participantId: string };
      const me = data.participants.find((p) => p.id === body.participantId);
      if (!me || me.role !== 'coordinator') {
        return json({ error: 'only a coordinator can reset the demo incident' }, 403);
      }
      const fresh = buildLangtangSeed(data.incident.id);
      await this.ctx.storage.put('data', fresh);
      // invalidate any outstanding panel tokens
      const tokens = await this.ctx.storage.list({ prefix: 'panelToken:' });
      for (const key of tokens.keys()) await this.ctx.storage.delete(key);
      return json({ ok: true, reset: true, version: fresh.incident.version });
    }

    if (req.method === 'GET' && url.pathname === '/activity') {
      return json({
        incidentId: data.incident.id,
        version: data.incident.version,
        activity: data.audit.slice(-50),
      });
    }

    return json({ error: 'not found' }, 404);
  }
}
