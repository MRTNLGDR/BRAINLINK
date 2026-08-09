param([switch]$Install)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Script = Join-Path $PSScriptRoot 'brainlink-materialize.mjs'
$Workspace = Join-Path $Root '.brainlink-workspace'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js >=22.12.0 <23.0.0 is required. Run BRAINLINK.bat for automatic portable installation.'
}
$Version = (& node -p "process.versions.node").Trim()
$Parts = $Version.Split('.')
if ([int]$Parts[0] -ne 22 -or [int]$Parts[1] -lt 12) {
  throw "Node.js $Version is unsupported. Run BRAINLINK.bat to use the pinned portable runtime."
}
if (-not (Test-Path $Script)) { throw "Missing stable Brainlink materializer: $Script" }

$Arguments = @($Script, '--source-root', $Root, '--workspace-root', $Workspace)
if ($env:BRAINLINK_GIT) { $Arguments += @('--git', $env:BRAINLINK_GIT) }
if ($Install) { $Arguments += '--install' }
& node @Arguments
if ($LASTEXITCODE -ne 0) { throw "Stable Brainlink materialization failed with exit code $LASTEXITCODE" }
