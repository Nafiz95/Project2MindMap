param(
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$MetadataUrl = "http://127.0.0.1:$Port/api/metadata"

try {
    $Metadata = Invoke-RestMethod $MetadataUrl -TimeoutSec 5
}
catch {
    Write-Error "Could not read $MetadataUrl. Start the backend with .\scripts\start.ps1."
    exit 1
}

$RequiredFields = @("database_profile", "code_profile_version", "api_prefix", "server_started_at")
foreach ($Field in $RequiredFields) {
    if (-not $Metadata.PSObject.Properties.Name.Contains($Field) -or -not $Metadata.$Field) {
        Write-Error "Backend response is stale or incompatible: missing '$Field'. Stop the old backend and restart with .\scripts\start.ps1."
        exit 1
    }
}

Write-Host "Project2MindMap runtime"
Write-Host "  URL: http://127.0.0.1:$Port"
Write-Host "  API: $($Metadata.api_prefix)"
Write-Host "  Code profile: $($Metadata.code_profile_version)"
Write-Host "  Started: $($Metadata.server_started_at)"
Write-Host "  Database: $($Metadata.database_name)"
Write-Host "  Database profile: $($Metadata.database_profile)"
Write-Host "  Status: $($Metadata.database_status)"
Write-Host "  Populated: $($Metadata.is_populated)"

if ($Metadata.database_name -ne "llm_wiki.db") {
    Write-Warning "Active database is not llm_wiki.db. This may be intentional if you switched databases."
}
