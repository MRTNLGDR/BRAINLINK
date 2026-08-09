param([switch]$Install)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Stable = Join-Path $Root 'scripts\materialize-brainlink.ps1'
$Target = Join-Path $Root '.brainlink-workspace\AFFiNE'
$Parts = Join-Path $Root '.brainlink-zip-candidate-v23-runtime'
$Archive = Join-Path $Root '.brainlink-workspace\brainlink-zip-candidate-v23-runtime.tar.gz'
$TransportManifest = Join-Path $Root 'BRAINLINK_ZIP_CANDIDATE_V23_RUNTIME.sha256'
$FinalManifest = Join-Path $Root 'BRAINLINK_ZIP_CANDIDATE_V23_FINAL.sha256'
$FinalOverrides = Join-Path $Root '.brainlink-v23-final-overrides'
$Authority = Join-Path $Root 'BRAINLINK_ZIP_AUTHORITY.lock'
$Auditor = Join-Path $Root 'scripts\brainlink-audit-v23-transport.mjs'
$AuditEvidence = Join-Path $Root '.brainlink-workspace\brainlink-v23-transport-audit.json'

function Invoke-Checked([string]$Exe, [string[]]$Args) {
  & $Exe @Args
  if ($LASTEXITCODE -ne 0) { throw "$Exe failed with exit code $LASTEXITCODE" }
}

function Read-Lock([string]$Path) {
  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if (-not $trimmed) { continue }
    $separator = $trimmed.IndexOf('=')
    if ($separator -lt 1) { throw "Invalid lock line: $trimmed" }
    $values[$trimmed.Substring(0, $separator)] = $trimmed.Substring($separator + 1)
  }
  return $values
}

function Assert-Hash([string]$Path, [string]$Expected, [string]$Label) {
  if ($Expected -notmatch '^[0-9a-f]{64}$') { throw "$Label is not pinned." }
  $Actual = (Get-FileHash -Algorithm SHA256 $Path).Hash.ToLowerInvariant()
  if ($Actual -ne $Expected) { throw "$Label checksum mismatch: $Actual" }
}

if (-not (Test-Path $Stable)) { throw 'Stable Brainlink materializer is missing.' }
if (-not (Test-Path $Parts)) { throw 'Compact ZIP candidate runtime transport is missing.' }
if (-not (Test-Path $TransportManifest)) { throw 'Compact ZIP candidate transport manifest is missing.' }
if (-not (Test-Path $FinalManifest)) { throw 'Final ZIP candidate runtime manifest is missing.' }
if (-not (Test-Path $FinalOverrides)) { throw 'Final ZIP candidate overrides are missing.' }
if (-not (Test-Path $Authority)) { throw 'ZIP authority lock is missing.' }
if (-not (Test-Path $Auditor)) { throw 'ZIP candidate transport auditor is missing.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js >=22.12.0 <23.0.0 is required.' }
if (-not (Get-Command tar -ErrorAction SilentlyContinue)) { throw 'tar is required.' }

$Lock = Read-Lock $Authority
$ExpectedArchive = $Lock['candidate_runtime_overlay_sha256']
$ExpectedTransportManifest = $Lock['candidate_runtime_manifest_sha256']
$ExpectedFinalManifest = $Lock['candidate_final_runtime_manifest_sha256']
$ExpectedFinalPackage = $Lock['candidate_final_package_sha256']

Write-Host '[BRAINLINK] Auditing compact v2.3 transport before touching the AFFiNE workspace...'
Invoke-Checked node @($Auditor, "--root=$Root", "--output=$AuditEvidence", '--require-pinned')

Write-Host '[BRAINLINK] Rebuilding verified stable v2.1 baseline first...'
& $Stable
if ($LASTEXITCODE -ne 0) { throw 'Stable Brainlink baseline materialization failed.' }

Assert-Hash $TransportManifest $ExpectedTransportManifest 'Candidate transport manifest'
Assert-Hash $FinalManifest $ExpectedFinalManifest 'Candidate final manifest'
Assert-Hash (Join-Path $FinalOverrides 'package.json') $ExpectedFinalPackage 'Candidate final package'

$PartFiles = Get-ChildItem (Join-Path $Parts 'runtime.part*.b64') | Sort-Object {
  if ($_.Name -match '^runtime\.part(\d+)([a-z]*)\.b64$') {
    return ('{0:D8}{1}' -f [int]$Matches[1], $Matches[2])
  }
  return $_.Name
}
if (-not $PartFiles) { throw 'No compact candidate runtime fragments were found.' }
$Encoded = ($PartFiles | ForEach-Object { Get-Content $_.FullName -Raw }) -join ''
[IO.File]::WriteAllBytes($Archive, [Convert]::FromBase64String(($Encoded -replace '\s+', '')))
Assert-Hash $Archive $ExpectedArchive 'Candidate runtime transport'

Write-Host '[BRAINLINK] Applying signed ZIP-authoritative transport over stable baseline...'
& tar -xzf $Archive -C $Target
if ($LASTEXITCODE -ne 0) { throw 'Unable to extract ZIP candidate runtime transport.' }
foreach ($line in Get-Content $TransportManifest) {
  if (-not $line.Trim()) { continue }
  $manifestParts = $line -split '\s{2}', 2
  if ($manifestParts.Count -ne 2) { throw "Invalid transport manifest line: $line" }
  $expected, $relative = $manifestParts
  $file = Join-Path $Target ($relative -replace '/', '\')
  if (-not (Test-Path $file -PathType Leaf)) { throw "Candidate transport file missing: $relative" }
  $actual = (Get-FileHash -Algorithm SHA256 $file).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { throw "Candidate transport file checksum mismatch: $relative" }
}

Write-Host '[BRAINLINK] Applying independently pinned lock-compatible final package...'
Get-ChildItem -LiteralPath $FinalOverrides -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $Target -Recurse -Force
}
foreach ($line in Get-Content $FinalManifest) {
  if (-not $line.Trim()) { continue }
  $manifestParts = $line -split '\s{2}', 2
  if ($manifestParts.Count -ne 2) { throw "Invalid final manifest line: $line" }
  $expected, $relative = $manifestParts
  $file = Join-Path $Target ($relative -replace '/', '\')
  if (-not (Test-Path $file -PathType Leaf)) { throw "Candidate final file missing: $relative" }
  $actual = (Get-FileHash -Algorithm SHA256 $file).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { throw "Candidate final file checksum mismatch: $relative" }
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

Write-Host '[BRAINLINK] ZIP-authoritative candidate v2.3 assembled runtime materialized and verified.'
Write-Host "[BRAINLINK] Transport audit evidence: $AuditEvidence"
Write-Host '[BRAINLINK] Stable v2.1 remains recoverable by running BRAINLINK_SETUP.bat.'
