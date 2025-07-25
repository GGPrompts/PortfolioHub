# Start VS Code Server for Claude Portfolio
# This script starts VS Code Server with proper settings and error handling

param(
    [int]$Port = 8080,
    [string]$Host = "0.0.0.0",
    [switch]$WithToken = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting VS Code Server for Claude Portfolio..." -ForegroundColor Green
Write-Host "📁 Portfolio Path: D:\ClaudeWindows\claude-dev-portfolio" -ForegroundColor Cyan
Write-Host "🌐 Server URL: http://localhost:$Port" -ForegroundColor Cyan

try {
    # Change to portfolio directory
    Set-Location "D:\ClaudeWindows\claude-dev-portfolio"
    
    # Check if VS Code is installed
    $vsCodePath = Get-Command code -ErrorAction SilentlyContinue
    if (-not $vsCodePath) {
        Write-Host "❌ VS Code not found in PATH. Please install VS Code or add it to PATH." -ForegroundColor Red
        exit 1
    }
    
    # Check if port is already in use
    $portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($portInUse) {
        Write-Host "⚠️ Port $Port is already in use. VS Code Server might already be running." -ForegroundColor Yellow
        Write-Host "💡 Try opening http://localhost:$Port in your browser" -ForegroundColor Cyan
        $choice = Read-Host "Continue anyway? (y/N)"
        if ($choice -ne 'y' -and $choice -ne 'Y') {
            exit 0
        }
    }
    
    # Build the command
    $command = "code serve-web --port $Port --host $Host"
    
    if (-not $WithToken) {
        $command += " --without-connection-token"
    }
    
    $command += " --accept-server-license-terms"
    
    Write-Host "🔧 Command: $command" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📝 VS Code Server License:" -ForegroundColor Yellow
    Write-Host "   By using this software, you agree to:" -ForegroundColor Gray
    Write-Host "   • Visual Studio Code Server License Terms: https://aka.ms/vscode-server-license" -ForegroundColor Gray
    Write-Host "   • Microsoft Privacy Statement: https://privacy.microsoft.com/privacystatement" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🎯 Once started, access VS Code Server at: http://localhost:$Port" -ForegroundColor Green
    Write-Host "🔄 Use Ctrl+C to stop the server" -ForegroundColor Cyan
    Write-Host ""
    
    # Start VS Code Server
    Invoke-Expression $command
    
} catch {
    Write-Host "❌ Failed to start VS Code Server: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Troubleshooting tips:" -ForegroundColor Cyan
    Write-Host "   • Make sure VS Code is installed and in PATH" -ForegroundColor Gray
    Write-Host "   • Check if port $Port is available" -ForegroundColor Gray
    Write-Host "   • Try running VS Code as administrator" -ForegroundColor Gray
    exit 1
}