export type BrainlinkTaskStatus = 'BACKLOG' | 'READY' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
export type BrainlinkWorkerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'BLOCKED';
export type BrainlinkSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BrainlinkLaw {
  id: string;
  title: string;
  scope: 'GLOBAL' | 'ORGANIZATION' | 'PROJECT' | 'WORKER';
  version: number;
  body: string;
  mandatory: boolean;
  enabled: boolean;
  createdAt: string;
}

export interface BrainlinkReceipt {
  id: string;
  lawId: string;
  lawVersion: number;
  actor: string;
  readAt: string;
}

export interface BrainlinkProject {
  id: string;
  name: string;
  description: string;
  health: number;
  progress: number;
  createdAt: string;
}

export interface BrainlinkTask {
  id: string;
  title: string;
  projectId?: string;
  status: BrainlinkTaskStatus;
  owner: string;
  dueAt?: string;
  evidenceRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrainlinkWorker {
  id: string;
  name: string;
  role: string;
  status: BrainlinkWorkerStatus;
  currentTaskId?: string;
  lastHeartbeat?: string;
  createdAt: string;
}

export interface BrainlinkEvidence {
  id: string;
  type: 'CHECKPOINT' | 'DECISION' | 'OUTPUT' | 'TEST' | 'AUDIT';
  title: string;
  detail: string;
  actor: string;
  taskId?: string;
  createdAt: string;
}

export interface BrainlinkBug {
  id: string;
  title: string;
  severity: BrainlinkSeverity;
  status: 'OPEN' | 'INVESTIGATING' | 'SOLVED';
  cause: string;
  solution: string;
  createdAt: string;
}

export interface BrainlinkArchetype {
  id: string;
  name: string;
  description: string;
  template: string;
  createdAt: string;
}

export interface BrainlinkConnection {
  id: string;
  name: string;
  kind: 'MCP' | 'GIT' | 'FILESYSTEM' | 'API';
  endpoint: string;
  mode: 'READ_ONLY' | 'READ_WRITE';
  status: 'CONNECTED' | 'DISCONNECTED';
  createdAt: string;
}

export interface BrainlinkApproval {
  id: string;
  title: string;
  detail: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface BrainlinkNotification {
  id: string;
  title: string;
  detail: string;
  read: boolean;
  createdAt: string;
}

export interface BrainlinkAuditEvent {
  id: string;
  action: string;
  detail: string;
  actor: string;
  createdAt: string;
}

export interface BrainlinkSettings {
  actorName: string;
  localOnly: boolean;
  requireEvidenceForDone: boolean;
  workerReadGate: boolean;
}

export interface BrainlinkState {
  schemaVersion: 1;
  laws: BrainlinkLaw[];
  receipts: BrainlinkReceipt[];
  projects: BrainlinkProject[];
  tasks: BrainlinkTask[];
  workers: BrainlinkWorker[];
  evidence: BrainlinkEvidence[];
  bugs: BrainlinkBug[];
  archetypes: BrainlinkArchetype[];
  connections: BrainlinkConnection[];
  approvals: BrainlinkApproval[];
  notifications: BrainlinkNotification[];
  audit: BrainlinkAuditEvent[];
  settings: BrainlinkSettings;
}
