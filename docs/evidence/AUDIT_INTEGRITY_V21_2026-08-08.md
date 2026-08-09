# Brainlink audit-integrity v2.1 verification — 2026-08-08

## Assembly verified

The Brainlink v2.1 runtime was assembled from the exact pinned AFFiNE base using the same sequence encoded in the setup scripts:

1. reset to AFFiNE `v0.27.0` commit `c61cc6a86f5f8364732296f0bb8393b37e0f70b3`;
2. apply the immutable Brainlink base overlay (`1b4e3aa98dd378eb7299e071aa83329643114e40b3e66a378c319613a2a94b8d`);
3. copy the readable runtime overrides;
4. concatenate/apply the four verified governance-v2 app patch parts;
5. decode the exact Base64 audit-v2.1 patch and apply it;
6. verify the final materialized files against `BRAINLINK_RUNTIME_V2.sha256`;
7. execute the Brainlink structural validator and isolated semantic/behavior checks.

## Final-file integrity

```text
package.json: OK
packages/frontend/core/src/brainlink/types.ts: OK
packages/frontend/core/src/brainlink/integrity.ts: OK
packages/frontend/core/src/brainlink/store.ts: OK
packages/frontend/core/src/brainlink/policy.ts: OK
packages/frontend/core/src/brainlink/app.tsx: OK
packages/frontend/core/src/brainlink/__tests__/policy.spec.ts: OK
packages/frontend/core/src/brainlink/__tests__/store.spec.ts: OK
packages/frontend/core/src/brainlink/__tests__/integrity.spec.ts: OK
scripts/brainlink-validate.mjs: OK
docs/43_RUNTIME_IMPLEMENTATION_REPORT_2026-08-08.md: OK
docs/44_GOVERNANCE_HARDENING_2026-08-08.md: OK
docs/45_AUDIT_INTEGRITY_2026-08-08.md: OK

13/13 final-file SHA-256 checks passed.
```

Final `app.tsx` SHA-256:

```text
5434d86452f0b1cabc6b3ee612c4ca3ac34223d5763db03649075829151fb6ad
```

Final manifest SHA-256:

```text
1d12289e42b613b9e3e284c61240c2ad9aea318700cf89b52afca25587218680
```

## Structural validator

The final materialized runtime passed **42/42 structural invariants**. The additional v2.1 invariants verify that:

- the integrity module is present;
- audit chain fields are modeled;
- SHA-256 audit hashing is implemented;
- app/store mutations use chained append;
- imported sealed audit history is verified;
- tamper-detection tests exist;
- audit history is not silently truncated;
- the Audit UI surfaces `CHAIN VALID`/`CHAIN INVALID`.

## Behavior execution

The compiled governance/integrity harness passed **15/15 cases**, including:

- SHA-256 standard vectors for empty string and `abc`;
- valid default audit chain;
- valid append after an existing chain;
- rejection after historical audit mutation;
- one-time sealing of legacy history;
- v1 state migration;
- contextual project/worker law resolution;
- worker read and `ON_ERROR` gates;
- stale-evidence rejection and fresh-evidence completion;
- unapproved imported `READ_WRITE` downgrade;
- valid chain after automatic import repair.

Strict TypeScript checks for the governance/integrity core passed. An isolated semantic check of the app also passed with React/Router treated as external declarations.

## Remaining environment limitation

Node `v22.16.0` is available and satisfies AFFiNE 0.27.0. Full Yarn install/build, browser E2E, accessibility and complete monorepo suites remain unavailable in this execution host because its DNS/package access cannot resolve the Yarn/package endpoints and no complete dependency cache is present. Those suites are intentionally not represented as executed.
