# Tao docs/HUONG-DAN-HE-THONG.pdf
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Script = Join-Path $Root "scripts\build-guide-pdf.py"
$Pdf = Join-Path $Root "docs\HUONG-DAN-HE-THONG.pdf"
$Html = Join-Path $Root "docs\HUONG-DAN-HE-THONG.html"

if (Get-Command python -ErrorAction SilentlyContinue) {
    python $Script
    if (Test-Path $Pdf) { exit 0 }
}

Write-Host "Mo HTML de in ra PDF (Ctrl+P):" -ForegroundColor Yellow
Start-Process $Html
