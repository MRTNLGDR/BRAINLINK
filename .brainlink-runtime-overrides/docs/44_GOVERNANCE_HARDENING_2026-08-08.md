# Brainlink governance hardening — 2026-08-08

## Runtime schema v2

This increment upgrades the local Brainlink governance state from schema v1 to v2 while preserving import compatibility with v1 backups.

Implemented changes:

- laws now carry lifecycle trigger (`ALWAYS`, `SESSION_START`, `TASK_START`, `TASK_END`, `ON_ERROR`);
- scoped rules can target organization, project, or worker IDs;
- worker start gates resolve only laws effective for the worker/current task context;
- a blocked worker must satisfy `ON_ERROR` rules before retrying;
- task `DONE` requires evidence created in the current execution epoch, not any historical evidence;
- task completion also requires effective `TASK_END`/`ALWAYS` law receipts;
- connector registration no longer claims a live transport connection;
- `READ_WRITE` capability requires explicit matching human approval;
- imports cannot smuggle unapproved write capability; it is downgraded and audited;
- bug solution text no longer auto-marks a bug solved; an explicit verification action is required;
- project progress is derived from actual task completion rather than a manual `+10%` button;
- backup parsing validates the full state shape and migrates legacy v1 state;
- destructive local reset requires confirmation and leaves a reset tombstone in the new audit ledger.

## Verification

- Brainlink structural validator: **35/35 PASS**.
- TypeScript strict check for Brainlink `types.ts`, `store.ts`, `policy.ts`: **PASS**.
- Isolated strict semantic check for `app.tsx` with only React/Router declarations stubbed: **PASS**.
- Executed governance behavior cases with compiled policy/store modules: **10/10 PASS**.
- Vitest suites authored for policy and state migration/import invariants.

## Still not claimed

A full AFFiNE dependency install/build, browser E2E, accessibility audit and full monorepo test suite remain unverified in this execution environment because DNS cannot resolve the Yarn distribution/package endpoints. Node v22.16.0 is available and is within AFFiNE's supported range; the remaining blocker here is dependency/network availability, not the Node version.
