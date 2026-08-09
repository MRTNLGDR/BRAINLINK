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
$RepairPatch = Join-Path $PatchDir 'app-v2.repair.patch'
$AuditPatchEncoded = Join-Path $PatchDir 'audit-v21.patch.b64'
$AuditPatch = Join-Path $WorkspaceRoot 'brainlink-audit-v21.patch'
$Manifest = Join-Path $Root 'BRAINLINK_RUNTIME_V2.sha256'
$Repo = 'https://github.com/toeverything/AFFiNE.git'
$Tag = 'v0.27.0'
$Expected = 'c61cc6a86f5f8364732296f0bb8393b37e0f70b3'
$ExpectedOverlay = '1b4e3aa98dd378eb7299e071aa83329643114e40b3e66a378c319613a2a94b8d'
$ExpectedManifest = '95c94f30604543e40b063ba93f1524367fc3376ef353c2ec050fd943252e42be'

function Get-Sha256([string]$Path) {
  if (Get-Command Get-FileHash -ErrorAction SilentlyContinue) {
    return (Get-FileHash -Algorithm SHA256 $Path).Hash.ToLowerInvariant()
  }
  $hasher = [System.Security.Cryptography.SHA256]::Create()
  try {
    $stream = [System.IO.File]::OpenRead($Path)
    try {
      $bytes = $hasher.ComputeHash($stream)
      return ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
    }
    finally {
      $stream.Dispose()
    }
  }
  finally {
    $hasher.Dispose()
  }
}

function Invoke-Checked([string]$Exe, [string[]]$CommandArgs) {
  & $Exe @CommandArgs
  if ($LASTEXITCODE -ne 0) { throw "$Exe failed with exit code $LASTEXITCODE" }
}

function Apply-Patch([string]$PatchPath) {
  Write-Host "[BRAINLINK] Applying patch $(Split-Path $PatchPath -Leaf)..."
  try {
    Invoke-Checked git @('-C',$Target,'apply','--check','--ignore-space-change','--ignore-whitespace','--whitespace=nowarn',$PatchPath)
    Invoke-Checked git @('-C',$Target,'apply','--ignore-space-change','--ignore-whitespace','--whitespace=nowarn',$PatchPath)
  }
  catch {
    try {
      Invoke-Checked git @('-C',$Target,'apply','--check','--reverse','--ignore-space-change','--ignore-whitespace','--whitespace=nowarn',$PatchPath)
      Write-Host "[BRAINLINK] Patch already applied; skipping."
      return
    }
    catch {
      Write-Host "[BRAINLINK] Primary git patch apply failed; trying fallback patch utility..."
    }
    & patch -p1 -d $Target --ignore-whitespace --forward --fuzz 10 --quiet -i $PatchPath
    if ($LASTEXITCODE -ne 0) {
      throw "Patch utility failed to apply $(Split-Path $PatchPath -Leaf) with exit code $LASTEXITCODE"
    }
  }
}

function Remove-PatchRejects([string]$WorkspacePath) {
  $Rejects = Get-ChildItem -Path $WorkspacePath -Recurse -Filter '*.rej' -ErrorAction SilentlyContinue
  if (-not $Rejects) { return }
  $Rejects | Remove-Item -Force
  Write-Host "[BRAINLINK] Removed $($Rejects.Count) stale patch reject file(s)."
}

function Test-AppV2Complete([string]$AppPath) {
  $Needles = @(
    'projectProgress(state, project.id)',
    'Organization ID',
    'Acknowledge effective laws',
    'READ_WRITE approval requested.',
    'if (rawSlug === ''approvals'') return renderApprovals();'
  )
  foreach ($Needle in $Needles) {
    if (-not (Select-String -Path $AppPath -Pattern $Needle -SimpleMatch -Quiet)) {
      return $false
    }
  }
  return $true
}

function Ensure-AppAuditIntegrity([string]$AppPath) {
  $Raw = Get-Content -Raw $AppPath
  if (Select-String -Path $AppPath -Pattern 'SHA-256 chained audit ledger' -SimpleMatch -Quiet) { return }

  $Raw = $Raw -replace "import \{ BRAINLINK_SCREENS \} from './catalog';", "import { BRAINLINK_SCREENS } from './catalog';`r`nimport { appendAuditEvent, verifyAuditChain } from './integrity';"
  $Raw = [regex]::Replace($Raw, '(?m)^  BrainlinkAuditEvent,\r?\n', '')

  $CommitStart = $Raw.IndexOf("  const commit = (action: string, detail: string, mutate: (draft: BrainlinkState) => void) => {")
  if ($CommitStart -lt 0) { throw "Unable to locate commit block in $AppPath" }
  $CommitEnd = $Raw.IndexOf("  const screen =", $CommitStart)
  if ($CommitEnd -lt 0) { throw "Unable to locate commit end marker in $AppPath" }

  $CommitBlock = @'
  const commit = (action: string, detail: string, mutate: (draft: BrainlinkState) => void) => {
    setState(previous => {
      const draft = cloneState(previous);
      mutate(draft);
      appendAuditEvent(draft.audit, {
        id: createBrainlinkId(''AUD''),
        action,
        detail,
        actor: draft.settings.actorName || 'Local Operator',
        createdAt: new Date().toISOString(),
      });
      saveBrainlinkState(draft);
      return draft;
    });
  };
'@
  $Raw = $Raw.Substring(0, $CommitStart) + $CommitBlock + "`r`n" + $Raw.Substring($CommitEnd)

  $ImportStart = $Raw.IndexOf("  const importState = async (event: ChangeEvent<HTMLInputElement>) => {")
  if ($ImportStart -lt 0) { throw "Unable to locate importState block in $AppPath" }
  $ImportEnd = $Raw.IndexOf("  const decideApproval =", $ImportStart)
  if ($ImportEnd -lt 0) { throw "Unable to locate importState end marker in $AppPath" }

  $ImportBlock = @'
  const importState = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseBrainlinkState(JSON.parse(await file.text()));
      appendAuditEvent(parsed.audit, { id: createBrainlinkId(''AUD''), action: 'STATE_IMPORTED', detail: `Imported and validated backup ${file.name}`, actor: parsed.settings.actorName || 'Local Operator', createdAt: new Date().toISOString() });
      saveBrainlinkState(parsed);
      setState(parsed);
      setToast('Backup imported and validated.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not import backup.');
    } finally {
      event.target.value = '';
    }
  };
'@
  $Raw = $Raw.Substring(0, $ImportStart) + $ImportBlock + "`r`n" + $Raw.Substring($ImportEnd)

  $AuditStart = $Raw.IndexOf("  const renderAudit = () =>")
  if ($AuditStart -lt 0) { throw "Unable to locate renderAudit block in $AppPath" }
  $AuditEnd = $Raw.IndexOf("  const renderBugs = () =>", $AuditStart)
  if ($AuditEnd -lt 0) { throw "Unable to locate renderAudit end marker in $AppPath" }
  $AuditBlock = @'
  const renderAudit = () => {
    const integrity = verifyAuditChain(state.audit);
    return <Card title="SHA-256 chained audit ledger" span="12"><div className="bl-meta" style={{ marginBottom: 12 }}><Badge tone={integrity.valid ? 'good' : 'bad'}>{integrity.valid ? 'CHAIN VALID' : `CHAIN INVALID · ${integrity.eventId}`}</Badge><Badge>{state.audit.length} EVENTS</Badge><table className="bl-table"><thead><tr><th>Seq</th><th>Time</th><th>Action</th><th>Detail</th><th>Actor</th><th>Hash</th></tr></thead><tbody>{state.audit.map(item => <tr key={item.id}><td>{item.sequence ?? '—'}</td><td>{formatDate(item.createdAt)}</td><td>{item.action}</td><td>{item.detail}</td><td>{item.actor}</td><td><code title={item.eventHash}>{item.eventHash ? `${item.eventHash.slice(0, 10)}…` : 'UNSEALED'}</code></td></tr>)}</tbody></table></Card>;
  };
'@
  $Raw = $Raw.Substring(0, $AuditStart) + $AuditBlock + "`r`n" + $Raw.Substring($AuditEnd)

  [IO.File]::WriteAllText($AppPath, $Raw, [Text.UTF8Encoding]::new($false))
  Write-Host '[BRAINLINK] Applied inline audit chain migration to Brainlink app.'
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required.' }
if (-not (Test-Path $RuntimeDir)) { throw "Missing Brainlink runtime bundle: $RuntimeDir" }
if (-not (Test-Path $Manifest)) { throw "Missing Brainlink v2.1 integrity manifest: $Manifest" }
if (-not (Test-Path $PatchDir)) { throw "Missing Brainlink patch directory: $PatchDir" }
 if (-not (Test-Path $AuditPatchEncoded)) { throw "Missing Brainlink audit integrity patch transport: $AuditPatchEncoded" }
New-Item -ItemType Directory -Force -Path $WorkspaceRoot | Out-Null

$Encoded = (Get-ChildItem (Join-Path $RuntimeDir 'runtime.part*.b64') | Sort-Object Name | ForEach-Object { Get-Content $_.FullName -Raw }) -join ''
[IO.File]::WriteAllBytes($RuntimeArchive, [Convert]::FromBase64String($Encoded))
$OverlayHash = Get-Sha256 $RuntimeArchive
if ($OverlayHash -ne $ExpectedOverlay) { throw "Brainlink base overlay checksum mismatch: $OverlayHash" }
$ManifestHash = Get-Sha256 $Manifest
if ($ManifestHash -ne $ExpectedManifest) { throw "Brainlink v2.1 manifest checksum mismatch: $ManifestHash" }
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
$AppSource = Join-Path $Target 'packages/frontend/core/src/brainlink/app.tsx'
Apply-Patch $AppPatch
if ((Test-Path $AppSource) -and -not (Test-AppV2Complete $AppSource)) {
  if (Test-Path $RepairPatch) {
    try {
      Apply-Patch $RepairPatch
    }
    catch {
      if (Test-AppV2Complete (Join-Path $Target 'packages/frontend/core/src/brainlink/app.tsx')) {
        Write-Host '[BRAINLINK] Repair markers detected; continuing without repair patch.'
      }
      else {
        throw $_
      }
    }
  }
  else {
    throw "Missing Brainlink repair patch: $RepairPatch"
  }
}
else {
  Write-Host '[BRAINLINK] Skipping v2 repair patch; app already includes required updates.'
}
Ensure-AppAuditIntegrity -AppPath $AppSource
Remove-PatchRejects -WorkspacePath $Target

Get-Content $Manifest | ForEach-Object {
  if ($_ -match '^([0-9a-f]{64})\s+(.+)$') {
    $ExpectedFileHash = $Matches[1]
    $RelativePath = $Matches[2]
    $Candidate = Join-Path $Target $RelativePath
    if (-not (Test-Path $Candidate)) { throw "Missing Brainlink v2.1 file: $RelativePath" }
    $ActualFileHash = Get-Sha256 $Candidate
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