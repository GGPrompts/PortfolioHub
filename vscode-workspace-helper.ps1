# VS Code Workspace Helper
# Helps open VS Code Server with workspace pre-configured

Write-Host "VS Code Workspace Helper" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

$workspacePath = "D:\ClaudeWindows\claude-dev-portfolio\portfolio-absolute-paths.code-workspace"
$folderPath = "D:\ClaudeWindows\claude-dev-portfolio"

Write-Host "`nOptions:" -ForegroundColor Yellow

Write-Host "`n1. Open VS Code with folder:" -ForegroundColor Green
Write-Host "   This opens VS Code with the main portfolio folder" -ForegroundColor White
Write-Host "   Command: " -NoNewline
Write-Host "code serve-web --port 8080 --folder `"$folderPath`"" -ForegroundColor Gray

Write-Host "`n2. Copy workspace path for manual opening:" -ForegroundColor Green
Write-Host "   $workspacePath" -ForegroundColor Gray
$workspacePath | Set-Clipboard
Write-Host "   ✓ Copied to clipboard!" -ForegroundColor Green

Write-Host "`n3. Instructions for VS Code Server:" -ForegroundColor Green
Write-Host "   Option A - Open Folder:" -ForegroundColor Yellow
Write-Host "   • Press Ctrl+K, then Ctrl+O" -ForegroundColor White
Write-Host "   • Navigate to: D:\ClaudeWindows\claude-dev-portfolio" -ForegroundColor White
Write-Host "   • Click 'Select Folder'" -ForegroundColor White

Write-Host "`n   Option B - Multi-Root Workspace:" -ForegroundColor Yellow
Write-Host "   • Press Ctrl+Shift+P" -ForegroundColor White
Write-Host "   • Type: Add Folder to Workspace" -ForegroundColor White
Write-Host "   • Add these folders one by one:" -ForegroundColor White
Write-Host "     - D:\ClaudeWindows\claude-dev-portfolio" -ForegroundColor Gray
Write-Host "     - D:\ClaudeWindows\claude-dev-portfolio\projects" -ForegroundColor Gray
Write-Host "     - D:\ClaudeWindows\claude-dev-portfolio\scripts" -ForegroundColor Gray
Write-Host "   • Save workspace: File → Save Workspace As..." -ForegroundColor White

Write-Host "`n   Option C - If workspace file not showing:" -ForegroundColor Yellow
Write-Host "   • In the file dialog, change filter to 'All Files (*.*)'" -ForegroundColor White
Write-Host "   • Or type the filename directly: portfolio-absolute-paths.code-workspace" -ForegroundColor White

Write-Host "`n4. Start VS Code Server with folder pre-opened:" -ForegroundColor Green
$choice = Read-Host "`nStart VS Code Server now? (Y/N)"

if ($choice -eq 'Y' -or $choice -eq 'y') {
    Write-Host "`nStarting VS Code Server..." -ForegroundColor Green
    
    # Stop any existing instances
    Stop-Process -Name "code-tunnel" -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "code" -Force -ErrorAction SilentlyContinue | Out-Null
    
    Start-Sleep -Seconds 2
    
    # Start with folder
    Set-Location $folderPath
    & code serve-web --port 8080 --host 0.0.0.0 --without-connection-token --accept-server-license-terms
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
