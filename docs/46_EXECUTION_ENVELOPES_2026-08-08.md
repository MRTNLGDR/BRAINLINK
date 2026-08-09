# Brainlink Execution Envelopes — runtime v2.2 candidate

## Status

`CANDIDATE_NOT_PROMOTED`.

The stable Brainlink runtime remains **v2.1**. This v2.2 work is intentionally additive and is materialized through the separate `BRAINLINK_SETUP_V22.bat` path only after the verified v2.1 tree has been reconstructed first.

The Oráculo/COSMETA/Brainlink V5 source is supporting architectural context, not an automatic migration authority. Its TaskEnvelope and anti-loop requirements reinforce this candidate, while product boundaries remain unchanged.

## Decision

A worker execution is represented in the v2.2 candidate as a separate immutable **attempt** instead of allowing worker/task status changes to overwrite operational history.

Each attempt freezes a `BrainlinkTaskEnvelope` containing:

- task, actor, worker, tenant and optional project IDs;
- deterministic rule-pack ID/hash plus the exact resolved law versions;
- effective capabilities, including connector write capability only when human-approved;
- resource budget for tool calls, checkpoints, retries and strategies;
- context references;
- acceptance criteria and verifiers;
- rollback instruction;
- correlation ID and creation time.

## Lifecycle

A new attempt records the ordered lifecycle:

`CREATED → RULES_RESOLVED → ACKNOWLEDGED → AUTHORIZED → RUNNING`

Further events can move it through `PAUSED`, `VERIFYING`, `WAITING_APPROVAL` and terminal states `SUCCEEDED`, `FAILED`, `BLOCKED`, or `CANCELLED`.

Terminal attempts are immutable. A later retry creates a new attempt number and correlation lineage instead of editing the old one.

## Anti-loop behavior

Brainlink normalizes and SHA-256 fingerprints execution errors by task + worker + error detail. If the two latest failed/blocked attempts repeat the same fingerprint, another attempt is blocked until fresh task evidence/checkpoint is created after the latest failure, forcing a visible strategy change instead of silent repetition.

An overlapping active execution for the same worker is also rejected.

## Task completion

When a governed task passes the existing DONE gates, active attempts for that task receive `VERIFYING` followed by terminal `SUCCEEDED`/`RESULT`, and their workers return to `IDLE`.

## Compatibility

The persisted Brainlink state remains schema v2. Existing v2 backups without an `executions` collection are accepted as `executions: []`. Execution envelopes/events are strictly parsed when present.

No Oráculo, COSMETA, Ultrabase, provider, model-runtime or filesystem-management responsibility is moved into Brainlink by this feature.

## Verification already performed in development materialization

The v2.2 execution behavior harness passed **16/16** cases, including deterministic rule-pack hashing, approved-write capability freezing, lifecycle creation, overlap rejection, terminal immutability, normalized error fingerprints, repeated-error anti-loop, checkpoint recovery, old-v2 compatibility, execution round-trip parsing and audit-chain preservation.

The development structural pass was **54/54** when combining the existing 42 v2.1 invariants with 12 Execution Envelope invariants. Strict TypeScript for the execution/governance core and isolated semantic checking of the app both passed.

These results do **not** promote v2.2. Promotion additionally requires the gates defined in `docs/47_V5_CONTEXT_ADOPTION_AND_NON_BREAKAGE_2026-08-08.md`, including immutable dependency installation, targeted tests, production build, relevant E2E/negative paths, backup compatibility and rollback evidence.
