# Add Windows Defender exclusions for development projects
# Run this script as Administrator

Write-Host "Adding Windows Defender exclusions for Claude development projects..." -ForegroundColor Green

# Portfolio project paths
$exclusionPaths = @(
    "D:\ClaudeWindows\claude-dev-portfolio",
    "D:\ClaudeWindows\Projects",
    "D:\ClaudeWindows\node_modules"
)

# Development processes
$exclusionProcesses = @(
    "node.exe",
    "npm.exe",
    "vite.exe",
    "typescript.exe"
)

# Add path exclusions
foreach ($path in $exclusionPaths) {
    if (Test-Path $path) {
        try {
            Add-MpPreference -ExclusionPath $path
            Write-Host "✓ Added exclusion for: $path" -ForegroundColor Green
        } catch {
            Write-Host "✗ Failed to add exclusion for: $path" -ForegroundColor Red
            Write-Host "Error: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠ Path not found: $path" -ForegroundColor Yellow
    }
}

# Add process exclusions
foreach ($process in $exclusionProcesses) {
    try {
        Add-MpPreference -ExclusionProcess $process
        Write-Host "✓ Added process exclusion for: $process" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to add process exclusion for: $process" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

Write-Host "`nCurrent exclusions:" -ForegroundColor Cyan
Get-MpPreference | Select-Object ExclusionPath, ExclusionProcess | Format-List

Write-Host "`nNote: You may need to restore any quarantined files manually from Windows Defender Security Center." -ForegroundColor Yellow
Write-Host "To restore quarantined files:" -ForegroundColor Yellow
Write-Host "1. Open Windows Security (Windows key + I > Privacy & Security > Windows Security)" -ForegroundColor Yellow
Write-Host "2. Go to Virus & threat protection" -ForegroundColor Yellow
Write-Host "3. Click on Protection history" -ForegroundColor Yellow
Write-Host "4. Find quarantined files and click Restore" -ForegroundColor Yellow