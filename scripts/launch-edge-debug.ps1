# Simple Edge DevTools Debug Launcher
param(
    [string]$Url = "http://localhost:5173",
    [int]$DebugPort = 9222
)

Write-Host "🚀 Starting Edge with DevTools debugging..." -ForegroundColor Cyan

# Kill existing Edge processes for clean start
Write-Host "🔄 Stopping existing Edge processes..." -ForegroundColor Yellow
Get-Process msedge -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Create temp user data directory
$userDataDir = "$env:TEMP\edge-debug-automation"
if (Test-Path $userDataDir) {
    Remove-Item $userDataDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $userDataDir -Force | Out-Null

# Launch Edge with debugging
$edgeArgs = @(
    "--remote-debugging-port=$DebugPort",
    "--disable-web-security", 
    "--no-first-run",
    "--user-data-dir=$userDataDir",
    $Url
)

Write-Host "🌐 Launching Edge with debugging on port $DebugPort..." -ForegroundColor Green

try {
    Start-Process "msedge" -ArgumentList $edgeArgs
    Start-Sleep -Seconds 4
    
    # Test the debugging endpoint
    $testUrl = "http://localhost:$DebugPort/json/version"
    $response = Invoke-WebRequest -Uri $testUrl -TimeoutSec 5
    $info = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Edge DevTools ready!" -ForegroundColor Green
    Write-Host "   Browser: $($info.Browser)" -ForegroundColor Gray
    Write-Host "   Debug URL: http://localhost:$DebugPort" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🤖 Ready for Playwright automation!" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Failed to start Edge debugging: $($_.Exception.Message)" -ForegroundColor Red
}