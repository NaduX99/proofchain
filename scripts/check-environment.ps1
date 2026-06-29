$ErrorActionPreference = "SilentlyContinue"

function Test-Command {
    param(
        [string]$Name,
        [string]$VersionCommand
    )

    $command = Get-Command $Name
    if (-not $command) {
        Write-Host "[MISSING] $Name" -ForegroundColor Red
        return $false
    }

    Write-Host "[OK] $Name" -ForegroundColor Green
    Invoke-Expression $VersionCommand
    return $true
}

Write-Host "Checking ProofChain development environment..." -ForegroundColor Cyan

$allGood = $true
$allGood = (Test-Command "git" "git --version") -and $allGood
$allGood = (Test-Command "node" "node --version") -and $allGood
$allGood = (Test-Command "npm" "npm --version") -and $allGood
$allGood = (Test-Command "docker" "docker --version") -and $allGood

if (Get-Command docker) {
    docker compose version
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Docker Desktop engine is running." -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Docker is installed but Docker Desktop is not running." -ForegroundColor Red
        $allGood = $false
    }
}

if ($allGood) {
    Write-Host "`nEnvironment check passed." -ForegroundColor Green
} else {
    Write-Host "`nInstall or start the missing software, then run this script again." -ForegroundColor Yellow
    exit 1
}
