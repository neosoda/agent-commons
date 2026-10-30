# Assemble a portable Windows package from the npm tarball, with a verified official Node executable.
param([string]$OutDirectory = 'artifacts/portable')
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$nodeVersion = 'v24.22.2'
$official = 'https://nodejs.org/dist/' + $nodeVersion
$root = (Get-Location).Path
$out = Join-Path $root $OutDirectory
$stage = Join-Path $out 'AgentCommonsPortable'
$app = Join-Path $stage 'app'
$runtime = Join-Path $stage 'runtime'
New-Item -ItemType Directory -Path $app, $runtime -Force | Out-Null

Write-Host 'Packing the published package layout...'
$packed = & npm pack --pack-destination $out --silent
if ($LASTEXITCODE -ne 0 -or -not $packed) { throw 'npm pack failed.' }
$tarball = Join-Path $out ($packed | Select-Object -Last 1).Trim()
if (-not (Test-Path -LiteralPath $tarball)) { throw 'Package tarball missing.' }
& npm install --prefix $app --omit=dev --ignore-scripts --no-audit --no-fund --no-save $tarball
if ($LASTEXITCODE -ne 0) { throw 'Production package install failed.' }

Write-Host 'Downloading and validating official pinned Node executable...'
$sumFile = Join-Path $out 'SHASUMS256.txt'
$nodeExe = Join-Path $runtime 'node.exe'
Invoke-WebRequest -Uri ($official + '/SHASUMS256.txt') -OutFile $sumFile
Invoke-WebRequest -Uri ($official + '/win-x64/node.exe') -OutFile $nodeExe
$entry = Get-Content $sumFile | Where-Object { $_ -match '^[0-9a-fA-F]{64}\s+win-x64/node\.exe$' } | Select-Object -First 1
if (-not $entry) { throw 'The official SHA256 list has no win-x64/node.exe entry.' }
$expected = ($entry -split '\s+')[0].ToLowerInvariant()
$actual = (Get-FileHash -LiteralPath $nodeExe -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) {
  Remove-Item -LiteralPath $nodeExe -Force
  throw 'Official Node SHA256 verification failed.'
}
Remove-Item -LiteralPath $sumFile -Force
Write-Host ('Node runtime SHA256 verified: ' + $actual)

$launch = @'
@echo off
setlocal
cd /d "%~dp0"
"%~dp0runtime\node.exe" "%~dp0app\node_modules\@neosoda\agent-commons\dist\cli\index.js" web %*
if errorlevel 1 (
  echo.
  echo Agent Commons could not start. Please review the error.
  pause
)
endlocal
'@
Set-Content -LiteralPath (Join-Path $stage 'Start-AgentCommons.cmd') -Value $launch -Encoding ascii
$instructions = @'
AGENT COMMONS - WINDOWS PORTABLE / VERSION PORTABLE
==================================================
ENGLISH
1. Extract the COMPLETE ZIP to a folder you own.
2. Open AgentCommonsPortable and double-click Start-AgentCommons.cmd.
3. Your browser opens the local Skill Hub (http://127.0.0.1:4173).
4. Keep the console open; Ctrl+C stops the server.

FRANCAIS
1. Extraire TOUTE l'archive ZIP dans un dossier personnel.
2. Ouvrir AgentCommonsPortable puis Start-AgentCommons.cmd.
3. Le Skill Hub s'ouvre dans le navigateur (http://127.0.0.1:4173).
4. Garder la console ouverte ; Ctrl+C pour arreter le serveur.

No administrator rights or separate Node installation required.
Aucune installation de Node.js ni droits administrateur necessaires.
The dashboard is LOCAL ONLY, with no login: NEVER publish port 4173.
Interface LOCALE SANS AUTHENTIFICATION : ne jamais exposer le port 4173.

Options : Start-AgentCommons.cmd --port 5180
          Start-AgentCommons.cmd --no-open
          Start-AgentCommons.cmd --home "C:\temporary-test-profile"

Official release and checksum:
https://github.com/neosoda/agent-commons/releases
Source: https://github.com/neosoda/agent-commons
'@
Set-Content -LiteralPath (Join-Path $stage 'README-Windows.txt') -Value $instructions -Encoding utf8

Write-Host 'Smoke-testing bundled runtime and local HTTP dashboard...'
$cli = Join-Path $app 'node_modules\@neosoda\agent-commons\dist\cli\index.js'
& $nodeExe $cli --help | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Portable CLI boot failed.' }
$port = Get-Random -Minimum 44000 -Maximum 55000
$argumentString = ('"' + $cli + '" web --no-open --port ' + $port)
$server = Start-Process -FilePath $nodeExe -ArgumentList $argumentString -PassThru -NoNewWindow
try {
  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    if ($server.HasExited) { throw 'Portable web server quit unexpectedly.' }
    try {
      $response = Invoke-WebRequest -Uri ('http://127.0.0.1:' + $port + '/') -TimeoutSec 2
      if ($response.StatusCode -eq 200 -and $response.Content.Contains('Skill Hub')) {
        $ready = $true
        break
      }
    } catch { Start-Sleep -Milliseconds 400 }
  }
  if (-not $ready) { throw 'Portable HTTP dashboard never became healthy.' }
  Write-Host 'PASS: bundled runtime serves the dashboard over loopback.'
} finally {
  if (-not $server.HasExited) { Stop-Process -Id $server.Id -Force }
}
$zip = Join-Path $out 'AgentCommons-win-x64-portable.zip'
Compress-Archive -Path $stage -DestinationPath $zip -CompressionLevel Optimal -Force
$sha = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath ($zip + '.sha256') -Value ($sha + '  ' + (Split-Path $zip -Leaf)) -Encoding ascii
Write-Host ('PORTABLE_SHA256: ' + $sha)

# Product-quality gate: re-extract the final ZIP into a clean directory (with spaces),
# then run ONLY the embedded Node binary and the installed package from that ZIP.
# This catches missing entries, bad relative paths and errors hidden by source-tree smoke tests.
Write-Host 'Verifying final ZIP from a clean extracted location...'
$unpacked = Join-Path $out 'portable clean extraction'
$smokeHome = Join-Path $out 'portable synthetic home'
New-Item -ItemType Directory -Path $unpacked, $smokeHome -Force | Out-Null
$extractedServer = $null
try {
  Expand-Archive -LiteralPath $zip -DestinationPath $unpacked -Force
  $bundle = Join-Path $unpacked 'AgentCommonsPortable'
  $embeddedNode = Join-Path $bundle 'runtime\node.exe'
  $embeddedCli = Join-Path $bundle 'app\node_modules\@neosoda\agent-commons\dist\cli\index.js'
  foreach ($required in @($embeddedNode, $embeddedCli, (Join-Path $bundle 'Start-AgentCommons.cmd'), (Join-Path $bundle 'README-Windows.txt'))) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw ('ZIP missing: ' + $required) }
  }
  & $embeddedNode $embeddedCli --help | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'ZIP-extracted CLI cannot boot.' }
  $extractedManifestPath = Join-Path $bundle 'app\node_modules\@neosoda\agent-commons\package.json'
  if (-not (Test-Path -LiteralPath $extractedManifestPath)) { throw 'ZIP missing packaged manifest.' }
  $extractedManifest = Get-Content -LiteralPath $extractedManifestPath -Raw | ConvertFrom-Json
  $expectedVersion = (Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
  $zipCliVersion = (& $embeddedNode $embeddedCli --version | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $extractedManifest.version -ne $expectedVersion -or $zipCliVersion -ne $expectedVersion) {
    throw ('ZIP version mismatch: package=' + $extractedManifest.version + ', CLI=' + $zipCliVersion + ', expected=' + $expectedVersion)
  }
  $cleanPort = Get-Random -Minimum 44000 -Maximum 55000
  $cleanArgs = ('"' + $embeddedCli + '" web --no-open --home "' + $smokeHome + '" --port ' + $cleanPort)
  $extractedServer = Start-Process -FilePath $embeddedNode -ArgumentList $cleanArgs -PassThru -NoNewWindow
  $healthy = $false
  for ($i = 0; $i -lt 40; $i++) {
    if ($extractedServer.HasExited) { throw 'ZIP-extracted Skill Hub terminated during startup.' }
    try {
      $result = Invoke-WebRequest -Uri ('http://127.0.0.1:' + $cleanPort + '/') -TimeoutSec 2
      if ($result.StatusCode -eq 200 -and $result.Content.Contains('Skill Hub')) {
        $healthy = $true
        break
      }
    } catch { Start-Sleep -Milliseconds 400 }
  }
  if (-not $healthy) { throw 'ZIP-extracted Skill Hub did not serve HTTP 200.' }
  $checksumLine = (Get-Content -LiteralPath ($zip + '.sha256') -Raw).Trim()
  if ($checksumLine -ne ($sha + '  ' + (Split-Path $zip -Leaf))) {
    throw 'Published checksum does not match the built ZIP.'
  }
  Write-Host 'PASS: extracted ZIP, embedded runtime, isolated home, localhost dashboard, checksum.'
} finally {
  if ($extractedServer -and -not $extractedServer.HasExited) {
    Stop-Process -Id $extractedServer.Id -Force
  }
  Remove-Item -LiteralPath $unpacked, $smokeHome -Recurse -Force -ErrorAction SilentlyContinue
}
