// Relay domain model — see docs/BRIEF.md §Domain model.

export type Role = 'volunteer' | 'local-group' | 'coordinator';
export type Transport = 'none' | 'bike' | 'car' | 'van';
export type NeedCategory =
  | 'supplies' | 'transport' | 'shelter' | 'information'
  | 'infrastructure' | 'medical' | 'safeguarding';
export type Priority = 'normal' | 'high' | 'critical';
export type NeedStatus = 'open' | 'matched' | 'resolved';
export type AttentionLevel = 'L0' | 'L1' | 'L2';
export type AttentionLabel = 'Routine' | 'Review required' | 'Human-only';
export type ProfilePreset = 'local-helper' | 'logistics' | 'observe-only';
export type ActionType = 'deliver' | 'transport' | 'source' | 'coordinate' | 'check-in';
export type SensitivityFlag =
  | 'money' | 'medical' | 'sealed-delivery-only' | 'safeguarding'
  | 'evacuation' | 'hazardous' | 'missing-person' | 'untrusted-content';

export interface ResponseProfile {
  preset: ProfilePreset;
  transport: Transport;
  maxTravelKm: number;
  availability: string; // e.g. "14:00-17:00"
  mobilityConstraints: string[];
  languages: string[];
  skills: string[]; // capability tokens, e.g. 'lifting'
  exclusions: string[];
  canSpendMoney: boolean;
  maxPersonalSpend?: number;
}

export interface Participant {
  id: string;
  displayName: string;
  role: Role;
  responseProfile: ResponseProfile;
}

export interface Need {
  id: string;
  index: number;
  title: string;
  body: string;
  category: NeedCategory;
  priority: Priority;
  locationLabel: string;
  distanceKm: number;
  requiredCapabilities: string[]; // capability tokens, e.g. 'vehicle', 'lifting'
  amount?: { kind: 'money' | 'quantity'; value: number; unit: string };
  sourceActorId: string;
  origin: 'coordinator' | 'participant';
  status: NeedStatus;
  sensitivity: SensitivityFlag[];
}

export interface ThreadMessage {
  id: string;
  needId?: string;
  authorActorId: string;
  text: string;
  createdAt: string;
  kind: 'comment' | 'clarification' | 'resource-offer' | 'update';
  via?: 'agent' | 'human'; // who actually posted on the author's behalf (undefined = human)
}

export interface DraftCommitment {
  id: string;
  needId: string;
  participantId: string;
  actionType: ActionType;
  summary: string;
  motivation: string;
  sourceRefs: string[];
  level: AttentionLevel;
  escalated: boolean;
  escalationReason?: string;
  status: 'queued' | 'confirmed' | 'discarded';
  createdAt: string;
}

export interface Commitment {
  id: string;
  needId: string;
  participantId: string;
  actionType: ActionType;
  summary: string;
  committedVia: 'human-panel';
  createdAt: string;
}

export interface AuditEntry {
  at: string;
  participantId?: string;
  actor: 'human' | 'agent' | 'system';
  action: string;
  needId?: string;
  level?: AttentionLevel;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  regionLabel: string;
  startsAt: string;
  status: 'active' | 'stabilizing' | 'closed';
  version: number;
}

export interface IncidentData {
  incident: Incident;
  participants: Participant[];
  needs: Need[];
  threads: ThreadMessage[];
  drafts: DraftCommitment[];
  commitments: Commitment[];
  audit: AuditEntry[];
}

export interface AttentionInfo {
  level: AttentionLevel;
  label: AttentionLabel;
  reasons: string[];
}
