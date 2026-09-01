// Human commit path (Review Panel only). Pure decision logic, unit-tested.
// Invariants enforced here, server-side, regardless of the client:
// - only the participant's own QUEUED drafts can be confirmed or discarded;
// - review-required (L1) drafts are confirmed one at a time, never in a batch;
// - human-only (L2) drafts cannot exist, but are rejected belt-and-braces anyway.

import type { Commitment, DraftCommitment, IncidentData } from '../shared/types';

export interface CommitInput {
  confirmDraftIds?: unknown;
  discardDraftIds?: unknown;
}

export type CommitDecision =
  | { kind: 'rejected'; body: { status: 'rejected'; reason: string } }
  | {
      kind: 'applied';
      confirmed: DraftCommitment[];
      discarded: DraftCommitment[];
      commitments: Commitment[];
    };

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function rejected(reason: string): CommitDecision {
  return { kind: 'rejected', body: { status: 'rejected', reason } };
}

export function decideCommit(
  data: IncidentData, participantId: string, input: CommitInput, now: string,
): CommitDecision {
  const me = data.participants.find((p) => p.id === participantId);
  if (!me) return rejected('unknown participant');

  const confirmIds = asStringArray(input.confirmDraftIds);
  const discardIds = asStringArray(input.discardDraftIds);
  if (confirmIds.length === 0 && discardIds.length === 0) {
    return rejected('nothing to confirm or discard');
  }
  if (confirmIds.some((id) => discardIds.includes(id))) {
    return rejected('a draft cannot be both confirmed and discarded');
  }

  const resolve = (ids: string[]): DraftCommitment[] | string => {
    const out: DraftCommitment[] = [];
    for (const id of ids) {
      const d = data.drafts.find((x) => x.id === id);
      if (!d) return `unknown draft: ${id}`;
      if (d.participantId !== participantId) return `draft ${id} belongs to another participant`;
      if (d.status !== 'queued') return `draft ${id} is not queued (status: ${d.status})`;
      out.push(d);
    }
    return out;
  };

  const confirming = resolve(confirmIds);
  if (typeof confirming === 'string') return rejected(confirming);
  const discarding = resolve(discardIds);
  if (typeof discarding === 'string') return rejected(discarding);

  if (confirming.some((d) => d.level === 'L2')) {
    return rejected('human-only (L2) drafts cannot be confirmed');
  }
  if (confirming.length > 1 && confirming.some((d) => d.level !== 'L0')) {
    return rejected('review-required (L1) drafts must be confirmed individually, never in a batch');
  }

  const commitments: Commitment[] = confirming.map((d) => ({
    id: `c-${crypto.randomUUID().slice(0, 8)}`,
    needId: d.needId,
    participantId,
    actionType: d.actionType,
    summary: d.summary,
    committedVia: 'human-panel',
    createdAt: now,
  }));

  return { kind: 'applied', confirmed: confirming, discarded: discarding, commitments };
}

// ---------------------------------------------------------------- panel token guard
// One token per participant, short-lived, single-use (the DO deletes it on any attempt).

export interface PanelTokenRecord { token: string; expiresAt: string }

export function validatePanelToken(
  record: PanelTokenRecord | undefined, presented: unknown, now: string,
): { ok: true } | { ok: false; reason: string } {
  if (!record) return { ok: false, reason: 'no panel token issued — open the Review Panel first' };
  if (typeof presented !== 'string' || presented.length === 0) {
    return { ok: false, reason: 'missing panel token' };
  }
  if (record.token !== presented) return { ok: false, reason: 'panel token mismatch' };
  if (now >= record.expiresAt) return { ok: false, reason: 'panel token expired — re-open the Review Panel' };
  return { ok: true };
}
