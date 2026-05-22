# Launched by start-all.ps1
$Host.UI.RawUI.WindowTitle = 'Knowledge API :3000'
$AdminRoot = Split-Path $PSScriptRoot -Parent
Set-Location (Join-Path $AdminRoot 'api')

if (-not (Test-Path '.env')) {
    if (Test-Path '..\.env') { Copy-Item '..\.env' '.env' }
    elseif (Test-Path '..\.env.example') {
        Copy-Item '..\.env.example' '.env'
        Write-Warning 'Copied .env.example - set OPENAI_API_KEY in api/.env'
    }
}

if (-not (Test-Path 'node_modules')) { npm install }

Write-Host 'Knowledge API: http://127.0.0.1:3000/api/v1/health'
Write-Host 'Swagger: http://127.0.0.1:3000/docs'
Write-Host 'Close this window to stop API.'
npm run start:dev
