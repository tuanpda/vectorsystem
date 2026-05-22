# Khoi dong toan bo Knowledge Platform (Windows)
# Usage: .\start-all.ps1
# Dung:  .\stop-all.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Scripts = Join-Path $Root 'scripts'
$MinerURoot = Join-Path (Split-Path -Parent $Root) 'MinerU'

function Write-Step($msg) {
    Write-Host ''
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Test-PortListening([int]$Port) {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $conn
}

function Stop-ListenersOnPort([int]$Port) {
    $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Write-Host "  Da dung process tren port $Port (PID $procId)" -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 2
}

function Test-HttpOk([string]$Url) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4
        return $r.StatusCode -ge 200 -and $r.StatusCode -lt 400
    } catch {
        return $false
    }
}

function Wait-HttpOk([string]$Url, [string]$Label, [int]$TimeoutSec = 120) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-HttpOk $Url) {
            Write-Host "  OK: $Label" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
    }
    Write-Warning "  Timeout: $Label ($Url)"
    return $false
}

function Start-ServiceWindow([string]$Title, [string]$LaunchScript, [string]$WorkDir) {
    Start-Process powershell -WorkingDirectory $WorkDir -ArgumentList @(
        '-NoExit',
        '-ExecutionPolicy', 'Bypass',
        '-File', $LaunchScript
    ) -WindowStyle Normal
}

Write-Host ''
Write-Host '  Knowledge Platform - Start All' -ForegroundColor White
Write-Host '  ==============================' -ForegroundColor White
Write-Host "  Root: $Root" -ForegroundColor White
Write-Host ''

# --- Docker ---
Write-Step '1/4 Docker (Postgres, Redis, MinIO)'
Set-Location $Root
try {
    docker info 2>&1 | Out-Null
} catch {
    Write-Error 'Docker Desktop chua chay. Mo Docker Desktop roi chay lai start-all.ps1'
}

docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Error 'docker compose up -d that bai'
}

Write-Host '  Cho container healthy...' -ForegroundColor DarkGray
Start-Sleep -Seconds 8
docker compose ps

# --- MinerU API ---
Write-Step '2/4 MinerU API (port 8000)'
$mineruLaunch = Join-Path $Scripts 'launch-mineru.ps1'
if (-not (Test-Path (Join-Path $MinerURoot 'run-mineru.ps1'))) {
    Write-Warning "Khong tim thay MinerU - bo qua"
} elseif (-not (Test-HttpOk 'http://127.0.0.1:8000/health')) {
    if (Test-PortListening 8000) { Stop-ListenersOnPort 8000 }
    Start-ServiceWindow 'MinerU' $mineruLaunch $MinerURoot
    Wait-HttpOk 'http://127.0.0.1:8000/docs' 'MinerU' 120 | Out-Null
} else {
    Write-Host '  MinerU da chay' -ForegroundColor Green
}

# --- Knowledge API ---
Write-Step '3/4 Knowledge API (port 3000)'
$apiLaunch = Join-Path $Scripts 'launch-api.ps1'
$apiHealth = 'http://127.0.0.1:3000/api/v1/health'
if (-not (Test-HttpOk $apiHealth)) {
    if (Test-PortListening 3000) { Stop-ListenersOnPort 3000 }
    Start-ServiceWindow 'API' $apiLaunch $Root
    Wait-HttpOk $apiHealth 'Knowledge API' 120 | Out-Null
} else {
    Write-Host '  Knowledge API da chay' -ForegroundColor Green
}

# --- Admin UI ---
Write-Step '4/4 Admin UI (port 5173)'
$adminLaunch = Join-Path $Scripts 'launch-admin.ps1'
$adminUrl = 'http://127.0.0.1:5173/admin/'
if (-not (Test-HttpOk $adminUrl)) {
    if (Test-PortListening 5173) {
        Write-Host '  Port 5173 co process nhung 127.0.0.1 khong vao duoc - khoi dong lai Admin' -ForegroundColor Yellow
        Stop-ListenersOnPort 5173
    }
    Start-ServiceWindow 'Admin' $adminLaunch $Root
    Wait-HttpOk $adminUrl 'Admin UI' 90 | Out-Null
} else {
    Write-Host '  Admin UI da chay' -ForegroundColor Green
}

Write-Host ''
Write-Host '  ==============================' -ForegroundColor Green
Write-Host '  San sang:' -ForegroundColor Green
Write-Host ''
Write-Host "  Admin:    $adminUrl" -ForegroundColor Green
Write-Host '  API:      http://127.0.0.1:3000/api/v1/health' -ForegroundColor Green
Write-Host '  Swagger:  http://127.0.0.1:3000/docs' -ForegroundColor Green
Write-Host '  MinerU:   http://127.0.0.1:8000' -ForegroundColor Green
Write-Host ''
Write-Host '  Dung tat ca: .\stop-all.ps1' -ForegroundColor Green
Write-Host '  Huong dan:   docs\HUONG-DAN-HE-THONG.pdf' -ForegroundColor Green
Write-Host ''

Start-Process $adminUrl -ErrorAction SilentlyContinue
