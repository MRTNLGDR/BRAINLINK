# Brainlink conflict register — ZIP-authoritative reconciliation 2026-08-08

Every conflict preserves the original source and records a resolution without editing the authoritative ZIP bytes.

| ID | Topic | Source A | Source B / current evidence | Resolution | State |
|---|---|---|---|---|---|
| `DOC-CONFLICT-001` | Runtime inspected/implemented | ZIP historical status says fork/runtime were not inspected/built when authored | Current repository evidence has AFFiNE pin + Brainlink runtime checks | ZIP status remains a historical snapshot; current implementation status comes from later verified evidence. Product requirements still come from ZIP. | `RESOLVED_BY_TIME_AXIS` |
| `DOC-CONFLICT-002` | Authority of V1 ZIP | Previous reconciliation classified V1 partly as historical | Latest user instruction: “o que vale é o que está no ZIP” | ZIP is promoted to `ZIP_AUTHORITY_SOURCE` for Brainlink intent/contracts. | `RESOLVED_BY_USER_AUTHORITY` |
| `DOC-CONFLICT-003` | V5 role | V5 contains cross-product Oráculo/COSMETA/Brainlink architecture | User states ZIP is authoritative | V5 becomes `SECONDARY_CONTEXT`; it can complement only when compatible with ZIP and non-breakage. | `RESOLVED_BY_USER_AUTHORITY` |
| `DOC-CONFLICT-004` | Missing files referenced by ZIP | ZIP index/docs reference `docs/02`, roadmap, contracts, schemas, DB/evidence artifacts | Those paths are absent from the ZIP archive | Keep original ZIP unchanged and create `REPAIRED_CANON` artifacts derived from requirements already stated in the ZIP. Every repair must say it was reconstructed after package creation. | `REPAIR_REQUIRED` |
| `DOC-CONFLICT-005` | AFFiNE pin | ZIP says exact pin must be captured during bootstrap | Current verified repository pins AFFiNE `v0.27.0` / `c61cc6a86f5f8364732296f0bb8393b37e0f70b3` | Current pin satisfies the ZIP requirement; do not undo it. | `RESOLVED_BY_VERIFIED_EVIDENCE` |
| `DOC-CONFLICT-006` | Screen state | ZIP target docs describe screens as product requirements, not implemented runtime | Current runtime structurally implements 44 route intents | Keep ZIP as target authority; current evidence advances implementation status. Visual/E2E quality remains separately gated. | `PARTIALLY_IMPLEMENTED` |
| `DOC-CONFLICT-007` | Rule scopes/read gates | ZIP specifies 11 precedence scopes and 11 read gates | Current runtime/candidate initially implements a reduced subset | Extend policy/runtime compatibly; do not weaken existing gates. | `IMPLEMENTATION_GAP` |
| `DOC-CONFLICT-008` | Worker lifecycle/TaskEnvelope | ZIP requires full execution lifecycle, immutable envelope, budgets and anti-loop | Candidate v2.2 implements much but not all ZIP rule/read-gate semantics | Treat v2.2 work as basis, then close remaining ZIP deltas before promotion. | `IMPLEMENTATION_GAP` |
| `DOC-CONFLICT-009` | Ultrabase | ZIP selects Ultrabase but requires real manual/inventory before migration | Real runtime/manual not available here | Keep `BLOCKED_RUNTIME_INPUT`; build contracts/schema targets only, never fake connected health or migration. | `OPEN_EXTERNAL_INPUT` |
| `DOC-CONFLICT-010` | MCP/secrets/search | ZIP defines capabilities and contracts, but real services are not present | Current runtime keeps adapters/metadata only | Implement interfaces/contracts/status truth; external health remains `UNKNOWN/BLOCKED` until real services exist. | `OPEN_EXTERNAL_INPUT` |
| `DOC-CONFLICT-011` | Package version vs runtime version | ZIP is documentation/product spec `1.0.0`; runtime is `v2.1/v2.2` | Different version axes | Never compare or use one number to supersede the other. | `RESOLVED_BY_VERSION_TAXONOMY` |
| `DOC-CONFLICT-012` | “Perfect/100%” | Product goal asks for complete, reliable software | ZIP explicitly forbids fake completion and requires evidence | Definition is: no known blocking defect for the claimed release scope; all applicable gates/evidence pass; external blockers remain visible. | `RESOLVED_BY_EVIDENCE_GATE` |

## Verified integrity of the authoritative ZIP

- archive SHA-256: `4bce9d511680c70d7cfd51dbc4ef203172a46fa4d10388acd16209fa6b556c09`;
- 63 ZIP entries;
- 56 entries listed by `SHA256SUMS.txt`;
- **56/56 listed files match their SHA-256**.

The package is byte-integral even though some referenced files were not included.

## Missing referenced artifacts that require canonical repair

The ZIP itself references, among others:

- `docs/02_AUTHORITY_AND_TERMS.md`;
- `roadmap/tasks.master.yaml`;
- `roadmap/gaps-alerts.yaml`;
- `contracts/openapi.yaml`;
- `contracts/events.asyncapi.yaml`;
- `contracts/error-codes.yaml`;
- `contracts/brainlink-mcp-manifest.json`;
- `database/migrations/`;
- `schemas/` including `schemas/software.signature.schema.json`;
- `spec/shared-entity-contract.yaml`;
- `checklists/PRE_TASK_100_CHECKS.yaml`;
- `ui/design-tokens.json`;
- `oss/manifest.yaml`;
- `evidence/`;
- consolidated `BRAINLINK_COMPLETE_DOCUMENTATION.md`.

These are repair work, not grounds to discard the ZIP.
