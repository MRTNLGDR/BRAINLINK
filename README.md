# BRAINLINK

Brainlink is a governed, local-first knowledge and agent workspace built as a compatibility-preserving layer on top of **AFFiNE v0.27.0**.

## Source of truth

The primary Brainlink product/documentation authority is the user-supplied `Brainlink_Documentacao_Completa_v1.0.0.zip`:

- SHA-256: `4bce9d511680c70d7cfd51dbc4ef203172a46fa4d10388acd16209fa6b556c09`;
- 63 archive entries;
- 56/56 included files validated by the archive's own checksum set.

The ZIP is preserved as source evidence. Corrections are additive: missing referenced artifacts are repaired in versioned canonical/runtime layers with provenance instead of rewriting the source archive. The later Oráculo/COSMETA/Brainlink V5 document is **secondary context only** and cannot override the Brainlink ZIP or silently expand Brainlink into another product.

## AFFiNE foundation

The exact upstream base is pinned in `AFFINE_UPSTREAM.lock`:

- upstream: `toeverything/AFFiNE`;
- tag: `v0.27.0`;
- commit: `c61cc6a86f5f8364732296f0bb8393b37e0f70b3`.

Brainlink reuses AFFiNE documents, BlockSuite Canvas, workspace behavior and local-first semantics rather than rebuilding or replacing them.

## Stable runtime — v2.1

The normal production-oriented development baseline remains **v2.1** while the ZIP-authoritative candidate is under promotion testing.

```bat
BRAINLINK_SETUP.bat
BRAINLINK_DEV.bat
```

Stable v2.1 includes:

- 39 primary + 5 contextual Brainlink route intents;
- scoped Universalis/read receipts;
- worker read gates and error retry gate;
- fresh-evidence gate for task completion;
- connector write approval gate;
- strict v1→v2 local-state migration/import validation;
- explicit bug-solution verification;
- Project World, projects, roadmap/tasks, workers, evidence, audit, approvals, connections, archetypes, calendar, settings, superadmin and mobile companion surfaces;
- secret values excluded from persisted `BrainlinkState`;
- tamper-evident SHA-256 audit chain with monotonic sequence, `prevHash` and `eventHash`;
- rejection of altered sealed audit history and no silent audit truncation.

Stable evidence currently records **42/42 structural checks** and **15/15 governance/integrity behavior cases**.

## ZIP-authoritative candidate — v2.3

`v2.3-zip-authority` is the current candidate. It supersedes the earlier v2.2 candidate but **does not replace stable v2.1 yet**.

Windows candidate setup:

```bat
BRAINLINK_SETUP_ZIP_CANDIDATE.bat
BRAINLINK_DEV.bat
```

The candidate materializer is intentionally fail-closed:

1. audits the candidate transport before touching AFFiNE;
2. reconstructs verified stable v2.1;
3. rebuilds the compact v2.3 runtime archive from versioned Base64 fragments;
4. verifies its pinned SHA-256;
5. applies it over stable;
6. verifies every final candidate file against `BRAINLINK_ZIP_CANDIDATE_V23_RUNTIME.sha256`;
7. runs the stable regression validator and the v2.3 validator;
8. only with `-Install`, performs immutable dependency installation and `brainlink:check`.

The candidate runtime transport is deliberately separate from the documentation corpus:

- 18 ordered transport fragments;
- 60,911 decoded archive bytes;
- runtime overlay SHA-256: `72375fababaae6f48037d1a5b072ed18988a8bf6db566f95dcd0426433b5340f`;
- 30 final runtime files;
- manifest SHA-256: `79e73c0bb0c18708bdd5fbe3a8c7100e3966b37e4e85440d408df0896830ead0`.

### ZIP-aligned corrections in v2.3

The candidate reconciles the existing implementation with the ZIP instead of discarding working code:

- all **40 canonical `LAW-001..LAW-040` laws**; older conflicting local IDs are preserved as legacy history instead of being silently overwritten;
- all **11 rule-precedence scopes** from platform safety through incident/error;
- all **11 rule read-gates**, with receipts scoped to the specific gate;
- literal **PreTask100**: exactly 100 auditable checks in 10 categories, not 100 hidden LLM loops;
- immutable per-attempt Execution/Task Envelopes with correlation ID, rule-pack/hash, capabilities, budget, context references, criteria, verifiers, rollback, checkpoints and result/error history;
- bounded retry/stagnation controls and repeated-error anti-loop enforcement;
- expanded execution lifecycle;
- connector write approval bound to exact payload hash and expiry;
- evidence truth states so `DONE` is not automatically a `VERIFIED` claim;
- 16 KB structured micro-event payload limit and explicit execution budgets;
- repaired target OpenAPI, AsyncAPI, MCP, error-code, roadmap, checklist and schema artifacts referenced by the authoritative ZIP;
- external systems remain explicit boundaries instead of fake integrations.

Candidate evidence records **54/54 ZIP-alignment structural checks**, **35/35 behavior cases**, TypeScript strict core `PASS`, isolated app semantic check `PASS`, and stable **42/42 regression checks** in a clean simulation.

See `docs/evidence/ZIP_CANDIDATE_V23_TRANSPORT_VERIFICATION_2026-08-08.md` and `BRAINLINK_ZIP_AUTHORITY.lock`.

## Why v2.3 is still NOT_PROMOTED

The current execution environment cannot complete the package-registry-dependent release gate. Therefore Brainlink does not claim full production certification yet. Promotion still requires, in an environment with registry access:

- immutable dependency installation;
- full production build;
- installed Vitest/integration suites;
- browser E2E and negative-path tests;
- accessibility/security checks;
- backup/import compatibility in the installed app;
- demonstrated rollback from candidate to stable.

A newer document or a green structural validator cannot bypass these gates.

## Documentation and taxonomy

Documentation is separated from runtime so historical/cumulative material never overwrites AFFiNE technical workspaces or current implementation truth.

- `docs/corpus/v1.0.0/` — authoritative ZIP preservation/reconstruction material;
- `docs/corpus/v5/` — secondary V5 cross-product context;
- `docs/canon/` — taxonomy, conflict resolution and effective Brainlink canon;
- `docs/evidence/` — runtime/materialization/verification evidence.

Version axes are intentionally separate: documentation package version, target-product version, runtime release, state schema and AFFiNE upstream pin are not interchangeable.

## External boundaries — no fake completion

The ZIP specifies several real integrations whose runtimes/credentials/manuals are not present here. They remain explicit `BLOCKED_RUNTIME_INPUT`/adapter boundaries until inspected:

- Ultrabase production schema/migrations/RLS/Storage/Realtime;
- production MCP transports/servers;
- Secret Broker/OpenBao;
- provider credentials and remote notification services;
- user-machine C:/D: inventory/migration;
- external vendor builds and runtime license validation.

Brainlink may define contracts for these boundaries, but it does not display them as connected or healthy without a real transport and evidence.

## Verification commands

After dependencies are available in the materialized workspace:

```bash
yarn brainlink:validate
yarn brainlink:test
yarn brainlink:check
yarn brainlink:dev
yarn brainlink:build
```

The normal `BRAINLINK_SETUP.bat` always remains the recovery path to stable v2.1 until the candidate promotion gate is completed.
