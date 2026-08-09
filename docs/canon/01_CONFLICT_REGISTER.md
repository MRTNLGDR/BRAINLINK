# Brainlink conflict register — documentation reconciliation 2026-08-08

Every conflict below preserves both source claims and records an effective resolution without editing either source snapshot.

| ID | Topic | Source A | Source B / current evidence | Resolution | State |
|---|---|---|---|---|---|
| `DOC-CONFLICT-001` | Runtime inspected/implemented | V1/V4 historical docs: AFFiNE fork/runtime not inspected or built | Current repository evidence: AFFiNE `v0.27.0` pinned; Brainlink stable runtime `v2.1`; candidate `v2.2`; structural/governance checks recorded | Historical statements remain true **for their snapshot date**. Current status comes from latest verified runtime evidence. | `RESOLVED_BY_TIME_AXIS` |
| `DOC-CONFLICT-002` | Screen implementation | V4 screen catalog says 44 screens are target-only/not implemented | Current runtime reports 39 primary + 5 contextual route intents implemented structurally | Keep V4 catalog as historical target; current implementation evidence supersedes only the old implementation-status column. Visual/E2E completeness is still separately gated. | `PARTIALLY_SUPERSEDED` |
| `DOC-CONFLICT-003` | Brainlink installation path | V1/V4 target: `D:\AIIA\01-apps-canonicos\26-Brainlink` | V5 Oráculo host target contains `03-brainlink` under `00-ORACULO MASTER ADMIN`; current repo materializes locally under `.brainlink-workspace/AFFiNE` | Paths are **deployment aliases**, not product identity. Repository identity stays `MRTNLGDR/BRAINLINK`; stable setup path is unchanged. Oráculo-hosted path is an optional future integration target. | `RESOLVED_AS_PATH_ALIASES` |
| `DOC-CONFLICT-004` | Product ownership | Some integrated V5 sections describe Oráculo as the global host | Brainlink product canon says Brainlink is the knowledge/governance plane | No conflict after boundary normalization: Oráculo coordinates execution/admin; Brainlink remains governance/knowledge. Do not merge runtimes. | `RESOLVED_BY_BOUNDED_CONTEXT` |
| `DOC-CONFLICT-005` | Ultrabase | V1/V4/V5 choose Ultrabase as data plane | Real Ultrabase repo/manual/runtime still not inspected in this Brainlink execution | Keep as `EXTERNAL_BOUNDARY / BLOCKED_RUNTIME_INPUT`; do not fabricate migrations/RLS/health. | `OPEN_EXTERNAL_INPUT` |
| `DOC-CONFLICT-006` | Documentation package vs runtime version | V1 package is `1.0.0`; V4 cumulative is `4.0.0-cumulative`; V5 is integrated target; runtime is `v2.1` | Numbers refer to different version axes | Version axes are separated by taxonomy; no numeric comparison is permitted across axes. | `RESOLVED_BY_VERSION_TAXONOMY` |
| `DOC-CONFLICT-007` | V1 package completeness claims | V1 index references `docs/02_AUTHORITY_AND_TERMS.md`, roadmap/contracts/database/schemas/evidence artifacts | Uploaded v1 ZIP does not contain those referenced paths | Preserve ZIP unchanged; mark missing referenced artifacts as `CORPUS_GAP`. Do not invent them. V4/V5 may be cited as later sources if they contain equivalent content, but they are not retroactively inserted into V1. | `RECORDED_GAP` |
| `DOC-CONFLICT-008` | V5 adoption | V5 contains many Oráculo/COSMETA/model/vendor target capabilities | User explicitly requires V5/docs to complement, not break existing Brainlink | V5 is `CROSS_PRODUCT_TARGET_SPEC / CONTEXT_COMPLEMENT_ONLY`; only additive Brainlink-owned capabilities may become candidates after non-breakage gates. | `RESOLVED_BY_LATEST_USER_INTENT` |
| `DOC-CONFLICT-009` | Execution Envelope | V1/V4 describe TaskEnvelope/anti-loop as target spec | Candidate v2.2 implements Execution Envelope semantics, but is not promoted | Candidate remains candidate until stable regression + build/test/promotion gate; documentation cannot auto-promote it. | `CANDIDATE` |
| `DOC-CONFLICT-010` | AFFiNE strategy | Historical docs initially lacked an inspected pin | Current stable repo pins AFFiNE `v0.27.0` / `c61cc6…` | Current exact pin is effective implementation fact; historical “pin not captured” remains snapshot history. | `RESOLVED_BY_VERIFIED_EVIDENCE` |

## Corpus gaps found in uploaded V1 ZIP

The uploaded ZIP is internally intact: its own `SHA256SUMS.txt` validates **56/56 included files**. Integrity does not imply that every path mentioned by prose exists in the archive.

Notable referenced-but-absent paths include:

- `docs/02_AUTHORITY_AND_TERMS.md`;
- `roadmap/tasks.master.yaml`;
- `contracts/openapi.yaml`;
- `contracts/events.asyncapi.yaml`;
- `contracts/brainlink-mcp-manifest.json`;
- `database/migrations/`;
- the referenced `schemas/` / `evidence/` artifact sets described by the index.

These are recorded as gaps of that snapshot, not silently synthesized.
