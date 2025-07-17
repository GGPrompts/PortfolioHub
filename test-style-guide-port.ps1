# Test script to verify style guide port configuration
Write-Host "🔍 Testing Style Guide Port Configuration" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Kill any existing processes on ports 3001 and 5173-5174
$portsToCheck = @(3001, 5173, 5174)

foreach ($port in $portsToCheck) {
    $netstat = netstat -ano | Select-String ":$port "
    if ($netstat) {
        $processId = ($netstat -split '\s+')[-1]
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "🛑 Killing process on port $port (PID: $processId)" -ForegroundColor Red
            Stop-Process -Id $processId -Force
        }
    }
}

Start-Sleep -Seconds 2

# Test starting the style guide
Write-Host "🚀 Starting style guide with explicit port configuration..." -ForegroundColor Green

Set-Location "D:\ClaudeWindows\claude-dev-portfolio\projects\ggprompts-style-guide"

# Check if vite.config.js exists and contains port 3001
if (Test-Path "vite.config.js") {
    $config = Get-Content "vite.config.js" -Raw
    if ($config -match "port:\s*3001") {
        Write-Host "✅ vite.config.js contains port: 3001" -ForegroundColor Green
    } else {
        Write-Host "❌ vite.config.js does not contain port: 3001" -ForegroundColor Red
    }
} else {
    Write-Host "❌ vite.config.js not found" -ForegroundColor Red
}

# Start the development server
Write-Host "🔧 Starting npm run dev..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\ClaudeWindows\claude-dev-portfolio\projects\ggprompts-style-guide'; npm run dev"

Write-Host "💡 Check the opened terminal to see which port it actually uses" -ForegroundColor Cyan