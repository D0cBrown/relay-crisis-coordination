import { describe, expect, it } from 'vitest';
import { decideCommit, validatePanelToken } from '../src/worker/commit-logic';
import { buildLangtangSeed } from '../src/worker/seed';
import type { DraftCommitment, IncidentData } from '../src/shared/types';

const NOW = '2026-09-01T12:00:00Z';

function draft(over: Partial<DraftCommitment>): DraftCommitment {
  return {
    id: 'd-1', needId: 'n2', participantId: 'sam', actionType: 'deliver',
    summary: 'deliver meals', motivation: 'fits profile', sourceRefs: [],
    level: 'L0', escalated: false, status: 'queued', createdAt: NOW,
    ...over,
  };
}

function seedWith(...drafts: DraftCommitment[]): IncidentData {
  const data = buildLangtangSeed('inc-test');
  data.drafts.push(...drafts);
  return data;
}

describe('human commit path (Review Panel)', () => {
  it('batch-confirms multiple routine (L0) drafts', () => {
    const data = seedWith(draft({ id: 'd-1', needId: 'n2' }), draft({ id: 'd-2', needId: 'n4' }));
    const d = decideCommit(data, 'sam', { confirmDraftIds: ['d-1', 'd-2'] }, NOW);
    expect(d.kind).toBe('applied');
    if (d.kind !== 'applied') return;
    expect(d.commitments).toHaveLength(2);
    expect(d.commitments.every((c) => c.committedVia === 'human-panel')).toBe(true);
  });

  it('never batch-confirms a review-required (L1) draft', () => {
    const data = seedWith(
      draft({ id: 'd-1', needId: 'n2', level: 'L0' }),
      draft({ id: 'd-2', needId: 'n1', level: 'L1', escalated: true }),
    );
    const d = decideCommit(data, 'sam', { confirmDraftIds: ['d-1', 'd-2'] }, NOW);
    expect(d.kind).toBe('rejected');
    if (d.kind !== 'rejected') return;
    expect(d.body.reason).toMatch(/individually/);
  });

  it('confirms an L1 draft on its own', () => {
    const data = seedWith(draft({ id: 'd-2', needId: 'n1', level: 'L1', escalated: true }));
    const d = decideCommit(data, 'sam', { confirmDraftIds: ['d-2'] }, NOW);
    expect(d.kind).toBe('applied');
  });

  it('never confirms an L2 draft, even if one somehow existed', () => {
    const data = seedWith(draft({ id: 'd-x', needId: 'n5', level: 'L2' }));
    const d = decideCommit(data, 'sam', { confirmDraftIds: ['d-x'] }, NOW);
    expect(d.kind).toBe('rejected');
  });

  it("rejects another participant's draft and unknown/non-queued drafts", () => {
    const data = seedWith(
      draft({ id: 'd-maya', participantId: 'maya' }),
      draft({ id: 'd-done', status: 'confirmed' }),
    );
    expect(decideCommit(data, 'sam', { confirmDraftIds: ['d-maya'] }, NOW).kind).toBe('rejected');
    expect(decideCommit(data, 'sam', { confirmDraftIds: ['d-nope'] }, NOW).kind).toBe('rejected');
    expect(decideCommit(data, 'sam', { confirmDraftIds: ['d-done'] }, NOW).kind).toBe('rejected');
  });

  it('discards drafts and rejects confirm+discard overlap or empty input', () => {
    const data = seedWith(draft({ id: 'd-1' }));
    const ok = decideCommit(data, 'sam', { discardDraftIds: ['d-1'] }, NOW);
    expect(ok.kind).toBe('applied');
    if (ok.kind === 'applied') expect(ok.discarded).toHaveLength(1);

    expect(decideCommit(seedWith(draft({ id: 'd-1' })), 'sam',
      { confirmDraftIds: ['d-1'], discardDraftIds: ['d-1'] }, NOW).kind).toBe('rejected');
    expect(decideCommit(seedWith(), 'sam', {}, NOW).kind).toBe('rejected');
  });
});

describe('panel token guard (commit-token)', () => {
  const record = { token: 'tok-123', expiresAt: '2026-09-01T12:05:00Z' };

  it('accepts the exact token before expiry', () => {
    expect(validatePanelToken(record, 'tok-123', NOW).ok).toBe(true);
  });

  it('rejects missing record, missing token, mismatch, and expiry', () => {
    expect(validatePanelToken(undefined, 'tok-123', NOW).ok).toBe(false);
    expect(validatePanelToken(record, '', NOW).ok).toBe(false);
    expect(validatePanelToken(record, 'tok-999', NOW).ok).toBe(false);
    expect(validatePanelToken(record, 'tok-123', '2026-09-01T12:06:00Z').ok).toBe(false);
  });
});
