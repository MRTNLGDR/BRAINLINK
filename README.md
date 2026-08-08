# BRAINLINK

Brainlink is a governed, local-first knowledge and agent workspace built as a compatibility layer on top of **AFFiNE v0.27.0**.

The repository keeps the Brainlink-owned governance core readable under `brainlink-source/`, stores the complete verified runtime overlay in `.brainlink-runtime/`, and pins the upstream base in `AFFINE_UPSTREAM.lock`. `BRAINLINK_SETUP.bat` materializes the full AFFiNE tree into `.brainlink-workspace/AFFiNE`, verifies the exact upstream commit and overlay checksum, applies Brainlink, then installs with the immutable Yarn lockfile.

## Windows quick start

```bat
BRAINLINK_SETUP.bat
BRAINLINK_DEV.bat
```

Requirements: Git, PowerShell/Corepack and Node.js `>=22.12.0 <23.0.0`.

## Implemented Brainlink runtime

The mounted runtime includes Universalis law/version/read-receipt governance, evidence-gated task completion, worker lifecycle/read gates/checkpoints, governance and audit ledgers, Project World, AFFiNE documents/canvas reuse, global search, Bug Book, archetypes, connection metadata, approvals, calendar, backup/import/export, superadmin surfaces, mobile companion surfaces and contextual project/task/worker/document views.

External LLM/MCP/Ultrabase operations are adapter boundaries, not mocked success paths. Secret values are not part of the persisted Brainlink state model.

## Provenance

- Upstream: `toeverything/AFFiNE`
- Tag: `v0.27.0`
- Commit: `c61cc6a86f5f8364732296f0bb8393b37e0f70b3`
- Uploaded `AFFINE.zip` SHA-256: `f65b6967dbf2992a4d39f51ddc48fdac04828a47d01599a53ca48cbd0e3b3f47`
- Brainlink runtime bundle SHA-256: `1b4e3aa98dd378eb7299e071aa83329643114e40b3e66a378c319613a2a94b8d`

The source audit summary is in `docs/evidence/SOURCE_SCAN_SUMMARY_2026-08-08.json`. The full per-entry inventory was generated during the source audit; the repository keeps the compact evidence summary instead of vendoring a multi-megabyte machine inventory.

See `docs/43_RUNTIME_IMPLEMENTATION_REPORT_2026-08-08.md` for the implemented/verified/blocked distinction.
