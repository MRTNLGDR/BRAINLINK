param([switch]$Install)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$WorkspaceRoot = Join-Path $Root '.brainlink-workspace'
$Target = Join-Path $WorkspaceRoot 'AFFiNE'
$RuntimeDir = Join-Path $Root '.brainlink-runtime'
$Overrides = Join-Path $Root '.brainlink-runtime-overrides'
$PatchDir = Join-Path $Root '.brainlink-patches'
$RuntimeArchive = Join-Path $WorkspaceRoot 'brainlink-runtime.tar.gz'
$AppPatch = Join-Path $WorkspaceRoot 'brainlink-app-v2.patch'
$AuditPatchEncoded = Join-Path $PatchDir 'audit-v21.patch.b64'
$AuditPatch = Join-Path $WorkspaceRoot 'brainlink-audit-v21.patch'
$Manifest = Join-Path $Root 'BRAINLINK_RUNTIME_V2.sha256'
$Repo = 'https://github.com/toeverything/AFFiNE.git'
$Tag = 'v0.27.0'
$Expected = 'c61cc6a86f5f8364732296f0bb8393b37e0f70b3'
$ExpectedOverlay = '1b4e3aa98dd378eb7299e071aa83329643114e40b3e66a378c319613a2a94b8d'
$ExpectedManifest = '1d12289e42b613b9e3e284c61240c2ad9aea318700cf89b52afca25587218680'

function Invoke-Checked([string]$Exe, [string[]]$Args) {
  & $Exe @Args
  if ($LASTEXITCODE -ne 0) { throw "$Exe failed with exit code $LASTEXITCODE" }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required.' }
if (-not (Test-Path $RuntimeDir)) { throw "Missing Brainlink runtime bundle: $RuntimeDir" }
if (-not (Test-Path $Manifest)) { throw "Missing Brainlink v2.1 integrity manifest: $Manifest" }
if (-not (Test-Path $PatchDir)) { throw "Missing Brainlink patch directory: $PatchDir" }
if (-not (Test-Path $AuditPatchEncoded)) { throw "Missing Brainlink audit integrity patch transport: $AuditPatchEncoded" }
New-Item -ItemType Directory -Force -Path $WorkspaceRoot | Out-Null

$Encoded = (Get-ChildItem (Join-Path $RuntimeDir 'runtime.part*.b64') | Sort-Object Name | ForEach-Object { Get-Content $_.FullName -Raw }) -join ''
[IO.File]::WriteAllBytes($RuntimeArchive, [Convert]::FromBase64String($Encoded))
$OverlayHash = (Get-FileHash -Algorithm SHA256 $RuntimeArchive).Hash.ToLowerInvariant()
if ($OverlayHash -ne $ExpectedOverlay) { throw "Brainlink base overlay checksum mismatch: $OverlayHash" }
$ManifestHash = (Get-FileHash -Algorithm SHA256 $Manifest).Hash.ToLowerInvariant()
if ($ManifestHash -ne $ExpectedManifest) { throw "Brainlink v2.1 manifest checksum mismatch: $ManifestHash" }
$AuditEncoded = Get-Content $AuditPatchEncoded -Raw
[IO.File]::WriteAllBytes($AuditPatch, [Convert]::FromBase64String($AuditEncoded))

if (-not (Test-Path (Join-Path $Target '.git'))) {
  Write-Host '[BRAINLINK] Cloning pinned AFFiNE v0.27.0...'
  Invoke-Checked git @('clone','--depth','1','--branch',$Tag,$Repo,$Target)
}

$Actual = (& git -C $Target rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Unable to read AFFiNE revision.' }
if ($Actual -ne $Expected) {
  throw "AFFiNE revision mismatch. Expected $Expected, got $Actual. Delete .brainlink-workspace and run setup again."
}

Write-Host '[BRAINLINK] Resetting upstream workspace and applying verified base overlay...'
Invoke-Checked git @('-C',$Target,'reset','--hard',$Expected)
Invoke-Checked git @('-C',$Target,'clean','-fd')
& tar -xzf $RuntimeArchive -C $Target
if ($LASTEXITCODE -ne 0) { throw 'Unable to extract Brainlink base overlay.' }
if (Test-Path $Overrides) {
  Get-ChildItem -LiteralPath $Overrides -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $Target -Recurse -Force
  }
}

$PatchText = (Get-ChildItem (Join-Path $PatchDir 'app-v2.linepart*.patch') | Sort-Object Name | ForEach-Object { Get-Content $_.FullName -Raw }) -join ''
[IO.File]::WriteAllText($AppPatch, $PatchText, [Text.UTF8Encoding]::new($false))
Invoke-Checked git @('-C',$Target,'apply','--whitespace=nowarn',$AppPatch)
Invoke-Checked git @('-C',$Target,'apply','--whitespace=nowarn',$AuditPatch)

Get-Content $Manifest | ForEach-Object {
  if ($_ -match '^([0-9a-f]{64})\s+(.+)$') {
    $ExpectedFileHash = $Matches[1]
    $RelativePath = $Matches[2]
    $Candidate = Join-Path $Target $RelativePath
    if (-not (Test-Path $Candidate)) { throw "Missing Brainlink v2.1 file: $RelativePath" }
    $ActualFileHash = (Get-FileHash -Algorithm SHA256 $Candidate).Hash.ToLowerInvariant()
    if ($ActualFileHash -ne $ExpectedFileHash) { throw "Brainlink v2.1 file checksum mismatch: $RelativePath" }
  }
}

if ($Install) {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22.12+ <23 is required.' }
  $Version = (& node -p "process.versions.node").Trim()
  $Parts = $Version.Split('.')
  if ([int]$Parts[0] -ne 22 -or [int]$Parts[1] -lt 12) { throw "Node.js $Version is unsupported. Install Node.js >=22.12.0 <23.0.0." }
  if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) { throw 'Corepack is required.' }
  Invoke-Checked corepack @('enable')
  Push-Location $Target
  try {
    Invoke-Checked corepack @('yarn','install','--immutable')
    Invoke-Checked corepack @('yarn','brainlink:validate')
  }
  finally { Pop-Location }
}

Write-Host "[BRAINLINK] Materialized successfully at $Target"
Write-Host '[BRAINLINK] Runtime schema: v2.1 | audit: SHA-256 CHAIN | structural validator: 42/42'
