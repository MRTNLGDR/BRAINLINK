import type {
  BrainlinkApproval,
  BrainlinkArchetype,
  BrainlinkAuditEvent,
  BrainlinkBug,
  BrainlinkConnection,
  BrainlinkEvidence,
  BrainlinkLaw,
  BrainlinkNotification,
  BrainlinkProject,
  BrainlinkReceipt,
  BrainlinkState,
  BrainlinkTask,
  BrainlinkWorker,
} from './types';
import { appendAuditEvent, isLegacyUnsealedAudit, sealLegacyAudit, verifyAuditChain } from './integrity';

export const BRAINLINK_STORAGE_KEY = 'brainlink:state:v2';
export const BRAINLINK_LEGACY_STORAGE_KEYS = ['brainlink:state:v1'] as const;

const now = () => new Date().toISOString();
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requiredString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid Brainlink backup: ${field}`);
  return value;
};
const optionalString = (value: unknown) => typeof value === 'string' && value ? value : undefined;
const booleanValue = (value: unknown, field: string) => {
  if (typeof value !== 'boolean') throw new Error(`Invalid Brainlink backup: ${field}`);
  return value;
};
const numberValue = (value: unknown, field: string, fallback?: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Invalid Brainlink backup: ${field}`);
};
const arrayValue = (value: unknown, field: string) => {
  if (!Array.isArray(value)) throw new Error(`Invalid Brainlink backup: ${field}`);
  return value;
};

export const createBrainlinkId = (prefix: string) => {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
};

export const createDefaultBrainlinkState = (): BrainlinkState => {
  const state: BrainlinkState = {
  schemaVersion: 2,
  laws: [
    {
      id: 'LAW-001',
      title: 'Ler regras antes de executar',
      scope: 'GLOBAL',
      trigger: 'SESSION_START',
      version: 1,
      body: 'Toda execução deve resolver as regras efetivas e registrar recibo de leitura antes de mutações governadas.',
      mandatory: true,
      enabled: true,
      createdAt: now(),
    },
    {
      id: 'LAW-002',
      title: 'Não simular conclusão',
      scope: 'GLOBAL',
      trigger: 'TASK_END',
      version: 1,
      body: 'Nenhuma tarefa pode ser marcada como concluída sem evidência compatível quando o evidence gate estiver habilitado.',
      mandatory: true,
      enabled: true,
      createdAt: now(),
    },
    {
      id: 'LAW-003',
      title: 'Segredos por referência',
      scope: 'GLOBAL',
      trigger: 'ALWAYS',
      version: 1,
      body: 'Workers e interfaces usam identificadores de segredo; valores sensíveis não entram em prompts, logs ou documentos.',
      mandatory: true,
      enabled: true,
      createdAt: now(),
    },
    {
      id: 'LAW-004',
      title: 'Erro gera registro, não loop silencioso',
      scope: 'GLOBAL',
      trigger: 'ON_ERROR',
      version: 1,
      body: 'Após erro relevante, registrar causa, tentativa e próximo passo antes de repetir a mesma ação.',
      mandatory: true,
      enabled: true,
      createdAt: now(),
    },
  ],
  receipts: [],
  projects: [
    {
      id: 'PRJ-BRAINLINK',
      name: 'Brainlink',
      description: 'Plano de conhecimento, governança e coordenação local-first.',
      health: 92,
      progress: 0,
      createdAt: now(),
    },
  ],
  tasks: [
    {
      id: 'TASK-RUNTIME',
      title: 'Runtime Brainlink integrado ao fork AFFiNE',
      projectId: 'PRJ-BRAINLINK',
      status: 'IN_PROGRESS',
      owner: 'Brainlink Custodian',
      evidenceRequired: true,
      createdAt: now(),
      updatedAt: now(),
    },
  ],
  workers: [
    {
      id: 'WORKER-CUSTODIAN',
      name: 'Brainlink Custodian',
      role: 'Governance custodian',
      status: 'IDLE',
      currentTaskId: 'TASK-RUNTIME',
      createdAt: now(),
    },
  ],
  evidence: [
    {
      id: 'EVID-SEED',
      type: 'AUDIT',
      title: 'Brainlink runtime initialized',
      detail: 'Local-first runtime store initialized from canonical Brainlink V4 specification.',
      actor: 'system',
      createdAt: now(),
    },
  ],
  bugs: [],
  archetypes: [
    {
      id: 'ARCH-EXECUTE',
      name: 'Governed execution',
      description: 'Archetype para execução com regras, checkpoints e evidência.',
      template: 'Resolve effective rules -> acknowledge -> execute task -> checkpoint -> verify -> attach evidence.',
      createdAt: now(),
    },
  ],
  connections: [],
  approvals: [],
  notifications: [
    {
      id: 'NOT-001',
      title: 'Brainlink runtime active',
      detail: 'The local governance runtime is available.',
      read: false,
      createdAt: now(),
    },
  ],
  audit: [
    {
      id: 'AUD-SEED',
      action: 'STATE_INITIALIZED',
      detail: 'Created canonical local-first Brainlink state.',
      actor: 'system',
      createdAt: now(),
    },
  ],
  settings: {
    actorName: 'Local Operator',
    organizationId: 'local',
    localOnly: true,
    requireEvidenceForDone: true,
    workerReadGate: true,
  },
  };
  state.audit = sealLegacyAudit(state.audit);
  return state;
};

const parseLaw = (value: unknown, legacy: boolean): BrainlinkLaw => {
  if (!isRecord(value)) throw new Error('Invalid Brainlink backup: law');
  const scope = requiredString(value.scope, 'law.scope') as BrainlinkLaw['scope'];
  if (!['GLOBAL', 'ORGANIZATION', 'PROJECT', 'WORKER'].includes(scope)) throw new Error('Invalid Brainlink backup: law.scope');
  const triggerRaw = legacy ? 'ALWAYS' : requiredString(value.trigger, 'law.trigger');
  if (!['ALWAYS', 'SESSION_START', 'TASK_START', 'TASK_END', 'ON_ERROR'].includes(triggerRaw)) throw new Error('Invalid Brainlink backup: law.trigger');
  const targetId = optionalString(value.targetId);
  if (!legacy && scope !== 'GLOBAL' && !targetId) throw new Error('Invalid Brainlink backup: scoped law targetId');
  return {
    id: requiredString(value.id, 'law.id'),
    title: requiredString(value.title, 'law.title'),
    scope,
    targetId,
    trigger: triggerRaw as BrainlinkLaw['trigger'],
    version: numberValue(value.version, 'law.version'),
    body: typeof value.body === 'string' ? value.body : '',
    mandatory: booleanValue(value.mandatory, 'law.mandatory'),
    enabled: booleanValue(value.enabled, 'law.enabled'),
    createdAt: requiredString(value.createdAt, 'law.createdAt'),
  };
};

const parseReceipt = (value: unknown): BrainlinkReceipt => {
  if (!isRecord(value)) throw new Error('Invalid Brainlink backup: receipt');
  return {
    id: requiredString(value.id, 'receipt.id'),
    lawId: requiredString(value.lawId, 'receipt.lawId'),
    lawVersion: numberValue(value.lawVersion, 'receipt.lawVersion'),
    actor: requiredString(value.actor, 'receipt.actor'),
    readAt: requiredString(value.readAt, 'receipt.readAt'),
  };
};

const parseProject = (value: unknown): BrainlinkProject => {
  if (!isRecord(value)) throw new Error('Invalid Brainlink backup: project');
  return {
    id: requiredString(value.id, 'project.id'),
    name: requiredString(value.name, 'project.name'),
    description: typeof value.description === 'string' ? value.description : '',
    health: Math.max(0, Math.min(100, numberValue(value.health, 'project.health', 100))),
    progress: Math.max(0, Math.min(100, numberValue(value.progress, 'project.progress', 0))),
    createdAt: requiredString(value.createdAt, 'project.createdAt'),
  };
};

const parseTask = (value: unknown): BrainlinkTask => {
  if (!isRecord(value)) throw new Error('Invalid Brainlink backup: task');
  const status = requiredString(value.status, 'task.status') as BrainlinkTask['status'];
  if (!['BACKLOG', 'READY', 'IN_PROGRESS', 'BLOCKED', 'DONE'].includes(status)) throw new Error('Invalid Brainlink backup: task.status');
  return {
    id: requiredString(value.id, 'task.id'),
    title: requiredString(value.title, 'task.title'),
    projectId: optionalString(value.projectId),
    status,
    owner: requiredString(value.owner, 'task.owner'),
    dueAt: optionalString(value.dueAt),
    evidenceRequired: booleanValue(value.evidenceRequired, 'task.evidenceRequired'),
    createdAt: requiredString(value.createdAt, 'task.createdAt'),
    updatedAt: requiredString(value.updatedAt, 'task.updatedAt'),
  };
};

const parseWorker = (value: unknown): BrainlinkWorker => {
  if (!isRecord(value)) throw new Error('Invalid Brainlink backup: worker');
  const status = requiredString(value.status, 'worker.status') as BrainlinkWorker['status'];
  if (!['IDLE', 'RUNNING', 'PAUSED', 'BLOCKED'].includes(status)) throw new Error('Invalid Brainlink backup: worker.status');
  return {
    id: requiredString(value.id, 'worker.id'),
    name: requiredString(value.name, 'worker.name'),
    role: typeof value.role === 'string' ? value.role : 'Worker',
    status,
    currentTaskId: optionalString(value.currentTaskId),
    lastHeartbeat: optionalString(value.lastHeartbeat),
    createdAt: requiredString(value.createdAt, 'worker.createdAt'),
  };
};

const parseEvidence = (value: unknown): BrainlinkEvidence => {
  if (!isRecord(value)) throw new Error('Invalid Brainlink backup: evidence');
  const type = requiredString(value.type, 'evidence.type') as BrainlinkEvidence['type'];
  if (!['CHECKPOINT', 'DECISION', 'OUTPUT', 'TEST', 'AUDIT'].includes(type)) throw new Error('Invalid Brainlink backup: evidence.type');
  return {
    id: requiredString(value.id, 'evidence.id'),
    type,
    title: requiredString(value.title, 'evidence.title'),
    detail: typeof value.detail === 'string' ? value.detail : '',
    actor: requiredString(value.actor, 'evidence.actor'),
    taskId: optionalString(value.taskId),
    createdAt: requiredString(value.createdAt, 'evidence.createdAt'),
  };
};

const parseBug = (value: unknown): BrainlinkBug => {
  if (!isRecord(value)) throw new Error('Invalid Brainlink backup: bug');
  const severity = requiredString(value.severity, 'bug.severity') as BrainlinkBug['severity'];
  const status = requiredString(value.status, 'bug.status') as BrainlinkBug['status'];
  if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) throw new Error('Invalid Brainlink backup: bug.severity');
  if (!['OPEN', 'INVESTIGATING', 'SOLVED'].includes(status)) throw new Error('Invalid Brainlink backup: bug.status');
  return {
    id: requiredString(value.id, 'bug.id'),
    title: requiredString(value.title, 'bug.title'),
    severity,
    status,
    cause: typeof value.cause === 'string' ? value.cause : '',
    solution: typeof value.solution === 'string' ? value.solution : '',
    createdAt: requiredString(value.createdAt, 'bug.createdAt'),
  };
};

const parseArchetype = (value: unknown): BrainlinkArchetype => {
  if (!isRecord(value)) throw new Error('Invalid Brainlink backup: archetype');
  return {
    id: requiredString(value.id, 'archetype.id'),
    name: requiredString(value.name, 'archetype.name'),
    description: typeof value.description === 'string' ? value.description : '',
    template: typeof value.template === 'string' ? value.template : '',
    createdAt: requiredString(value.createdAt, 'archetype.createdAt'),
  };
};

const parseConnection = (value: unknown, legacy: boolean): BrainlinkConnection => {
  if (!isRecord(value)) throw new Error('Invalid Brainlink backup: connection');
  const kind = requiredString(value.kind, 'connection.kind') as BrainlinkConnection['kind'];
  if (!['MCP', 'GIT', 'FILESYSTEM', 'API'].includes(kind)) throw new Error('Invalid Brainlink backup: connection.kind');
  const parsedMode = requiredString(value.mode, 'connection.mode') as BrainlinkConnection['mode'];
  if (!['READ_ONLY', 'READ_WRITE'].includes(parsedMode)) throw new Error('Invalid Brainlink backup: connection.mode');
  const mode: BrainlinkConnection['mode'] = legacy ? 'READ_ONLY' : parsedMode;
  const oldStatus = typeof value.status === 'string' ? value.status : 'DISCONNECTED';
  const status: BrainlinkConnection['status'] = legacy
    ? 'REGISTERED'
    : oldStatus === 'DISABLED' ? 'DISABLED' : 'REGISTERED';
  return {
    id: requiredString(value.id, 'connection.id'),
    name: requiredString(value.name, 'connection.name'),
    kind,
    endpoint: typeof value.endpoint === 'string' ? value.endpoint : '',
    mode,
    status,
    createdAt: requiredString(value.createdAt, 'connection.createdAt'),
  };
};

const parseApproval = (value: unknown): BrainlinkApproval => {
  if (!isRecord(value)) throw new Error('Invalid Brainlink backup: approval');
  const status = requiredString(value.status, 'approval.status') as BrainlinkApproval['status'];
  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) throw new Error('Invalid Brainlink backup: approval.status');
  return {
    id: requiredString(value.id, 'approval.id'),
    title: requiredString(value.title, 'approval.title'),
    detail: typeof value.detail === 'string' ? value.detail : '',
    status,
    connectionId: optionalString(value.connectionId),
    requestedMode: value.requestedMode === 'READ_WRITE' ? 'READ_WRITE' : undefined,
    createdAt: requiredString(value.createdAt, 'approval.createdAt'),
  };
};

const parseNotification = (value: unknown): BrainlinkNotification => {
  if (!isRecord(value)) throw new Error('Invalid Brainlink backup: notification');
  return {
    id: requiredString(value.id, 'notification.id'),
    title: requiredString(value.title, 'notification.title'),
    detail: typeof value.detail === 'string' ? value.detail : '',
    read: booleanValue(value.read, 'notification.read'),
    createdAt: requiredString(value.createdAt, 'notification.createdAt'),
  };
};

const parseAudit = (value: unknown): BrainlinkAuditEvent => {
  if (!isRecord(value)) throw new Error('Invalid Brainlink backup: audit');
  const sequence = typeof value.sequence === 'number' && Number.isInteger(value.sequence) && value.sequence > 0 ? value.sequence : undefined;
  const prevHash = optionalString(value.prevHash);
  const eventHash = optionalString(value.eventHash);
  for (const [name, hash] of [['prevHash', prevHash], ['eventHash', eventHash]] as const) {
    if (hash !== undefined && !/^[0-9a-f]{64}$/.test(hash)) throw new Error(`Invalid Brainlink backup: audit.${name}`);
  }
  return {
    id: requiredString(value.id, 'audit.id'),
    action: requiredString(value.action, 'audit.action'),
    detail: typeof value.detail === 'string' ? value.detail : '',
    actor: requiredString(value.actor, 'audit.actor'),
    createdAt: requiredString(value.createdAt, 'audit.createdAt'),
    sequence,
    prevHash,
    eventHash,
  };
};

export const parseBrainlinkState = (value: unknown): BrainlinkState => {
  if (!isRecord(value)) throw new Error('Invalid Brainlink backup: root');
  const schemaVersion = value.schemaVersion;
  if (schemaVersion !== 1 && schemaVersion !== 2) throw new Error(`Unsupported Brainlink schemaVersion: ${String(schemaVersion)}`);
  const legacy = schemaVersion === 1;
  const settings = value.settings;
  if (!isRecord(settings)) throw new Error('Invalid Brainlink backup: settings');

  const state: BrainlinkState = {
    schemaVersion: 2,
    laws: arrayValue(value.laws, 'laws').map(item => parseLaw(item, legacy)),
    receipts: arrayValue(value.receipts, 'receipts').map(parseReceipt),
    projects: arrayValue(value.projects, 'projects').map(parseProject),
    tasks: arrayValue(value.tasks, 'tasks').map(parseTask),
    workers: arrayValue(value.workers, 'workers').map(parseWorker),
    evidence: arrayValue(value.evidence, 'evidence').map(parseEvidence),
    bugs: arrayValue(value.bugs, 'bugs').map(parseBug),
    archetypes: arrayValue(value.archetypes, 'archetypes').map(parseArchetype),
    connections: arrayValue(value.connections, 'connections').map(item => parseConnection(item, legacy)),
    approvals: arrayValue(value.approvals, 'approvals').map(parseApproval),
    notifications: arrayValue(value.notifications, 'notifications').map(parseNotification),
    audit: arrayValue(value.audit, 'audit').map(parseAudit),
    settings: {
      actorName: requiredString(settings.actorName, 'settings.actorName'),
      organizationId: legacy ? 'local' : requiredString(settings.organizationId, 'settings.organizationId'),
      localOnly: booleanValue(settings.localOnly, 'settings.localOnly'),
      requireEvidenceForDone: booleanValue(settings.requireEvidenceForDone, 'settings.requireEvidenceForDone'),
      workerReadGate: booleanValue(settings.workerReadGate, 'settings.workerReadGate'),
    },
  };

  if (isLegacyUnsealedAudit(state.audit)) {
    state.audit = sealLegacyAudit(state.audit);
    appendAuditEvent(state.audit, {
      id: createBrainlinkId('AUD'),
      action: 'AUDIT_CHAIN_INITIALIZED',
      detail: 'Legacy Brainlink audit history was sealed into a SHA-256 hash chain.',
      actor: 'system',
      createdAt: now(),
    });
  } else {
    const integrity = verifyAuditChain(state.audit);
    if (!integrity.valid) throw new Error(`Invalid Brainlink backup: audit integrity (${integrity.reason}:${integrity.eventId})`);
  }

  for (const connection of state.connections) {
    if (connection.mode !== 'READ_WRITE') continue;
    const approved = state.approvals.some(approval => approval.connectionId === connection.id && approval.requestedMode === 'READ_WRITE' && approval.status === 'APPROVED');
    if (!approved) {
      connection.mode = 'READ_ONLY';
      appendAuditEvent(state.audit, {
        id: createBrainlinkId('AUD'),
        action: 'UNAPPROVED_WRITE_DOWNGRADED',
        detail: `Connector ${connection.id} was imported as READ_WRITE without an approved capability request and was downgraded to READ_ONLY.`,
        actor: 'system',
        createdAt: now(),
      });
    }
  }

  if (legacy) {
    appendAuditEvent(state.audit, {
      id: createBrainlinkId('AUD'),
      action: 'STATE_MIGRATED',
      detail: 'Migrated Brainlink local state from schema v1 to v2 and sealed its audit history.',
      actor: 'system',
      createdAt: now(),
    });
  }

  return state;
};

export const loadBrainlinkState = (): BrainlinkState => {
  if (typeof window === 'undefined') return createDefaultBrainlinkState();
  const keys = [BRAINLINK_STORAGE_KEY, ...BRAINLINK_LEGACY_STORAGE_KEYS];
  for (const key of keys) {
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) continue;
      const parsed = parseBrainlinkState(JSON.parse(stored));
      saveBrainlinkState(parsed);
      return parsed;
    } catch {
      // Try the next known storage key, then fall back to a clean state.
    }
  }
  return createDefaultBrainlinkState();
};

export const saveBrainlinkState = (state: BrainlinkState) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BRAINLINK_STORAGE_KEY, JSON.stringify(state));
};
