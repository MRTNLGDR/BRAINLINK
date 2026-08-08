import type { BrainlinkState, BrainlinkTask, BrainlinkWorker } from './types';

export const effectiveMandatoryLaws = (state: BrainlinkState) =>
  state.laws.filter(law => law.enabled && law.mandatory);

export const actorHasEffectiveLawReceipt = (
  state: BrainlinkState,
  actor: string,
  lawId: string,
  lawVersion: number
) => state.receipts.some(
  receipt => receipt.actor === actor && receipt.lawId === lawId && receipt.lawVersion === lawVersion
);

export const canWorkerRun = (state: BrainlinkState, worker: BrainlinkWorker) =>
  !state.settings.workerReadGate || effectiveMandatoryLaws(state).every(
    law => actorHasEffectiveLawReceipt(state, worker.name, law.id, law.version)
  );

export const canTaskComplete = (state: BrainlinkState, task: BrainlinkTask) =>
  !state.settings.requireEvidenceForDone ||
  !task.evidenceRequired ||
  state.evidence.some(evidence => evidence.taskId === task.id);
