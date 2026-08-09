# V5 context non-breakage evidence — 2026-08-08

## Source reviewed

- file: `00_ORACULO_MASTER_ADMIN_COSMETA_BRAINLINK_CUMULATIVO_V5_SINGLE_FILE_2026-08-07 (2).md`
- SHA-256: `7fef02277ce23bd6cf937e8ba5dd12e2f90e756e073179341144f48306cb0d7b`
- bytes: `432930`
- lines: `14403`
- declared source status: `TARGET_SPEC_DOCUMENTED / RUNTIME_NOT_INSPECTED_ON_USER_PC`
- Brainlink classification: `CONTEXT_COMPLEMENT_ONLY`

## Decision

The V5 source does not automatically override implementation. Brainlink adopts only compatible governance/knowledge concepts. Oráculo, COSMETA, Ultrabase, AIIA Gateway and other external runtimes remain boundaries rather than being mocked or duplicated inside Brainlink.

The current stable runtime remains **v2.1**. Execution Envelopes remain **v2.2 candidate**.

## Candidate setup defect corrected

The v2.2 candidate materializers previously referenced `apply-execution-v22.mjs` directly even though the repository already contained the transport-safety shim required by that generated-source migration.

Both candidate materializers now use:

`scripts/apply-execution-v22-safe.mjs`

The normal `BRAINLINK_SETUP.bat` was not changed and continues to call the stable v2.1 materializer.

## Non-breakage guard

`node scripts/brainlink-nonbreakage-guard.mjs`

Observed result in the verification harness:

```text
PASS  Stable runtime remains v2.1
PASS  Stable setup still uses v2.1 materializer
PASS  v2.2 remains a separate candidate entrypoint
PASS  Windows v2.2 uses transport-safe migrator
PASS  Unix v2.2 uses transport-safe migrator
PASS  V5 is explicitly context-only
PASS  V5 cannot auto-promote runtime
PASS  V5 cannot replace product boundaries
PASS  V5 source provenance is pinned

9/9 non-breakage checks passed.
```

## Promotion policy

The v2.2 candidate materializers now run the repository non-breakage guard before candidate work. They then reconstruct the verified stable v2.1 base, apply the candidate migration, rerun the 42 v2.1 invariants and run the 12 v2.2 invariants.

This evidence does not claim that dependency installation, full AFFiNE production build, browser E2E, accessibility or security suites ran in this network-restricted environment. Those remain promotion gates, not fabricated success states.
