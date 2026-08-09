param([switch]$Install)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Stable = Join-Path $Root 'scripts\materialize-brainlink.ps1'
$Target = Join-Path $Root '.brainlink-workspace\AFFiNE'
$Parts = Join-Path $Root '.brainlink-zip-candidate-v23'
$Archive = Join-Path $Root '.brainlink-workspace\brainlink-zip-candidate-v23.tar.gz'
$Manifest = Join-Path $Root 'BRAINLINK_ZIP_CANDIDATE_V23.sha256'
$ExpectedArchive = 'cf1274c5ed29f57590e71a1273edd51415a5ac88e889633b4be627a97c3baed4'
$ExpectedManifest = '95eaea164ea608f9fe52095468c40abcda85ba646a2077a273db6d4a799913f1'

function Invoke-Checked([string]$Exe, [string[]]$Args) {
  & $Exe @Args
  if ($LASTEXITCODE -ne 0) { throw "$Exe failed with exit code $LASTEXITCODE" }
}

if (-not (Test-Path $Stable)) { throw 'Stable Brainlink materializer is missing.' }
if (-not (Test-Path $Parts)) { throw 'ZIP candidate transport parts are missing.' }
if (-not (Test-Path $Manifest)) { throw 'ZIP candidate final-file manifest is missing.' }

Write-Host '[BRAINLINK] Rebuilding verified stable v2.1 baseline first...'
& $Stable
if ($LASTEXITCODE -ne 0) { throw 'Stable Brainlink baseline materialization failed.' }

$ManifestHash = (Get-FileHash -Algorithm SHA256 $Manifest).Hash.ToLowerInvariant()
if ($ManifestHash -ne $ExpectedManifest) { throw "Candidate manifest checksum mismatch: $ManifestHash" }
$Encoded = (Get-ChildItem (Join-Path $Parts 'runtime.part*.b64') | Sort-Object Name | ForEach-Object { Get-Content $_.FullName -Raw }) -join ''
[IO.File]::WriteAllBytes($Archive, [Convert]::FromBase64String($Encoded))
$ArchiveHash = (Get-FileHash -Algorithm SHA256 $Archive).Hash.ToLowerInvariant()
if ($ArchiveHash -ne $ExpectedArchive) { throw "Candidate overlay checksum mismatch: $ArchiveHash" }

Write-Host '[BRAINLINK] Applying ZIP-authoritative candidate over stable baseline...'
& tar -xzf $Archive -C $Target
if ($LASTEXITCODE -ne 0) { throw 'Unable to extract ZIP candidate overlay.' }

foreach ($line in Get-Content $Manifest) {
  if (-not $line.Trim()) { continue }
  $parts = $line -split '\s{2}', 2
  if ($parts.Count -ne 2) { throw "Invalid manifest line: $line" }
  $expected, $relative = $parts
  $file = Join-Path $Target ($relative -replace '/', '\')
  if (-not (Test-Path $file)) { throw "Candidate file missing: $relative" }
  $actual = (Get-FileHash -Algorithm SHA256 $file).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { throw "Candidate file checksum mismatch: $relative" }
}

Push-Location $Target
try {
  Invoke-Checked node @('scripts/brainlink-validate.mjs')
  Invoke-Checked node @('scripts/brainlink-validate-v23.mjs')
  if ($Install) {
    $Version = (& node -p "process.versions.node").Trim()
    $PartsVersion = $Version.Split('.')
    if ([int]$PartsVersion[0] -ne 22 -or [int]$PartsVersion[1] -lt 12) { throw "Node.js $Version is unsupported. Install Node.js >=22.12.0 <23.0.0." }
    if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) { throw 'Corepack is required.' }
    Invoke-Checked corepack @('enable')
    Invoke-Checked corepack @('yarn','install','--immutable')
    Invoke-Checked corepack @('yarn','brainlink:check')
  }
} finally { Pop-Location }

Write-Host '[BRAINLINK] ZIP-authoritative candidate v2.3 materialized and verified.'
Write-Host '[BRAINLINK] Stable v2.1 remains recoverable by running BRAINLINK_SETUP.bat.'
