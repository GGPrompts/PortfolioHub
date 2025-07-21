# VS Code Server launcher with profile support
# This ensures your VS Code profile settings (including dark mode) are preserved

param(
    [string]$Profile = "Default",  # Change this to your profile name if different
    [int]$Port = 8080
)

Write-Host "Starting VS Code Server with profile support..." -ForegroundColor Green
Write-Host "Profile: $Profile" -ForegroundColor Cyan
Write-Host "Port: $Port" -ForegroundColor Cyan

# Stop any existing VS Code Server instances
Write-Host "`nStopping existing VS Code Server instances..." -ForegroundColor Yellow
Stop-Process -Name "code-tunnel" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "code" -Force -ErrorAction SilentlyContinue | Out-Null

# Wait a moment for processes to fully stop
Start-Sleep -Seconds 2

# Change to portfolio directory
Set-Location "D:\ClaudeWindows\claude-dev-portfolio"
Write-Host "`nStarting from: $(Get-Location)" -ForegroundColor Green

# Start VS Code Server with profile flag
# The --profile flag ensures your settings are loaded
Write-Host "`nLaunching VS Code Server..." -ForegroundColor Green
$arguments = @(
    "serve-web",
    "--port", $Port,
    "--host", "0.0.0.0",
    "--without-connection-token",
    "--accept-server-license-terms"
)

# Add profile argument if not default
if ($Profile -ne "Default") {
    $arguments += "--profile"
    $arguments += $Profile
}

Write-Host "Command: code $($arguments -join ' ')" -ForegroundColor DarkGray

# Start VS Code Server
& code $arguments

Write-Host "`n✅ VS Code Server started!" -ForegroundColor Green
Write-Host "📌 Access at: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "`n💡 Tips:" -ForegroundColor Yellow
Write-Host "  - Your profile settings (including dark mode) should now be preserved" -ForegroundColor White
Write-Host "  - Open the workspace file to load all project folders" -ForegroundColor White
Write-Host "  - If dark mode still doesn't persist, check Settings Sync is enabled" -ForegroundColor White
Write-Host "`nPress Ctrl+C to stop the server" -ForegroundColor Gray
