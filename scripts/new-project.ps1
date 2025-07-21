#!/usr/bin/env pwsh
# Interactive Project Creator

Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                   🚀 PROJECT CREATOR                          ║
║                                                               ║
║                Claude Development Portfolio                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# Get project name
Write-Host "📝 Enter project name (letters, numbers, hyphens only):" -ForegroundColor Yellow
$ProjectName = Read-Host "   Project Name"

if ([string]::IsNullOrWhiteSpace($ProjectName)) {
    Write-Host "❌ Project name cannot be empty" -ForegroundColor Red
    exit 1
}

# Select project type
Write-Host ""
Write-Host "🎨 Select project type:" -ForegroundColor Yellow
Write-Host "   [1] 2D - React Application (default)" -ForegroundColor White
Write-Host "   [2] 3D - Three.js Experience" -ForegroundColor White
Write-Host ""
$TypeChoice = Read-Host "   Choice (1-2) [default: 1]"

$Type = switch ($TypeChoice) {
    "2" { "3d" }
    default { "2d" }
}

# If 3D, select control system
$ControlSystem = "orbit"
if ($Type -eq "3d") {
    Write-Host ""
    Write-Host "🎮 Select control system for 3D project:" -ForegroundColor Yellow
    Write-Host "   [1] Orbit - General 3D viewing (default)" -ForegroundColor White
    Write-Host "   [2] FPS - First-person shooter style" -ForegroundColor White
    Write-Host "   [3] Fly - Free flight/spaceship controls" -ForegroundColor White
    Write-Host "   [4] Gallery - Fixed viewpoint navigation" -ForegroundColor White
    Write-Host ""
    $ControlChoice = Read-Host "   Choice (1-4) [default: 1]"
    
    $ControlSystem = switch ($ControlChoice) {
        "2" { "fps" }
        "3" { "fly" }
        "4" { "gallery" }
        default { "orbit" }
    }
}

# Get description (optional)
Write-Host ""
Write-Host "📄 Enter project description (optional):" -ForegroundColor Yellow
$Description = Read-Host "   Description"

# Get port (optional)
Write-Host ""
Write-Host "🌐 Enter port number (optional, auto-assigns if empty):" -ForegroundColor Yellow
$PortInput = Read-Host "   Port"
$Port = if ([string]::IsNullOrWhiteSpace($PortInput)) { 0 } else { [int]$PortInput }

# Confirm
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "📋 Project Configuration:" -ForegroundColor Green
Write-Host "   Name: $ProjectName" -ForegroundColor White
Write-Host "   Type: $Type $(if ($Type -eq '3d') { "($ControlSystem controls)" })" -ForegroundColor White
if (![string]::IsNullOrWhiteSpace($Description)) {
    Write-Host "   Description: $Description" -ForegroundColor White
}
if ($Port -ne 0) {
    Write-Host "   Port: $Port" -ForegroundColor White
} else {
    Write-Host "   Port: Auto-assign" -ForegroundColor White
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

Write-Host "❓ Create this project? (Y/n)" -ForegroundColor Yellow
$Confirm = Read-Host "   Confirm"

if ($Confirm -eq "n" -or $Confirm -eq "N") {
    Write-Host "❌ Project creation cancelled" -ForegroundColor Red
    exit 0
}

# Build parameters for enhanced script
$Params = @{
    ProjectName = $ProjectName
    Type = $Type
}

if ($Type -eq "3d") {
    $Params.ControlSystem = $ControlSystem
}

if (![string]::IsNullOrWhiteSpace($Description)) {
    $Params.Description = $Description
}

if ($Port -ne 0) {
    $Params.Port = $Port
}

# Call the enhanced create script
Write-Host ""
Write-Host "🚀 Creating project..." -ForegroundColor Green
Write-Host ""

& "$PSScriptRoot\create-project-enhanced.ps1" @Params
