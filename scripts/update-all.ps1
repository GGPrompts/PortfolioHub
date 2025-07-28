#!/usr/bin/env pwsh
# Update All Repositories Script

Write-Host "🔄 Updating Portfolio Hub..." -ForegroundColor Green
Set-Location "D:\ClaudeWindows\claude-dev-portfolio"
git pull origin master

Write-Host "`n📁 Updating Individual Projects..." -ForegroundColor Green

$projects = @(
    "matrix-cards",
    "ggprompts", 
    "ggprompts-style-guide",
    "sleak-card",
    "3d-matrix-cards",
    "3d-file-system",
    "standalone-terminal-system"
)

foreach ($project in $projects) {
    $projectPath = "D:\ClaudeWindows\claude-dev-portfolio\projects\$project"
    if (Test-Path $projectPath) {
        Write-Host "  📦 Updating $project..." -ForegroundColor Cyan
        Set-Location $projectPath
        
        # Try main branch first, fallback to master
        $branch = git branch --show-current
        if ($branch) {
            git pull origin $branch
        } else {
            # Try common branch names
            git pull origin main 2>$null
            if ($LASTEXITCODE -ne 0) {
                git pull origin master 2>$null
            }
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✅ $project updated successfully" -ForegroundColor Green
        } else {
            Write-Host "    ⚠️ $project update failed or no remote" -ForegroundColor Yellow
        }
    } else {
        Write-Host "    ❌ $project not found" -ForegroundColor Red
    }
}

Write-Host "`n🎉 All repositories updated!" -ForegroundColor Green
Set-Location "D:\ClaudeWindows\claude-dev-portfolio"