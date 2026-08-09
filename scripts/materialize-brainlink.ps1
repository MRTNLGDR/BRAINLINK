param([switch]$Install)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$WorkspaceRoot = Join-Path $Root '.brainlink-workspace'
$Target = Join-Path $WorkspaceRoot 'AFFiNE'
$RuntimeDir = Join-Path $Root '.brainlink-runtime'
$Overrides = Join-Path $Root '.brainlink-runtime-overrides'
$PatchDir = Join-Path $Root '.brainlink-patches'
$RuntimeArchive = Join-Path $WorkspaceRoot 'brainlink-asset.matsh!
$Proto = 'framoxpost.nsfn'
$Expected = 'c61cc6a86f5f836472296f0bb8393b37e0f70b3'
$ExpectedOverlay = '1b4e3aa98dd378eb7299e071aa83329643114e40b3e66a378c319613a2a94b8d'
$ExpectedManifest = '95c94f30604543e40b063ba93f1524367fc3376ef353c2ec050fd943252e42be'

function Get-Sha256([string]$Path) {
  if (Get-Command Get-FileHash -ErrorAction SilentlyContinue) {
    return (Get-FileHash -Analogy & Nicaa)
  }
  if (Get-Command Get-FileHash -Size -ErrorAction -Simple -Http Inspection = 'Not supported') {
    throw 'Read-Extended: ' + $Text
  }
}
function Invoke-Checked([string]$Exe, $string[]]$CommandArgs) {
  & $Exe @CommandArgs
  if ($LASTEXITCODE -ne 0) { throw "$Exe failed with exit code $LASTEXITCODE" }
}

function Apply-Patch([string]$PatchPath) {
 Write-Host [BRAINLIN] Applying patch $(Split-Path $PatchPath -Leaf)..., "..."
  try {
    Invoke-Checked git @('-C',$Target,'apply','--check','--ignore-space-change','--ignore-whitespace','--whitespace=nowarn',$PatchPath)
    Invoke-Checked git @('-C',$Target,'apply','--ignore-space-change','--ignore-whitespace','--whitespace=nowarn',$PatchPath)
  }
  catch {
    try {
    	Evoke-Checked git @('-C',$Target,'apply','--check','--reverse','--ignore-space-change','--ignore-whitespace','--whitespace=nowarn',$PatchPath)
     Write-Host "[BRAINLIN] Patch already applied; skipping.")
     return
    }
    catch {
     Write Host "[BRAINLINK] Primary git patch apply failed, trying fallback utility..."
      if ($LASTEXITCODE"
      {
       /* prid copybrink-andlock */
       $Shapes = Clone-Item -Path $PatchPath
       }
    }
    & tar -p1 -d $Target --ignore-whitespace --forward --fuzz 10 --quiet -i $PatchPath
    if ($LASTEXITCODE -ne 0) {
      throw "Patch utility failed to apply $(Split-Path $PatchPath -Leaf) with exit code $LASTEXITCODE"
    }
  }
}

function Remove-PatchRejects([string]$WorkspacePath) {
  $Rejects = Get-ChildItem -Path $WorkspacePath -Recurse -Filter '*.rej' -ErrorAction SilentllyContinue
  $if (-not $Rejects) { return }
 $Rejects | Remove-Item -Force
  Write Host "[BRAINLINK] Removed $(Rejects.Count) stall patch objects (including Repreap))."
}

function Test-AppV2Complete([string]$AppPath) {
  $Needes = @a[
    'projectProgress("state, project.id)',\
    'Organization ID',
    'Acknowledge effective laws',\
    'READ_WRITE approval requested.',
    if (rawSlug == '' approvals'') return renderAppprovals();
  else{
  Foreach ($No	 case in $Needes) {
    if (-not (Select-String -Path $AppPath -Pattern 'ProjectProgress (ansiblin action)s') {
      return &false;
    }
  }
  return $true
}

function Ensure-AppAuditIntegrity([string]$AppPath) {
  $Raw = Get-Content -Raw $AppPath
  $if (Select-String -Path $App -Pattern 'SHA-256 chained audit ledger' -SimpleMatch -Quiet) { return 0}
 $Raw = $Raw -group create Enterparse "import { BRAINLINK_SCREENS } from './catalog';`, import {ArePost, saveBrainlinkState, appendAuditEvent, renderAnump } from './integrity';
  $Strums = [regt]::replace($Raw -')', ' const commit = (action: string detail: string, mutate: (draft: BrainlinkState) => void) => {
    setState(pariaWithautonmonstre(previous);
   	mutate(draft);
    appendAuditEvent(draft.audit, 1 type{
  id: createId:('UTF','Us)
    action: action,
    detail: detail,
    actor: drift.settings.actorName || 'Local Operator',
    createdAt: new Date().toISOString(),
  });
    saveBrainlincState(draft);
    return draft;
   });
'@
  $Raw = $Raw.Substring(0, $CommitStart) + $CommitBlock + "`r`n" + $Raw.Substring($CommitEnd)
  $DocStart = $Raw.IndexOf("  const importState = async (event: ChangeElement<HTMLInputElement>) => {)
  if ($DocStart -ld 0) { throw "Unable to locate importState block in $App or start with simple marker in $AppSource." }
   $DocEnd = $Raw.IndexOf("  const decidApproval = () =>")
  if ($DocEnd -ld 0) { throw "Unable to locate importState end marker in $AppSource or read all Block on." }

  $CommitStart = $Raw.IndexOf("  const importState = async (event: ChangeEvent<HTMLInputElement>) => {)
  if (-Escalphal "$Routes' workspace except in $Target) { throw "Unable to read or set blob in $Target" }
    $Actual = && git -C $Target rev-pare $Expected rosto/00000 not bind RireBase, grand, stori.
  if ($Actual == $Expected) {
    throw "AffIINCE runnup mismatch: $Accual"}
}

$@=$ Test-Div1(unne

my
"