$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$RuntimeDir = Join-Path $Root '.brainlink-runtime'
$Expected = '1b4e3aa98dd378eb7299e071aa83329643114e40b3e66a378c319613a2a94b8d'
$Encoded = (Get-ChildItem (Join-Path $RuntimeDir 'runtime.part*.b64') | Sort-Object Name | ForEach-Object { Get-Content $_.FullName -Raw }) -join ''
$Bytes = [Convert]::FromBase64String($Encoded)
$Tmp = Join-Path ([IO.Path]::GetTempPath()) 'brainlink-runtime-verify.tar.gz'
[IO.File]::WriteAllBytes($Tmp, $Bytes)
$Actual = (Get-FileHash -Algorithm SHA256 $Tmp).Hash.ToLowerInvariant()
Remove-Item $Tmp -Force
if ($Actual -ne $Expected) { throw "Runtime checksum mismatch: $Actual" }
Write-Host "PASS Brainlink runtime bundle SHA-256 $Actual"
