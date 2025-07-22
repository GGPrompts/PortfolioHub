# Reinstall Claude Portfolio VS Code Extension

Write-Host "🚮 Uninstalling existing extension..." -ForegroundColor Yellow
code --uninstall-extension claude-dev.claude-portfolio

Write-Host "🔨 Building portfolio React app..." -ForegroundColor Cyan
Set-Location "..\.."
npm run build

Write-Host "📋 Copying portfolio dist files..." -ForegroundColor Cyan
Copy-Item -Path "dist\*" -Destination "vscode-extension\claude-portfolio\portfolio-dist\" -Recurse -Force

Write-Host "🔨 Compiling TypeScript..." -ForegroundColor Cyan
Set-Location "vscode-extension\claude-portfolio"
npm run compile

Write-Host "📦 Creating VSIX package..." -ForegroundColor Cyan
npx vsce package --out claude-portfolio-reinstalled.vsix

Write-Host "🚀 Installing extension..." -ForegroundColor Cyan
code --install-extension .\claude-portfolio-reinstalled.vsix

Write-Host "✅ Extension reinstalled successfully!" -ForegroundColor Green
Write-Host "🔄 Please reload VS Code window (Ctrl+Shift+P → Developer: Reload Window)" -ForegroundColor Yellow
Write-Host "📂 Look for Claude Portfolio icon in the Activity Bar!" -ForegroundColor Blue
