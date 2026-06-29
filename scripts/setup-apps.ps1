$ErrorActionPreference = "Stop"

if (-not (Test-Path "apps")) {
    New-Item -ItemType Directory -Path "apps" | Out-Null
}

if (-not (Test-Path "apps/web")) {
    Write-Host "Creating Next.js frontend..." -ForegroundColor Cyan
    npx create-next-app@latest apps/web --ts --tailwind --eslint --app --src-dir --use-npm --import-alias "@/*"
} else {
    Write-Host "apps/web already exists. Skipping frontend creation." -ForegroundColor Yellow
}

if (-not (Test-Path "apps/api")) {
    Write-Host "Creating NestJS backend..." -ForegroundColor Cyan
    npx @nestjs/cli@latest new apps/api --package-manager npm --skip-git
} else {
    Write-Host "apps/api already exists. Skipping backend creation." -ForegroundColor Yellow
}

Write-Host "`nApplications created." -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "1. Change the NestJS API port to 4000."
Write-Host "2. Add GET /api/health."
Write-Host "3. Copy required variables from the root .env into apps/api/.env."
