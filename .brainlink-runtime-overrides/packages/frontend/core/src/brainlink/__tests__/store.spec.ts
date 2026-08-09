import { describe, expect, test } from 'vitest';

import { verifyAuditChain } from '../integrity';
import { createDefaultBrainlinkState, parseBrainlinkState } from '../store';

describe('Brainlink state parser and migrations', () => {
  test('migrates v1 state to v2 and downgrades legacy write capabilities', () => {
    const legacy = JSON.parse(JSON.stringify(createDefaultBrainlinkState())) as Record<string, any>;
    legacy.schemaVersion = 1;
    for (const law of legacy.laws) {
      delete law.trigger;
      delete law.targetId;
    }
    delete legacy.settings.organizationId;
    legacy.connections = [{
      id: 'CONN-LEGACY',
      name: 'Legacy connector',
      kind: 'API',
      endpoint: 'https://example.invalid',
      mode: 'READ_WRITE',
      status: 'CONNECTED',
      createdAt: new Date().toISOString(),
    }];

    const migrated = parseBrainlinkState(legacy);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.settings.organizationId).toBe('local');
    expect(migrated.connections[0].mode).toBe('READ_ONLY');
    expect(migrated.audit.some(event => event.action === 'STATE_MIGRATED')).toBe(true);
    expect(verifyAuditChain(migrated.audit).valid).toBe(true);
  });

  test('cannot import READ_WRITE without a matching approved request', () => {
    const state = createDefaultBrainlinkState();
    state.connections.push({
      id: 'CONN-UNSAFE',
      name: 'Unsafe import',
      kind: 'API',
      endpoint: 'local://unsafe',
      mode: 'READ_WRITE',
      status: 'REGISTERED',
      createdAt: new Date().toISOString(),
    });

    const parsed = parseBrainlinkState(state);
    expect(parsed.connections[0].mode).toBe('READ_ONLY');
    expect(parsed.audit.some(event => event.action === 'UNAPPROVED_WRITE_DOWNGRADED')).toBe(true);
  });

  test('rejects a backup whose sealed audit history was tampered with', () => {
    const state = createDefaultBrainlinkState();
    state.audit[state.audit.length - 1].detail = 'tampered after sealing';
    expect(() => parseBrainlinkState(state)).toThrow(/audit integrity/);
  });

  test('rejects malformed state instead of accepting partial schemaVersion-only data', () => {
    expect(() => parseBrainlinkState({ schemaVersion: 2 })).toThrow(/Invalid Brainlink backup/);
  });
});
