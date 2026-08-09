# Effective Brainlink canon — ZIP-authoritative snapshot 2026-08-08

## Authority

The uploaded `Brainlink_Documentacao_Completa_v1.0.0.zip` is the **authoritative Brainlink product/documentation baseline**. Its machine-readable specification, manifests, universal laws, rule gates, lifecycle and budgets define the target to implement.

- ZIP SHA-256: `4bce9d511680c70d7cfd51dbc4ef203172a46fa4d10388acd16209fa6b556c09`.
- Internal SHA list: **56/56 PASS**.
- V5 is secondary context only.
- The original ZIP is immutable evidence; repairs are versioned separately.

## Current implementation facts that must be preserved

- Repository: `MRTNLGDR/BRAINLINK`.
- AFFiNE upstream: `v0.27.0`, commit `c61cc6a86f5f8364732296f0bb8393b37e0f70b3`.
- Stable runtime baseline: `v2.1` while newer work is under promotion gates.
- Candidate work already adds stronger execution-envelope/anti-loop behavior and must be reconciled with the ZIP rather than discarded.
- Existing SHA-256 audit-chain, import hardening, connector write approval, evidence gate and scoped rule behavior are additive implementations of ZIP requirements and remain protected from regression.

## Effective product invariants compiled from the ZIP

1. Reuse AFFiNE/BlockSuite; do not reimplement document/canvas/CRDT commodity capability.
2. Brainlink is the local-first knowledge/governance and AI-worker control plane.
3. One authoritative owner per concept; derivatives never become sources of truth.
4. Universalis resolves precedence across the complete ZIP scope hierarchy.
5. Effective rule packs/read receipts gate session, task, phase, privileged action, error, resume, finish and approval flows.
6. External AI proposes; canonical AI-originated change is applied only through governed Custodian/trusted service paths.
7. Task execution uses an immutable envelope with rule-pack hash, capabilities, budget, context, criteria, verifiers, rollback and correlation ID.
8. Loops/retries are bounded; repeated identical failure or no-evidence progress must change strategy or block.
9. `VERIFIED` always requires executed evidence mapped to criteria; a model never self-certifies.
10. Audit is append-only and tamper-evident; critical history cannot be silently truncated.
11. Secrets never enter model context, logs or common state.
12. Network/filesystem/secret/destructive actions are deny-by-default and scoped.
13. External files stay in place by default; mutation requires capability/audit.
14. Ultrabase, MCP, OpenBao, Qdrant/Tantivy and other services are real external/reused boundaries, not fake local success states.
15. All failures must be visible, bounded, recoverable and auditable; rollback remains available.
16. Generated files are generated; route trees/build artifacts are not manually edited.
17. Performance/context/tool budgets are enforced and measurable.
18. Accessibility/mobile/offline/release/security claims remain unverified until their relevant executable gates run.

## Repairs required because the authoritative ZIP omitted referenced artifacts

Create a canonical repaired layer for missing documents/contracts/schemas/roadmap/evidence files using only requirements present in the ZIP, with `repair_source` metadata and no false claim that the artifact existed in the original package.

## Implementation priority

### P0 — correctness/governance core

- full rule-scope precedence;
- full read-gate registry;
- TaskEnvelope/Execution lifecycle compatibility;
- budgets and stagnation enforcement;
- truth states;
- approval payload integrity/expiry;
- repaired canonical contracts + roadmap + gaps.

### P1 — locally implementable Brainlink capability

- richer Bug/Solution records;
- prompt archetype versioning/validation;
- permission-aware metadata search/projections baseline;
- organization/workspace/project scope metadata;
- governance/health status with explicit `UNKNOWN/DEGRADED` semantics;
- portable backup manifest/integrity metadata.

### External-gated

- Ultrabase actual DB migration/RLS/storage/realtime;
- real secret broker/OpenBao;
- production MCP servers/transports;
- external provider credentials;
- target-device desktop/mobile/browser build and E2E;
- user-machine filesystem inventory.

External-gated items remain visible and cannot be painted green by documentation or mock UI.
