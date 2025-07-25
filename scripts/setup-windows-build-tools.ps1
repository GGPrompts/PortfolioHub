# Windows Build Tools Setup
Write-Host "=== Windows Build Tools Setup ===" -ForegroundColor Green

# Step 1: Check Python
Write-Host "1. Checking Python..." -ForegroundColor Cyan
try {
    python --version
    Write-Host "Python found" -ForegroundColor Green
} catch {
    Write-Host "Python not found - install from python.org" -ForegroundColor Red
}

# Step 2: Configure npm
Write-Host "2. Configuring npm..." -ForegroundColor Cyan
npm config set msvs_version 2022
Write-Host "Set msvs_version to 2022" -ForegroundColor Green

# Step 3: Install node-gyp
Write-Host "3. Installing node-gyp..." -ForegroundColor Cyan
npm install -g node-gyp

Write-Host "Setup complete. Run npm run setup:node-pty next." -ForegroundColor Green
