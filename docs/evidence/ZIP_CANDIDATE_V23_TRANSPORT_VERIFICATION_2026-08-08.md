# Brainlink ZIP-authoritative candidate v2.3 — transport and regression verification

Date: 2026-08-08 (America/Sao_Paulo)

## Authority

- Primary Brainlink documentation authority: `Brainlink_Documentacao_Completa_v1.0.0.zip`.
- Source SHA-256: `4bce9d511680c70d7cfd51dbc4ef203172a46fa4d10388acd16209fa6b556c09`.
- ZIP entries: `63`.
- Included files validated by the ZIP's own checksum set: `56/56`.
- V5 integrated Oráculo/COSMETA/Brainlink document remains secondary context only.

## Stable rollback baseline

The candidate does not replace the promoted runtime while it is under verification.

- Stable runtime: `v2.1`.
- Stable setup: `BRAINLINK_SETUP.bat`.
- Stable structural validator: `42/42 PASS`.
- Stable governance/integrity behavior cases: `15/15 PASS`.
- AFFiNE pin: `v0.27.0` / `c61cc6a86f5f8364732296f0bb8393b37e0f70b3`.

The candidate materializer always rebuilds the verified stable baseline before applying the candidate overlay. Running the normal stable setup again restores that baseline.

## Compact v2.3 runtime transport

Documentation/corpus bytes are deliberately not copied into the materialized AFFiNE tree. They remain repository-level provenance. The candidate transport contains runtime/code/contracts/checklists/roadmap/evidence required by execution only.

- Transport directory: `.brainlink-zip-candidate-v23-runtime/`.
- Ordered fragments: `18` (`00`, `01`, `02`, `03`, `04a`, `04b`, `05` ... `16`).
- Decoded gzip/tar bytes: `60,911`.
- Runtime overlay SHA-256: `72375fababaae6f48037d1a5b072ed18988a8bf6db566f95dcd0426433b5340f`.
- Final-file manifest: `BRAINLINK_ZIP_CANDIDATE_V23_RUNTIME.sha256`.
- Manifest SHA-256: `79e73c0bb0c18708bdd5fbe3a8c7100e3966b37e4e85440d408df0896830ead0`.
- Manifested final runtime files: `30`.

The transport audit verifies Base64/gzip validity, safe archive paths, an exact archive-file/manifest-file set, every extracted final-file SHA-256, and the two pinned hashes above before the AFFiNE workspace is changed.

## Byte-level publication controls

Representative Git blob identities were compared against the locally tested transport bytes after publication:

- `runtime.part00.b64`: `e3e83bb242f8f1f0274cde53becf157b7b709384` — exact match.
- `runtime.part04a.b64`: `0b768e3e774f7d388e593a1c1deab8a7ec73b4f9` — exact match.
- `runtime.part04b.b64`: `ca35b477d647e1903abed7ade70b3e1464620a4d` — exact match.
- `runtime.part16.b64`: `2ff51be113239da8afd04d3a6a46587286329dbb` — exact match.

The locally reconstructed archive used the same published filename order and produced the pinned runtime overlay SHA-256.

## ZIP-aligned runtime behavior implemented

The candidate reconciles the existing implementation with the authoritative ZIP rather than replacing AFFiNE or fabricating external systems. It adds/repairs:

- all `40` canonical `LAW-001..LAW-040` laws, preserving conflicting older local laws as legacy history instead of deleting them;
- `11` rule precedence scopes;
- `11` read gates with gate-specific receipts;
- the literal `PreTask100` audit: exactly 100 checks in 10 categories, not 100 hidden model loops;
- immutable Execution/Task Envelopes per attempt with correlation, rule-pack, capability, budget, context, verifier and rollback snapshots;
- bounded retry/stagnation controls and repeated-error anti-loop enforcement;
- complete execution lifecycle states and checkpoints;
- write approval bound to exact connector payload hash and expiry;
- evidence truth-state handling so an operational `DONE` status is not automatically a `VERIFIED` claim;
- 16 KB micro-event payload enforcement and runtime budgets;
- audit-chain migration ordering that seals/verifies history before repair events;
- target OpenAPI/AsyncAPI/MCP/error contracts and repaired canonical roadmap/checklist artifacts referenced by the ZIP, with external integrations kept explicitly blocked until real runtimes exist.

## Candidate validation results

Clean simulation over a fresh stable-v2.1 materialization:

- stable regression validator: `42/42 PASS`;
- v2.3 ZIP-alignment structural validator: `54/54 PASS`;
- candidate behavior cases: `35/35 PASS`;
- TypeScript strict check for the candidate governance core: `PASS`;
- isolated semantic TypeScript check for the touched Brainlink app surface: `PASS`;
- all candidate final-file SHA-256 checks: `PASS`.

## Promotion state

`v2.3-zip-authority` remains `NOT_PROMOTED`.

This is intentional. Promotion still requires the dependency-registry-dependent gates that this execution host cannot complete: immutable dependency installation, full production build, targeted/full test execution with installed dependencies, browser E2E/negative paths, accessibility/security checks, backup/import compatibility under the installed app, and demonstrated release rollback. No documentation statement is allowed to turn these missing executions into a green status.
