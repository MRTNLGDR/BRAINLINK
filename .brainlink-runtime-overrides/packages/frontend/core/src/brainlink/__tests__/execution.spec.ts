import { describe, expect, test } from 'vitest';

import {
  appendExecutionEvent,
  canStartExecution,
  compileTaskEnvelope,
  createExecutionAttempt,
  executionRetryBlocker,
  makeExecutionErrorEvent,
  makeExecutionStateEvent,
} from '../execution';
import { workerStartRequiredLaws } from '../policy';
import { createDefaultBrainlinkState } from '../store';

const authorize = (state: ReturnType<typeof createDefaultBrainlinkState>, workerName: string) => {
  const worker = state.workers.find(item => item.name === workerName)!;
  for (const law of workerStartRequiredLaws(state, worker)) {
    state.receipts.push({ id: `r-${law.id}`, lawId: law.id, lawVersion: law.version, actor: worker.name, readAt: new Date().toISOString() });
  }
  return worker;
};

const createAttempt = (state: ReturnType<typeof createDefaultBrainlinkState>, suffix: string) => {
  const worker = authorize(state, 'Brainlink Custodian');
  return createExecutionAttempt(state, worker, {
    executionId: `EXEC-${suffix}`,
    correlationId: `CORR-${suffix}`,
    eventIds: ['1','2','3','4','5'].map(id => `EV-${suffix}-${id}`),
  }, `2026-08-08T20:00:0${suffix}.000Z`);
};

describe('Brainlink execution envelopes', () => {
  test('freezes a deterministic law pack and local capability set', () => {
    const state = createDefaultBrainlinkState();
    const worker = authorize(state, 'Brainlink Custodian');
    const first = compileTaskEnvelope(state, worker, 'CORR-A', '2026-08-08T20:00:00.000Z');
    const second = compileTaskEnvelope(state, worker, 'CORR-B', '2026-08-08T20:01:00.000Z');
    expect(first.rulePackHash).toBe(second.rulePackHash);
    expect(first.capabilities).toContain('document:read');
    expect(first.capabilities.some(capability => capability.endsWith(':write'))).toBe(false);
  });

  test('cannot start before the effective law read gate is satisfied', () => {
    const state = createDefaultBrainlinkState();
    expect(canStartExecution(state, state.workers[0])).toMatchObject({ allowed: false });
  });

  test('creates a lifecycle lineage with attempt and correlation IDs', () => {
    const state = createDefaultBrainlinkState();
    const execution = createAttempt(state, '1');
    expect(execution.attempt).toBe(1);
    expect(execution.state).toBe('RUNNING');
    expect(execution.events.map(event => event.state)).toEqual(['RUNNING','AUTHORIZED','ACKNOWLEDGED','RULES_RESOLVED','CREATED']);
    expect(execution.envelope.correlationId).toBe('CORR-1');
  });

  test('terminal attempts are immutable', () => {
    const state = createDefaultBrainlinkState();
    const execution = createAttempt(state, '1');
    appendExecutionEvent(execution, makeExecutionStateEvent('EV-END', 'CANCELLED', 'cancel', '2026-08-08T20:02:00.000Z'));
    expect(() => appendExecutionEvent(execution, makeExecutionStateEvent('EV-LATE', 'RUNNING', 'late', '2026-08-08T20:03:00.000Z'))).toThrow(/terminal/);
  });

  test('blocks repeated identical failures until a fresh strategy checkpoint exists', () => {
    const state = createDefaultBrainlinkState();
    const worker = authorize(state, 'Brainlink Custodian');
    const first = createAttempt(state, '1');
    appendExecutionEvent(first, makeExecutionErrorEvent(first, 'ERR-1', 'BLOCKED', 'same failure', '2026-08-08T20:02:00.000Z'));
    state.executions.unshift(first);
    const second = createExecutionAttempt(state, worker, {
      executionId: 'EXEC-2', correlationId: 'CORR-2', eventIds: ['1','2','3','4','5'].map(id => `EV-2-${id}`),
    }, '2026-08-08T20:03:00.000Z');
    appendExecutionEvent(second, makeExecutionErrorEvent(second, 'ERR-2', 'BLOCKED', 'same   failure', '2026-08-08T20:04:00.000Z'));
    state.executions.unshift(second);
    expect(executionRetryBlocker(state, worker)).toMatch(/Repeated failure fingerprint/);
    expect(canStartExecution(state, worker).allowed).toBe(false);
    state.evidence.unshift({ id:'E-RECOVERY', type:'CHECKPOINT', title:'Strategy changed', detail:'Alternative path selected.', actor:'operator', taskId:worker.currentTaskId, createdAt:'2026-08-08T20:05:00.000Z' });
    expect(executionRetryBlocker(state, worker)).toBeUndefined();
    expect(canStartExecution(state, worker).allowed).toBe(true);
  });
});
