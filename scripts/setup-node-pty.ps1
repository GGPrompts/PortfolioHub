# node-pty Installation and Configuration Script
# Handles Windows-specific compilation issues

param(
    [string]$InstallLocation = "extension", # "extension" or "main"
    [switch]$Force = $false,
    [switch]$Verbose = $false
)

Write-Host "=== node-pty Windows Installation ===" -ForegroundColor Green
Write-Host "Install Location: $InstallLocation" -ForegroundColor Cyan

# Determine target directory
$targetDir = switch ($InstallLocation) {
    "extension" { "vscode-extension\claude-portfolio" }
    "main" { "." }
    default { "vscode-extension\claude-portfolio" }
}

Write-Host "Target Directory: $targetDir" -ForegroundColor Cyan

# Change to target directory
Push-Location $targetDir

try {
    # Step 1: Clean any existing node-pty installations
    if ($Force) {
        Write-Host "`n1. Cleaning existing installations..." -ForegroundColor Cyan
        if (Test-Path "node_modules\node-pty") {
            Remove-Item -Path "node_modules\node-pty" -Recurse -Force
            Write-Host "Removed existing node-pty" -ForegroundColor Yellow
        }
        npm cache clean --force
        Write-Host "Cleared npm cache" -ForegroundColor Yellow
    }

    # Step 2: Install node-pty with Windows-specific flags
    Write-Host "`n2. Installing node-pty with Windows build configuration..." -ForegroundColor Cyan
    
    # Set environment variables for Windows builds
    $env:npm_config_msvs_version = "2022"
    $env:npm_config_node_gyp = (npm bin -g) + "\node-gyp"
    
    Write-Host "Setting Windows build environment:" -ForegroundColor Yellow
    Write-Host "  MSVS_VERSION: $env:npm_config_msvs_version" -ForegroundColor White
    Write-Host "  NODE_GYP: $env:npm_config_node_gyp" -ForegroundColor White

    # Install node-pty with specific version and build flags
    $nodeptyVersion = "1.0.0" # Latest stable version known to work on Windows
    
    Write-Host "`nInstalling node-pty@$nodeptyVersion..." -ForegroundColor Yellow
    
    if ($Verbose) {
        npm install node-pty@$nodeptyVersion --verbose --build-from-source
    } else {
        npm install node-pty@$nodeptyVersion --build-from-source
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ node-pty installed successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ node-pty installation failed with exit code $LASTEXITCODE" -ForegroundColor Red
        
        # Try alternative installation methods
        Write-Host "`nTrying alternative installation method..." -ForegroundColor Yellow
        
        # Method 2: Install with additional flags
        npm install node-pty@$nodeptyVersion --build-from-source --msvs_version=2022 --python=python
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ node-pty installed with alternative method" -ForegroundColor Green
        } else {
            Write-Host "✗ Alternative installation also failed" -ForegroundColor Red
        }
    }

    # Step 3: Verify installation
    Write-Host "`n3. Verifying node-pty installation..." -ForegroundColor Cyan
    
    $nodeptyPath = "node_modules\node-pty"
    if (Test-Path $nodeptyPath) {
        Write-Host "✓ node-pty directory exists" -ForegroundColor Green
        
        # Check for compiled binary
        $binaryPath = "$nodeptyPath\build\Release\pty.node"
        if (Test-Path $binaryPath) {
            Write-Host "✓ Native binary compiled successfully: $binaryPath" -ForegroundColor Green
        } else {
            Write-Host "✗ Native binary not found: $binaryPath" -ForegroundColor Red
            
            # List what's in the build directory
            Write-Host "Build directory contents:" -ForegroundColor Yellow
            if (Test-Path "$nodeptyPath\build") {
                Get-ChildItem "$nodeptyPath\build" -Recurse | ForEach-Object {
                    Write-Host "  $($_.FullName)" -ForegroundColor White
                }
            } else {
                Write-Host "  No build directory found" -ForegroundColor Red
            }
        }
        
        # Test loading the module
        Write-Host "`nTesting module loading..." -ForegroundColor Cyan
        $testScript = @"
try {
    const pty = require('node-pty');
    console.log('✓ node-pty loaded successfully');
    console.log('Available methods:', Object.keys(pty));
    
    // Test creating a terminal (if possible)
    try {
        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.cwd(),
            env: process.env
        });
        console.log('✓ Terminal creation test successful');
        ptyProcess.kill();
    } catch (testError) {
        console.log('⚠ Terminal creation test failed:', testError.message);
    }
} catch (error) {
    console.log('✗ node-pty loading failed:', error.message);
    process.exit(1);
}
"@
        
        Set-Content -Path "test-node-pty.js" -Value $testScript
        Write-Host "Running node-pty test..." -ForegroundColor Yellow
        node test-node-pty.js
        Remove-Item "test-node-pty.js" -Force
        
    } else {
        Write-Host "✗ node-pty installation not found" -ForegroundColor Red
    }

    # Step 4: Install additional xterm dependencies if this is for the main app
    if ($InstallLocation -eq "main") {
        Write-Host "`n4. Installing xterm dependencies for main app..." -ForegroundColor Cyan
        
        # Install xterm and addons
        npm install xterm@5.3.0 xterm-addon-fit@0.8.0 xterm-addon-web-links@0.9.0
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ xterm dependencies installed" -ForegroundColor Green
        } else {
            Write-Host "✗ xterm dependencies installation failed" -ForegroundColor Red
        }
    }

    # Step 5: Update package.json with correct versions
    Write-Host "`n5. Updating package.json..." -ForegroundColor Cyan
    
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        
        # Add node-pty to dependencies
        if (-not $packageJson.dependencies) {
            $packageJson | Add-Member -Type NoteProperty -Name dependencies -Value @{}
        }
        
        $packageJson.dependencies."node-pty" = "^$nodeptyVersion"
        
        # Add build scripts if they don't exist
        if (-not $packageJson.scripts) {
            $packageJson | Add-Member -Type NoteProperty -Name scripts -Value @{}
        }
        
        $packageJson.scripts."rebuild:node-pty" = "npm rebuild node-pty --build-from-source"
        $packageJson.scripts."test:node-pty" = "node -e `"console.log('Testing node-pty...'); require('node-pty'); console.log('✓ Success')`""
        
        # Save updated package.json
        $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
        Write-Host "✓ package.json updated with node-pty@$nodeptyVersion" -ForegroundColor Green
    }

} finally {
    Pop-Location
}

Write-Host "`n=== node-pty Installation Complete ===" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Target: $targetDir" -ForegroundColor White
Write-Host "  Version: $nodeptyVersion" -ForegroundColor White
Write-Host "  Build: from source with Windows flags" -ForegroundColor White

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Test the installation with: npm run test:node-pty" -ForegroundColor White
Write-Host "2. If issues persist, run with -Force flag to clean install" -ForegroundColor White
Write-Host "3. Check VS Code Output > Claude Portfolio for runtime errors" -ForegroundColor White

Write-Host "`nTroubleshooting commands:" -ForegroundColor Yellow
Write-Host "  .\scripts\verify-build-environment.ps1  # Check build tools" -ForegroundColor White
Write-Host "  npm run rebuild:node-pty                # Rebuild native module" -ForegroundColor White
Write-Host "  npm install --verbose                   # Verbose installation" -ForegroundColor White