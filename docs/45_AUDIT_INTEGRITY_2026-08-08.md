# Brainlink audit integrity — 2026-08-08

## Decision

The local Brainlink audit ledger is now tamper-evident instead of merely append-oriented by UI convention. Each event carries a monotonic `sequence`, `prevHash` and SHA-256 `eventHash`. The hash is calculated over the canonical event payload without the `eventHash` field itself.

## Compatibility

- existing schema-v1/v2 backups with completely unsealed audit histories are accepted, sealed chronologically once and receive an `AUDIT_CHAIN_INITIALIZED` event;
- backups that already contain chain fields must verify exactly; a mutation of historical detail/action/actor/time/sequence/hash is rejected as an invalid backup;
- new mutations use one `appendAuditEvent` path;
- the app no longer truncates audit history to 1,000 events because deleting the chain root silently would invalidate the integrity proof.

## UI

The Audit surface displays `CHAIN VALID`/`CHAIN INVALID`, event sequence and a truncated event hash with the full hash in the title.

## Tests executed

- SHA-256 empty-string standard vector: PASS;
- SHA-256 `abc` standard vector: PASS;
- default chain: PASS;
- append preserves chain: PASS;
- historical mutation is detected: PASS;
- v1 unsealed history migration/sealing: PASS;
- policy/import cases combined: **15/15 PASS**;
- structural validator after audit hardening: **42/42 PASS**;
- strict TypeScript for `types.ts`, `integrity.ts`, `store.ts`, `policy.ts`: PASS.
