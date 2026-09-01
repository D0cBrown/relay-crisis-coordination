// Profile → attention-level compilation. Deterministic, server-authoritative.
// L0 Routine (batch review) · L1 Review required (individual) · L2 Human-only (no draft).
// Escalation rules only ever RAISE the level. See docs/BRIEF.md §Response profile compilation.

import type {
  AttentionInfo, AttentionLevel, Need, ResponseProfile,
} from './types';

const LABELS: Record<AttentionLevel, AttentionInfo['label']> = {
  L0: 'Routine',
  L1: 'Review required',
  L2: 'Human-only',
};

const RANK: Record<AttentionLevel, number> = { L0: 0, L1: 1, L2: 2 };

export function capabilitiesOf(profile: ResponseProfile): Set<string> {
  const caps = new Set(profile.skills);
  if (profile.transport === 'bike') caps.add('bike');
  if (profile.transport === 'car') caps.add('vehicle');
  if (profile.transport === 'van') { caps.add('vehicle'); caps.add('van'); }
  return caps;
}

export function compileAttention(profile: ResponseProfile, need: Need): AttentionInfo {
  if (profile.preset === 'observe-only') {
    return { level: 'L2', label: LABELS.L2, reasons: ['observe-only profile: the agent may brief, but every action is reserved'] };
  }

  const reasons: string[] = [];
  let level = baseline(profile, need);

  const raise = (to: AttentionLevel, reason: string) => {
    if (RANK[to] > RANK[level]) level = to;
    reasons.push(reason);
  };

  const flags = need.sensitivity ?? [];

  // Outside declared boundaries → reserved.
  if (need.distanceKm > profile.maxTravelKm) {
    raise('L2', `distance ${need.distanceKm} km exceeds declared max travel ${profile.maxTravelKm} km`);
  }
  const caps = capabilitiesOf(profile);
  const missing = need.requiredCapabilities.filter((c) => !caps.has(c));
  if (missing.length > 0) {
    raise('L2', `required capabilities outside declared profile: ${missing.join(', ')}`);
  }

  // Forced escalations.
  if (flags.includes('money') || need.amount?.kind === 'money') {
    raise('L1', 'involves money or reimbursement: individual review required');
  }
  if (need.category === 'medical' || flags.includes('medical')) {
    if (flags.includes('sealed-delivery-only')) {
      raise('L1', 'medical-adjacent sealed-package delivery: individual review, never batch-confirmed');
    } else {
      raise('L2', 'medical/clinical action is reserved for humans');
    }
  }
  if (need.category === 'safeguarding' || flags.includes('safeguarding')) {
    raise('L2', 'safeguarding / vulnerable-person action is reserved');
  }
  if (flags.includes('evacuation')) raise('L2', 'evacuation authority is reserved');
  if (flags.includes('hazardous')) raise('L2', 'hazardous access: no volunteer scouting into unsafe areas');
  if (flags.includes('missing-person')) raise('L2', 'missing-person claims are unverified and reserved');
  if (flags.includes('untrusted-content')) {
    raise('L1', 'thread contains untrusted third-party content: individual review required');
  }

  return { level, label: LABELS[level], reasons };
}

function baseline(profile: ResponseProfile, need: Need): AttentionLevel {
  switch (need.category) {
    case 'supplies':
    case 'information':
      return 'L0';
    case 'transport':
      return profile.preset === 'logistics' ? 'L0' : 'L1';
    case 'shelter':
    case 'infrastructure':
      return 'L1';
    case 'medical':
      return need.sensitivity?.includes('sealed-delivery-only') ? 'L1' : 'L2';
    case 'safeguarding':
      return 'L2';
    default:
      return 'L1';
  }
}
