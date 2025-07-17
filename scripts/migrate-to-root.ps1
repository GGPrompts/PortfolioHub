# PowerShell script to reorganize portfolio as root directory
# This will create a new structure with all projects under one root

param(
    [switch]$SkipConfirmation
)

Write-Host "🚀 Portfolio Root Migration Tool" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$newRootName = "claude-dev-portfolio"
$newRootPath = "D:\ClaudeWindows\$newRootName"

Write-Host "This will create a new structure at: $newRootPath" -ForegroundColor Yellow
Write-Host ""

if (-not $SkipConfirmation) {
    $confirm = Read-Host "Continue? (y/n)"
    if ($confirm -ne 'y') {
        Write-Host "Migration cancelled" -ForegroundColor Red
        exit
    }
}

# Create new root directory
Write-Host "Creating new root directory..." -ForegroundColor Green
New-Item -ItemType Directory -Path $newRootPath -Force | Out-Null

# Copy portfolio files to new root
Write-Host "Copying portfolio files..." -ForegroundColor Green
$portfolioItems = @(
    "src",
    "public", 
    "scripts",
    "package.json",
    "package-lock.json",
    "vite.config.ts",
    "tsconfig.json",
    "tsconfig.node.json",
    "index.html",
    ".gitignore",
    "README.md",
    "QUICK_START.md"
)

foreach ($item in $portfolioItems) {
    if (Test-Path "D:\ClaudeWindows\Projects\portfolio-showcase\$item") {
        Copy-Item -Path "D:\ClaudeWindows\Projects\portfolio-showcase\$item" -Destination "$newRootPath\$item" -Recurse -Force
        Write-Host "  ✓ Copied $item" -ForegroundColor Gray
    }
}

# Create projects directory
Write-Host "Creating projects directory..." -ForegroundColor Green
New-Item -ItemType Directory -Path "$newRootPath\projects" -Force | Out-Null

# Move scripts to scripts directory
Write-Host "Organizing scripts..." -ForegroundColor Green
New-Item -ItemType Directory -Path "$newRootPath\scripts" -Force | Out-Null
Move-Item -Path "$newRootPath\*.ps1" -Destination "$newRootPath\scripts\" -Force
Move-Item -Path "$newRootPath\*.bat" -Destination "$newRootPath\scripts\" -Force
Move-Item -Path "$newRootPath\*.js" -Destination "$newRootPath\scripts\" -Force -ErrorAction SilentlyContinue

# Copy projects
Write-Host "`nCopying projects..." -ForegroundColor Green

$projects = @{
    "3d-matrix-cards" = "D:\ClaudeWindows\Projects\3d-Matrix-Cards"
    "matrix-cards" = "D:\ClaudeWindows\Projects\MatrixCards"
    "sleak-card" = "D:\ClaudeWindows\Projects\GGPromptsProject\SleakCard"
    "ggprompts" = "D:\ClaudeWindows\Projects\GGPromptsProject\GGPrompts"
    "ggprompts-style-guide" = "D:\ClaudeWindows\Projects\GGPromptsProject\GGPrompts-StyleGuide"
}

foreach ($projectName in $projects.Keys) {
    $sourcePath = $projects[$projectName]
    $destPath = "$newRootPath\projects\$projectName"
    
    if (Test-Path $sourcePath) {
        Write-Host "  Copying $projectName..." -ForegroundColor White
        Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
        Write-Host "  ✓ Copied $projectName" -ForegroundColor Gray
    } else {
        Write-Host "  ✗ Source not found: $sourcePath" -ForegroundColor Red
    }
}

# Copy other portfolio files
Write-Host "`nCopying portfolio assets..." -ForegroundColor Green
Copy-Item -Path "D:\ClaudeWindows\Projects\portfolio-showcase\projects\manifest.json" -Destination "$newRootPath\projects\manifest.json" -Force

# Update paths in scripts
Write-Host "`nUpdating script paths..." -ForegroundColor Green

# Create new start-all.ps1 with updated paths
$startAllContent = @'
# PowerShell script to start all projects for development
Write-Host "🚀 Starting Portfolio Development Environment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Split-Path -Parent $PSScriptRoot

# Function to check if port is in use
function Test-Port {
    param($Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Start Portfolio (always)
Write-Host "1. Starting Portfolio on port 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd '$rootPath'
Write-Host 'Portfolio running at http://localhost:3000' -ForegroundColor Green
npm run dev
"@

# Wait a bit
Start-Sleep -Seconds 2

# Check and start Matrix Cards
if (-not (Test-Port 3002)) {
    Write-Host "2. Starting Matrix Cards on port 3002..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd '$rootPath\projects\matrix-cards'
Write-Host 'Matrix Cards running at http://localhost:3002' -ForegroundColor Green
npm start
"@
} else {
    Write-Host "2. Matrix Cards already running on port 3002 ✓" -ForegroundColor Yellow
}

# Add other projects...
'@

Set-Content -Path "$newRootPath\scripts\start-all.ps1" -Value $startAllContent

# Create master CLAUDE.md
Write-Host "`nCreating master CLAUDE.md..." -ForegroundColor Green
$claudeMd = @'
# Claude Development Portfolio

## Overview
This is the root directory for all Claude-assisted development projects. The portfolio app serves as a central hub to view, launch, and manage all projects.

## Structure
```
claude-dev-portfolio/
├── src/                    # Portfolio React app
├── projects/              # All development projects
├── scripts/               # Utility scripts
└── docs/                  # Documentation
```

## Quick Start
1. Install dependencies: `npm install`
2. Start portfolio: `npm run dev`
3. Start all projects: `.\scripts\start-all.ps1`

## Projects
- **3d-matrix-cards**: Three.js interactive card display
- **matrix-cards**: React cyberpunk card components
- **sleak-card**: Modern card system with water effects
- **ggprompts**: Main AI prompt platform
- **ggprompts-style-guide**: Design system documentation
'@

Set-Content -Path "$newRootPath\CLAUDE.md" -Value $claudeMd

Write-Host "`n✅ Migration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. cd $newRootPath" -ForegroundColor White
Write-Host "2. npm install" -ForegroundColor White
Write-Host "3. npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Old structure preserved at: D:\ClaudeWindows\Projects\" -ForegroundColor Gray