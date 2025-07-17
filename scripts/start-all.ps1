# PowerShell script to start all projects for development
Write-Host "🚀 Starting Portfolio Development Environment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if port is in use
function Test-Port {
    param($Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Start Portfolio (always)
Write-Host "1. Starting Portfolio on port 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd 'D:\ClaudeWindows\Projects\portfolio-showcase'
Write-Host 'Portfolio running at http://localhost:3000' -ForegroundColor Green
npm run dev
"@

# Wait a bit
Start-Sleep -Seconds 2

# Check and start Matrix Cards
if (-not (Test-Port 3002)) {
    Write-Host "2. Starting Matrix Cards on port 3002..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd 'D:\ClaudeWindows\Projects\MatrixCards'
Write-Host 'Matrix Cards running at http://localhost:3002' -ForegroundColor Green
npm start
"@
} else {
    Write-Host "2. Matrix Cards already running on port 3002 ✓" -ForegroundColor Yellow
}

# Check and start Sleak Card
if (-not (Test-Port 3003)) {
    Write-Host "3. Starting Sleak Card on port 3003..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd 'D:\ClaudeWindows\Projects\GGPromptsProject\SleakCard'
Write-Host 'Sleak Card running at http://localhost:3003' -ForegroundColor Green
npm start
"@
} else {
    Write-Host "3. Sleak Card already running on port 3003 ✓" -ForegroundColor Yellow
}

# Check and start GGPrompts Main
if (-not (Test-Port 5173)) {
    Write-Host "4. Starting GGPrompts Main on port 5173..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd 'D:\ClaudeWindows\Projects\GGPromptsProject\GGPrompts'
Write-Host 'GGPrompts Main running at http://localhost:5173' -ForegroundColor Green
Write-Host 'Make sure your .env file has Supabase credentials!' -ForegroundColor Yellow
npm run dev
"@
} else {
    Write-Host "4. GGPrompts Main already running on port 5173 ✓" -ForegroundColor Yellow
}

# Check and start Style Guide
if (-not (Test-Port 5174)) {
    Write-Host "5. Starting GGPrompts Style Guide on port 5174..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd 'D:\ClaudeWindows\Projects\GGPromptsProject\GGPrompts-StyleGuide'
Write-Host 'Style Guide running at http://localhost:5174' -ForegroundColor Green
npm run dev -- --port 5174
"@
} else {
    Write-Host "5. Style Guide already running on port 5174 ✓" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ All projects starting!" -ForegroundColor Green
Write-Host ""
Write-Host "Available at:" -ForegroundColor Cyan
Write-Host "  Portfolio:      http://localhost:3000" -ForegroundColor White
Write-Host "  Matrix Cards:   http://localhost:3002" -ForegroundColor White
Write-Host "  Sleak Card:     http://localhost:3003" -ForegroundColor White
Write-Host "  GGPrompts:      http://localhost:5173" -ForegroundColor White
Write-Host "  Style Guide:    http://localhost:5174" -ForegroundColor White
Write-Host ""
Write-Host "Opening Portfolio in browser..." -ForegroundColor Cyan

# Wait for portfolio to be ready
$maxAttempts = 30
$attempt = 0
while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 1
    if (Test-Port 3000) {
        Start-Process "http://localhost:3000"
        break
    }
    $attempt++
}

Write-Host ""
Write-Host "Press any key to exit this window (projects will keep running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")