# BRAINLINK

Brainlink is a governed, local-first knowledge and agent workspace built as a compatibility-preserving layer on top of **AFFiNE v0.27.0**.

The repository pins the exact AFFiNE base in `AFFINE_UPSTREAM.lock`. Runtime delivery is deliberately reproducible and auditable:

1. `.brainlink-runtime/` — immutable verified Brainlink base overlay;
2. `.brainlink-runtime-overrides/` — readable final governance/runtime source overrides;
3. `.brainlink-patches/app-v2.linepart*.patch` — verified UTF-8-safe patch that upgrades the base Brainlink app to governance v2;
4. `.brainlink-patches/audit-v21.patch.b64` — transport-safe exact patch that upgrades the app to the v2.1 SHA-256 audit chain.

`BRAINLINK_RUNTIME_V2.sha256` verifies the **final materialized files**, not merely the transport artifacts. `BRAINLINK_SETUP.bat` materializes the full AFFiNE tree into `.brainlink-workspace/AFFiNE`, verifies the pinned upstream revision, base overlay, v2.1 manifest and every final runtime file before installing dependencies.

## Windows quick start — stable

```bat
BRAINLINK_SETUP.bat
BRAINLINK_DEV.bat
```

Requirements: Git, PowerShell/Corepack and Node.js `>=22.12.0 <23.0.0`.

After dependencies are available, the materialized workspace exposes:

```bash
yarn brainlink:validate
yarn brainlink:test
yarn brainlink:check
yarn brainlink:dev
yarn brainlink:build
```

## Runtime v2.1 — stable

The local Brainlink governance plane includes:

- 39 primary surfaces + 5 contextual surfaces = **44 route intents**;
- Universalis laws with version, scope target and lifecycle trigger (`ALWAYS`, `SESSION_START`, `TASK_START`, `TASK_END`, `ON_ERROR`);
- contextual worker read gates and `ON_ERROR` retry gates;
- task `DONE` gate requiring fresh evidence from the current execution epoch plus applicable task-end law receipts;
- Project World/Projects with progress derived from actual task completion;
- workers, roadmap, evidence, Bug Book, archetypes, calendar, settings, superadmin and mobile companion surfaces;
- connector metadata without fake live-connection claims;
- human approval before any connector can move from `READ_ONLY` to `READ_WRITE`;
- import protection that downgrades unapproved write capability and records the repair in audit;
- schema-v2 backup validation with v1 migration;
- explicit bug verification before `SOLVED`;
- secret values excluded from persisted `BrainlinkState`;
- a **tamper-evident SHA-256 audit chain** using monotonic sequence, `prevHash` and `eventHash`;
- verification of sealed audit history on import, one-time sealing of legacy unsealed history, and rejection of altered historical events;
- no silent audit truncation.

AFFiNE documents and BlockSuite Canvas are reused instead of reimplemented.

## Runtime v2.2 — candidate only

`BRAINLINK_SETUP_V22.bat` is a separate candidate path. It first materializes and verifies the stable v2.1 tree, then applies the transport-safe Execution Envelope migration and reruns the full v2.1 regression validator plus v2.2-specific invariants.

Execution Envelopes add immutable per-attempt history, frozen TaskEnvelope context, rule-pack/capability/budget snapshots, correlation IDs, lifecycle events and repeated-error anti-loop protection. **v2.2 is not promoted to stable** until its full promotion gate passes. The normal `BRAINLINK_SETUP.bat` remains v2.1.

## V5 context policy

The supplied **Oráculo Master Admin / COSMETA / Brainlink Cumulative V5** is registered as `CONTEXT_COMPLEMENT_ONLY`, not as an automatic runtime migration. Its provenance is pinned in `BRAINLINK_CONTEXT_V5.lock`.

Brainlink keeps its responsibility as the knowledge/governance plane. COSMETA remains an external execution/canvas boundary, Oráculo remains an external execution/admin boundary, and Ultrabase remains the external data-plane boundary when its real runtime/manual is available. V5 features are adopted only when they complement Brainlink without duplicating another product, replacing a source of truth, breaking AFFiNE compatibility or creating fake external integrations.

Run the repository-level guard to verify these invariants:

```bash
node scripts/brainlink-nonbreakage-guard.mjs
```

See `docs/47_V5_CONTEXT_ADOPTION_AND_NON_BREAKAGE_2026-08-08.md` for the adoption matrix.

## Verification in this execution

A clean base-overlay simulation applied the same source overrides and patch chain used by the stable setup scripts. Results:

- all **13/13 final-file SHA-256 checks: PASS**;
- structural validator: **42/42 PASS**;
- final `app.tsx` SHA-256: `5434d86452f0b1cabc6b3ee612c4ca3ac34223d5763db03649075829151fb6ad`;
- v2.1 final-file manifest SHA-256: `1d12289e42b613b9e3e284c61240c2ad9aea318700cf89b52afca25587218680`;
- TypeScript strict check for governance/integrity core: **PASS**;
- isolated semantic TypeScript check for `app.tsx`: **PASS**;
- compiled governance/integrity behavior cases: **15/15 PASS**;
- standard SHA-256 vectors for empty string and `abc`: **PASS**;
- policy, migration/import and audit-integrity Vitest suites are authored and registered as `brainlink:test`;
- V5 non-breakage guard: **9/9 PASS** against the promoted stable/candidate layout.

The v2.2 Execution Envelope development harness has separately passed **16/16 behavior cases** and **12/12 candidate invariants** in the development materialization, while keeping v2.1 as the release baseline.

A full AFFiNE dependency build/browser E2E/accessibility/security suite is not claimed here because this execution host cannot resolve the Yarn/package endpoints; Node `v22.16.0` itself is inside the supported AFFiNE range.

## Documentation truth

The supplied cumulative V4 material was source-audited and inventoried. Runtime-critical canon is versioned directly in this repository, including the runtime, governance-hardening and audit-integrity reports. The V5 single-file source is treated as additional architectural context and is not silently converted into runtime features.

Historical/reference material remains separated from AFFiNE's technical `docs/reference` workspace so Brainlink does not overwrite upstream workspaces or pretend external Ultrabase/MCP/provider integrations exist. Quarantined pre-existing experimental patches are preserved as history and are not silently applied to the stable runtime.

## Provenance

- Upstream: `toeverything/AFFiNE`
- Tag: `v0.27.0`
- Commit: `c61cc6a86f5f8364732296f0bb8393b37e0f70b3`
- Uploaded `AFFINE.zip` SHA-256: `f65b6967dbf2992a4d39f51ddc48fdac04828a47d01599a53ca48cbd0e3b3f47`
- Brainlink base overlay SHA-256: `1b4e3aa98dd378eb7299e071aa83329643114e40b3e66a378c319613a2a94b8d`
- Brainlink v2.1 final-file manifest SHA-256: `1d12289e42b613b9e3e284c61240c2ad9aea318700cf89b52afca25587218680`
- V5 context SHA-256: `7fef02277ce23bd6cf937e8ba5dd12e2f90e756e073179341144f48306cb0d7b`

See `docs/43_RUNTIME_IMPLEMENTATION_REPORT_2026-08-08.md`, `docs/44_GOVERNANCE_HARDENING_2026-08-08.md`, `docs/45_AUDIT_INTEGRITY_2026-08-08.md`, `docs/46_EXECUTION_ENVELOPES_2026-08-08.md`, `docs/47_V5_CONTEXT_ADOPTION_AND_NON_BREAKAGE_2026-08-08.md`, and `docs/evidence/AUDIT_INTEGRITY_V21_2026-08-08.md`.
