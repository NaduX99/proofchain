$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
    Write-Host ".env does not exist. Creating it from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Open .env and replace every change_me value before continuing." -ForegroundColor Red
    exit 1
}

docker compose up -d
docker compose ps
