# Authoritative Brainlink documentation ZIP — exact preservation

This directory preserves the exact bytes of the user-supplied authoritative documentation archive:

`Brainlink_Documentacao_Completa_v1.0.0.zip`

- SHA-256: `4bce9d511680c70d7cfd51dbc4ef203172a46fa4d10388acd16209fa6b556c09`
- bytes: `320832`
- ZIP entries: `63`
- internal checksum set: `56/56 PASS`

`zip.part*.b64` files concatenate in lexical/numeric order and decode to the original ZIP. `scripts/restore-brainlink-authoritative-docs.mjs` performs reconstruction and SHA-256 verification before extraction.

The source ZIP is immutable evidence. Corrections, taxonomy and resolved conflicts live under `docs/canon/`; runtime-aligned derived contracts live in the candidate/runtime layers. The original archive is never rewritten to make later corrections appear historical.

The previously started `docs/corpus/sources/corpus_sources.tar.gz.b64.*` transport is retained only as lineage and is superseded by this exact original-ZIP transport.
