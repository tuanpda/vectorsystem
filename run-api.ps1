# Start Knowledge API (NestJS) on port 3000
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $Root 'api')

if (-not (Test-Path '.env')) {
    if (Test-Path '..\.env') {
        Copy-Item '..\.env' '.env'
    }
    elseif (Test-Path '..\.env.example') {
        Copy-Item '..\.env.example' '.env'
        Write-Warning 'Copied .env.example - set OPENAI_API_KEY in api/.env'
    }
}

if (-not (Test-Path 'node_modules')) {
    npm install
}

Write-Host 'Knowledge API: http://127.0.0.1:3000/api/v1/health'
Write-Host 'Swagger: http://127.0.0.1:3000/docs'
npm run start:dev
