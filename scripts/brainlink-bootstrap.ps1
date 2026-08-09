[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ForwardArgs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ScriptRoot = Split-Path -Parent $PSScriptRoot
$ElevatedMarker = '--brainlink-bootstrap-elevated'
$WasRelaunchedElevated = $ForwardArgs -contains $ElevatedMarker
$ForwardArgs = @($ForwardArgs | Where-Object { $_ -ne $ElevatedMarker })

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-BrainlinkHome {
  $base = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { $env:USERPROFILE }
  $candidates = @()
  if ($env:BRAINLINK_HOME) { $candidates += [IO.Path]::GetFullPath($env:BRAINLINK_HOME) }
  if (Test-Path 'D:\') { $candidates += 'D:\AIIA\01-apps-canonicos\26-Brainlink' }
  $candidates += (Join-Path $base 'Brainlink')
  foreach ($candidate in ($candidates | Select-Object -Unique)) {
    try {
      New-Item -ItemType Directory -Path $candidate -Force | Out-Null
      $probe = Join-Path $candidate ".brainlink-write-test-$PID"
      Set-Content -LiteralPath $probe -Value 'ok' -Encoding ASCII
      Remove-Item -LiteralPath $probe -Force
      return $candidate
    } catch {
      if ($env:BRAINLINK_HOME -and $candidate -eq [IO.Path]::GetFullPath($env:BRAINLINK_HOME)) { throw }
    }
  }
  throw 'Nenhum local gravavel foi encontrado para instalar o Brainlink.'
}

$BrainlinkHome = Get-BrainlinkHome
$ToolsRoot = Join-Path $BrainlinkHome 'tools'
$StateRoot = Join-Path $BrainlinkHome 'state'
$LogsRoot = Join-Path $BrainlinkHome 'logs'
$CacheRoot = Join-Path $BrainlinkHome 'cache\downloads'
$QuarantineRoot = Join-Path $BrainlinkHome 'quarantine\bootstrap'
foreach ($directory in @($BrainlinkHome, $ToolsRoot, $StateRoot, $LogsRoot, $CacheRoot, $QuarantineRoot)) {
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
}
$env:BRAINLINK_HOME = $BrainlinkHome

$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Transcript = Join-Path $LogsRoot "bootstrap-$Timestamp.log"
try { Start-Transcript -Path $Transcript -Append -Force | Out-Null } catch { }

function Write-Step([string]$Message) {
  Write-Host "[BRAINLINK] $Message" -ForegroundColor Cyan
}

function Invoke-Download([string]$Uri, [string]$Destination) {
  $partial = "$Destination.partial"
  Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue
  Write-Step "Baixando $Uri"
  Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $partial -Headers @{ 'User-Agent' = 'Brainlink-OneClick/1.0' }
  Move-Item -LiteralPath $partial -Destination $Destination -Force
}

function Assert-Sha256([string]$File, [string]$Expected) {
  $actual = (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $Expected.ToLowerInvariant()) {
    throw "Checksum SHA-256 invalido para $File. Esperado $Expected; recebido $actual."
  }
}

function Move-ToQuarantine([string]$Path, [string]$Reason) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $name = [IO.Path]::GetFileName($Path.TrimEnd('\'))
  $destination = Join-Path $QuarantineRoot "$name-$Timestamp"
  Write-Step "Preservando item invalido em quarentena ($Reason): $destination"
  Move-Item -LiteralPath $Path -Destination $destination -Force
}

function Get-WindowsArchitecture {
  $architecture = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
  switch ($architecture.ToUpperInvariant()) {
    'AMD64' { return 'x64' }
    'ARM64' { return 'arm64' }
    default { throw "Arquitetura Windows nao suportada pelo Brainlink: $architecture. Use Windows x64 ou ARM64." }
  }
}

function Ensure-PortableNode([string]$Architecture) {
  $version = '22.23.0'
  $archiveName = "node-v$version-win-$Architecture.zip"
  $expected = switch ($Architecture) {
    'x64' { '425a5bd68cc95e8eb16bcccd0a75081b48983fc6a26f67126bd4d6c7198231e8' }
    'arm64' { '8d540a7a1eeb3ff6681f516c47d786964b874acdaa4fd83338d6898bbb4f68a4' }
  }
  $install = Join-Path $ToolsRoot "node-v$version-win-$Architecture"
  $node = Join-Path $install 'node.exe'
  if (Test-Path -LiteralPath $node) {
    $actualVersion = (& $node -p 'process.versions.node').Trim()
    if ($LASTEXITCODE -eq 0 -and $actualVersion -eq $version) {
      Write-Step "Node.js portatil verificado: v$actualVersion"
      return $node
    }
    Move-ToQuarantine $install 'Node portatil incompleto ou versao incorreta'
  }

  $archive = Join-Path $CacheRoot $archiveName
  if (-not (Test-Path -LiteralPath $archive)) {
    Invoke-Download "https://nodejs.org/download/release/v$version/$archiveName" $archive
  }
  try { Assert-Sha256 $archive $expected } catch {
    Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
    Invoke-Download "https://nodejs.org/download/release/v$version/$archiveName" $archive
    Assert-Sha256 $archive $expected
  }

  $temporary = Join-Path $ToolsRoot "node-extract-$Timestamp"
  Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $temporary -Force | Out-Null
  Expand-Archive -LiteralPath $archive -DestinationPath $temporary -Force
  $extracted = Join-Path $temporary "node-v$version-win-$Architecture"
  if (-not (Test-Path -LiteralPath (Join-Path $extracted 'node.exe'))) {
    throw "Arquivo oficial do Node foi extraido, mas node.exe nao foi encontrado."
  }
  if (Test-Path -LiteralPath $install) { Move-ToQuarantine $install 'substituicao atomica do Node' }
  Move-Item -LiteralPath $extracted -Destination $install
  Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue
  $actualVersion = (& $node -p 'process.versions.node').Trim()
  if ($LASTEXITCODE -ne 0 -or $actualVersion -ne $version) {
    throw "Node portatil nao iniciou corretamente depois da instalacao."
  }
  Write-Step "Node.js portatil instalado e verificado: v$actualVersion"
  return $node
}

function Test-GitExecutable([string]$GitExe) {
  if (-not (Test-Path -LiteralPath $GitExe)) { return $false }
  try {
    $version = (& $GitExe --version 2>$null)
    return $LASTEXITCODE -eq 0 -and $version -match '^git version '
  } catch { return $false }
}

function Ensure-PortableGit([string]$Architecture) {
  $install = Join-Path $ToolsRoot 'mingit'
  $gitExe = Join-Path $install 'cmd\git.exe'
  $releaseState = Join-Path $StateRoot 'mingit-release.txt'
  $release = $null
  try {
    Write-Step 'Consultando release oficial do Git for Windows...'
    $release = Invoke-RestMethod -UseBasicParsing -Uri 'https://api.github.com/repos/git-for-windows/git/releases/latest' -Headers @{ 'User-Agent' = 'Brainlink-OneClick/1.0'; 'Accept' = 'application/vnd.github+json' }
  } catch {
    if (Test-GitExecutable $gitExe) {
      Write-Warning "Nao foi possivel consultar atualizacao do Git; usando copia portatil verificada existente. $($_.Exception.Message)"
      return $gitExe
    }
    throw "Nao foi possivel consultar o Git for Windows e nao existe cache funcional. $($_.Exception.Message)"
  }

  $asset = if ($Architecture -eq 'arm64') {
    $release.assets | Where-Object { $_.name -match '^MinGit-.*-arm64\.zip$' } | Select-Object -First 1
  } else {
    $release.assets | Where-Object { $_.name -match '^MinGit-.*-64-bit\.zip$' } | Select-Object -First 1
  }
  if (-not $asset) { throw "Release $($release.tag_name) nao contem MinGit para $Architecture." }

  $wanted = "$($release.id)|$($asset.id)|$($asset.name)"
  $installed = if (Test-Path -LiteralPath $releaseState) { (Get-Content -LiteralPath $releaseState -Raw).Trim() } else { '' }
  if ($installed -eq $wanted -and (Test-GitExecutable $gitExe)) {
    Write-Step "MinGit portatil atualizado: $($release.tag_name)"
    return $gitExe
  }

  $archive = Join-Path $CacheRoot $asset.name
  Invoke-Download $asset.browser_download_url $archive
  $digestVerified = $false
  if ($asset.PSObject.Properties.Name -contains 'digest' -and $asset.digest -match '^sha256:([0-9a-fA-F]{64})$') {
    Assert-Sha256 $archive $Matches[1]
    $digestVerified = $true
  }

  $temporary = Join-Path $ToolsRoot "mingit-extract-$Timestamp"
  Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $temporary -Force | Out-Null
  Expand-Archive -LiteralPath $archive -DestinationPath $temporary -Force
  $candidate = Join-Path $temporary 'cmd\git.exe'
  if (-not (Test-GitExecutable $candidate)) { throw 'MinGit foi extraido, mas git.exe nao iniciou.' }

  $signature = Get-AuthenticodeSignature -LiteralPath $candidate
  $signatureValid = $signature.Status -eq [System.Management.Automation.SignatureStatus]::Valid
  if (-not $digestVerified -and -not $signatureValid) {
    throw "Nao foi possivel validar o MinGit: release sem digest SHA-256 e assinatura Authenticode $($signature.Status)."
  }
  if ($signatureValid) {
    Write-Step "Assinatura Authenticode do Git verificada: $($signature.SignerCertificate.Subject)"
  } elseif ($digestVerified) {
    Write-Step 'Digest SHA-256 publicado pelo GitHub verificado para o MinGit.'
  }

  if (Test-Path -LiteralPath $install) { Move-ToQuarantine $install 'atualizacao atomica do MinGit' }
  Move-Item -LiteralPath $temporary -Destination $install
  Set-Content -LiteralPath $releaseState -Value $wanted -Encoding UTF8
  $gitExe = Join-Path $install 'cmd\git.exe'
  if (-not (Test-GitExecutable $gitExe)) { throw 'Git portatil nao iniciou depois da instalacao.' }
  Write-Step "MinGit portatil instalado: $(& $gitExe --version)"
  return $gitExe
}

function Test-SymbolicLinkCapability {
  $testRoot = Join-Path $StateRoot "symlink-test-$PID"
  try {
    New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
    $target = Join-Path $testRoot 'target.txt'
    $link = Join-Path $testRoot 'link.txt'
    Set-Content -LiteralPath $target -Value 'brainlink' -Encoding ASCII
    New-Item -ItemType SymbolicLink -Path $link -Target $target -Force -ErrorAction Stop | Out-Null
    return (Test-Path -LiteralPath $link)
  } catch {
    return $false
  } finally {
    Remove-Item -LiteralPath $testRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Enable-WindowsDevelopmentCapabilities {
  if (-not (Test-IsAdministrator)) { return }
  try {
    New-Item -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock' -Force | Out-Null
    New-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock' -Name 'AllowDevelopmentWithoutDevLicense' -PropertyType DWord -Value 1 -Force | Out-Null
  } catch { Write-Warning "Nao foi possivel habilitar Developer Mode por registro: $($_.Exception.Message)" }
  try {
    New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'LongPathsEnabled' -PropertyType DWord -Value 1 -Force | Out-Null
  } catch { Write-Warning "Nao foi possivel habilitar long paths por registro: $($_.Exception.Message)" }
}

function Relaunch-ElevatedIfNeeded {
  if (Test-SymbolicLinkCapability) { return }
  if (Test-IsAdministrator) {
    Enable-WindowsDevelopmentCapabilities
    if (-not (Test-SymbolicLinkCapability)) {
      Write-Warning 'O Windows nao concedeu symlink sem privilegio, mas o instalador elevado continuara com permissao administrativa.'
    }
    return
  }
  if ($WasRelaunchedElevated) { throw 'Permissao de symlink continua indisponivel depois da elevacao.' }

  Write-Step 'O AFFiNE usa links simbolicos. Solicitando uma unica elevacao UAC para habilitar Developer Mode/long paths...'
  $arguments = @('-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", $ElevatedMarker) + $ForwardArgs
  $process = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Verb RunAs -ArgumentList $arguments -Wait -PassThru
  try { Stop-Transcript | Out-Null } catch { }
  exit $process.ExitCode
}

try {
  Write-Step "Home canonico: $BrainlinkHome"
  $architecture = Get-WindowsArchitecture
  $nodeExe = Ensure-PortableNode $architecture
  $gitExe = Ensure-PortableGit $architecture

  $env:BRAINLINK_GIT = $gitExe
  $env:GIT_CONFIG_GLOBAL = Join-Path $StateRoot 'gitconfig'
  $gitBin = Split-Path -Parent $gitExe
  $gitUsrBin = Join-Path (Split-Path -Parent $gitBin) 'usr\bin'
  $nodeBin = Split-Path -Parent $nodeExe
  $env:PATH = "$nodeBin;$gitBin;$gitUsrBin;$env:PATH"
  $tarExe = Join-Path $gitUsrBin 'tar.exe'
  if (Test-Path -LiteralPath $tarExe) { $env:BRAINLINK_TAR = $tarExe }

  & $gitExe config --global core.longpaths true
  & $gitExe config --global core.symlinks true
  & $gitExe config --global core.autocrlf false
  if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel configurar o Git portatil.' }

  Relaunch-ElevatedIfNeeded
  Enable-WindowsDevelopmentCapabilities

  $entry = Join-Path $ScriptRoot 'scripts\brainlink-one-click.mjs'
  if (-not (Test-Path -LiteralPath $entry)) { throw "Entrypoint Brainlink ausente: $entry" }
  Write-Step 'Iniciando atualizacao, materializacao, testes, build, health check e abertura...'
  & $nodeExe $entry @ForwardArgs
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) { throw "Brainlink terminou com codigo $exitCode." }
  Write-Step "Brainlink concluido. Log de bootstrap: $Transcript"
  try { Stop-Transcript | Out-Null } catch { }
  exit 0
} catch {
  Write-Host "[BRAINLINK] FALHA: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "[BRAINLINK] Log: $Transcript" -ForegroundColor Yellow
  try { Stop-Transcript | Out-Null } catch { }
  exit 1
}
