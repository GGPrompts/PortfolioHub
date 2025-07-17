# Fixed simple launcher script for all projects
Write-Host "🚀 Launching Portfolio Projects..." -ForegroundColor Green

# Change to the portfolio directory
Set-Location "D:\ClaudeWindows\claude-dev-portfolio"

# Run the working start-all script
.\scripts\start-all-working.ps1

Write-Host "✅ Launch script completed!" -ForegroundColor Green
Write-Host "Check the opened terminals - each project should be starting now." -ForegroundColor Cyan