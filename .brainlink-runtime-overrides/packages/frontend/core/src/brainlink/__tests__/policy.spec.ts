import { describe, expect, test } from 'vitest';

import {
  canTaskComplete,
  canWorkerRun,
  connectionHasApprovedWrite,
  projectProgress,
  taskEndRequiredLaws,
  workerStartRequiredLaws,
} from '../policy';
import { createDefaultBrainlinkState } from '../store';

describe('Brainlink governance policies', () => {
  test('blocks a worker until every effective start law version is acknowledged', () => {
    const state = createDefaultBrainlinkState();
    const worker = state.workers[0];
    const task = state.tasks[0];

    state.laws.push({
      id: 'LAW-PROJECT-START',
      title: 'Project start law',
      scope: 'PROJECT',
      targetId: task.projectId,
      trigger: 'TASK_START',
      version: 1,
      body: 'Project-specific worker instruction.',
      mandatory: true,
      enabled: true,
      createdAt: new Date().toISOString(),
    });
    state.laws.push({
      id: 'LAW-OTHER-PROJECT',
      title: 'Other project law',
      scope: 'PROJECT',
      targetId: 'PRJ-OTHER',
      trigger: 'TASK_START',
      version: 1,
      body: 'Must not leak into this worker context.',
      mandatory: true,
      enabled: true,
      createdAt: new Date().toISOString(),
    });

    expect(canWorkerRun(state, worker)).toBe(false);
    const required = workerStartRequiredLaws(state, worker);
    expect(required.some(law => law.id === 'LAW-PROJECT-START')).toBe(true);
    expect(required.some(law => law.id === 'LAW-OTHER-PROJECT')).toBe(false);

    state.receipts = required.map(law => ({
      id: `r-${law.id}`,
      lawId: law.id,
      lawVersion: law.version,
      actor: worker.name,
      readAt: new Date().toISOString(),
    }));
    expect(canWorkerRun(state, worker)).toBe(true);
  });

  test('adds ON_ERROR law requirements before a blocked worker can run again', () => {
    const state = createDefaultBrainlinkState();
    const worker = state.workers[0];
    state.receipts = workerStartRequiredLaws(state, worker).map(law => ({
      id: `r-${law.id}`,
      lawId: law.id,
      lawVersion: law.version,
      actor: worker.name,
      readAt: new Date().toISOString(),
    }));
    expect(canWorkerRun(state, worker)).toBe(true);

    worker.status = 'BLOCKED';
    expect(canWorkerRun(state, worker)).toBe(false);
    expect(workerStartRequiredLaws(state, worker).some(law => law.trigger === 'ON_ERROR')).toBe(true);
  });

  test('blocks DONE when evidence is stale or task-end laws are unread', () => {
    const state = createDefaultBrainlinkState();
    const task = state.tasks[0];
    task.evidenceRequired = true;
    state.evidence.push({
      id: 'e-stale',
      type: 'TEST',
      title: 'Old verification',
      detail: 'Predates the current task execution epoch.',
      actor: 'test',
      taskId: task.id,
      createdAt: '2000-01-01T00:00:00.000Z',
    });
    expect(canTaskComplete(state, task)).toBe(false);

    state.receipts.push(...taskEndRequiredLaws(state, task).map(law => ({
      id: `r-${law.id}`,
      lawId: law.id,
      lawVersion: law.version,
      actor: state.settings.actorName,
      readAt: new Date().toISOString(),
    })));
    state.evidence.push({
      id: 'e-fresh',
      type: 'TEST',
      title: 'Fresh verification',
      detail: 'Passed after current task execution began.',
      actor: 'test',
      taskId: task.id,
      createdAt: new Date(Date.parse(task.updatedAt) + 1000).toISOString(),
    });
    expect(canTaskComplete(state, task)).toBe(true);
  });

  test('requires an approved capability request for connector writes', () => {
    const state = createDefaultBrainlinkState();
    state.connections.push({
      id: 'CONN-TEST',
      name: 'Test connector',
      kind: 'API',
      endpoint: 'local://test',
      mode: 'READ_ONLY',
      status: 'REGISTERED',
      createdAt: new Date().toISOString(),
    });
    expect(connectionHasApprovedWrite(state, 'CONN-TEST')).toBe(false);
    state.approvals.push({
      id: 'APR-TEST',
      title: 'Enable write',
      detail: 'Explicit human approval.',
      status: 'APPROVED',
      connectionId: 'CONN-TEST',
      requestedMode: 'READ_WRITE',
      createdAt: new Date().toISOString(),
    });
    expect(connectionHasApprovedWrite(state, 'CONN-TEST')).toBe(true);
  });

  test('derives project progress from task completion', () => {
    const state = createDefaultBrainlinkState();
    state.tasks.push({ ...state.tasks[0], id: 'TASK-SECOND', status: 'DONE' });
    expect(projectProgress(state, 'PRJ-BRAINLINK')).toBe(50);
  });
});
