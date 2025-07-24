#!/usr/bin/env pwsh
# Terminal Service Dependencies Installation Script
# 
# This script installs node-pty and other required dependencies for the
# multi-terminal VS Code extension functionality.

Write-Host "🚀 Installing Terminal Service Dependencies..." -ForegroundColor Cyan

# Change to VS Code extension directory
$extensionPath = "D:\ClaudeWindows\claude-dev-portfolio\vscode-extension\claude-portfolio"
if (-not (Test-Path $extensionPath)) {
    Write-Host "❌ VS Code extension directory not found: $extensionPath" -ForegroundColor Red
    exit 1
}

Set-Location $extensionPath
Write-Host "📁 Working directory: $(Get-Location)" -ForegroundColor Green

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found in current directory" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow

try {
    # Install dependencies
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
    
    # Verify node-pty installation
    Write-Host "🔍 Verifying node-pty installation..." -ForegroundColor Yellow
    
    $nodePtyPath = "node_modules\node-pty"
    if (Test-Path $nodePtyPath) {
        Write-Host "✅ node-pty installed successfully" -ForegroundColor Green
        
        # Check if native binaries are present
        $nativePath = "$nodePtyPath\build\Release"
        if (Test-Path $nativePath) {
            Write-Host "✅ Native binaries found" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Native binaries not found, attempting rebuild..." -ForegroundColor Yellow
            npm rebuild node-pty
            
            if (Test-Path $nativePath) {
                Write-Host "✅ Native binaries rebuilt successfully" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to build native binaries" -ForegroundColor Red
                Write-Host "💡 You may need to install build tools:" -ForegroundColor Cyan
                Write-Host "   npm install -g windows-build-tools" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "❌ node-pty not found in node_modules" -ForegroundColor Red
        exit 1
    }
    
    # Compile TypeScript
    Write-Host "🔧 Compiling TypeScript..." -ForegroundColor Yellow
    npm run compile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ TypeScript compilation successful" -ForegroundColor Green
    } else {
        Write-Host "⚠️ TypeScript compilation had issues, but continuing..." -ForegroundColor Yellow
    }
    
    # Install React app dependencies (xterm.js)
    Write-Host "📱 Installing React app terminal dependencies..." -ForegroundColor Yellow
    
    $reactAppPath = "D:\ClaudeWindows\claude-dev-portfolio"
    if (Test-Path $reactAppPath) {
        Push-Location $reactAppPath
        
        try {
            # Check if xterm is already installed
            $xtermInstalled = npm list xterm 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "📦 Installing xterm.js and addons..." -ForegroundColor Yellow
                npm install xterm xterm-addon-fit xterm-addon-webgl
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ xterm.js installed successfully" -ForegroundColor Green
                } else {
                    Write-Host "⚠️ Failed to install xterm.js - install manually if needed" -ForegroundColor Yellow
                }
            } else {
                Write-Host "✅ xterm.js already installed" -ForegroundColor Green
            }
        }
        finally {
            Pop-Location
        }
    } else {
        Write-Host "⚠️ React app directory not found: $reactAppPath" -ForegroundColor Yellow
    }
    
    Write-Host "🎉 Terminal service setup complete!" -ForegroundColor Green
    Write-Host "" -ForegroundColor White
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Reload VS Code window (Ctrl+Shift+P → 'Developer: Reload Window')" -ForegroundColor White
    Write-Host "2. Use Command Palette:" -ForegroundColor White
    Write-Host "   - 'Claude Portfolio: Create Terminal Session'" -ForegroundColor Gray
    Write-Host "   - 'Claude Portfolio: Terminal Service Status'" -ForegroundColor Gray
    Write-Host "   - 'Claude Portfolio: Create Workbranch'" -ForegroundColor Gray
    Write-Host "3. Terminal service will be available at ws://localhost:8002" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "🔧 Development Usage:" -ForegroundColor Cyan
    Write-Host "- VS Code Extension handles terminal processes via node-pty" -ForegroundColor White
    Write-Host "- React app connects via WebSocket for xterm.js integration" -ForegroundColor White
    Write-Host "- Workbranch isolation provides multi-project terminal support" -ForegroundColor White
    
} catch {
    Write-Host "❌ Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "✨ Installation completed successfully!" -ForegroundColor Green