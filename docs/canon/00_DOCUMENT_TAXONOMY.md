# Brainlink documentation taxonomy and authority model — 2026-08-08

## Purpose

Brainlink keeps **all supplied documentation**, but preservation is not the same as execution authority. This taxonomy prevents an older package, a cross-product target spec, or a historical status statement from silently replacing the verified runtime.

## Document classes

| Class | Meaning | May directly change runtime? |
|---|---|---|
| `EFFECTIVE_CONTRACT` | Machine-readable contract, lock, schema or policy explicitly promoted for the current Brainlink runtime | Yes, through normal review/test gates |
| `VERIFIED_RUNTIME_EVIDENCE` | Executed checks, hashes, materialization/build/test evidence and current implementation facts | Describes current truth; does not itself grant new capabilities |
| `NORMATIVE_SOURCE` | Universal engineering rules, Universalis laws and approved governance sources | Only after compilation into effective contracts/policies |
| `BRAINLINK_TARGET_SPEC` | Desired Brainlink behavior not yet verified as runtime | No; candidate input only |
| `CROSS_PRODUCT_TARGET_SPEC` | Oráculo/COSMETA/AIIA/Ultrabase integrated architecture that contains Brainlink context | No; may only contribute compatible Brainlink contracts |
| `HISTORICAL_SNAPSHOT` | Older documentation package or cumulative snapshot preserved for lineage | No |
| `ADJACENT_SYSTEM_CONTEXT` | Oráculo, COSMETA, AIIA Gateway, Ultrabase, vendor/runtime designs | No; Brainlink links/governs rather than absorbs these runtimes |
| `REFERENCE_ASSET` | Visual/reference binary with provenance | No |
| `CORPUS_GAP` | A file/artifact referenced by a snapshot but absent from that snapshot | No; must not be invented |
| `DEPRECATED` | Superseded material retained for history | No |

## Two independent precedence axes

### A. Normative / design authority

1. Current machine-readable Brainlink contracts, locks and schemas.
2. Legrand Universal Engineering Bible / other explicitly normative source.
3. Effective Universalis / approved policies.
4. Accepted ADRs.
5. Latest explicit user intent that does not violate higher-order contracts/safety.
6. Integrated target specifications such as the V5 Oráculo/COSMETA/Brainlink document.
7. Historical/cumulative snapshots and explanatory/reference material.

Conflicts are preserved as `ConflictRecord`; they are not deleted or silently harmonized.

### B. Descriptive implementation-status truth

1. Latest verified runtime evidence and current repository state.
2. Current source code/lockfiles whose integrity is verified.
3. Current implementation reports.
4. Target specs.
5. Historical status statements.

This second axis is necessary because a 2026-08-04 document can truthfully say “runtime not inspected” at that time while later verified evidence can truthfully say the runtime now contains implemented routes/gates. The historical statement remains preserved but is not current status.

## Product responsibility taxonomy

| Product | Effective responsibility in this repository |
|---|---|
| **Brainlink** | knowledge, documents, Universalis, governance, tasks, worker/execution metadata, approvals, evidence, audit, bugs/solutions, knowledge-facing orchestration contracts |
| **AFFiNE / BlockSuite** | reusable workspace/document/canvas engine and upstream UI semantics |
| **Oráculo Master Admin** | adjacent execution/admin/worker-routing host; not reimplemented inside Brainlink |
| **COSMETA** | adjacent universal execution/node canvas; not reimplemented inside Brainlink |
| **Ultrabase** | external/shared data plane when the real runtime/manual is inspected; no second fake database |
| **AIIA Gateway** | external model/provider routing and secret boundary |

## Version taxonomy

Never compare these as if they were the same version number:

- `documentation_package_version` — e.g. `Brainlink_Documentacao_Completa_v1.0.0`;
- `cumulative_spec_edition` — e.g. `BRAINLINK-CUMULATIVE-V4`, integrated V5;
- `product_target_version` — target product semver described by a specification;
- `runtime_release` — currently promoted executable Brainlink runtime (`v2.1` at this record date);
- `runtime_candidate` — non-promoted candidate (`v2.2` at this record date);
- `state_schema_version` — persisted Brainlink state schema (`2` at this record date);
- `affine_upstream_pin` — AFFiNE `v0.27.0` commit `c61cc6a86f5f8364732296f0bb8393b37e0f70b3`;
- `document_version` — per-document version/front-matter.

## Corpus locations

- `docs/corpus/v1.0.0/` — exact preserved first Brainlink documentation package + readable text bundle.
- `docs/corpus/v5/` — exact supplied Oráculo/COSMETA/Brainlink V5 single-file context.
- `docs/canon/` — reconciliation layer; this is where effective taxonomy, conflicts and current truth are recorded.

Preserved corpus files are **immutable evidence inputs**. Corrections are made in `docs/canon/` or a new versioned corpus snapshot, never by rewriting the historical source.
