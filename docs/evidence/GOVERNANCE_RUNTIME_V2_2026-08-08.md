# Governance runtime v2 verification — 2026-08-08

## Assembly exercised

The verification workspace was created from the verified Brainlink v1/base overlay, then materialized using the same v2 delivery model published in this repository:

1. apply readable files corresponding to `.brainlink-runtime-overrides/`;
2. concatenate `app-v2.linepart00.patch` through `app-v2.linepart03.patch` in lexical order;
3. apply the resulting patch to `packages/frontend/core/src/brainlink/app.tsx`;
4. validate the final files against `BRAINLINK_RUNTIME_V2.sha256`;
5. execute `node scripts/brainlink-validate.mjs`.

The four safe patch fragment Git blobs were individually checked against their tested local Git blobs before the materializer was switched to them.

## Final-file integrity

```text
package.json: OK
packages/frontend/core/src/brainlink/types.ts: OK
packages/frontend/core/src/brainlink/store.ts: OK
packages/frontend/core/src/brainlink/policy.ts: OK
packages/frontend/core/src/brainlink/app.tsx: OK
packages/frontend/core/src/brainlink/__tests__/policy.spec.ts: OK
packages/frontend/core/src/brainlink/__tests__/store.spec.ts: OK
scripts/brainlink-validate.mjs: OK
docs/43_RUNTIME_IMPLEMENTATION_REPORT_2026-08-08.md: OK
docs/44_GOVERNANCE_HARDENING_2026-08-08.md: OK
```

Final app SHA-256:

```text
7b3aa4602e4331ae84e68636b3766768cd4f0422d19481b0664759cf66e8d513
```

Final manifest SHA-256:

```text
d44d5eac2e35d7c2bbf483679bf06d11d064210c3bf816ede03ed520b891e7af
```

## Structural validator

```text
PASS  Brainlink app exists
PASS  Desktop route registered
PASS  Desktop mobile-companion route registered
PASS  Mobile route registered
PASS  Mobile companion route registered
PASS  39 cataloged primary surfaces — found 39
PASS  5 contextual surfaces — found 5
PASS  44 total route intents — found 44
PASS  Universalis runtime implemented
PASS  Scoped law targets modeled
PASS  Law lifecycle triggers modeled
PASS  Contextual worker law resolver implemented
PASS  Task-end law resolver implemented
PASS  Error retry gate implemented
PASS  Evidence gate implemented
PASS  Stale evidence rejected
PASS  Policy unit tests exist
PASS  Store migration unit tests exist
PASS  Cross-tab local sync implemented
PASS  Worker read gate implemented
PASS  Connector write approval gate implemented
PASS  No fake live connector status
PASS  Imported write bypass is downgraded
PASS  Bug solve requires explicit verification
PASS  Project progress derived from tasks
PASS  Audit ledger implemented
PASS  Backup export implemented
PASS  Backup import uses strict parser
PASS  State schema v2 implemented
PASS  Legacy v1 migration implemented
PASS  No secret value field in state model
PASS  AFFiNE technical workspace identity preserved
PASS  Brainlink scripts registered
PASS  Brainlink targeted test/check scripts registered
PASS  Runtime governance canon preserved

35/35 checks passed.
```

## Semantic and behavior checks already executed in this increment

- strict TypeScript: `types.ts`, `store.ts`, `policy.ts` — PASS;
- isolated strict TypeScript semantic check: `app.tsx` with only React/Router externals stubbed — PASS;
- compiled governance behavior assertions — 10/10 PASS;
- authored Vitest suites — policy plus store migration/import safety.

## Dependency-backed verification status

The execution host has Node `v22.16.0`, which satisfies AFFiNE 0.27.0's Node range. Full Yarn dependency installation/build, browser E2E, accessibility and full monorepo suites remain unavailable in this host because package/Yarn endpoints cannot be resolved and there is no complete dependency cache. Those suites are not represented as executed.
