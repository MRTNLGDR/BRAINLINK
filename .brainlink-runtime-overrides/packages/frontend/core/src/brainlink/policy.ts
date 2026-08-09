import type {
  BrainlinkLaw,
  BrainlinkLawTrigger,
  BrainlinkState,
  BrainlinkTask,
  BrainlinkWorker,
} from './types';

export interface BrainlinkLawContext {
  actor?: string;
  worker?: BrainlinkWorker;
  task?: BrainlinkTask;
  triggers?: BrainlinkLawTrigger[];
}

const taskForWorker = (state: BrainlinkState, worker?: BrainlinkWorker) =>
  worker?.currentTaskId ? state.tasks.find(task => task.id === worker.currentTaskId) : undefined;

const lawMatchesScope = (
  state: BrainlinkState,
  law: BrainlinkLaw,
  context: BrainlinkLawContext
) => {
  if (law.scope === 'GLOBAL') return true;
  if (law.scope === 'ORGANIZATION') return !law.targetId || law.targetId === state.settings.organizationId;

  const worker = context.worker;
  const task = context.task ?? taskForWorker(state, worker);
  if (law.scope === 'PROJECT') return Boolean(task?.projectId) && (!law.targetId || law.targetId === task?.projectId);
  if (law.scope === 'WORKER') return Boolean(worker) && (!law.targetId || law.targetId === worker?.id || law.targetId === worker?.name);
  return false;
};

const lawMatchesTrigger = (law: BrainlinkLaw, triggers?: BrainlinkLawTrigger[]) => {
  if (!triggers?.length) return true;
  return law.trigger === 'ALWAYS' || triggers.includes(law.trigger);
};

export const effectiveMandatoryLaws = (
  state: BrainlinkState,
  context: BrainlinkLawContext = {}
) => state.laws.filter(
  law => law.enabled && law.mandatory && lawMatchesScope(state, law, context) && lawMatchesTrigger(law, context.triggers)
);

export const actorHasEffectiveLawReceipt = (
  state: BrainlinkState,
  actor: string,
  lawId: string,
  lawVersion: number
) => state.receipts.some(
  receipt => receipt.actor === actor && receipt.lawId === lawId && receipt.lawVersion === lawVersion
);

export const workerStartRequiredLaws = (state: BrainlinkState, worker: BrainlinkWorker) => {
  const task = taskForWorker(state, worker);
  const triggers: BrainlinkLawTrigger[] = task ? ['SESSION_START', 'TASK_START'] : ['SESSION_START'];
  if (worker.status === 'BLOCKED') triggers.push('ON_ERROR');
  return effectiveMandatoryLaws(state, { worker, task, triggers });
};

export const taskEndRequiredLaws = (state: BrainlinkState, task: BrainlinkTask) =>
  effectiveMandatoryLaws(state, { task, triggers: ['TASK_END'] });

export const errorRequiredLaws = (
  state: BrainlinkState,
  worker?: BrainlinkWorker,
  task?: BrainlinkTask
) => effectiveMandatoryLaws(state, { worker, task, triggers: ['ON_ERROR'] });

export const canWorkerRun = (state: BrainlinkState, worker: BrainlinkWorker) =>
  !state.settings.workerReadGate || workerStartRequiredLaws(state, worker).every(
    law => actorHasEffectiveLawReceipt(state, worker.name, law.id, law.version)
  );

export const hasFreshTaskEvidence = (state: BrainlinkState, task: BrainlinkTask) => {
  const taskEpoch = Date.parse(task.updatedAt || task.createdAt);
  return state.evidence.some(evidence => {
    if (evidence.taskId !== task.id) return false;
    const evidenceEpoch = Date.parse(evidence.createdAt);
    return Number.isFinite(evidenceEpoch) && (!Number.isFinite(taskEpoch) || evidenceEpoch >= taskEpoch);
  });
};

export const canTaskComplete = (
  state: BrainlinkState,
  task: BrainlinkTask,
  actor = state.settings.actorName
) => {
  const evidenceSatisfied = !state.settings.requireEvidenceForDone || !task.evidenceRequired || hasFreshTaskEvidence(state, task);
  if (!evidenceSatisfied) return false;
  return taskEndRequiredLaws(state, task).every(
    law => actorHasEffectiveLawReceipt(state, actor, law.id, law.version)
  );
};

export const taskCompletionBlockers = (
  state: BrainlinkState,
  task: BrainlinkTask,
  actor = state.settings.actorName
) => {
  const blockers: string[] = [];
  if (state.settings.requireEvidenceForDone && task.evidenceRequired && !hasFreshTaskEvidence(state, task)) {
    blockers.push('fresh task evidence');
  }
  const missingLaws = taskEndRequiredLaws(state, task).filter(
    law => !actorHasEffectiveLawReceipt(state, actor, law.id, law.version)
  );
  if (missingLaws.length) blockers.push(`${missingLaws.length} TASK_END law receipt(s)`);
  return blockers;
};

export const connectionHasApprovedWrite = (state: BrainlinkState, connectionId: string) =>
  state.approvals.some(
    approval => approval.connectionId === connectionId && approval.requestedMode === 'READ_WRITE' && approval.status === 'APPROVED'
  );

export const projectProgress = (state: BrainlinkState, projectId: string) => {
  const tasks = state.tasks.filter(task => task.projectId === projectId);
  if (!tasks.length) return state.projects.find(project => project.id === projectId)?.progress ?? 0;
  const done = tasks.filter(task => task.status === 'DONE').length;
  return Math.round((done / tasks.length) * 100);
};
