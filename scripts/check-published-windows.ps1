# Offline acceptance of the PUBLISHED Windows ZIP (not the source checkout).
# Run on an independent Windows PC with PowerShell 5.1+; no Node/npm needed.
param(
  [Parameter(Mandatory = $true)][string]$ZipPath,
  [string]$ChecksumPath = '',
  [switch]$KeepFiles
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$zip = (Resolve-Path -LiteralPath $ZipPath).Path
if (-not $ChecksumPath) { $ChecksumPath = $zip + '.sha256' }
$checksum = (Resolve-Path -LiteralPath $ChecksumPath).Path
$entry = (Get-Content -LiteralPath $checksum -Raw).Trim()
if ($entry -notmatch '^([0-9a-fA-F]{64})\s+AgentCommons-win-x64-portable\.zip$') {
  throw 'Invalid SHA-256 checksum file for Agent Commons Windows portable.'
}
$expected = $Matches[1].ToLowerInvariant()
$actual = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw 'Release archive checksum mismatch. Do not execute.' }
Write-Host ('PASS: SHA-256 ' + $actual)

$root = Join-Path $env:TEMP ('Agent Commons release check ' + [guid]::NewGuid().ToString('N'))
$unpacked = Join-Path $root 'portable release with spaces'
$testHome = Join-Path $root 'synthetic user home'
New-Item -ItemType Directory -Force -Path $unpacked, $testHome | Out-Null
$server = $null
try {
  Expand-Archive -LiteralPath $zip -DestinationPath $unpacked -Force
  $bundle = Join-Path $unpacked 'AgentCommonsPortable'
  $node = Join-Path $bundle 'runtime\node.exe'
  $cli = Join-Path $bundle 'app\node_modules\@neosoda\agent-commons\dist\cli\index.js'
  foreach ($file in @($node, $cli, (Join-Path $bundle 'Start-AgentCommons.cmd'))) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
      throw ('Incomplete release ZIP, missing ' + $file)
    }
  }
  $version = (& $node $cli --version | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $version -ne '0.3.0') {
    throw ('Incorrect release CLI version: ' + $version)
  }
  Write-Host ('PASS: embedded Node and CLI v' + $version)
  $port = Get-Random -Minimum 44000 -Maximum 55000
  $arguments = ('"' + $cli + '" web --no-open --home "' + $testHome + '" --port ' + $port)
  $server = Start-Process -FilePath $node -ArgumentList $arguments -PassThru -NoNewWindow
  $healthy = $false
  for ($i = 0; $i -lt 40; $i++) {
    if ($server.HasExited) { throw 'Portable Skill Hub exited before responding.' }
    try {
      $response = Invoke-WebRequest -Uri ('http://127.0.0.1:' + $port + '/') -TimeoutSec 2 -UseBasicParsing
      if ($response.StatusCode -eq 200 -and $response.Content.Contains('Skill Hub')) {
        $healthy = $true
        break
      }
    } catch { Start-Sleep -Milliseconds 400 }
  }
  if (-not $healthy) { throw 'Portable Skill Hub failed HTTP loopback smoke.' }
  $data = Invoke-WebRequest -Uri ('http://127.0.0.1:' + $port + '/api/state') -TimeoutSec 2 -UseBasicParsing
  if ($data.StatusCode -ne 200) { throw 'The local read-only workspace API did not respond.' }
  Write-Host 'PASS: local-only dashboard and read-only API under isolated HOME'
  Write-Host 'The package is ready for a manual UI/keyboard/NVDA acceptance session.'
} finally {
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force }
  if ($KeepFiles) { Write-Host ('Synthetic test files retained at ' + $root) }
  elseif (Test-Path -LiteralPath $root) {
    Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
  }
}
