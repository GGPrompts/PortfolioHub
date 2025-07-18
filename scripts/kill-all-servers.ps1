# PowerShell script to stop all portfolio development servers
Write-Host "STOPPING Portfolio Development Servers" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Red
Write-Host ""

# Function to get process using a specific port
function Get-ProcessOnPort {
    param($Port)
    try {
        $netstat = netstat -ano | Select-String ":$Port "
        if ($netstat) {
            $processId = ($netstat -split '\s+')[-1]
            # Validate process ID is a valid number and not 0
            if ($processId -match '^\d+$' -and [int]$processId -gt 0) {
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                return $process
            }
        }
    } catch {
        return $null
    }
    return $null
}

# Function to kill process on port
function Stop-ProcessOnPort {
    param($Port, $Name)
    
    $process = Get-ProcessOnPort $Port
    if ($process) {
        try {
            Write-Host "STOPPING $Name (PID: $($process.Id)) on port $Port" -ForegroundColor Yellow
            Stop-Process -Id $process.Id -Force
            Start-Sleep -Seconds 1
            
            # Verify it stopped
            if (-not (Get-ProcessOnPort $Port)) {
                Write-Host "  SUCCESS: $Name stopped successfully" -ForegroundColor Green
            } else {
                Write-Host "  WARNING: $Name may still be running" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ERROR: Failed to stop $Name on port $Port" -ForegroundColor Red
        }
    } else {
        Write-Host "No process found on port $Port ($Name)" -ForegroundColor Gray
    }
}

# Portfolio project ports
$ports = @{
    5173 = "Portfolio"
    3001 = "GGPrompts Style Guide"
    3005 = "3D Matrix Cards"
    3002 = "Matrix Cards"
    3003 = "Sleak Card"
    9323 = "GGPrompts"
    3004 = "3D File System"
}

# Stop all servers
foreach ($port in $ports.Keys) {
    Stop-ProcessOnPort -Port $port -Name $ports[$port]
}

Write-Host ""
Write-Host "Checking for any remaining Node.js processes..." -ForegroundColor Cyan

# Check for any remaining Node.js processes in project directories
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js processes still running:" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        Write-Host "  - PID: $($_.Id), Start Time: $($_.StartTime)" -ForegroundColor Gray
    }
    Write-Host ""
    
    # Ask if user wants to kill all Node processes
    $response = Read-Host "Kill all remaining Node.js processes? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "Attempting to kill all Node.js processes..." -ForegroundColor Yellow
        try {
            Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
            Write-Host "All Node.js processes terminated" -ForegroundColor Green
        } catch {
            Write-Host "Some processes require administrator privileges to terminate" -ForegroundColor Red
            Write-Host "Try running PowerShell as Administrator and run this script again" -ForegroundColor Cyan
        }
    } else {
        Write-Host "Node.js processes left running" -ForegroundColor Gray
        Write-Host "To kill manually: Get-Process -Name node | Stop-Process -Force" -ForegroundColor Cyan
    }
} else {
    Write-Host "No Node.js processes found" -ForegroundColor Green
}

Write-Host ""
Write-Host "Server shutdown complete!" -ForegroundColor Green