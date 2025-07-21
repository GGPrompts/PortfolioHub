# VS Code Workspace Troubleshooter
# Helps diagnose and fix workspace loading issues

Write-Host "VS Code Workspace Troubleshooter" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check current directory
Write-Host "`nCurrent Directory:" -ForegroundColor Yellow
Get-Location

# Check if workspace files exist
Write-Host "`nChecking workspace files..." -ForegroundColor Yellow
$workspaceFiles = @(
    "portfolio-dev.code-workspace",
    "portfolio-absolute-paths.code-workspace",
    "portfolio-profile-aware.code-workspace"
)

foreach ($file in $workspaceFiles) {
    if (Test-Path $file) {
        Write-Host "✓ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "✗ Missing: $file" -ForegroundColor Red
    }
}

# Check if folders exist
Write-Host "`nChecking workspace folders..." -ForegroundColor Yellow
$folders = @(
    "D:\ClaudeWindows\claude-dev-portfolio",
    "D:\ClaudeWindows\claude-dev-portfolio\projects",
    "D:\ClaudeWindows\claude-dev-portfolio\scripts"
)

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Write-Host "✓ Exists: $folder" -ForegroundColor Green
    } else {
        Write-Host "✗ Missing: $folder" -ForegroundColor Red
    }
}

# Provide solutions
Write-Host "`n📋 Solutions:" -ForegroundColor Cyan

Write-Host "`n1. If folders don't open in VS Code:" -ForegroundColor Yellow
Write-Host "   - Try using the absolute paths workspace:" -ForegroundColor White
Write-Host "     File → Open Workspace from File → portfolio-absolute-paths.code-workspace" -ForegroundColor Gray

Write-Host "`n2. Quick fix - Open folders manually:" -ForegroundColor Yellow
Write-Host "   In VS Code Server, use File → Add Folder to Workspace..." -ForegroundColor White
Write-Host "   Add these folders:" -ForegroundColor White
Write-Host "   - D:\ClaudeWindows\claude-dev-portfolio" -ForegroundColor Gray
Write-Host "   - D:\ClaudeWindows\claude-dev-portfolio\projects" -ForegroundColor Gray
Write-Host "   - D:\ClaudeWindows\claude-dev-portfolio\scripts" -ForegroundColor Gray

Write-Host "`n3. Save as new workspace:" -ForegroundColor Yellow
Write-Host "   After adding folders manually:" -ForegroundColor White
Write-Host "   File → Save Workspace As... → Save as 'my-portfolio.code-workspace'" -ForegroundColor Gray

Write-Host "`n4. Launch with explicit working directory:" -ForegroundColor Yellow
Write-Host "   Stop VS Code Server and restart with:" -ForegroundColor White
Write-Host "   cd D:\ClaudeWindows\claude-dev-portfolio" -ForegroundColor Gray
Write-Host "   code serve-web --port 8080 --host 0.0.0.0 --without-connection-token --accept-server-license-terms" -ForegroundColor Gray

Write-Host "`n💡 Most Common Fix:" -ForegroundColor Green
Write-Host "Use the workspace with absolute paths: portfolio-absolute-paths.code-workspace" -ForegroundColor White

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
