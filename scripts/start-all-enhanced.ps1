# Enhanced PowerShell script with comprehensive server detection
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

# Function to start a project with enhanced detection
function Start-Project {
    param($Name, $Path, $Port, $EnvVars, $Command)
    
    Write-Host "[CHECK] Checking $Name (port $Port)..." -ForegroundColor Cyan
    
    if (-not (Test-Path $Path)) {
        Write-Host "  [WARN] Project $Name path not found: $Path" -ForegroundColor Red
        return
    }
    
    # Check if already running
    $isRunning = Test-NodeProjectRunning -Path $Path -Port $Port
    Write-Verbose "Checked running status for $Name - $isRunning"
    
    if ($isRunning) {
        if ($Force) {
            Write-Host "  [RESTART] Force restart requested - stopping existing server..." -ForegroundColor Yellow
            Write-Verbose "Force restart requested for $Name on port $Port"
            Stop-ProcessOnPort $Port
            Start-Sleep -Seconds 3
        } else {
            Write-Host "  [RUNNING] $Name already running on port $Port (use -Force to restart)" -ForegroundColor Green
            Write-Verbose "$Name already running, skipping start"
            return
        }
    }
    
    # Double-check port is free
    if (Test-Port $Port) {
        Write-Host "  [ERROR] Port $Port is still in use - cannot start $Name" -ForegroundColor Red
        Write-Verbose "Port $Port is still in use after stop attempt"
        return
    }
    
    Write-Host "  [START] Starting $Name on port $Port..." -ForegroundColor Green
    
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
    
    # Start the process using PowerShell 7 (pwsh) instead of Windows PowerShell 5.1
    Write-Verbose "Starting process - $fullCommand"
    if (Get-Command pwsh -ErrorAction SilentlyContinue) {
        Start-Process pwsh -ArgumentList "-NoExit", "-Command", $fullCommand
        Write-Host "  [INFO] Started with PowerShell 7 (pwsh)" -ForegroundColor Blue
    } else {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $fullCommand
        Write-Host "  [WARN] PowerShell 7 not found, using Windows PowerShell 5.1" -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 3
    
    # Verify it started
    if (Test-Port $Port) {
        Write-Host "  [SUCCESS] $Name started successfully on port $Port" -ForegroundColor Green
    } else {
        Write-Host "  [WAIT] $Name may be starting... (port not yet active)" -ForegroundColor Yellow
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

# Project configurations (using external Projects directory)
$externalProjectsPath = "D:\ClaudeWindows\Projects"

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
        Path = (Resolve-Path "$externalProjectsPath/3d-matrix-cards-updated").Path
        Port = 3005
        EnvVars = @{
            PORT = "3005"
            BROWSER = "none"
        }
        Command = "npm start"
    }
    "Matrix Cards" = @{
        Path = (Resolve-Path "$externalProjectsPath/matrix-cards-react").Path
        Port = 3002
        EnvVars = @{
            PORT = "3002"
            BROWSER = "none"
            REACT_APP_OPEN_BROWSER = "false"
        }
        Command = "npm start"
    }
    "Sleak Card" = @{
        Path = (Resolve-Path "$externalProjectsPath/sleak-card-updated").Path
        Port = 3003
        EnvVars = @{
            PORT = "3003"
            BROWSER = "none"
            REACT_APP_OPEN_BROWSER = "false"
        }
        Command = "npm start"
    }
    "GGPrompts" = @{
        Path = (Resolve-Path "$externalProjectsPath/ggprompts").Path
        Port = 9323
        EnvVars = @{
            BROWSER = "none"
            OPEN_BROWSER = "false"
        }
        Command = "npm run dev"
    }
    "GGPrompts Style Guide" = @{
        Path = (Resolve-Path "$externalProjectsPath/ggprompts-style-guide").Path
        Port = 3001
        EnvVars = @{
            BROWSER = "none"
            OPEN_BROWSER = "false"
        }
        Command = "npm run dev"
    }
    "GGPrompts Professional" = @{
        Path = (Resolve-Path "$externalProjectsPath/ggprompts-professional").Path
        Port = 3006
        EnvVars = @{
            PORT = "3006"
            BROWSER = "none"
            OPEN_BROWSER = "false"
        }
        Command = "npm run dev"
    }
    "3D File System" = @{
        Path = (Resolve-Path "$externalProjectsPath/3d-file-system").Path
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
Write-Host "[COMPLETE] Portfolio Development Environment Management Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Access your projects:" -ForegroundColor Cyan
Write-Host "  Portfolio:              http://localhost:5173" -ForegroundColor White
Write-Host "  3D Matrix Cards:        http://localhost:3005" -ForegroundColor White
Write-Host "  3D File System:         http://localhost:3004" -ForegroundColor White
Write-Host "  Matrix Cards:           http://localhost:3002" -ForegroundColor White
Write-Host "  Sleak Card:             http://localhost:3003" -ForegroundColor White
Write-Host "  GGPrompts:              http://localhost:9323" -ForegroundColor White
Write-Host "  GGPrompts Style Guide:  http://localhost:3001" -ForegroundColor White
Write-Host "  GGPrompts Professional: http://localhost:3006" -ForegroundColor White
Write-Host ""
Write-Host "Script Options:" -ForegroundColor Yellow
Write-Host "  -OnlyPortfolio    Start only the portfolio" -ForegroundColor Gray
Write-Host "  -NoPortfolio      Start all projects except portfolio" -ForegroundColor Gray
Write-Host "  -Force            Force restart even if already running" -ForegroundColor Gray
Write-Host "  -Verbose          Show detailed output" -ForegroundColor Gray
Write-Host ""
Write-Host "Management Commands:" -ForegroundColor Yellow
Write-Host "  .\scripts\start-all-enhanced.ps1 -Force    # Restart all servers" -ForegroundColor Gray
Write-Host "  .\scripts\kill-all-servers.ps1             # Stop all servers" -ForegroundColor Gray