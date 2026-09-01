import { describe, expect, it } from 'vitest';
import { compileAttention } from '../src/shared/attention';
import type { Need, ResponseProfile } from '../src/shared/types';

function profile(overrides: Partial<ResponseProfile> = {}): ResponseProfile {
  return {
    preset: 'local-helper', transport: 'car', maxTravelKm: 12,
    availability: '14:00-17:00', mobilityConstraints: [], languages: ['en'],
    skills: [], exclusions: [], canSpendMoney: false,
    ...overrides,
  };
}

function need(overrides: Partial<Need> = {}): Need {
  return {
    id: 'n', index: 1, title: 'test', body: '', category: 'supplies',
    priority: 'normal', locationLabel: 'x', distanceKm: 4,
    requiredCapabilities: [], sourceActorId: 'a', origin: 'coordinator',
    status: 'open', sensitivity: [],
    ...overrides,
  };
}

describe('profile → attention compilation', () => {
  it('observe-only profiles get L2 for everything', () => {
    const a = compileAttention(profile({ preset: 'observe-only' }), need());
    expect(a.level).toBe('L2');
    expect(a.label).toBe('Human-only');
  });

  it('in-range supplies with matching capabilities is L0 for a local helper', () => {
    const a = compileAttention(profile(), need({ requiredCapabilities: ['vehicle'] }));
    expect(a.level).toBe('L0');
    expect(a.label).toBe('Routine');
  });

  it('money always forces at least L1', () => {
    const a = compileAttention(profile(), need({ amount: { kind: 'money', value: 180, unit: 'USD' } }));
    expect(a.level).toBe('L1');
    const b = compileAttention(profile(), need({ sensitivity: ['money'] }));
    expect(b.level).toBe('L1');
  });

  it('medical content is L2 unless sealed-package delivery, which is L1 and never L0', () => {
    const clinical = compileAttention(profile(), need({ category: 'medical', sensitivity: ['medical'] }));
    expect(clinical.level).toBe('L2');
    const sealed = compileAttention(profile(), need({
      category: 'medical', sensitivity: ['medical', 'sealed-delivery-only'],
    }));
    expect(sealed.level).toBe('L1');
  });

  it('safeguarding, hazardous and missing-person are reserved (L2)', () => {
    expect(compileAttention(profile(), need({ category: 'safeguarding', sensitivity: ['safeguarding'] })).level).toBe('L2');
    expect(compileAttention(profile(), need({ category: 'infrastructure', sensitivity: ['hazardous'] })).level).toBe('L2');
    expect(compileAttention(profile(), need({ category: 'safeguarding', sensitivity: ['missing-person'] })).level).toBe('L2');
  });

  it('outside declared travel range is L2', () => {
    const a = compileAttention(profile({ maxTravelKm: 12 }), need({ distanceKm: 14 }));
    expect(a.level).toBe('L2');
    expect(a.reasons.join(' ')).toMatch(/max travel/);
  });

  it('missing required capabilities is L2', () => {
    const a = compileAttention(profile({ transport: 'none' }), need({ requiredCapabilities: ['vehicle'] }));
    expect(a.level).toBe('L2');
  });

  it('untrusted third-party content forces at least L1 and never lowers a level', () => {
    const a = compileAttention(profile(), need({ sensitivity: ['untrusted-content'] }));
    expect(a.level).toBe('L1');
    const b = compileAttention(profile(), need({
      category: 'safeguarding', sensitivity: ['safeguarding', 'untrusted-content'],
    }));
    expect(b.level).toBe('L2'); // stays reserved, not lowered
  });

  it('escalations only ever raise: sealed medical + hazardous ends L2', () => {
    const a = compileAttention(profile(), need({
      category: 'medical', sensitivity: ['medical', 'sealed-delivery-only', 'hazardous'],
    }));
    expect(a.level).toBe('L2');
  });
});
