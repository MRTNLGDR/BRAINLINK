import { describe, expect, test } from 'vitest';

import { appendAuditEvent, sealLegacyAudit, sha256Hex, verifyAuditChain } from '../integrity';
import type { BrainlinkAuditEvent } from '../types';

describe('Brainlink audit integrity', () => {
  test('matches standard SHA-256 vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  test('seals legacy newest-first events into a valid chain', () => {
    const legacy: BrainlinkAuditEvent[] = [
      { id: '2', action: 'SECOND', detail: 'two', actor: 'test', createdAt: '2026-01-02T00:00:00.000Z' },
      { id: '1', action: 'FIRST', detail: 'one', actor: 'test', createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    const sealed = sealLegacyAudit(legacy);
    expect(sealed[0].sequence).toBe(2);
    expect(verifyAuditChain(sealed).valid).toBe(true);
  });

  test('detects mutation of historical audit content', () => {
    const audit = sealLegacyAudit([
      { id: '1', action: 'FIRST', detail: 'one', actor: 'test', createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
    appendAuditEvent(audit, { id: '2', action: 'SECOND', detail: 'two', actor: 'test', createdAt: '2026-01-02T00:00:00.000Z' });
    expect(verifyAuditChain(audit).valid).toBe(true);
    audit[1].detail = 'tampered';
    expect(verifyAuditChain(audit)).toMatchObject({ valid: false, eventId: '1' });
  });
});
