// Server-side draft-commitment decision. This is the enforcement layer: the DO calls this
// on every draft request regardless of what the client claimed. Pure function → unit-tested.

import type { ActionType, DraftCommitment, IncidentData } from '../shared/types';
import { compileAttention } from '../shared/attention';

export interface DraftInput {
  needId?: string;
  actionType?: string;
  summary?: string;
  motivation?: string;
  sourceRefs?: unknown;
}

const ACTION_TYPES: ActionType[] = ['deliver', 'transport', 'source', 'coordinate', 'check-in'];

export type DraftDecision =
  | { kind: 'rejected'; body: Record<string, unknown> }
  | { kind: 'duplicate'; body: Record<string, unknown> }
  | { kind: 'queued'; body: Record<string, unknown>; draft: DraftCommitment };

const REVIEW_NOTE =
  'This is a DRAFT only. The participant confirms or discards it in the on-page Review Panel. No tool can confirm a real-world commitment.';

export function decideDraft(
  data: IncidentData, participantId: string, input: DraftInput, now: string,
): DraftDecision {
  const me = data.participants.find((p) => p.id === participantId);
  if (!me) return rejected('unknown participant');

  const need = data.needs.find((n) => n.id === input.needId);
  if (!need) return rejected('unknown needId — call get_coordination_state first');
  if (need.status !== 'open') {
    return rejected(`need ${need.id} is no longer open (status: ${need.status})`);
  }

  const attention = compileAttention(me.responseProfile, need);
  if (attention.level === 'L2') {
    return {
      kind: 'rejected',
      body: {
        status: 'rejected',
        level: 'L2',
        label: 'Human-only',
        reasons: attention.reasons,
        explanation:
          'This need is reserved (human-only) for this participant. The agent may read it and brief the participant, but cannot draft a commitment for it.',
      },
    };
  }

  if (!ACTION_TYPES.includes(input.actionType as ActionType)) {
    return rejected(`invalid actionType — must be one of: ${ACTION_TYPES.join(', ')}`);
  }
  const summary = (input.summary ?? '').trim();
  const motivation = (input.motivation ?? '').trim();
  if (!summary || !motivation) return rejected('summary and motivation are required');
  if (summary.length > 300 || motivation.length > 600) {
    return rejected('summary (max 300 chars) or motivation (max 600 chars) too long');
  }

  const existing = data.drafts.find(
    (d) => d.participantId === participantId && d.needId === need.id && d.status === 'queued',
  );
  if (existing) {
    return {
      kind: 'duplicate',
      body: {
        status: 'queued',
        alreadyQueued: true,
        draft: existing,
        reviewRequired: existing.level === 'L0' ? 'batch' : 'individual',
        note: `A draft for this need is already queued (${existing.id}). ${REVIEW_NOTE}`,
      },
    };
  }

  const escalated = attention.level !== 'L0';
  const draft: DraftCommitment = {
    id: `d-${crypto.randomUUID().slice(0, 8)}`,
    needId: need.id,
    participantId,
    actionType: input.actionType as ActionType,
    summary,
    motivation,
    sourceRefs: Array.isArray(input.sourceRefs)
      ? input.sourceRefs.filter((r): r is string => typeof r === 'string').slice(0, 10)
      : [],
    level: attention.level,
    escalated,
    escalationReason: escalated ? attention.reasons.join('; ') : undefined,
    status: 'queued',
    createdAt: now,
  };

  return {
    kind: 'queued',
    draft,
    body: {
      status: 'queued',
      draft,
      level: attention.level,
      label: attention.label,
      batchEligible: attention.level === 'L0',
      reviewRequired: attention.level === 'L0' ? 'batch' : 'individual',
      escalationReason: draft.escalationReason ?? null,
      note: REVIEW_NOTE + (escalated
        ? ' This draft requires individual human review and will never be batch-confirmed.'
        : ' This draft is eligible for batch review.'),
    },
  };
}

function rejected(reason: string): DraftDecision {
  return { kind: 'rejected', body: { status: 'rejected', reason } };
}
