# PowerShell script to check status of all portfolio development servers
Write-Host "🔍 Portfolio Development Server Status" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

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

# Function to test if server is responding with HTTP
function Test-HttpServer {
    param($Port)
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port" -Method Head -TimeoutSec 5 -ErrorAction SilentlyContinue
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Portfolio project ports
$projects = @{
    3000 = @{ Name = "Portfolio"; Url = "http://localhost:3000" }
    3001 = @{ Name = "GGPrompts Style Guide"; Url = "http://localhost:3001" }
    3002 = @{ Name = "Matrix Cards"; Url = "http://localhost:3002" }
    3003 = @{ Name = "Sleak Card"; Url = "http://localhost:3003" }
    9323 = @{ Name = "GGPrompts"; Url = "http://localhost:9323" }
}

$runningCount = 0
$totalCount = $projects.Count

# Check each project
foreach ($port in $projects.Keys) {
    $project = $projects[$port]
    $isPortOpen = Test-Port $port
    $isHttpWorking = Test-HttpServer $port
    $process = Get-ProcessOnPort $port
    
    if ($isPortOpen) {
        $runningCount++
        if ($isHttpWorking) {
            Write-Host "✅ $($project.Name)" -ForegroundColor Green
            Write-Host "   Port: $port | Status: Running | HTTP: OK" -ForegroundColor Gray
        } else {
            Write-Host "⚠️ $($project.Name)" -ForegroundColor Yellow
            Write-Host "   Port: $port | Status: Port Open | HTTP: Not Responding" -ForegroundColor Gray
        }
        
        if ($process) {
            Write-Host "   Process: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Gray
        }
        
        Write-Host "   URL: $($project.Url)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ $($project.Name)" -ForegroundColor Red
        Write-Host "   Port: $port | Status: Stopped" -ForegroundColor Gray
    }
    
    Write-Host ""
}

# Summary
Write-Host "📊 Summary: $runningCount/$totalCount projects running" -ForegroundColor Cyan

if ($runningCount -eq $totalCount) {
    Write-Host "🎉 All projects are running!" -ForegroundColor Green
} elseif ($runningCount -eq 0) {
    Write-Host "💤 No projects are running" -ForegroundColor Yellow
    Write-Host "💡 Run '.\scripts\start-all-enhanced.ps1' to start all projects" -ForegroundColor Gray
} else {
    Write-Host "⚠️ Some projects are not running" -ForegroundColor Yellow
    Write-Host "💡 Run '.\scripts\start-all-enhanced.ps1' to start missing projects" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Yellow
Write-Host "  .\scripts\start-all-enhanced.ps1        # Start all projects" -ForegroundColor Gray
Write-Host "  .\scripts\start-all-enhanced.ps1 -Force # Restart all projects" -ForegroundColor Gray
Write-Host "  .\scripts\kill-all-servers.ps1          # Stop all projects" -ForegroundColor Gray