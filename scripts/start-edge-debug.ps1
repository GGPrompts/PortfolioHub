# Edge DevTools Debug Launcher for Claude Portfolio
param(
    [string]$Url = "http://localhost:5173",
    [int]$DebugPort = 9222,
    [switch]$Force = $false
)

Write-Host "🚀 Starting Edge with DevTools debugging..." -ForegroundColor Cyan

# Kill existing Edge processes if Force is specified
if ($Force) {
    Write-Host "🔄 Killing existing Edge processes..." -ForegroundColor Yellow
    Get-Process msedge -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Check if debug port is already in use
$portInUse = Test-NetConnection -ComputerName localhost -Port $DebugPort -InformationLevel Quiet
if ($portInUse) {
    Write-Host "⚠️  Port $DebugPort is already in use. Edge may already be running with debugging." -ForegroundColor Yellow
    Write-Host "   You can use -Force to kill existing processes." -ForegroundColor Gray
} else {
    Write-Host "✅ Port $DebugPort is available." -ForegroundColor Green
}

# Create user data directory for isolated Edge instance
$userDataDir = "$env:TEMP\edge-debug-$DebugPort"
if (-not (Test-Path $userDataDir)) {
    New-Item -ItemType Directory -Path $userDataDir -Force | Out-Null
}

# Edge launch arguments
$edgeArgs = @(
    "--remote-debugging-port=$DebugPort",
    "--disable-web-security",
    "--disable-features=VizDisplayCompositor",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=$userDataDir",
    $Url
)

Write-Host "🌐 Launching Edge with debugging enabled..." -ForegroundColor Green
Write-Host "   URL: $Url" -ForegroundColor Gray
Write-Host "   Debug Port: $DebugPort" -ForegroundColor Gray
Write-Host "   User Data: $userDataDir" -ForegroundColor Gray

try {
    Start-Process "msedge" -ArgumentList $edgeArgs -ErrorAction Stop
    
    # Wait a moment for Edge to start
    Start-Sleep -Seconds 3
    
    # Verify debugging endpoint is accessible
    Write-Host "🔍 Verifying debugging endpoint..." -ForegroundColor Blue
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$DebugPort/json/version" -TimeoutSec 5 -ErrorAction Stop
        $version = ($response.Content | ConvertFrom-Json).Browser
        Write-Host "✅ Edge DevTools debugging ready!" -ForegroundColor Green
        Write-Host "   Browser: $version" -ForegroundColor Gray
        Write-Host "   Debugging endpoint: http://localhost:$DebugPort" -ForegroundColor Gray
        
        # Instructions
        Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
        Write-Host "   1. In VS Code, press F5 and select '🔗 Simple Edge DevTools Attach'" -ForegroundColor White
        Write-Host "   2. Or use Ctrl+Shift+P → 'Debug: Attach by Process ID'" -ForegroundColor White
        Write-Host "   3. Edge DevTools should appear in VS Code sidebar" -ForegroundColor White
        
    } catch {
        Write-Host "❌ Could not verify debugging endpoint. Edge may not have started correctly." -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Failed to launch Edge with debugging." -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "   Make sure Microsoft Edge is installed and accessible." -ForegroundColor Gray
}

Write-Host "`n🎯 Debug Information:" -ForegroundColor Yellow
Write-Host "   Check port: netstat -ano | findstr :$DebugPort" -ForegroundColor Gray
Write-Host "   Test endpoint: http://localhost:$DebugPort/json/version" -ForegroundColor Gray
Write-Host "   Kill Edge: Get-Process msedge | Stop-Process -Force" -ForegroundColor Gray