#!/usr/bin/env pwsh
# Money Manager PWA - Setup Script

Write-Host "🚀 Money Manager PWA - Setup Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking for Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please download and install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green
$npmVersion = npm --version
Write-Host "✓ npm $npmVersion found" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Dependencies installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: npm run dev" -ForegroundColor White
    Write-Host "  2. Open: http://localhost:3000/transactions" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Installation failed!" -ForegroundColor Red
    exit 1
}
