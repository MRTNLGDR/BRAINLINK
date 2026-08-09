export type GovernanceState = 'READY' | 'DEGRADED' | 'EMPTY';
export type ModuleStatus = 'ACTIVE' | 'DEGRADED' | 'BLOCKED' | 'DONE' | 'PLANNED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';
export type DocumentStatus = 'CURRENT' | 'STALE' | 'ARCHIVED';

export interface GovernanceSummary {
  totalModules: number;
  activeModules: number;
  totalTasks: number;
  doneTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  openAlerts: number;
  documents: number;
  progressPercent: number;
}

export interface GovernanceModule {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: ModuleStatus;
  progressPercent: number;
  updatedAt: string;
}

export interface GovernanceTask {
  id: string;
  title: string;
  moduleId: string;
  status: TaskStatus;
  priority: Priority;
  owner: string;
  acceptanceCriteria: string;
  updatedAt: string;
}

export interface GovernanceAlert {
  id: string;
  title: string;
  description: string;
  severity: Priority;
  status: AlertStatus;
  moduleId?: string;
  action: string;
  updatedAt: string;
}

export interface GovernanceChange {
  id: string;
  version: string;
  title: string;
  description: string;
  commit?: string;
  at: string;
}

export interface GovernanceLog {
  id: string;
  level: LogLevel;
  event: string;
  message: string;
  actor?: string;
  at: string;
}

export interface GovernanceDocument {
  id: string;
  title: string;
  kind: string;
  path: string;
  status: DocumentStatus;
  updatedAt: string;
}

export interface GovernanceSnapshot {
  schemaVersion: '1.0';
  generatedAt: string;
  state: GovernanceState;
  summary: GovernanceSummary;
  modules: GovernanceModule[];
  tasks: GovernanceTask[];
  alerts: GovernanceAlert[];
  changelog: GovernanceChange[];
  logs: GovernanceLog[];
  documents: GovernanceDocument[];
}

export const GOVERNANCE_UPDATED_EVENT = 'oraculo:governance-updated';
