#!/usr/bin/env pwsh
# Create New Project Script

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectName,
    
    [Parameter(Mandatory=$false)]
    [int]$Port = 0,
    
    [Parameter(Mandatory=$false)]
    [string]$Description = "A new project in the Claude Development Portfolio"
)

Write-Host "🚀 Creating new project: $ProjectName" -ForegroundColor Green

# Validate project name
if ($ProjectName -match '[^a-zA-Z0-9-]') {
    Write-Host "❌ Project name can only contain letters, numbers, and hyphens" -ForegroundColor Red
    exit 1
}

# Convert to proper formats
$ProjectId = $ProjectName.ToLower()
$ProjectTitle = $ProjectName -replace '-', ' ' | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_) }
$ProjectDir = "D:\ClaudeWindows\claude-dev-portfolio\projects\$ProjectId"

# Check if project already exists
if (Test-Path $ProjectDir) {
    Write-Host "❌ Project '$ProjectId' already exists" -ForegroundColor Red
    exit 1
}

# Find available port if not specified
if ($Port -eq 0) {
    $UsedPorts = @()
    Get-Content "D:\ClaudeWindows\claude-dev-portfolio\projects\manifest.json" | ConvertFrom-Json | ForEach-Object {
        $_.projects | ForEach-Object {
            if ($_.localPort) {
                $UsedPorts += $_.localPort
            }
        }
    }
    
    # Find next available port starting from 3006
    $Port = 3006
    while ($UsedPorts -contains $Port) {
        $Port++
    }
}

Write-Host "📁 Creating project directory..." -ForegroundColor Cyan
Copy-Item -Path "D:\ClaudeWindows\claude-dev-portfolio\project-template" -Destination $ProjectDir -Recurse

Write-Host "📝 Updating project files..." -ForegroundColor Cyan

# Update package.json
$PackageJson = Get-Content "$ProjectDir\package.json" -Raw | ConvertFrom-Json
$PackageJson.name = $ProjectId
$PackageJson.scripts.dev = "vite --port $Port --host 0.0.0.0"
$PackageJson | ConvertTo-Json -Depth 10 | Set-Content "$ProjectDir\package.json"

# Update vite.config.js
(Get-Content "$ProjectDir\vite.config.js") -replace 'port: 3006', "port: $Port" | Set-Content "$ProjectDir\vite.config.js"

# Update index.html
(Get-Content "$ProjectDir\index.html") -replace 'PROJECT_NAME', $ProjectTitle | Set-Content "$ProjectDir\index.html"

# Update App.tsx
(Get-Content "$ProjectDir\src\App.tsx") -replace 'PROJECT_NAME', $ProjectTitle | Set-Content "$ProjectDir\src\App.tsx"

# Update CLAUDE.md
$ClaudeContent = Get-Content "$ProjectDir\CLAUDE.md" -Raw
$ClaudeContent = $ClaudeContent -replace 'PROJECT_NAME', $ProjectTitle
$ClaudeContent = $ClaudeContent -replace 'PROJECT_ID', $ProjectId
$ClaudeContent = $ClaudeContent -replace 'your-project-name', $ProjectId
$ClaudeContent = $ClaudeContent -replace 'your-project-id', $ProjectId
$ClaudeContent = $ClaudeContent -replace 'YOUR-PROJECT-NAME', $ProjectId.ToUpper()
$ClaudeContent = $ClaudeContent -replace '3006', $Port
Set-Content "$ProjectDir\CLAUDE.md" -Value $ClaudeContent

# Update README.md
(Get-Content "$ProjectDir\README.md") -replace 'PROJECT_NAME', $ProjectTitle | Set-Content "$ProjectDir\README.md"

Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
Set-Location $ProjectDir
npm install

Write-Host "🔧 Initializing git repository..." -ForegroundColor Cyan
git init
git add .
git commit -m "feat: initial project setup from template

- Set up $ProjectTitle project structure
- Configure port $Port
- Add portfolio integration files
- Initialize with example component

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

Write-Host "📋 Creating dev journal..." -ForegroundColor Cyan
$JournalPath = "D:\ClaudeWindows\claude-dev-portfolio\projects\dev-journals\$ProjectId.md"
$JournalContent = @"
# $ProjectTitle - Development Journal

## Project Overview
$Description

**Created**: $(Get-Date -Format 'yyyy-MM-dd')
**Port**: $Port
**Tech Stack**: React, TypeScript, Vite

## Development Log

### $(Get-Date -Format 'yyyy-MM-dd') - Project Initialization
- Created project from template
- Set up basic React + TypeScript structure
- Configured development server on port $Port
- Ready for feature development

## Next Steps
- [ ] Define project requirements and features
- [ ] Create initial component architecture
- [ ] Add to portfolio manifest
- [ ] Implement core functionality

## Notes
- Uses portfolio color palette and styling
- Integrated with portfolio live preview system
- Git repository initialized and ready for GitHub
"@

Set-Content $JournalPath -Value $JournalContent

Write-Host "📋 Updating portfolio manifest..." -ForegroundColor Cyan

# Read current manifest
$ManifestPath = "D:\ClaudeWindows\claude-dev-portfolio\projects\manifest.json"
try {
    $Manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
} catch {
    Write-Host "❌ Failed to read manifest.json: $_" -ForegroundColor Red
    exit 1
}

# Check if project already exists in manifest
$ExistingProject = $Manifest.projects | Where-Object { $_.id -eq $ProjectId }
if ($ExistingProject) {
    Write-Host "❌ Project '$ProjectId' already exists in manifest" -ForegroundColor Red
    exit 1
}

# Create new project entry
$NewProject = @{
    id = $ProjectId
    title = $ProjectTitle
    description = $Description
    displayType = "external"
    localPort = $Port
    buildCommand = "npm run dev"
    path = $ProjectId
    thumbnail = "thumbnails/$ProjectId.png"
    tags = @("React", "TypeScript", "New")
    tech = @("React", "Vite", "TypeScript")
    status = "active"
    devJournal = "projects/dev-journals/$ProjectId.md"
    features = @(
        "React 18 with TypeScript",
        "Portfolio integration",
        "Modern development setup"
    )
}

# Add to manifest
$Manifest.projects += $NewProject

# Save manifest
try {
    $Manifest | ConvertTo-Json -Depth 10 | Set-Content $ManifestPath
    Write-Host "  ✅ Portfolio manifest updated" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to update manifest.json: $_" -ForegroundColor Red
    exit 1
}

Write-Host "📡 Updating port manager..." -ForegroundColor Cyan

# Update portManager.ts
$PortManagerPath = "D:\ClaudeWindows\claude-dev-portfolio\src\utils\portManager.ts"
try {
    $PortManagerContent = Get-Content $PortManagerPath -Raw
} catch {
    Write-Host "❌ Failed to read portManager.ts: $_" -ForegroundColor Red
    exit 1
}

# Check if project already exists in portManager
if ($PortManagerContent -match "'$ProjectId':") {
    Write-Host "❌ Project '$ProjectId' already exists in portManager" -ForegroundColor Red
    exit 1
}

# Find the closing brace of DEFAULT_PORTS and add new entry before it
$Pattern = '(\s+)(};)(\s+// Fallback ports)'
$Replacement = "`$1  '$ProjectId': $Port,`n`$1`$2`$3"
$PortManagerContent = $PortManagerContent -replace $Pattern, $Replacement

# If the above pattern doesn't work, try a more general approach
if ($PortManagerContent -notmatch "'$ProjectId': $Port") {
    $Pattern = '(export const DEFAULT_PORTS = \{[^}]*)\s*};'
    $Replacement = "`$1,`n  '$ProjectId': $Port`n};"
    $PortManagerContent = $PortManagerContent -replace $Pattern, $Replacement
}

try {
    Set-Content $PortManagerPath -Value $PortManagerContent
    Write-Host "  ✅ Port manager updated" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to update portManager.ts: $_" -ForegroundColor Red
    exit 1
}

# Verify the update worked
$UpdatedContent = Get-Content $PortManagerPath -Raw
if ($UpdatedContent -match "'$ProjectId': $Port") {
    Write-Host "  ✅ Port manager integration verified" -ForegroundColor Green
} else {
    Write-Host "❌ Port manager update verification failed" -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Performing final integration checks..." -ForegroundColor Cyan

# Verify project files exist
$ChecksPassed = 0
$TotalChecks = 6

if (Test-Path $ProjectDir) {
    Write-Host "  ✅ Project directory created" -ForegroundColor Green
    $ChecksPassed++
} else {
    Write-Host "  ❌ Project directory missing" -ForegroundColor Red
}

if (Test-Path $JournalPath) {
    Write-Host "  ✅ Development journal created" -ForegroundColor Green
    $ChecksPassed++
} else {
    Write-Host "  ❌ Development journal missing" -ForegroundColor Red
}

if (Test-Path "$ProjectDir\.git") {
    Write-Host "  ✅ Git repository initialized" -ForegroundColor Green
    $ChecksPassed++
} else {
    Write-Host "  ❌ Git repository not initialized" -ForegroundColor Red
}

# Verify manifest integration
$UpdatedManifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$ManifestProject = $UpdatedManifest.projects | Where-Object { $_.id -eq $ProjectId }
if ($ManifestProject) {
    Write-Host "  ✅ Portfolio manifest integration verified" -ForegroundColor Green
    $ChecksPassed++
} else {
    Write-Host "  ❌ Portfolio manifest integration failed" -ForegroundColor Red
}

# Verify port manager integration (already done above)
$ChecksPassed++

# Verify package.json has correct port
$PackageContent = Get-Content "$ProjectDir\package.json" -Raw | ConvertFrom-Json
if ($PackageContent.scripts.dev -match $Port) {
    Write-Host "  ✅ Project port configuration verified" -ForegroundColor Green
    $ChecksPassed++
} else {
    Write-Host "  ❌ Project port configuration failed" -ForegroundColor Red
}

Write-Host ""
if ($ChecksPassed -eq $TotalChecks) {
    Write-Host "✅ Project '$ProjectTitle' created successfully!" -ForegroundColor Green
    Write-Host "🎉 All integration checks passed ($ChecksPassed/$TotalChecks)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Project '$ProjectTitle' created with issues!" -ForegroundColor Yellow
    Write-Host "🔧 Integration checks: $ChecksPassed/$TotalChecks passed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📍 Project Location: $ProjectDir" -ForegroundColor Yellow
Write-Host "🌐 Development Port: $Port" -ForegroundColor Yellow
Write-Host "📝 Dev Journal: $JournalPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. cd $ProjectDir"
Write-Host "  2. npm run dev"
Write-Host "  3. Refresh portfolio to see new project"
Write-Host ""
Write-Host "✨ New Features Automatically Integrated:" -ForegroundColor Green
Write-Host "  ✅ Portfolio manifest updated"
Write-Host "  ✅ Port manager updated"
Write-Host "  ✅ Project dropdown (DEV NOTES) ready"
Write-Host "  ✅ Development journal created"
Write-Host "  ✅ Git repository initialized"
Write-Host ""
Write-Host "🎯 Happy coding with Claude!" -ForegroundColor Green