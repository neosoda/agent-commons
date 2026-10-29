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
AGENT COMMONS - WINDOWS PORTABLE
================================
1. Extract the complete ZIP into a user-owned folder.
2. Double-click Start-AgentCommons.cmd.
3. Your browser opens http://127.0.0.1:4173.
4. Keep the console open, use Ctrl+C to stop the server.

No administrator privileges, Node installation, background service, or
publicly accessible listener are needed. Data stays in your user profile.

Options: Start-AgentCommons.cmd --port 5180
         Start-AgentCommons.cmd --no-open
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
