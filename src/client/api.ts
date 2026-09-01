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

export async function fetchPanelToken(
  incidentId: string, token: string,
): Promise<{ panelToken: string; expiresAt: string }> {
  const res = await fetch(`/api/incidents/${incidentId}/panel-token`, {
    method: 'POST',
    headers: { 'x-relay-token': token },
  });
  if (!res.ok) throw new Error(`panel token failed: HTTP ${res.status}`);
  return res.json();
}

export interface CommitResponse {
  status: 'applied' | 'rejected';
  reason?: string;
  confirmed?: DraftCommitment[];
  discarded?: DraftCommitment[];
}

export async function postCommit(
  incidentId: string, token: string,
  body: { panelToken: string; confirmDraftIds: string[]; discardDraftIds: string[] },
): Promise<CommitResponse> {
  const res = await fetch(`/api/incidents/${incidentId}/commit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-relay-token': token },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => null)) as CommitResponse | null;
  if (!payload) throw new Error(`commit failed: HTTP ${res.status}`);
  return payload;
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
