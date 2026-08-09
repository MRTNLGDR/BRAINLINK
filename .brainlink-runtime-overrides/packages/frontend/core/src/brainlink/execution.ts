import { canonicalJson, sha256Hex } from './integrity';
import {
  canWorkerRun,
  connectionHasApprovedWrite,
  workerStartRequiredLaws,
} from './policy';
import type {
  BrainlinkExecution,
  BrainlinkExecutionEvent,
  BrainlinkExecutionState,
  BrainlinkState,
  BrainlinkTask,
  BrainlinkTaskEnvelope,
  BrainlinkWorker,
} from './types';

const TERMINAL_STATES = new Set<BrainlinkExecutionState>(['SUCCEEDED', 'FAILED', 'BLOCKED', 'CANCELLED']);

const normalizedError = (detail: string) => detail.trim().toLowerCase().replace(/\s+/g, ' ');

export const executionErrorFingerprint = (taskId: string, workerId: string, detail: string) =>
  sha256Hex(canonicalJson({ taskId, workerId, error: normalizedError(detail) }));

export const isTerminalExecution = (execution: BrainlinkExecution) => TERMINAL_STATES.has(execution.state);

export const activeExecutionForWorker = (state: BrainlinkState, workerId: string) =>
  state.executions.find(execution => execution.workerId === workerId && !isTerminalExecution(execution));

export const nextExecutionAttempt = (state: BrainlinkState, workerId: string, taskId: string) =>
  state.executions.filter(execution => execution.workerId === workerId && execution.taskId === taskId).length + 1;

const effectiveCapabilities = (state: BrainlinkState) => {
  const capabilities = ['document:read', 'evidence:append', 'audit:append', 'patch:propose'];
  for (const connection of state.connections.filter(item => item.status === 'REGISTERED')) {
    capabilities.push(`connector:${connection.id}:read`);
    if (connection.mode === 'READ_WRITE' && connectionHasApprovedWrite(state, connection.id)) {
      capabilities.push(`connector:${connection.id}:write`);
    }
  }
  return capabilities.sort();
};

export const compileTaskEnvelope = (
  state: BrainlinkState,
  worker: BrainlinkWorker,
  correlationId: string,
  createdAt: string
): BrainlinkTaskEnvelope => {
  const task = worker.currentTaskId ? state.tasks.find(item => item.id === worker.currentTaskId) : undefined;
  if (!task) throw new Error('Execution requires a worker with a current task.');
  const laws = workerStartRequiredLaws(state, worker);
  const rulePack = laws.map(law => ({
    id: law.id,
    version: law.version,
    scope: law.scope,
    targetId: law.targetId,
    trigger: law.trigger,
    body: law.body,
  }));
  const rulePackHash = sha256Hex(canonicalJson(rulePack));
  const project = task.projectId ? state.projects.find(item => item.id === task.projectId) : undefined;
  return {
    taskId: task.id,
    actorId: state.settings.actorName,
    workerId: worker.id,
    tenantId: state.settings.organizationId,
    projectId: task.projectId,
    rulePackId: `rules:${rulePackHash.slice(0, 16)}`,
    rulePackHash,
    resolvedLawIds: laws.map(law => `${law.id}@${law.version}`),
    capabilities: effectiveCapabilities(state),
    resourceBudget: { toolCalls: 50, checkpoints: 20, retries: 2, strategies: 3 },
    contextPack: [
      `worker:${worker.id}`,
      `task:${task.id}`,
      ...(project ? [`project:${project.id}`] : []),
      `evidence-count:${state.evidence.filter(item => item.taskId === task.id).length}`,
    ],
    acceptanceCriteria: [
      'Respect the immutable rule-pack snapshot for this attempt.',
      task.evidenceRequired ? 'Attach fresh task evidence before completion.' : 'Task evidence is optional for this task.',
      'Record errors/checkpoints instead of overwriting execution history.',
    ],
    verifiers: [
      'audit:sha256-chain',
      'laws:effective-read-gate',
      ...(task.evidenceRequired ? ['evidence:fresh-task-epoch'] : []),
      'laws:task-end',
    ],
    rollback: 'Stop the attempt, preserve its event history, and create a new attempt only after the blocking condition is resolved.',
    correlationId,
    createdAt,
  };
};

export const executionRetryBlocker = (state: BrainlinkState, worker: BrainlinkWorker) => {
  const task = worker.currentTaskId ? state.tasks.find(item => item.id === worker.currentTaskId) : undefined;
  if (!task) return undefined;
  const failures = state.executions
    .filter(execution => execution.workerId === worker.id && execution.taskId === task.id && (execution.state === 'FAILED' || execution.state === 'BLOCKED'))
    .sort((a, b) => Date.parse(b.endedAt ?? b.createdAt) - Date.parse(a.endedAt ?? a.createdAt));
  if (failures.length < 2) return undefined;
  const latestError = failures[0].events.find(event => event.kind === 'ERROR' && event.fingerprint);
  const previousError = failures[1].events.find(event => event.kind === 'ERROR' && event.fingerprint);
  if (!latestError?.fingerprint || latestError.fingerprint !== previousError?.fingerprint) return undefined;
  const latestEpoch = Date.parse(failures[0].endedAt ?? latestError.createdAt);
  const recoveryCheckpoint = state.evidence.some(evidence =>
    evidence.taskId === task.id && Date.parse(evidence.createdAt) > latestEpoch
  );
  if (recoveryCheckpoint) return undefined;
  return `Repeated failure fingerprint ${latestError.fingerprint.slice(0, 12)}. Add fresh task evidence/checkpoint describing a strategy change before retrying.`;
};

export const canStartExecution = (state: BrainlinkState, worker: BrainlinkWorker) => {
  if (!worker.currentTaskId) return { allowed: false, reason: 'Worker has no current task.' } as const;
  if (!canWorkerRun(state, worker)) return { allowed: false, reason: 'Effective law read gate is not satisfied.' } as const;
  const active = activeExecutionForWorker(state, worker.id);
  if (active) return { allowed: false, reason: `Execution ${active.id} is already active (${active.state}).` } as const;
  const retryBlocker = executionRetryBlocker(state, worker);
  if (retryBlocker) return { allowed: false, reason: retryBlocker } as const;
  return { allowed: true, reason: undefined } as const;
};

const lifecycleEvent = (
  id: string,
  state: BrainlinkExecutionState,
  detail: string,
  createdAt: string
): BrainlinkExecutionEvent => ({ id, state, kind: 'STATE', detail, createdAt });

export const createExecutionAttempt = (
  state: BrainlinkState,
  worker: BrainlinkWorker,
  ids: { executionId: string; correlationId: string; eventIds: string[] },
  createdAt: string
): BrainlinkExecution => {
  const gate = canStartExecution(state, worker);
  if (!gate.allowed) throw new Error(gate.reason);
  const task = state.tasks.find(item => item.id === worker.currentTaskId) as BrainlinkTask;
  const envelope = compileTaskEnvelope(state, worker, ids.correlationId, createdAt);
  const states: Array<[BrainlinkExecutionState, string]> = [
    ['CREATED', 'Execution attempt created.'],
    ['RULES_RESOLVED', `Resolved ${envelope.resolvedLawIds.length} effective law(s); rule pack ${envelope.rulePackId}.`],
    ['ACKNOWLEDGED', 'Required law versions were acknowledged by the worker.'],
    ['AUTHORIZED', `Capabilities frozen: ${envelope.capabilities.join(', ')}.`],
    ['RUNNING', 'Execution attempt started.'],
  ];
  const events = states.map(([executionState, detail], index) =>
    lifecycleEvent(ids.eventIds[index], executionState, detail, createdAt)
  ).reverse();
  return {
    id: ids.executionId,
    taskId: task.id,
    workerId: worker.id,
    attempt: nextExecutionAttempt(state, worker.id, task.id),
    state: 'RUNNING',
    envelope,
    events,
    createdAt,
    startedAt: createdAt,
  };
};

export const appendExecutionEvent = (
  execution: BrainlinkExecution,
  event: BrainlinkExecutionEvent
) => {
  if (isTerminalExecution(execution)) throw new Error(`Execution ${execution.id} is terminal and cannot be mutated.`);
  execution.events.unshift(event);
  execution.state = event.state;
  if (TERMINAL_STATES.has(event.state)) execution.endedAt = event.createdAt;
};

export const makeExecutionErrorEvent = (
  execution: BrainlinkExecution,
  id: string,
  state: 'FAILED' | 'BLOCKED',
  detail: string,
  createdAt: string
): BrainlinkExecutionEvent => ({
  id,
  state,
  kind: 'ERROR',
  detail,
  fingerprint: executionErrorFingerprint(execution.taskId, execution.workerId, detail),
  createdAt,
});

export const makeExecutionStateEvent = (
  id: string,
  state: BrainlinkExecutionState,
  detail: string,
  createdAt: string,
  kind: BrainlinkExecutionEvent['kind'] = 'STATE'
): BrainlinkExecutionEvent => ({ id, state, kind, detail, createdAt });
