import { describe, expect, it } from 'vitest';
import { signParticipantToken, verifyParticipantToken } from '../src/worker/auth';

const SECRET = 'test-secret';

describe('magic-link participant tokens', () => {
  it('sign → verify roundtrip returns the participant id', async () => {
    const token = await signParticipantToken(SECRET, 'inc1', 'sam');
    expect(await verifyParticipantToken(SECRET, 'inc1', token)).toBe('sam');
  });

  it('rejects a tampered token', async () => {
    const token = await signParticipantToken(SECRET, 'inc1', 'sam');
    expect(await verifyParticipantToken(SECRET, 'inc1', token.slice(0, -2) + 'xx')).toBeNull();
    expect(await verifyParticipantToken(SECRET, 'inc1', 'maya.' + token.split('.')[1])).toBeNull();
  });

  it('rejects a token for a different incident or secret', async () => {
    const token = await signParticipantToken(SECRET, 'inc1', 'sam');
    expect(await verifyParticipantToken(SECRET, 'inc2', token)).toBeNull();
    expect(await verifyParticipantToken('other-secret', 'inc1', token)).toBeNull();
  });

  it('rejects malformed tokens', async () => {
    expect(await verifyParticipantToken(SECRET, 'inc1', '')).toBeNull();
    expect(await verifyParticipantToken(SECRET, 'inc1', 'no-dot')).toBeNull();
    expect(await verifyParticipantToken(SECRET, 'inc1', '.sig-only')).toBeNull();
  });
});
