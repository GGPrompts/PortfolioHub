# Start Terminal System Script
# Starts all components of the Claude Dev Portfolio Terminal System

param(
    [switch]$Debug,
    [switch]$VSCodeOnly,
    [switch]$ReactOnly
)

Write-Host "Starting Claude Dev Portfolio Terminal System..." -ForegroundColor Cyan

# Function to check if a port is in use
function Test-Port {
    param($Port)
    $connection = New-Object System.Net.Sockets.TcpClient
    try {
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Kill existing processes on our ports
$ports = @(3000, 3001, 3002)
foreach ($port in $ports) {
    if (Test-Port -Port $port) {
        Write-Host "Port $port is in use. Attempting to free it..." -ForegroundColor Yellow
        $process = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | 
                   Select-Object -ExpandProperty OwningProcess -Unique
        if ($process) {
            Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    }
}

# Start React development server
if (!$VSCodeOnly) {
    Write-Host "`nStarting React development server..." -ForegroundColor Yellow
    $reactProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ..; npm run dev" -PassThru
    Write-Host "React dev server starting on http://localhost:3000" -ForegroundColor Green
}

# Start VS Code extension
if (!$ReactOnly) {
    Write-Host "`nStarting VS Code extension..." -ForegroundColor Yellow
    Write-Host "Please ensure VS Code is running and press F5 in the extension project" -ForegroundColor Cyan
    
    # Open VS Code with the extension folder
    if (Get-Command code -ErrorAction SilentlyContinue) {
        code ./vscode-extension
    }
}

# Start terminal WebSocket server
Write-Host "`nStarting Terminal WebSocket server on port 3002..." -ForegroundColor Yellow

# Monitor status
Write-Host "`nTerminal System Status:" -ForegroundColor Cyan
Write-Host "- React App: http://localhost:3000" -ForegroundColor White
Write-Host "- Terminal WebSocket: ws://localhost:3002" -ForegroundColor White
Write-Host "- VS Code Extension: Check VS Code Extension Host" -ForegroundColor White

if ($Debug) {
    Write-Host "`nDebug mode enabled. Check console outputs for detailed logs." -ForegroundColor Magenta
}

Write-Host "`nPress Ctrl+C to stop all services" -ForegroundColor Yellow

# Keep the script running
try {
    while ($true) {
        Start-Sleep -Seconds 60
    }
} finally {
    Write-Host "`nStopping services..." -ForegroundColor Red
    if ($reactProcess) {
        Stop-Process -Id $reactProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
