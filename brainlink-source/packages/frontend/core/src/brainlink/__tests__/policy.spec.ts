import { describe, expect, test } from 'vitest';

import { canTaskComplete, canWorkerRun } from '../policy';
import { createDefaultBrainlinkState } from '../store';

describe('Brainlink governance policies', () => {
  test('blocks a worker until every mandatory law version is acknowledged', () => {
    const state = createDefaultBrainlinkState();
    const worker = state.workers[0];
    expect(canWorkerRun(state, worker)).toBe(false);
    state.receipts = state.laws
      .filter(law => law.enabled && law.mandatory)
      .map(law => ({ id: `r-${law.id}`, lawId: law.id, lawVersion: law.version, actor: worker.name, readAt: new Date().toISOString() }));
    expect(canWorkerRun(state, worker)).toBe(true);
  });

  test('blocks DONE while required evidence is missing', () => {
    const state = createDefaultBrainlinkState();
    const task = state.tasks[0];
    task.evidenceRequired = true;
    state.evidence = state.evidence.filter(item => item.taskId !== task.id);
    expect(canTaskComplete(state, task)).toBe(false);
    state.evidence.push({ id:'e-test', type:'TEST', title:'Verification', detail:'Passed', actor:'test', taskId:task.id, createdAt:new Date().toISOString() });
    expect(canTaskComplete(state, task)).toBe(true);
  });
});
