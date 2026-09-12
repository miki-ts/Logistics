# start.ps1 — Load .env and start the YM Logistics admin server
# Usage: .\start.ps1
# Run this from the admin\ directory

$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$") {
            $name  = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Host "  Loaded: $name" -ForegroundColor DarkGray
        }
    }
    Write-Host "✔  .env loaded" -ForegroundColor Green
} else {
    Write-Host "⚠  No .env file found — make sure environment variables are set manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting YM Admin server…" -ForegroundColor Cyan
node "$PSScriptRoot\server.js"
