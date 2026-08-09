# Brainlink documentation corpus

This directory preserves source documentation without allowing historical or cross-product documents to overwrite the current runtime.

## Layout

- `v1.0.0/` — uploaded `Brainlink_Documentacao_Completa_v1.0.0` snapshot. Exact original ZIP is preserved as Base64 plus a readable verbatim text bundle and per-file index.
- `v5/` — exact supplied Oráculo Master Admin / COSMETA / Brainlink cumulative V5 single-file target spec.
- `../canon/` — taxonomy, conflict register and effective current canon.

## Preservation rule

Corpus files are immutable source snapshots. Do not edit them to “fix” conflicts. Add a `ConflictRecord`, supersession record or a new versioned corpus instead.
