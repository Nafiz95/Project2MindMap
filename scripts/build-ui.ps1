$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root "frontend"
$NodeInstallDir = "C:\Program Files\nodejs"

if ((Test-Path (Join-Path $NodeInstallDir "node.exe")) -and ($env:PATH -notlike "*$NodeInstallDir*")) {
    $env:PATH = "$NodeInstallDir;$env:PATH"
}

$NpmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $NpmCommand) {
    $NpmCommand = Get-Command npm -ErrorAction Stop
}

Push-Location $Frontend
try {
    & $NpmCommand.Source install
    & $NpmCommand.Source run build
}
finally {
    Pop-Location
}
