# Launched by start-all.ps1
$Host.UI.RawUI.WindowTitle = 'Admin UI :5173'
$AdminRoot = Split-Path $PSScriptRoot -Parent
Set-Location (Join-Path $AdminRoot 'admin-ui')

if (-not (Test-Path 'node_modules')) {
    Write-Host 'Installing admin-ui dependencies...'
    npm install
}

Write-Host 'Admin UI: http://127.0.0.1:5173/admin/'
Write-Host 'Close this window to stop Admin UI.'
npm run dev
