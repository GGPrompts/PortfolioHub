# Windows Build Environment Setup Guide

This guide provides comprehensive instructions for setting up the Windows build environment required for node-pty compilation and terminal functionality.

## Quick Start

Run these commands in the project root to set up the complete build environment:

```powershell
# 1. Set up Windows build tools (Python, Visual Studio Build Tools)
npm run setup:build-tools

# 2. Verify build environment is working
npm run verify:build-env

# 3. Install node-pty for main React app
npm run setup:node-pty

# 4. Install node-pty for VS Code extension
npm run setup:node-pty-extension

# 5. Test installations
npm run test:node-pty
cd vscode-extension/claude-portfolio && npm run test:node-pty
```

## Prerequisites

### Required Software

1. **Node.js v18+** (Currently using v22.17.0) ✅
2. **Python 3.8+** (Required for node-gyp)
3. **Visual Studio Build Tools 2022** (or Visual Studio Community with C++ workload)
4. **Windows SDK 10/11**

### Installation Steps

#### 1. Install Python

**Option A: Microsoft Store (Recommended)**
```powershell
# Via winget (if available)
winget install Python.Python.3.11

# Or manually from Microsoft Store
start ms-windows-store://pdp/?productid=9NCVDN91XZQP
```

**Option B: Python.org**
- Download from [python.org](https://www.python.org/downloads/)
- Ensure "Add to PATH" is checked during installation

#### 2. Install Visual Studio Build Tools

**Option A: Visual Studio Build Tools 2022 (Recommended)**
```powershell
# Via winget
winget install Microsoft.VisualStudio.2022.BuildTools

# Manual download
# https://aka.ms/vs/17/release/vs_buildtools.exe
```

**Required Workloads:**
- ✅ **C++ build tools**
- ✅ **Windows 10/11 SDK** (latest version)
- ✅ **CMake tools for Visual Studio** (optional but recommended)

**Option B: Visual Studio Community 2022**
```powershell
winget install Microsoft.VisualStudio.2022.Community
```

#### 3. Configure npm for Windows

```powershell
# Set Visual Studio version
npm config set msvs_version 2022

# Set Python path (adjust path as needed)
npm config set python "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\Python311\python.exe"

# Install node-gyp globally
npm install -g node-gyp
```

## node-pty Installation

### For Main React App

```powershell
# Automated installation
npm run setup:node-pty

# Manual installation
npm install node-pty@1.0.0 --build-from-source

# Test installation
npm run test:node-pty
```

### For VS Code Extension

```powershell
# Automated installation
npm run setup:node-pty-extension

# Manual installation
cd vscode-extension/claude-portfolio
npm install node-pty@1.0.0 --build-from-source

# Test installation
npm run test:node-pty
```

## Troubleshooting

### Common Issues

#### 1. Python Not Found
```
Error: Can't find Python executable "python"
```

**Solution:**
```powershell
# Check Python installation
python --version

# If not found, install Python and add to PATH
# Then configure npm
npm config set python "$(where python)"
```

#### 2. Visual Studio Build Tools Not Found
```
Error: MSBuild.exe failed with exit code: 1
```

**Solution:**
```powershell
# Verify installation
dir "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools"
dir "C:\Program Files\Microsoft Visual Studio\2022\BuildTools"

# If not found, install Build Tools or VS Community
winget install Microsoft.VisualStudio.2022.BuildTools
```

#### 3. node-gyp Compilation Errors
```
Error: Could not find any Visual Studio installation to use
```

**Solution:**
```powershell
# Clear npm cache and retry
npm cache clean --force
npm config set msvs_version 2022
npm rebuild node-pty --build-from-source
```

#### 4. Windows SDK Missing
```
Error: Windows SDK not found
```

**Solution:**
- Open Visual Studio Installer
- Modify Build Tools installation
- Add "Windows 10/11 SDK" component

### Verification Commands

```powershell
# Check build environment
npm run verify:build-env

# Test node-pty loading
node -e "console.log('Testing...'); require('node-pty'); console.log('✓ Success')"

# Check npm configuration
npm config list

# Verify Python access
python --version

# Check Visual Studio tools
where cl  # Should find C++ compiler
```

### Force Rebuild

If node-pty compilation fails:

```powershell
# Clean and rebuild
npm run rebuild:node-pty

# Or with more aggressive cleaning
rm -rf node_modules/node-pty
npm cache clean --force
npm install node-pty@1.0.0 --build-from-source --verbose
```

## Build Configuration

### package.json Scripts

**Main App (`package.json`):**
```json
{
  "scripts": {
    "setup:build-tools": "powershell -ExecutionPolicy Bypass -File .\\scripts\\setup-windows-build-tools.ps1",
    "setup:node-pty": "powershell -ExecutionPolicy Bypass -File .\\scripts\\setup-node-pty.ps1 -InstallLocation main",
    "verify:build-env": "powershell -ExecutionPolicy Bypass -File .\\scripts\\verify-build-environment.ps1",
    "rebuild:node-pty": "npm rebuild node-pty --build-from-source",
    "test:node-pty": "node -e \"console.log('Testing node-pty...'); require('node-pty'); console.log('✓ Success')\""
  },
  "dependencies": {
    "node-pty": "^1.0.0",
    "xterm": "^5.3.0",
    "xterm-addon-fit": "^0.8.0",
    "xterm-addon-web-links": "^0.9.0"
  }
}
```

**VS Code Extension (`vscode-extension/claude-portfolio/package.json`):**
```json
{
  "scripts": {
    "rebuild:node-pty": "npm rebuild node-pty --build-from-source",
    "test:node-pty": "node -e \"console.log('Testing node-pty...'); require('node-pty'); console.log('✓ Success')\""
  },
  "dependencies": {
    "node-pty": "^1.0.0"
  }
}
```

## Environment Variables

For consistent builds, set these environment variables:

```powershell
# Temporary (current session)
$env:npm_config_msvs_version = "2022"
$env:npm_config_python = "python"

# Permanent (requires restart)
[Environment]::SetEnvironmentVariable("npm_config_msvs_version", "2022", "User")
[Environment]::SetEnvironmentVariable("npm_config_python", "python", "User")
```

## Integration with Terminal Service

Once node-pty is successfully installed, the terminal service components can use it:

```typescript
// Example usage in terminal service
import * as pty from 'node-pty';

const terminal = pty.spawn('powershell.exe', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
});
```

## Performance Notes

- **Build Time**: Initial node-pty compilation can take 2-5 minutes
- **Cache**: Subsequent installs will use cached binaries if available
- **Memory**: Build process may use significant RAM (2-4GB)
- **Disk Space**: Build artifacts require ~100MB additional space

## Support

If you encounter issues not covered here:

1. Run `npm run verify:build-env` and share output
2. Check VS Code Output > "Claude Portfolio" for detailed errors
3. Try installing with `--verbose` flag for detailed logs
4. Consider using Visual Studio Community instead of Build Tools

## Related Documentation

- [Terminal Integration Guide](./terminal-integration-guide.md)
- [Multi-Terminal Support](../PLAN.md#multi-terminal-support)
- [VS Code Extension Documentation](../vscode-extension/CLAUDE.md)