# Launched by start-all.ps1
$Host.UI.RawUI.WindowTitle = 'MinerU API :8000'
$AdminRoot = Split-Path $PSScriptRoot -Parent
$MinerURoot = Join-Path (Split-Path $AdminRoot -Parent) 'MinerU'
Set-Location $MinerURoot
Write-Host 'MinerU API: http://127.0.0.1:8000'
Write-Host 'Lan dau chay co the load model 1-2 phut — cho den khi thay log san sang.'
Write-Host 'Kiem tra: http://127.0.0.1:8000/docs mo duoc trong trinh duyet.'
Write-Host 'Close this window to stop MinerU.'
& (Join-Path $MinerURoot 'run-mineru.ps1') api
