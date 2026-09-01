import type {
  AttentionInfo, Commitment, DraftCommitment, Incident, Need, Participant, Role, ThreadMessage,
} from '../shared/types';

export interface StateResponse {
  version: number;
  incident: Incident;
  needs: Need[];
  threads: ThreadMessage[];
  participants: Array<{ id: string; displayName: string; role: Role }>;
  me: Pick<Participant, 'id' | 'displayName' | 'role' | 'responseProfile'>;
  attention: Record<string, AttentionInfo>;
  drafts: DraftCommitment[];
  commitments: Commitment[];
}

export async function createIncident(): Promise<{ incidentId: string; title: string; joinLinks: Record<string, string> }> {
  const res = await fetch('/api/incidents', { method: 'POST' });
  if (!res.ok) throw new Error(`create failed: HTTP ${res.status}`);
  return res.json();
}

export async function fetchState(
  incidentId: string, token: string, since: number,
): Promise<StateResponse | { unchanged: true; version: number }> {
  const res = await fetch(
    `/api/incidents/${incidentId}/state?since=${since}&p=${encodeURIComponent(token)}`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
