# BRAINLINK

Brainlink is a governed, local-first knowledge and agent workspace built as a compatibility-preserving layer on top of **AFFiNE v0.27.0**.

The repository pins the exact AFFiNE base in `AFFINE_UPSTREAM.lock`. Runtime delivery is split deliberately into three auditable layers:

1. `.brainlink-runtime/` — immutable verified Brainlink base overlay;
2. `.brainlink-runtime-overrides/` — readable governance/runtime v2 source files;
3. `.brainlink-patches/app-v2.linepart*.patch` — deterministic UTF-8-safe patch for the large Brainlink app surface.

`BRAINLINK_RUNTIME_V2.sha256` verifies the final materialized files after all three layers are applied. `BRAINLINK_SETUP.bat` materializes the full AFFiNE tree into `.brainlink-workspace/AFFiNE`, verifies the pinned upstream revision, base overlay, v2 manifest and every final v2 file before installing dependencies.

## Windows quick start

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

## Runtime v2

The local Brainlink governance plane includes:

- 39 primary surfaces + 5 contextual surfaces = **44 route intents**;
- Universalis laws with version, scope target and lifecycle trigger (`ALWAYS`, `SESSION_START`, `TASK_START`, `TASK_END`, `ON_ERROR`);
- contextual worker read gates and `ON_ERROR` retry gates;
- task `DONE` gate requiring fresh evidence from the current execution epoch plus applicable task-end law receipts;
- Project World/Projects with progress derived from actual task completion;
- workers, roadmap, evidence/audit, Bug Book, archetypes, calendar, settings, superadmin and mobile companion surfaces;
- connector metadata without fake live-connection claims;
- human approval before any connector can move from `READ_ONLY` to `READ_WRITE`;
- import protection that downgrades unapproved write capability and records the repair in audit;
- schema v2 backup validation with v1 migration;
- explicit bug verification before `SOLVED`;
- secret values excluded from persisted `BrainlinkState`.

AFFiNE documents and BlockSuite Canvas are reused instead of reimplemented.

## Verification in this execution

A clean base-overlay simulation applied the same readable overrides and the same four published patch fragments used by the setup scripts. Results:

- all **10/10 final-file SHA-256 checks: PASS**;
- Structural validator: **35/35 PASS**;
- final `app.tsx` SHA-256: `7b3aa4602e4331ae84e68636b3766768cd4f0422d19481b0664759cf66e8d513`;
- TypeScript strict check for governance core: **PASS**;
- isolated strict semantic check for `app.tsx`: **PASS**;
- compiled governance behavior cases: **10/10 PASS**;
- Vitest policy + migration/import suites are authored and registered as `brainlink:test`.

A full AFFiNE dependency build/browser E2E/accessibility/security suite is not claimed here because this execution host cannot resolve the Yarn/package endpoints; Node `v22.16.0` itself is inside the supported AFFiNE range.

## Documentation truth

The supplied cumulative V4 material was source-audited and inventoried. Runtime-critical canon is versioned directly in this repository, including the runtime implementation and governance-hardening reports. Historical/reference material is kept separate from AFFiNE's technical `docs/reference` workspace so Brainlink does not overwrite upstream workspaces or pretend external Ultrabase/MCP/provider integrations exist.

Quarantined pre-existing experimental patches are preserved as history and are not silently applied to the runtime.

## Provenance

- Upstream: `toeverything/AFFiNE`
- Tag: `v0.27.0`
- Commit: `c61cc6a86f5f8364732296f0bb8393b37e0f70b3`
- Uploaded `AFFINE.zip` SHA-256: `f65b6967dbf2992a4d39f51ddc48fdac04828a47d01599a53ca48cbd0e3b3f47`
- Brainlink base overlay SHA-256: `1b4e3aa98dd378eb7299e071aa83329643114e40b3e66a378c319613a2a94b8d`
- Brainlink v2 final-file manifest SHA-256: `d44d5eac2e35d7c2bbf483679bf06d11d064210c3bf816ede03ed520b891e7af`

See `docs/43_RUNTIME_IMPLEMENTATION_REPORT_2026-08-08.md`, `docs/44_GOVERNANCE_HARDENING_2026-08-08.md`, and `docs/evidence/GOVERNANCE_RUNTIME_V2_2026-08-08.md`.
