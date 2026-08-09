param([switch]$Install)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Target = Join-Path $Root '.brainlink-workspace\AFFiNE'
$V21 = Join-Path $PSScriptRoot 'materialize-brainlink.ps1'
$Transform = Join-Path $PSScriptRoot 'apply-execution-v22-safe.mjs'
$Validate22 = Join-Path $PSScriptRoot 'brainlink-v22-validate.mjs'
$NonBreakage = Join-Path $PSScriptRoot 'brainlink-nonbreakage-guard.mjs'
$Doc46 = Join-Path $Root 'docs\46_EXECUTION_ENVELOPES_2026-08-08.md'

function Invoke-Checked([string]$Exe, [string[]]$Args) {
  & $Exe @Args
  if ($LASTEXITCODE -ne 0) { throw "$Exe failed with exit code $LASTEXITCODE" }
}

if (-not (Test-Path $V21)) { throw 'Missing verified v2.1 materializer.' }
if (-not (Test-Path $Transform)) { throw 'Missing transport-safe Brainlink v2.2 source migrator.' }
if (-not (Test-Path $NonBreakage)) { throw 'Missing Brainlink non-breakage guard.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js >=22.12.0 <23.0.0 is required for the v2.2 source migration.' }
$Version = (& node -p "process.versions.node").Trim()
$Parts = $Version.Split('.')
if ([int]$Parts[0] -ne 22 -or [int]$Parts[1] -lt 12) { throw "Node.js $Version is unsupported. Install Node.js >=22.12.0 <23.0.0." }

Write-Host '[BRAINLINK] Enforcing repository non-breakage policy before candidate work...'
Invoke-Checked node @($NonBreakage, $Root)

Write-Host '[BRAINLINK] Materializing and verifying stable v2.1 base first...'
& powershell -NoProfile -ExecutionPolicy Bypass -File $V21
if ($LASTEXITCODE -ne 0) { throw 'Brainlink v2.1 base materialization failed.' }

Write-Host '[BRAINLINK] Applying transport-safe deterministic Execution Envelope v2.2 migration...'
Invoke-Checked node @($Transform, $Target)
if (Test-Path $Doc46) {
  Copy-Item -LiteralPath $Doc46 -Destination (Join-Path $Target 'docs\46_EXECUTION_ENVELOPES_2026-08-08.md') -Force
}

Push-Location $Target
try {
  Write-Host '[BRAINLINK] Re-running the 42 v2.1 regression invariants on the upgraded tree...'
  Invoke-Checked node @('scripts/brainlink-validate.mjs')
}
finally { Pop-Location }
Write-Host '[BRAINLINK] Running 12 v2.2 Execution Envelope invariants...'
Invoke-Checked node @($Validate22, $Target)

if ($Install) {
  if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) { throw 'Corepack is required.' }
  Invoke-Checked corepack @('enable')
  Push-Location $Target
  try {
    Invoke-Checked corepack @('yarn','install','--immutable')
    Invoke-Checked corepack @('yarn','brainlink:validate')
    Invoke-Checked corepack @('yarn','brainlink:test')
  }
  finally { Pop-Location }
  Invoke-Checked node @($Validate22, $Target)
}

Write-Host "[BRAINLINK] Runtime v2.2 candidate materialized at $Target"
Write-Host '[BRAINLINK] Stable release remains v2.1 until candidate promotion gates pass.'
Write-Host '[BRAINLINK] Non-breakage: 9/9 | Regression: 42/42 | Execution Envelopes: 12/12 | combined candidate checks: 63'
