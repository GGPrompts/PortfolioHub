# Windows Terminal Tabbed version - Start all projects in one terminal with multiple tabs
param(
    [switch]$NoPortfolio,
    [switch]$OnlyPortfolio,
    [switch]$Verbose,
    [switch]$Force  # Force restart even if already running
)

# Set verbose preference if -Verbose is used
if ($Verbose) {
    $VerbosePreference = "Continue"
    Write-Verbose "Verbose output enabled"
}

Write-Host "Starting Portfolio Development Environment (Tabbed)" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
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
            Write-Host "  [CHECK] Found Node.js process on port $Port (PID: $($process.Id))" -ForegroundColor Yellow
            return $true
        } else {
            Write-Host "  [WARN] Port $Port is used by $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Red
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
            Write-Host "  [STOP] Stopping process $($process.ProcessName) (PID: $($process.Id)) on port $Port" -ForegroundColor Red
            Stop-Process -Id $process.Id -Force
            Start-Sleep -Seconds 2
            return $true
        } catch {
            Write-Host "  [ERROR] Failed to stop process on port $Port" -ForegroundColor Red
            return $false
        }
    }
    return $false
}

# Function to build Windows Terminal command for a project
function Build-WindowsTerminalTab {
    param($Name, $Path, $Port, $EnvVars, $Command, $IsFirst = $false)
    
    # Check if already running
    $isRunning = Test-NodeProjectRunning -Path $Path -Port $Port
    
    if ($isRunning) {
        if ($Force) {
            Write-Host "  [RESTART] Force restart requested for $Name - stopping existing server..." -ForegroundColor Yellow
            Stop-ProcessOnPort $Port
            Start-Sleep -Seconds 3
        } else {
            Write-Host "  [SKIP] $Name already running on port $Port (use -Force to restart)" -ForegroundColor Green
            return $null
        }
    }
    
    # Double-check port is free
    if (Test-Port $Port) {
        Write-Host "  [ERROR] Port $Port is still in use - cannot start $Name" -ForegroundColor Red
        return $null
    }
    
    # Build environment variables string
    $envString = ""
    foreach ($env in $EnvVars.GetEnumerator()) {
        $envString += "`$env:$($env.Key) = '$($env.Value)'; "
    }
    
    # Build the PowerShell command
    $psCommand = @"
cd '$Path'; $envString Write-Host '$Name running at http://localhost:$Port' -ForegroundColor Green; $Command
"@
    
    # Build Windows Terminal tab argument
    if ($IsFirst) {
        return "new-tab --title `"$Name`" powershell -NoExit -Command `"$psCommand`""
    } else {
        return "; new-tab --title `"$Name`" powershell -NoExit -Command `"$psCommand`""
    }
}

# Function to display current server status
function Show-ServerStatus {
    Write-Host "[STATUS] Current Server Status:" -ForegroundColor Cyan
    Write-Host "===============================" -ForegroundColor Cyan
    
    foreach ($name in $projects.Keys) {
        $project = $projects[$name]
        $isRunning = Test-NodeProjectRunning -Path $project.Path -Port $project.Port
        $status = if ($isRunning) { "[RUNNING]" } else { "[STOPPED]" }
        $color = if ($isRunning) { "Green" } else { "Red" }
        
        Write-Host "  $status $name (port $($project.Port))" -ForegroundColor $color
    }
    Write-Host ""
}

# Project configurations
$projects = @{
    "Portfolio" = @{
        Path = (Resolve-Path $rootPath).Path
        Port = 5173
        EnvVars = @{
            BROWSER = "none"
            OPEN_BROWSER = "false"
            REACT_APP_OPEN_BROWSER = "false"
        }
        Command = "npm run dev"
    }
    "3D Matrix Cards" = @{
        Path = (Resolve-Path "$rootPath/../Projects/3d-matrix-cards-updated").Path
        Port = 3005
        EnvVars = @{
            PORT = "3005"
            BROWSER = "none"
        }
        Command = "npm start"
    }
    "Matrix Cards" = @{
        Path = (Resolve-Path "$rootPath/../Projects/matrix-cards-react").Path
        Port = 3002
        EnvVars = @{
            PORT = "3002"
            BROWSER = "none"
            REACT_APP_OPEN_BROWSER = "false"
        }
        Command = "npm start"
    }
    "Sleak Card" = @{
        Path = (Resolve-Path "$rootPath/../Projects/sleak-card-updated").Path
        Port = 3003
        EnvVars = @{
            PORT = "3003"
            BROWSER = "none"
            REACT_APP_OPEN_BROWSER = "false"
        }
        Command = "npm start"
    }
    "GGPrompts" = @{
        Path = (Resolve-Path "$rootPath/../Projects/ggprompts").Path
        Port = 9323
        EnvVars = @{
            BROWSER = "none"
            OPEN_BROWSER = "false"
        }
        Command = "npm run dev"
    }
    "GGPrompts Style Guide" = @{
        Path = (Resolve-Path "$rootPath/../Projects/ggprompts-style-guide").Path
        Port = 3001
        EnvVars = @{
            BROWSER = "none"
            OPEN_BROWSER = "false"
        }
        Command = "npm run dev"
    }
    "3D File System" = @{
        Path = (Resolve-Path "$rootPath/../Projects/3d-file-system").Path
        Port = 3004
        EnvVars = @{
            PORT = "3004"
            HOSTNAME = "0.0.0.0"
            BROWSER = "none"
            OPEN_BROWSER = "false"
        }
        Command = "npm run dev"
    }
}

# Show current status first
Show-ServerStatus

# Check if Windows Terminal is available
if (!(Get-Command "wt" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Windows Terminal (wt) not found. Please install Windows Terminal or use start-all-enhanced.ps1" -ForegroundColor Red
    exit 1
}

# Start projects based on parameters
if ($OnlyPortfolio) {
    $projectsToStart = @{"Portfolio" = $projects["Portfolio"]}
} elseif ($NoPortfolio) {
    $projectsToStart = $projects.Clone()
    $projectsToStart.Remove("Portfolio")
} else {
    $projectsToStart = $projects
}

# Build Windows Terminal command
$wtCommand = "wt "
$isFirst = $true
$tabsCreated = 0

foreach ($name in $projectsToStart.Keys) {
    $project = $projectsToStart[$name]
    Write-Host "[CHECK] Preparing $name (port $($project.Port))..." -ForegroundColor Cyan
    
    if (-not (Test-Path $project.Path)) {
        Write-Host "  [WARN] Project $name path not found: $($project.Path)" -ForegroundColor Red
        continue
    }
    
    $tabCommand = Build-WindowsTerminalTab -Name $name -Path $project.Path -Port $project.Port -EnvVars $project.EnvVars -Command $project.Command -IsFirst $isFirst
    
    if ($tabCommand) {
        $wtCommand += $tabCommand
        $isFirst = $false
        $tabsCreated++
        Write-Host "  [READY] $name will start in new tab" -ForegroundColor Green
    }
}

if ($tabsCreated -eq 0) {
    Write-Host "[INFO] No projects to start (all already running or paths not found)" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[LAUNCH] Starting $tabsCreated projects in Windows Terminal..." -ForegroundColor Green
Write-Host "Windows Terminal Command: $wtCommand" -ForegroundColor Gray
Write-Host ""

# Execute the Windows Terminal command
try {
    Invoke-Expression $wtCommand
    Write-Host "[SUCCESS] Windows Terminal launched with $tabsCreated tabs!" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to launch Windows Terminal: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "[FALLBACK] Try running: $wtCommand" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[COMPLETE] Portfolio Development Environment (Tabbed) Ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Access your projects:" -ForegroundColor Cyan
Write-Host "  Portfolio:              http://localhost:5173" -ForegroundColor White
Write-Host "  3D Matrix Cards:        http://localhost:3005" -ForegroundColor White
Write-Host "  3D File System:         http://localhost:3004" -ForegroundColor White
Write-Host "  Matrix Cards:           http://localhost:3002" -ForegroundColor White
Write-Host "  Sleak Card:             http://localhost:3003" -ForegroundColor White
Write-Host "  GGPrompts:              http://localhost:9323" -ForegroundColor White
Write-Host "  GGPrompts Style Guide:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Tips:" -ForegroundColor Yellow
Write-Host "  - Each project runs in its own tab in Windows Terminal" -ForegroundColor Gray
Write-Host "  - Use Ctrl+Shift+W to close individual tabs" -ForegroundColor Gray
Write-Host "  - Use Ctrl+Shift+T to open a new tab" -ForegroundColor Gray
Write-Host "  - Use Ctrl+Tab to switch between tabs" -ForegroundColor Gray
Write-Host ""
Write-Host "Script Options:" -ForegroundColor Yellow
Write-Host "  -OnlyPortfolio    Start only the portfolio" -ForegroundColor Gray
Write-Host "  -NoPortfolio      Start all projects except portfolio" -ForegroundColor Gray
Write-Host "  -Force            Force restart even if already running" -ForegroundColor Gray
Write-Host "  -Verbose          Show detailed output" -ForegroundColor Gray
Write-Host ""
Write-Host "Management Commands:" -ForegroundColor Yellow
Write-Host "  .\scripts\start-all-tabbed.ps1 -Force     # Restart all servers in tabs" -ForegroundColor Gray
Write-Host "  .\scripts\start-all-enhanced.ps1          # Use separate windows (original)" -ForegroundColor Gray
Write-Host "  .\scripts\kill-all-servers.ps1            # Stop all servers" -ForegroundColor Gray