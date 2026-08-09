# Brainlink documentation taxonomy and authority model — 2026-08-08

## Purpose

Brainlink preserves every supplied source, but this repository now has a clear authority rule: **the uploaded `Brainlink_Documentacao_Completa_v1.0.0.zip` is the authoritative Brainlink product/documentation baseline**. It is not rewritten in place; corrections are applied as versioned canonical repairs derived from that ZIP.

Verified runtime evidence remains authoritative for one different question: **what is actually implemented and proved right now**. A historical statement such as `NOT_INSPECTED` cannot erase later executed evidence, while later code cannot silently rewrite the product intent established by the ZIP.

The Oráculo/COSMETA/Brainlink V5 single-file document is retained as secondary cross-product context. It may complement the ZIP only where it does not contradict the ZIP, the latest explicit user intent, or verified non-breakage evidence.

## Document classes

| Class | Meaning | May directly change runtime? |
|---|---|---|
| `ZIP_AUTHORITY_SOURCE` | Exact file/content from the authoritative Brainlink ZIP | Defines product intent and required contracts; implementation still passes gates |
| `REPAIRED_CANON` | New artifact reconstructed from requirements explicitly present/referenced inside the ZIP, with provenance and tests | Yes, after validation; never claims it was physically present in the old ZIP |
| `EFFECTIVE_CONTRACT` | Machine-readable contract/schema/policy promoted for the current runtime | Yes, through review/test/migration gates |
| `VERIFIED_RUNTIME_EVIDENCE` | Executed checks, hashes, materialization/build/test evidence and current implementation facts | Describes implementation truth; does not override product intent silently |
| `NORMATIVE_SOURCE` | Engineering Bible, executable constitution and Universalis material inside the ZIP | Compiled into effective contracts/policies |
| `BRAINLINK_TARGET_SPEC` | Required Brainlink behavior documented by the ZIP but not yet verified | Candidate implementation input |
| `SECONDARY_CONTEXT` | V5 Oráculo/COSMETA/AIIA/Ultrabase integrated context | No automatic runtime authority |
| `ADJACENT_SYSTEM_CONTEXT` | Oráculo, COSMETA, AIIA Gateway, Ultrabase and vendor/runtime designs | No; Brainlink links/governs rather than absorbs these runtimes |
| `REFERENCE_ASSET` | Visual/reference binary with provenance | No |
| `CORPUS_GAP` | Path referenced by the ZIP but absent from the ZIP | Repaired only as `REPAIRED_CANON`, never backdated into the original package |
| `DEPRECATED` | Superseded material retained for history | No |

## Authority axis A — product intent / normative design

1. Explicit current user instruction.
2. Authoritative ZIP machine-readable contracts (`brainlink.spec.yaml`, `spec/*`, `manifests/*`) and exact preserved normative sources inside that ZIP.
3. Repaired canonical artifacts derived from explicit ZIP requirements, when they do not contradict item 2.
4. Effective Universalis / approved policies generated from the ZIP baseline.
5. Accepted ADRs that do not weaken higher authority without an explicitly allowed exception.
6. Approved research evidence.
7. Secondary V5 context only where compatible.
8. Other historical/explanatory/reference material.

Conflicts are preserved as `ConflictRecord`. They are never silently harmonized.

## Authority axis B — implementation-status truth

1. Latest executed and hash-linked runtime evidence.
2. Current source/lockfiles whose integrity is verified.
3. Current implementation reports.
4. ZIP target/spec requirements not yet implemented.
5. Historical status statements.

This means the ZIP decides **what Brainlink is supposed to be**, while verified evidence decides **how much of it is currently implemented**.

## Product boundaries from the ZIP

| Product/system | Effective responsibility |
|---|---|
| **Brainlink** | knowledge, documents, Universalis/rule compiler, governance, tasks, workers/executions, approvals, evidence/audit, bugs/solutions, prompt archetypes, search/projections, project world and orchestration contracts |
| **AFFiNE / BlockSuite** | reusable workspace/document/canvas engine and upstream UI semantics; extend before rewrite |
| **Legrand Oráculo** | adjacent execution/engineering worker plane governed by Brainlink |
| **Ultrabase** | authoritative shared/local data plane when its real runtime/manual is inspected |
| **AIIA Suite / other products** | consumers of shared contracts; not merged into Brainlink |
| **V5 COSMETA/Oráculo additions** | secondary context unless a Brainlink-owned requirement also exists in the ZIP |

## Version taxonomy

These are separate axes and MUST NOT be conflated:

- `documentation_package_version`: authoritative ZIP package `1.0.0`;
- `product_target_version`: `1.0.0` in the ZIP product spec;
- `runtime_release`: currently promoted executable Brainlink runtime (`v2.1` at this record date);
- `runtime_candidate`: candidate implementation line (`v2.2+` while under promotion gates);
- `state_schema_version`: persisted local runtime schema;
- `affine_upstream_pin`: exact AFFiNE tag/commit;
- `document_version`: per-document/front-matter version;
- `repair_revision`: version of canonical repairs added after the ZIP was authored.

## Corpus locations

- `docs/corpus/v1.0.0/` — exact authoritative ZIP source and readable extraction/bundle.
- `docs/corpus/v5/` — secondary cross-product context.
- `docs/canon/` — conflict resolution, repaired canon, current truth and traceability.
- `contracts/`, `roadmap/`, `schemas/`, `database/`, `evidence/` — repaired/current machine-readable artifacts when generated from ZIP requirements and validated.

The original ZIP corpus is immutable. Corrections happen in a newer canonical layer with explicit provenance, not by pretending the old archive contained files it did not contain.
