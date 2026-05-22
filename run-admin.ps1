# Start Admin UI (Vite dev) - API must run on port 3000
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $Root 'admin-ui')

if (-not (Test-Path 'node_modules')) {
    Write-Host 'Installing admin-ui dependencies...'
    npm install
}

Write-Host 'Admin UI: http://127.0.0.1:5173/admin/'
Write-Host ''
Write-Host 'CANH BAO: Can chay API truoc (terminal khac):'
Write-Host "  cd $Root"
Write-Host '  .\run-api.ps1'
Write-Host ''
npm run dev
