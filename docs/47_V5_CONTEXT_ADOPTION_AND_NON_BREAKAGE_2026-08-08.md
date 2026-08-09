# Brainlink V5 context adoption and non-breakage policy — 2026-08-08

## Purpose

The supplied **Oráculo Master Admin / COSMETA / Brainlink Cumulative V5** document is valuable architecture context, but it is **not** an instruction to replace the currently verified Brainlink runtime. Its own source status says `TARGET_SPEC_DOCUMENTED / RUNTIME_NOT_INSPECTED_ON_USER_PC`.

This document makes that distinction executable as project policy.

## Non-breakage rule

The currently promoted Brainlink runtime remains **v2.1** until a newer candidate independently passes its promotion gate.

A V5 idea may enter Brainlink only when all of the following are true:

1. it belongs to the Brainlink knowledge/governance responsibility;
2. it does not duplicate Oráculo, COSMETA, Ultrabase, an AFFiNE upstream capability, or another canonical service;
3. it is additive or backward-compatible with the current persisted state;
4. it preserves the AFFiNE compatibility/upstream strategy;
5. it has deterministic acceptance checks and rollback;
6. external dependencies are real and inspected, not mocked;
7. the stable runtime remains recoverable.

## Product boundaries preserved

| Logical product | Boundary used by Brainlink |
| --- | --- |
| Brainlink | Knowledge, documents, Universalis, governance, tasks, workers metadata, evidence, audit, bugs/solutions, approvals and knowledge-facing orchestration contracts |
| COSMETA | External execution/canvas boundary; do not recreate its universal media/spatial node OS inside Brainlink |
| Oráculo Master Admin | External execution/admin/worker-routing boundary; Brainlink may publish governance contracts to it |
| Ultrabase | External canonical data-plane boundary when the real runtime/manual is available; do not invent a second database implementation |
| AIIA Gateway | External provider/model-routing boundary; Brainlink stores policy/reference metadata, not provider master secrets |

## Adoption matrix

### ALREADY_SATISFIED / KEEP

- controlled AFFiNE reuse with exact upstream pin;
- local-first Brainlink layer;
- versioned Universalis rules and read receipts;
- evidence-gated task completion;
- human approval gate for write-capable connectors;
- explicit no-fake-success behavior;
- secret values excluded from persisted Brainlink state;
- tamper-evident SHA-256 audit chain;
- v1 → v2 state migration and strict import validation;
- Bug Book verification gate;
- rollback-oriented reproducible materialization.

These are not reimplemented because V5 mentions them; the current implementation remains the source under test.

### ADOPTED AS CANDIDATE — v2.2

**Execution Envelopes** complement the current worker model and are consistent with the documented TaskEnvelope/anti-loop contract.

The candidate adds per-attempt immutable execution history with:

- task/actor/worker/scope identity;
- rule-pack ID/hash and resolved law versions;
- frozen effective capabilities;
- resource budget;
- context references;
- acceptance criteria/verifiers;
- rollback instruction;
- correlation ID;
- lifecycle/checkpoint/error/result events;
- normalized error fingerprints and repeated-error anti-loop blocking.

This remains a **candidate**. It does not replace `BRAINLINK_SETUP.bat` or `brainlink_runtime_release=v2.1` until promotion gates pass.

### TARGET_ONLY — DO NOT IMPLEMENT INSIDE BRAINLINK NOW

- Oráculo shell and global application modes;
- COSMETA universal node canvas/catalog;
- Voice Live stack and model selection;
- AIIA AI Gateway runtime;
- filesystem C:/D: consolidation/migration;
- model installation/quantization runtime;
- vendor manager runtime for Dyad/Flowise/OpenCode/ComfyUI;
- GPU/resource scheduler;
- universal CAD/BIM/GIS/media execution engine.

Brainlink may document, reference, govern or link these capabilities, but must not absorb their runtime responsibilities.

### EXTERNAL_BOUNDARY — WAIT FOR REAL INPUT

- Ultrabase schema/migrations/RLS/storage/realtime;
- production MCP transports/servers;
- secret broker/OpenBao integration;
- provider credentials;
- remote notifications;
- external vendor builds and licenses;
- user-machine filesystem inventory.

No mock connection, fake health, fictitious migration or success status may be introduced to make these appear complete.

### REJECTED IF PROPOSED

- replacing stable v2.1 merely because a newer document exists;
- rewriting AFFiNE surfaces that can be extended/reused;
- copying COSMETA/Oráculo capabilities into Brainlink;
- changing a source of truth silently;
- auto-promoting v2.2 without regression/build/test evidence;
- moving/deleting user files as part of documentation adoption;
- turning target specs into green health states;
- making external connectors appear live without real transports.

## Candidate promotion gate

A candidate may become stable only after:

1. stable v2.1 materialization still passes all **42/42** regression invariants;
2. v2.2 Execution Envelope checks pass **12/12**;
3. strict TypeScript checks pass for touched Brainlink source;
4. immutable dependency installation succeeds on supported Node;
5. targeted Brainlink tests pass;
6. production build succeeds;
7. relevant browser/E2E and negative-path tests pass;
8. backup/import compatibility is demonstrated;
9. rollback to stable v2.1 is demonstrated;
10. release evidence is committed before `AFFINE_UPSTREAM.lock` changes `brainlink_runtime_release`.

## Context provenance

- supplied file: `00_ORACULO_MASTER_ADMIN_COSMETA_BRAINLINK_CUMULATIVO_V5_SINGLE_FILE_2026-08-07 (2).md`
- bytes: `432930`
- lines: `14403`
- SHA-256: `7fef02277ce23bd6cf937e8ba5dd12e2f90e756e073179341144f48306cb0d7b`
- classification in Brainlink: `CONTEXT_COMPLEMENT_ONLY`

The complete V5 source remains user-supplied context. Brainlink records provenance and adoption decisions without silently vendoring every target into runtime code.
