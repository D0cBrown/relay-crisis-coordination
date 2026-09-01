import { describe, expect, it } from 'vitest';
import { decideDraft } from '../src/worker/draft-logic';
import { buildLangtangSeed } from '../src/worker/seed';

const NOW = '2026-09-01T12:00:00Z';

function seed() {
  return buildLangtangSeed('inc-test');
}

const validInput = {
  actionType: 'deliver',
  summary: 'Deliver the boxed meals by car',
  motivation: 'Within range, car available in the window',
};

describe('server-side draft decision (enforcement layer)', () => {
  it('queues an L0 draft for an in-profile routine need (meals for Sam)', () => {
    const d = decideDraft(seed(), 'sam', { ...validInput, needId: 'n2' }, NOW);
    expect(d.kind).toBe('queued');
    if (d.kind !== 'queued') return;
    expect(d.draft.level).toBe('L0');
    expect(d.draft.escalated).toBe(false);
    expect(d.body.batchEligible).toBe(true);
    expect(d.body.reviewRequired).toBe('batch');
  });

  it('queues but escalates the sealed-medicine need to individual review (L1, never batch)', () => {
    const d = decideDraft(seed(), 'sam', { ...validInput, needId: 'n1' }, NOW);
    expect(d.kind).toBe('queued');
    if (d.kind !== 'queued') return;
    expect(d.draft.level).toBe('L1');
    expect(d.draft.escalated).toBe(true);
    expect(d.body.batchEligible).toBe(false);
    expect(d.body.reviewRequired).toBe('individual');
    expect(String(d.draft.escalationReason)).toMatch(/never batch/);
  });

  it('rejects reserved (L2) needs: hazardous bridge check', () => {
    const d = decideDraft(seed(), 'sam', { ...validInput, needId: 'n5', actionType: 'check-in' }, NOW);
    expect(d.kind).toBe('rejected');
    expect(d.body.level).toBe('L2');
    expect(String(d.body.explanation)).toMatch(/cannot draft/);
  });

  it('rejects safeguarding transport and missing-person needs (L2)', () => {
    expect(decideDraft(seed(), 'sam', { ...validInput, needId: 'n3', actionType: 'transport' }, NOW).kind).toBe('rejected');
    expect(decideDraft(seed(), 'sam', { ...validInput, needId: 'n7', actionType: 'coordinate' }, NOW).kind).toBe('rejected');
  });

  it('rejects everything for an observe-only participant', () => {
    const d = decideDraft(seed(), 'lena', { ...validInput, needId: 'n2' }, NOW);
    expect(d.kind).toBe('rejected');
    expect(d.body.level).toBe('L2');
  });

  it('server recomputes level regardless of what the client claims', () => {
    // even if an agent invents its own level, the money need always comes back escalated
    const d = decideDraft(seed(), 'sam', { ...validInput, needId: 'n6', actionType: 'coordinate' }, NOW);
    expect(d.kind).toBe('queued');
    if (d.kind !== 'queued') return;
    expect(d.draft.level).toBe('L1');
    expect(String(d.draft.escalationReason)).toMatch(/money|untrusted/);
  });

  it('rejects unknown needs, closed needs and malformed input', () => {
    expect(decideDraft(seed(), 'sam', { ...validInput, needId: 'nope' }, NOW).kind).toBe('rejected');

    const closed = seed();
    closed.needs.find((n) => n.id === 'n2')!.status = 'resolved';
    expect(decideDraft(closed, 'sam', { ...validInput, needId: 'n2' }, NOW).kind).toBe('rejected');

    expect(decideDraft(seed(), 'sam', { needId: 'n2', actionType: 'launch-drone', summary: 's', motivation: 'm' }, NOW).kind).toBe('rejected');
    expect(decideDraft(seed(), 'sam', { needId: 'n2', actionType: 'deliver', summary: '', motivation: '' }, NOW).kind).toBe('rejected');
  });

  it('deduplicates queued drafts per participant+need', () => {
    const data = seed();
    const first = decideDraft(data, 'sam', { ...validInput, needId: 'n2' }, NOW);
    if (first.kind !== 'queued') throw new Error('setup failed');
    data.drafts.push(first.draft);
    const second = decideDraft(data, 'sam', { ...validInput, needId: 'n2' }, NOW);
    expect(second.kind).toBe('duplicate');
    expect(second.body.alreadyQueued).toBe(true);
  });
});
