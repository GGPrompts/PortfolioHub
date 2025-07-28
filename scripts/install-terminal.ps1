# Terminal System Installation Script
# Installs all required dependencies for the Claude Dev Portfolio Terminal System

Write-Host "Installing Terminal System Dependencies..." -ForegroundColor Cyan

# Check if Node.js is installed
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Install global dependencies
Write-Host "`nInstalling global dependencies..." -ForegroundColor Yellow
npm install -g node-pty-prebuilt-multiarch

# Install React app dependencies
Write-Host "`nInstalling React app dependencies..." -ForegroundColor Yellow
Set-Location -Path ".."
npm install

# Install additional xterm addons
Write-Host "`nInstalling xterm addons..." -ForegroundColor Yellow
npm install xterm-addon-search

# Install VS Code extension dependencies
Write-Host "`nInstalling VS Code extension dependencies..." -ForegroundColor Yellow
Set-Location -Path "vscode-extension"
npm install

# Create required directories
Write-Host "`nCreating required directories..." -ForegroundColor Yellow
$dirs = @(
    "../public/terminal-assets",
    "../src/components/PersistentTerminals",
    "../src/services/terminal"
)

foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Green
    }
}

# Copy terminal assets if they exist
if (Test-Path "../node_modules/xterm/css/xterm.css") {
    Copy-Item "../node_modules/xterm/css/xterm.css" "../public/terminal-assets/" -Force
    Write-Host "Copied xterm.css to public assets" -ForegroundColor Green
}

Write-Host "`nTerminal System installation complete!" -ForegroundColor Green
Write-Host "Run 'npm run dev' in the root directory to start the development server." -ForegroundColor Cyan
