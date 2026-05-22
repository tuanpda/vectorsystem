# Dung cac dich vu dev Knowledge Platform (Windows)
# Usage: .\stop-all.ps1

$ErrorActionPreference = "SilentlyContinue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Dung Knowledge Platform..." -ForegroundColor Cyan

function Stop-Port([int]$Port, [string]$Label) {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) {
        Write-Host "  $Label (port $Port) - khong chay" -ForegroundColor DarkGray
        return
    }
    $pids = $conns.OwningProcess | Sort-Object -Unique
    foreach ($procId in $pids) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Write-Host "  Da dung $Label (PID $procId, port $Port)" -ForegroundColor Yellow
    }
}

Stop-Port -Port 5173 -Label "Admin UI"
Stop-Port -Port 3000 -Label "Knowledge API"
Stop-Port -Port 8000 -Label "MinerU API"

Set-Location $Root
Write-Host ""
Write-Host "Docker (tuy chon - giu data):" -ForegroundColor Cyan
Write-Host "  docker compose stop   # tam dung container"
Write-Host "  docker compose down   # go container (giu volume)"
Write-Host ""

$stopDocker = Read-Host "Tam dung Docker containers? (y/N)"
if ($stopDocker -eq 'y' -or $stopDocker -eq 'Y') {
    docker compose stop
    Write-Host "  Docker da stop." -ForegroundColor Green
}

Write-Host ""
Write-Host "Xong. Dong cac cua so PowerShell MinerU/API/Admin neu con mo." -ForegroundColor Green
