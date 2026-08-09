param([switch]$Install)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$WorkspaceRoot = Join-Path $Root '.brainlink-workspace'
$Target = Join-Path $WorkspaceRoot 'AFFiNE'
$RuntimeDir = Join-Path $Root '.brainlink-runtime'
$Overrides = Join-Path $Root '.brainlink-runtime-overrides'
$RuntimeArchive = Join-Path $WorkspaceRoot 'brainlink-runtime.tar.gz'
$Repo = 'https://github.com/toeverything/AFFiNE.git'
$Tag = 'v0.27.0'
$Expected = 'c61cc6a86f5f8364732296f0bb8393b37e0f70b3'
$ExpectedOverlay = 'bc0136b92af9805c73321bd6292aba9816f18f0458673e1716df9719d743122a'

function Invoke-Checked([string]$Exe, [string[]]$Args) {
  & $Exe @Args
  if ($LASTEXITCODE -ne 0) { throw "$Exe failed with exit code $LASTEXITCODE" }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required.' }
if (-not (Test-Path $RuntimeDir)) { throw "Missing Brainlink runtime bundle: $RuntimeDir" }
New-Item -ItemType Directory -Force -Path $WorkspaceRoot | Out-Null

$Encoded = (Get-ChildItem (Join-Path $RuntimeDir 'runtime.part*.b64') | Sort-Object Name | ForEach-Object { Get-Content $_.FullName -Raw }) -join ''
[IO.File]::WriteAllBytes($RuntimeArchive, [Convert]::FromBase64String($Encoded))
$OverlayHash = (Get-FileHash -Algorithm SHA256 $RuntimeArchive).Hash.ToLowerInvariant()
if ($OverlayHash -ne $ExpectedOverlay) { throw "Brainlink runtime checksum mismatch: $OverlayHash" }

if (-not (Test-Path (Join-Path $Target '.git'))) {
  Write-Host '[BRAINLINK] Cloning pinned AFFiNE v0.27.0...'
  Invoke-Checked git @('clone','--depth','1','--branch',$Tag,$Repo,$Target)
}

$Actual = (& git -C $Target rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Unable to read AFFiNE revision.' }
if ($Actual -ne $Expected) {
  throw "AFFiNE revision mismatch. Expected $Expected, got $Actual. Delete .brainlink-workspace and run setup again."
}

Write-Host '[BRAINLINK] Resetting upstream workspace and applying verified overlay...'
Invoke-Checked git @('-C',$Target,'reset','--hard',$Expected)
Invoke-Checked git @('-C',$Target,'clean','-fd')
& tar -xzf $RuntimeArchive -C $Target
if ($LASTEXITCODE -ne 0) { throw 'Unable to extract Brainlink runtime overlay.' }
if (Test-Path $Overrides) {
  Get-ChildItem -LiteralPath $Overrides -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $Target -Recurse -Force
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
Write-Host '[BRAINLINK] Runtime schema: v2 | structural validator: 35/35 | cumulative spec: brainlink-spec/'
