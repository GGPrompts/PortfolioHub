# PowerShell script to run portfolio and external projects

Write-Host "GGPrompts Portfolio Manager" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host @"
Select what to run:
1. Portfolio only (port 3000)
2. GGPrompts main site (port 5173)
3. GGPrompts Style Guide (port 5174)
4. All projects
5. Exit

Enter choice (1-5)
"@

switch ($choice) {
    "1" {
        Write-Host "Starting Portfolio..." -ForegroundColor Green
        Set-Location "D:\ClaudeWindows\Projects\portfolio-showcase"
        npm run dev
    }
    "2" {
        Write-Host "Starting GGPrompts main site..." -ForegroundColor Green
        Write-Host "Note: Make sure your Supabase environment variables are set!" -ForegroundColor Yellow
        Set-Location "D:\ClaudeWindows\Projects\GGPromptsProject\GGPrompts"
        npm run dev
    }
    "3" {
        Write-Host "Starting GGPrompts Style Guide..." -ForegroundColor Green
        Set-Location "D:\ClaudeWindows\Projects\GGPromptsProject\GGPrompts-StyleGuide"
        npm run dev -- --port 5174
    }
    "4" {
        Write-Host "Starting all projects..." -ForegroundColor Green
        Write-Host "Opening each in a new terminal window..." -ForegroundColor Yellow
        
        # Portfolio
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\ClaudeWindows\Projects\portfolio-showcase'; npm run dev"
        
        # GGPrompts main
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\ClaudeWindows\Projects\GGPromptsProject\GGPrompts'; npm run dev"
        
        # Style Guide
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\ClaudeWindows\Projects\GGPromptsProject\GGPrompts-StyleGuide'; npm run dev -- --port 5174"
        
        Write-Host ""
        Write-Host "All projects started!" -ForegroundColor Green
        Write-Host "Portfolio: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "GGPrompts: http://localhost:5173" -ForegroundColor Cyan
        Write-Host "Style Guide: http://localhost:5174" -ForegroundColor Cyan
    }
    "5" {
        Write-Host "Exiting..." -ForegroundColor Gray
        exit
    }
    default {
        Write-Host "Invalid choice!" -ForegroundColor Red
    }
}