# Fixed PowerShell script to start all projects
param(
    [switch]$NoPortfolio,
    [switch]$OnlyPortfolio,
    [switch]$Verbose
)

Write-Host "Starting Portfolio Development Environment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = Split-Path -Parent $PSScriptRoot

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

# Function to start a project
function Start-Project {
    param($Name, $Path, $Port, $Command, $Args)
    
    if (Test-Port $Port) {
        Write-Host "Project $Name already running on port $Port" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Starting $Name on port $Port..." -ForegroundColor Green
    
    # Set environment variables to prevent auto-opening browsers
    $env:BROWSER = "none"
    $env:OPEN_BROWSER = "false"
    $env:REACT_APP_OPEN_BROWSER = "false"
    
    $commandString = "$Command " + ($Args -join ' ')
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; Write-Host '$Name running at http://localhost:$Port' -ForegroundColor Green; $env:BROWSER = 'none'; $env:OPEN_BROWSER = 'false'; $env:REACT_APP_OPEN_BROWSER = 'false'; $commandString"
    
    Start-Sleep -Seconds 2
}

# Project configurations
$projects = @{
    "Portfolio" = @{
        Path = $rootPath
        Port = 3000
        Command = "npm"
        Args = @("run", "dev")
    }
    "Matrix Cards" = @{
        Path = "$rootPath\projects\matrix-cards"
        Port = 3002
        Command = "npm"
        Args = @("start")
    }
    "Sleak Card" = @{
        Path = "$rootPath\projects\sleak-card"
        Port = 3003
        Command = "npm"
        Args = @("start")
    }
    "GGPrompts" = @{
        Path = "$rootPath\projects\ggprompts"
        Port = 9323
        Command = "npm"
        Args = @("run", "dev")
    }
    "GGPrompts Style Guide" = @{
        Path = "$rootPath\projects\ggprompts-style-guide"
        Port = 3001
        Command = "npm"
        Args = @("run", "dev")
    }
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

foreach ($name in $projectsToStart.Keys) {
    $project = $projectsToStart[$name]
    
    if (Test-Path $project.Path) {
        Start-Project -Name $name -Path $project.Path -Port $project.Port -Command $project.Command -Args $project.Args
    } else {
        Write-Host "Project $name path not found: $($project.Path)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Portfolio Development Environment Started!" -ForegroundColor Green
Write-Host ""
Write-Host "Access your projects:" -ForegroundColor Cyan
Write-Host "  Portfolio:              http://localhost:3000" -ForegroundColor White
Write-Host "  Matrix Cards:           http://localhost:3002" -ForegroundColor White
Write-Host "  Sleak Card:             http://localhost:3003" -ForegroundColor White
Write-Host "  GGPrompts:              http://localhost:9323" -ForegroundColor White
Write-Host "  GGPrompts Style Guide:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Tips:" -ForegroundColor Yellow
Write-Host "  - Use Ctrl+C in each terminal to stop individual projects" -ForegroundColor Gray
Write-Host "  - Portfolio will show running status for each project" -ForegroundColor Gray
Write-Host "  - No browsers will auto-open - navigate manually" -ForegroundColor Gray