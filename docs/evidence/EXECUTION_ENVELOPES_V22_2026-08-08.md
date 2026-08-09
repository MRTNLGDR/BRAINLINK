# Brainlink Execution Envelope v2.2 verification — 2026-08-08

## Goal

Replace mutable worker/task execution history with separate governed attempts that freeze the effective context before execution and preserve retries/errors instead of overwriting them.

## Implemented runtime contract

Each attempt receives a `BrainlinkTaskEnvelope` with task/actor/worker/tenant/project IDs, deterministic rule-pack hash, exact resolved law versions, frozen capabilities, resource budget, context references, acceptance criteria, verifiers, rollback instruction and correlation ID.

Execution lifecycle states include `CREATED`, `RULES_RESOLVED`, `ACKNOWLEDGED`, `AUTHORIZED`, `RUNNING`, `PAUSED`, `VERIFYING`, `WAITING_APPROVAL`, `SUCCEEDED`, `FAILED`, `BLOCKED`, and `CANCELLED`.

Terminal attempts are immutable. One active attempt per worker is allowed. A repeated normalized SHA-256 error fingerprint across the two latest failed/blocked attempts blocks another retry until fresh task evidence/checkpoint is recorded after the latest failure.

Connector write capabilities enter the frozen envelope only when the connector is `READ_WRITE` and has a matching human approval.

## Compatibility

The persisted state remains schema v2. Older v2 backups without an `executions` collection are parsed as `executions: []`. Execution envelopes and events are strictly validated when present.

The v2.2 delivery is layered on top of the already verified v2.1 materialization. The v2.1 final-file manifest remains the regression base. A deterministic source migrator then upgrades `types.ts`, `store.ts` and `app.tsx`, while `execution.ts` and its tests are readable source files.

A transport interpolation defect was detected before promotion. `apply-execution-v22-safe.mjs` was verified against a simulation of that defect and produced the same final `types/store/app` files as the approved local v2.2 source tree.

## Verification results

- v2.1 regression structural invariants: **42/42 PASS**.
- v2.2 Execution Envelope invariants: **12/12 PASS**.
- combined structural invariants: **54/54 PASS**.
- compiled governance/integrity/execution behavior cases: **16/16 PASS**.
- strict TypeScript for governance/integrity/execution core: **PASS**.
- isolated semantic TypeScript check for the upgraded `app.tsx`: **PASS**.
- deterministic source-migration comparison against the approved v2.2 local source: **PASS**.

## Behavior cases covered

The executed behavior harness covered SHA-256/audit integrity, unread-worker start blocking, deterministic rule-pack hashing, absence of unapproved write capability, approved write capability freezing, attempt lifecycle creation, overlapping-execution rejection, terminal immutability, normalized error fingerprinting, repeated-error anti-loop, checkpoint recovery, old-v2 compatibility, execution-envelope round-trip parsing, existing task evidence completion and audit integrity after import repair.

## Environment limitation

Node `v22.16.0` satisfies AFFiNE 0.27.0. The full dependency-backed AFFiNE build/browser E2E/accessibility/full-monorepo suite still cannot be executed in this host because Yarn/package endpoints are not resolvable and no complete dependency cache is present. Those suites are not claimed as executed.
