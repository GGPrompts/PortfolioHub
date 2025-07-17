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

Write-Host "✅ Project '$ProjectTitle' created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Project Location: $ProjectDir" -ForegroundColor Yellow
Write-Host "🌐 Development Port: $Port" -ForegroundColor Yellow
Write-Host "📝 Dev Journal: $JournalPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. cd $ProjectDir"
Write-Host "  2. npm run dev"
Write-Host "  3. Add to portfolio manifest:"
Write-Host ""
Write-Host "Add this to projects/manifest.json:" -ForegroundColor Yellow
Write-Host @"
{
  "id": "$ProjectId",
  "title": "$ProjectTitle", 
  "description": "$Description",
  "displayType": "external",
  "localPort": $Port,
  "buildCommand": "npm run dev",
  "path": "$ProjectId",
  "thumbnail": "thumbnails/$ProjectId.png",
  "tags": ["React", "TypeScript", "New"],
  "tech": ["React", "Vite", "TypeScript"],
  "status": "active",
  "devJournal": "projects/dev-journals/$ProjectId.md",
  "features": [
    "React 18 with TypeScript",
    "Portfolio integration",
    "Modern development setup"
  ]
}
"@ -ForegroundColor Gray

Write-Host ""
Write-Host "🎯 Happy coding with Claude!" -ForegroundColor Green