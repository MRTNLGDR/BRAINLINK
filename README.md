# BRAINLINK

Brainlink is a governed, local-first knowledge and agent workspace built as a compatibility layer on top of **AFFiNE v0.27.0**.

The repository pins the exact AFFiNE base in `AFFINE_UPSTREAM.lock` and stores the complete verified Brainlink overlay in `.brainlink-runtime/`. `BRAINLINK_SETUP.bat` materializes the full AFFiNE tree into `.brainlink-workspace/AFFiNE`, verifies the exact upstream commit and overlay checksum, applies Brainlink, then installs with the immutable Yarn lockfile.

## Windows quick start

```bat
BRAINLINK_SETUP.bat
BRAINLINK_DEV.bat
```

Requirements: Git, PowerShell/Corepack and Node.js `>=22.12.0 <23.0.0`.

After dependencies are installed, the materialized workspace exposes:

```bash
yarn brainlink:validate
yarn brainlink:test
yarn brainlink:check
yarn brainlink:dev
yarn brainlink:build
```

## Runtime v2

The local Brainlink governance plane now includes:

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

- Structural validator: **35/35 PASS** after extracting the packaged v2 overlay.
- TypeScript strict check for governance core: **PASS**.
- Isolated strict semantic check for `app.tsx`: **PASS**.
- Compiled governance behavior cases: **10/10 PASS**.
- Vitest policy + migration/import suites: authored and registered as `brainlink:test`.

A full AFFiNE dependency build/browser E2E/accessibility/security suite is not claimed here because this execution host cannot resolve the Yarn/package endpoints; Node `v22.16.0` itself is within the supported AFFiNE range.

## Cumulative specification

The complete Brainlink V4 documentation set from the supplied package is preserved inside the verified overlay under `brainlink-spec/` so it does **not** overwrite AFFiNE's technical `docs/reference` workspace. The master specification is also surfaced at `docs/BRAINLINK_CUMULATIVO_V4_COMPLETE.md` in this repository.

Quarantined pre-existing experimental patches are preserved as history and are not silently applied to the runtime.

## Provenance

- Upstream: `toeverything/AFFiNE`
- Tag: `v0.27.0`
- Commit: `c61cc6a86f5f8364732296f0bb8393b37e0f70b3`
- Uploaded `AFFINE.zip` SHA-256: `f65b6967dbf2992a4d39f51ddc48fdac04828a47d01599a53ca48cbd0e3b3f47`
- Brainlink runtime v2 bundle SHA-256: `bc0136b92af9805c73321bd6292aba9816f18f0458673e1716df9719d743122a`

See `docs/43_RUNTIME_IMPLEMENTATION_REPORT_2026-08-08.md`, `docs/44_GOVERNANCE_HARDENING_2026-08-08.md`, and `docs/evidence/LOCAL_MATERIALIZATION_TEST_2026-08-08.md`.
