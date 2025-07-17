# PowerShell script to launch projects and open them in browser
# This script can be called from the portfolio to start external projects

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectId,
    
    [Parameter(Mandatory=$false)]
    [switch]$OpenOnly
)

# Project configurations
$projects = @{
    "ggprompts-main" = @{
        Path = "D:\ClaudeWindows\Projects\GGPromptsProject\GGPrompts"
        Port = 5173
        Command = "npm run dev"
        Name = "GGPrompts Main"
    }
    "ggprompts-style-guide" = @{
        Path = "D:\ClaudeWindows\Projects\GGPromptsProject\GGPrompts-StyleGuide"
        Port = 5174
        Command = "npm run dev -- --port 5174"
        Name = "GGPrompts Style Guide"
    }
}

$project = $projects[$ProjectId]
if (-not $project) {
    Write-Host "Project not found: $ProjectId" -ForegroundColor Red
    exit 1
}

$port = $project.Port
$url = "http://localhost:$port"

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

# If OpenOnly flag is set, just open the browser
if ($OpenOnly) {
    Start-Process $url
    exit 0
}

# Check if already running
if (Test-Port $port) {
    Write-Host "$($project.Name) is already running on port $port" -ForegroundColor Green
    Start-Process $url
    exit 0
}

# Start the project
Write-Host "Starting $($project.Name)..." -ForegroundColor Cyan
$projectPath = $project.Path

# Create a new PowerShell window for the dev server
$psCommand = @"
cd '$projectPath'
Write-Host 'Starting $($project.Name) on port $port...' -ForegroundColor Green
Write-Host '================================' -ForegroundColor Green
$($project.Command)
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $psCommand

# Wait for the server to start
Write-Host "Waiting for server to start..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 1
    if (Test-Port $port) {
        Write-Host "Server is ready!" -ForegroundColor Green
        Start-Process $url
        exit 0
    }
    $attempt++
    Write-Host "." -NoNewline
}

Write-Host ""
Write-Host "Server took too long to start. Opening browser anyway..." -ForegroundColor Yellow
Start-Process $url