# Alpaca - Tek komutla başlat
# Kullanım: .\start.ps1

$rootDir = $PSScriptRoot
$appDir  = Join-Path $rootDir "electron-app"

Write-Host "🐋 MongoDB başlatılıyor..." -ForegroundColor Cyan
docker compose -f "$rootDir\docker-compose.yml" up -d

Write-Host "⏳ MongoDB hazır olana kadar bekleniyor..." -ForegroundColor Yellow
$tries = 0
do {
    Start-Sleep -Seconds 2
    $status = docker inspect --format "{{.State.Health.Status}}" alpaca-mongo 2>$null
    $tries++
    if ($tries -gt 15) { Write-Host "⚠️  MongoDB zaman aşımı, devam ediliyor..." -ForegroundColor Yellow; break }
} while ($status -ne "healthy")

Write-Host "✅ MongoDB hazır." -ForegroundColor Green
Write-Host "🦙 Alpaca başlatılıyor..." -ForegroundColor Cyan

Set-Location $appDir
npm start
