# PowerShell script to stop all portfolio development servers
Write-Host "🛑 Stopping Portfolio Development Servers" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Red
Write-Host ""

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

# Function to kill process on port
function Stop-ProcessOnPort {
    param($Port, $Name)
    
    $process = Get-ProcessOnPort $Port
    if ($process) {
        try {
            Write-Host "🛑 Stopping $Name (PID: $($process.Id)) on port $Port" -ForegroundColor Yellow
            Stop-Process -Id $process.Id -Force
            Start-Sleep -Seconds 1
            
            # Verify it stopped
            if (-not (Get-ProcessOnPort $Port)) {
                Write-Host "  ✅ $Name stopped successfully" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️ $Name may still be running" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ❌ Failed to stop $Name on port $Port" -ForegroundColor Red
        }
    } else {
        Write-Host "🔍 No process found on port $Port ($Name)" -ForegroundColor Gray
    }
}

# Portfolio project ports
$ports = @{
    3000 = "Portfolio"
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
Write-Host "🔍 Checking for any remaining Node.js processes..." -ForegroundColor Cyan

# Check for any remaining Node.js processes in project directories
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js processes still running:" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        Write-Host "  - PID: $($_.Id), Start Time: $($_.StartTime)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "To kill all Node.js processes (use with caution):" -ForegroundColor Yellow
    Write-Host "  Get-Process -Name 'node' | Stop-Process -Force" -ForegroundColor Gray
} else {
    Write-Host "✅ No Node.js processes found" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎯 Server shutdown complete!" -ForegroundColor Green