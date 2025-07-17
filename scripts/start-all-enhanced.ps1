# Enhanced PowerShell script with comprehensive server detection
param(
    [switch]$NoPortfolio,
    [switch]$OnlyPortfolio,
    [switch]$Verbose,
    [switch]$Force  # Force restart even if already running
)

Write-Host "Starting Portfolio Development Environment (Enhanced)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Split-Path -Parent $PSScriptRoot

# Enhanced function to check if port is in use
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

# Function to get process using a specific port
function Get-ProcessOnPort {
    param($Port)
    try {
        $netstat = netstat -ano | Select-String ":$Port "
        if ($netstat) {
            $processId = ($netstat -split '\s+')[-1]
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            return $process
        }
    } catch {
        return $null
    }
    return $null
}

# Function to check if a Node.js project is already running in a directory
function Test-NodeProjectRunning {
    param($Path, $Port)
    
    # Check if port is in use
    if (-not (Test-Port $Port)) {
        return $false
    }
    
    # Get the process using the port
    $process = Get-ProcessOnPort $Port
    if ($process) {
        # Check if it's a Node.js process
        if ($process.ProcessName -eq "node") {
            Write-Host "  🔍 Found Node.js process on port $Port (PID: $($process.Id))" -ForegroundColor Yellow
            return $true
        } else {
            Write-Host "  ⚠️ Port $Port is used by $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Red
            return $true
        }
    }
    
    return $false
}

# Function to kill process on port
function Stop-ProcessOnPort {
    param($Port)
    
    $process = Get-ProcessOnPort $Port
    if ($process) {
        try {
            Write-Host "  🛑 Stopping process $($process.ProcessName) (PID: $($process.Id)) on port $Port" -ForegroundColor Red
            Stop-Process -Id $process.Id -Force
            Start-Sleep -Seconds 2
            return $true
        } catch {
            Write-Host "  ❌ Failed to stop process on port $Port" -ForegroundColor Red
            return $false
        }
    }
    return $false
}

# Function to start a project with enhanced detection
function Start-Project {
    param($Name, $Path, $Port, $EnvVars, $Command)
    
    Write-Host "🔍 Checking $Name (port $Port)..." -ForegroundColor Cyan
    
    if (-not (Test-Path $Path)) {
        Write-Host "  ⚠️ Project $Name path not found: $Path" -ForegroundColor Red
        return
    }
    
    # Check if already running
    $isRunning = Test-NodeProjectRunning -Path $Path -Port $Port
    
    if ($isRunning) {
        if ($Force) {
            Write-Host "  🔄 Force restart requested - stopping existing server..." -ForegroundColor Yellow
            Stop-ProcessOnPort $Port
            Start-Sleep -Seconds 3
        } else {
            Write-Host "  ✅ $Name already running on port $Port (use -Force to restart)" -ForegroundColor Green
            return
        }
    }
    
    # Double-check port is free
    if (Test-Port $Port) {
        Write-Host "  ❌ Port $Port is still in use - cannot start $Name" -ForegroundColor Red
        return
    }
    
    Write-Host "  🚀 Starting $Name on port $Port..." -ForegroundColor Green
    
    # Build the command with proper PowerShell syntax
    $commandParts = @()
    $commandParts += "cd '$Path'"
    $commandParts += "Write-Host '$Name running at http://localhost:$Port' -ForegroundColor Green"
    
    # Add environment variables
    foreach ($env in $EnvVars.GetEnumerator()) {
        $commandParts += "`$env:$($env.Key) = '$($env.Value)'"
    }
    
    # Add the actual command
    $commandParts += $Command
    
    $fullCommand = $commandParts -join '; '
    
    # Start the process
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $fullCommand
    
    Start-Sleep -Seconds 3
    
    # Verify it started
    if (Test-Port $Port) {
        Write-Host "  ✅ $Name started successfully on port $Port" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ $Name may be starting... (port not yet active)" -ForegroundColor Yellow
    }
}

# Function to display current server status
function Show-ServerStatus {
    Write-Host "🔍 Current Server Status:" -ForegroundColor Cyan
    Write-Host "========================" -ForegroundColor Cyan
    
    foreach ($name in $projects.Keys) {
        $project = $projects[$name]
        $isRunning = Test-NodeProjectRunning -Path $project.Path -Port $project.Port
        $status = if ($isRunning) { "🟢 RUNNING" } else { "🔴 STOPPED" }
        $color = if ($isRunning) { "Green" } else { "Red" }
        
        Write-Host "  $status $name (port $($project.Port))" -ForegroundColor $color
    }
    Write-Host ""
}

# Project configurations
$projects = @{
    "Portfolio" = @{
        Path = $rootPath
        Port = 3000
        EnvVars = @{
            BROWSER = "none"
            OPEN_BROWSER = "false"
            REACT_APP_OPEN_BROWSER = "false"
        }
        Command = "npm run dev"
    }
    "Matrix Cards" = @{
        Path = "$rootPath\projects\matrix-cards"
        Port = 3002
        EnvVars = @{
            PORT = "3002"
            BROWSER = "none"
            REACT_APP_OPEN_BROWSER = "false"
        }
        Command = "npm start"
    }
    "Sleak Card" = @{
        Path = "$rootPath\projects\sleak-card"
        Port = 3003
        EnvVars = @{
            PORT = "3003"
            BROWSER = "none"
            REACT_APP_OPEN_BROWSER = "false"
        }
        Command = "npm start"
    }
    "GGPrompts" = @{
        Path = "$rootPath\projects\ggprompts"
        Port = 9323
        EnvVars = @{
            BROWSER = "none"
            OPEN_BROWSER = "false"
        }
        Command = "npm run dev"
    }
    "GGPrompts Style Guide" = @{
        Path = "$rootPath\projects\ggprompts-style-guide"
        Port = 3001
        EnvVars = @{
            BROWSER = "none"
            OPEN_BROWSER = "false"
        }
        Command = "npm run dev"
    }
    "3D File System" = @{
        Path = "$rootPath\projects\3d-file-system"
        Port = 3004
        EnvVars = @{
            BROWSER = "none"
            OPEN_BROWSER = "false"
        }
        Command = "npm run dev"
    }
}

# Show current status first
Show-ServerStatus

# Start projects based on parameters
if ($OnlyPortfolio) {
    $projectsToStart = @{"Portfolio" = $projects["Portfolio"]}
} elseif ($NoPortfolio) {
    $projectsToStart = $projects.Clone()
    $projectsToStart.Remove("Portfolio")
} else {
    $projectsToStart = $projects
}

foreach ($name in $projectsToStart.Keys) {
    $project = $projectsToStart[$name]
    Start-Project -Name $name -Path $project.Path -Port $project.Port -EnvVars $project.EnvVars -Command $project.Command
}

Write-Host ""
Write-Host "🎯 Portfolio Development Environment Management Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Access your projects:" -ForegroundColor Cyan
Write-Host "  📊 Portfolio:              http://localhost:3000" -ForegroundColor White
Write-Host "  🗂️ 3D File System:         http://localhost:3004" -ForegroundColor White
Write-Host "  🎴 Matrix Cards:           http://localhost:3002" -ForegroundColor White
Write-Host "  💎 Sleak Card:             http://localhost:3003" -ForegroundColor White
Write-Host "  🤖 GGPrompts:              http://localhost:9323" -ForegroundColor White
Write-Host "  📚 GGPrompts Style Guide:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "💡 Script Options:" -ForegroundColor Yellow
Write-Host "  -OnlyPortfolio    Start only the portfolio" -ForegroundColor Gray
Write-Host "  -NoPortfolio      Start all projects except portfolio" -ForegroundColor Gray
Write-Host "  -Force            Force restart even if already running" -ForegroundColor Gray
Write-Host "  -Verbose          Show detailed output" -ForegroundColor Gray
Write-Host ""
Write-Host "🔄 Management Commands:" -ForegroundColor Yellow
Write-Host "  .\scripts\start-all-enhanced.ps1 -Force    # Restart all servers" -ForegroundColor Gray
Write-Host "  .\scripts\kill-all-servers.ps1             # Stop all servers" -ForegroundColor Gray