# Corpus reconstruction

The source corpus is split only to stay transport-safe through the GitHub connector. Concatenation order is lexical by part number.

## Reconstruct V1 original ZIP

```powershell
$parts = Get-ChildItem .\original-zip\v1_zip_b64.part*.txt | Sort-Object Name
$b64 = ($parts | ForEach-Object { Get-Content $_.FullName -Raw }) -join ''
[IO.File]::WriteAllBytes('Brainlink_Documentacao_Completa_v1.0.0.zip',[Convert]::FromBase64String($b64))
```

Expected SHA-256: `4bce9d511680c70d7cfd51dbc4ef203172a46fa4d10388acd16209fa6b556c09`.

## Reconstruct readable V1 text bundle

Concatenate `verbatim-text/v1_text.part00.md` through `part05.md`. Expected SHA-256: `bfa73c9f076750f35904129d006d100c13a165c77c308d9654e069966d3a29a2`.

## Reconstruct exact V5 single file

Concatenate `v5_source.part00.md` through `part07.md`. Expected SHA-256: `7fef02277ce23bd6cf937e8ba5dd12e2f90e756e073179341144f48306cb0d7b`.

Do not edit source parts. Reconciliation belongs in `docs/canon/`.
