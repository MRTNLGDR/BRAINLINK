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

The current stable runtime remains **v2.1**. Execution Envelopes remain **v2.2 candidate / NOT_PROMOTED**.

## Candidate setup defects corrected

1. The v2.2 candidate materializers referenced `apply-execution-v22.mjs` directly even though the generated-source migration requires the repository transport-safety shim. Windows and Unix candidate materializers now use `scripts/apply-execution-v22-safe.mjs`.
2. `execution.ts` and `execution.spec.ts` were initially stored under `.brainlink-runtime-overrides/`. Because the stable v2.1 materializer copies that directory recursively, a complete TypeScript build could have seen candidate-only files whose execution types are introduced only by v2.2. These files were moved to `.brainlink-v22-overrides/` and are injected only by the candidate materializers.
3. The stable SHA-256 runtime manifest was checked and contains no v2.2 execution source or test paths.
4. `AFFINE_UPSTREAM.lock` explicitly keeps `brainlink_runtime_release=v2.1` and `brainlink_candidate_status=NOT_PROMOTED`.

The normal `BRAINLINK_SETUP.bat` was not changed and continues to call the stable v2.1 materializer.

## Non-breakage guard

`node scripts/brainlink-nonbreakage-guard.mjs`

Observed result in the verification harness after source isolation:

```text
PASS  Stable runtime remains v2.1
PASS  v2.2 metadata remains NOT_PROMOTED
PASS  Stable setup still uses v2.1 materializer
PASS  v2.2 remains a separate candidate entrypoint
PASS  Windows v2.2 uses transport-safe migrator
PASS  Unix v2.2 uses transport-safe migrator
PASS  Stable overlay excludes v2.2 execution source/tests
PASS  Candidate overlay owns v2.2 execution source/tests
PASS  Stable runtime manifest excludes v2.2 execution files
PASS  V5 is explicitly context-only
PASS  V5 cannot auto-promote runtime
PASS  V5 cannot replace product boundaries
PASS  V5 source provenance is pinned

13/13 non-breakage checks passed.
```

## Promotion policy

The v2.2 candidate materializers run the repository non-breakage guard before candidate work. They then reconstruct the verified stable v2.1 base, inject only `.brainlink-v22-overrides/`, apply the candidate source migration, rerun the 42 v2.1 invariants and run the 12 v2.2 invariants.

This evidence does not claim that dependency installation, full AFFiNE production build, browser E2E, accessibility or security suites ran in this network-restricted environment. Those remain promotion gates, not fabricated success states.
