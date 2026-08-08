import type { BrainlinkState } from './types';

export const BRAINLINK_STORAGE_KEY = 'brainlink:state:v1';

const now = () => new Date().toISOString();

export const createBrainlinkId = (prefix: string) => {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
};

export const createDefaultBrainlinkState = (): BrainlinkState => ({
  schemaVersion: 1,
  laws: [
    {
      id: 'LAW-001',
      title: 'Ler regras antes de executar',
      scope: 'GLOBAL',
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
      version: 1,
      body: 'Workers e interfaces usam identificadores de segredo; valores sensíveis não entram em prompts, logs ou documentos.',
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
      progress: 68,
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
  approvals: [
    {
      id: 'APR-001',
      title: 'Enable external write connector',
      detail: 'Example approval showing that READ_WRITE capabilities require explicit human approval.',
      status: 'PENDING',
      createdAt: now(),
    },
  ],
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
    localOnly: true,
    requireEvidenceForDone: true,
    workerReadGate: true,
  },
});

export const loadBrainlinkState = (): BrainlinkState => {
  if (typeof window === 'undefined') {
    return createDefaultBrainlinkState();
  }
  try {
    const stored = window.localStorage.getItem(BRAINLINK_STORAGE_KEY);
    if (!stored) return createDefaultBrainlinkState();
    const parsed = JSON.parse(stored) as BrainlinkState;
    if (parsed.schemaVersion !== 1) return createDefaultBrainlinkState();
    return parsed;
  } catch {
    return createDefaultBrainlinkState();
  }
};

export const saveBrainlinkState = (state: BrainlinkState) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BRAINLINK_STORAGE_KEY, JSON.stringify(state));
};
