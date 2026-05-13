param(
    [int]$Port = 8000,
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$FrontendIndex = Join-Path $Root "frontend\dist\index.html"
$MetadataUrl = "http://127.0.0.1:$Port/api/metadata"

if (-not $NoBuild -and -not (Test-Path $FrontendIndex)) {
    & (Join-Path $PSScriptRoot "build-ui.ps1")
}

try {
    $Existing = Invoke-RestMethod $MetadataUrl -TimeoutSec 2
    if ($Existing.code_profile_version -eq "llm_wiki_native_v1" -and $Existing.api_prefix -eq "/api") {
        Write-Host "Compatible Project2MindMap backend is already running."
        Write-Host "Open http://127.0.0.1:$Port"
        Write-Host "Database: $($Existing.database_name) ($($Existing.database_profile))"
        exit 0
    }

    Write-Error "Port $Port is occupied by an incompatible Project2MindMap backend. Stop the old backend, then rerun .\scripts\start.ps1."
    exit 1
}
catch {
    $Listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($Listener) {
        Write-Error "Port $Port is already in use, but it is not serving compatible /api/metadata. Stop that process before starting Project2MindMap."
        exit 1
    }
}

Remove-Item Env:\PROJECT2MINDMAP_DB -ErrorAction SilentlyContinue

Write-Host "Starting Project2MindMap at http://127.0.0.1:$Port"
Write-Host "API metadata will be available at $MetadataUrl"

Push-Location $Backend
try {
    python -m uvicorn app.main:app --host 127.0.0.1 --port $Port
}
finally {
    Pop-Location
}
