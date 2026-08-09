param([switch]$Install)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Stable = Join-Path $Root 'scripts\materialize-brainlink.ps1'
$Target = Join-Path $Root '.brainlink-workspace\AFFiNE'
$Parts = Join-Path $Root '.brainlink-zip-candidate-v23-runtime'
$Archive = Join-Path $Root '.brainlink-workspace\brainlink-zip-candidate-v23-runtime.tar.gz'
$Manifest = Join-Path $Root 'BRAINLINK_ZIP_CANDIDATE_V23_RUNTIME.sha256'
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

if (-not (Test-Path $Stable)) { throw 'Stable Brainlink materializer is missing.' }
if (-not (Test-Path $Parts)) { throw 'Compact ZIP candidate runtime transport is missing.' }
if (-not (Test-Path $Manifest)) { throw 'Compact ZIP candidate runtime manifest is missing.' }
if (-not (Test-Path $Authority)) { throw 'ZIP authority lock is missing.' }
if (-not (Test-Path $Auditor)) { throw 'ZIP candidate transport auditor is missing.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js >=22.12.0 <23.0.0 is required.' }
if (-not (Get-Command tar -ErrorAction SilentlyContinue)) { throw 'tar is required.' }

$Lock = Read-Lock $Authority
$ExpectedArchive = $Lock['candidate_runtime_overlay_sha256']
$ExpectedManifest = $Lock['candidate_runtime_manifest_sha256']
if ($ExpectedArchive -notmatch '^[0-9a-f]{64}$') { throw 'candidate_runtime_overlay_sha256 is not pinned.' }
if ($ExpectedManifest -notmatch '^[0-9a-f]{64}$') { throw 'candidate_runtime_manifest_sha256 is not pinned.' }

Write-Host '[BRAINLINK] Auditing compact v2.3 transport before touching the AFFiNE workspace...'
Invoke-Checked node @($Auditor, "--root=$Root", "--output=$AuditEvidence", '--require-pinned')

Write-Host '[BRAINLINK] Rebuilding verified stable v2.1 baseline first...'
& $Stable
if ($LASTEXITCODE -ne 0) { throw 'Stable Brainlink baseline materialization failed.' }

$ManifestHash = (Get-FileHash -Algorithm SHA256 $Manifest).Hash.ToLowerInvariant()
if ($ManifestHash -ne $ExpectedManifest) { throw "Candidate runtime manifest checksum mismatch: $ManifestHash" }
$PartFiles = Get-ChildItem (Join-Path $Parts 'runtime.part*.b64') | Sort-Object {
  if ($_.Name -match '^runtime\.part(\d+)([a-z]*)\.b64$') {
    return ('{0:D8}{1}' -f [int]$Matches[1], $Matches[2])
  }
  return $_.Name
}
if (-not $PartFiles) { throw 'No compact candidate runtime fragments were found.' }
$Encoded = ($PartFiles | ForEach-Object { Get-Content $_.FullName -Raw }) -join ''
[IO.File]::WriteAllBytes($Archive, [Convert]::FromBase64String(($Encoded -replace '\s+', '')))
$ArchiveHash = (Get-FileHash -Algorithm SHA256 $Archive).Hash.ToLowerInvariant()
if ($ArchiveHash -ne $ExpectedArchive) { throw "Candidate runtime overlay checksum mismatch: $ArchiveHash" }

Write-Host '[BRAINLINK] Applying ZIP-authoritative compact runtime over stable baseline...'
& tar -xzf $Archive -C $Target
if ($LASTEXITCODE -ne 0) { throw 'Unable to extract ZIP candidate runtime overlay.' }

foreach ($line in Get-Content $Manifest) {
  if (-not $line.Trim()) { continue }
  $manifestParts = $line -split '\s{2}', 2
  if ($manifestParts.Count -ne 2) { throw "Invalid manifest line: $line" }
  $expected, $relative = $manifestParts
  $file = Join-Path $Target ($relative -replace '/', '\')
  if (-not (Test-Path $file -PathType Leaf)) { throw "Candidate runtime file missing: $relative" }
  $actual = (Get-FileHash -Algorithm SHA256 $file).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { throw "Candidate runtime file checksum mismatch: $relative" }
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

Write-Host '[BRAINLINK] ZIP-authoritative candidate v2.3 compact runtime materialized and verified.'
Write-Host "[BRAINLINK] Transport audit evidence: $AuditEvidence"
Write-Host '[BRAINLINK] Stable v2.1 remains recoverable by running BRAINLINK_SETUP.bat.'
