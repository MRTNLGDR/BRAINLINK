# ADR-0001 — Preserve AFFiNE 0.27.0 as compatibility base

Status: ACCEPTED — 2026-08-08

Brainlink is implemented as an isolated layer on the AFFiNE `v0.27.0` source tree. Generated route artifacts are not edited manually. Upstream document, canvas and local-first behavior remain authoritative unless a Brainlink requirement explicitly needs an adapter.

Consequences: upstream updates are reviewed as migrations; Brainlink-specific files live under explicit Brainlink namespaces/routes; the technical root workspace name remains `@affine/monorepo` where changing it would invalidate Yarn workspace resolution.
