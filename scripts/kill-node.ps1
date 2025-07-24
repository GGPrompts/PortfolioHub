# Kill Node.js Development Processes
param(
    [switch]$Verbose,
    [switch]$Force
)

if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host 'Searching for Node.js development processes...' -ForegroundColor Yellow
Write-Host '===============================================' -ForegroundColor Yellow

$nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue
$killed = 0

if (-not $nodeProcs) {
    Write-Host 'No Node.js processes found' -ForegroundColor Gray
    return
}

foreach($proc in $nodeProcs) {
    try {
        $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
        Write-Verbose "Process $($proc.Id): $cmdLine"
        
        if($cmdLine -and ($cmdLine -match 'dev|start|serve|webpack|vite|nodemon|ts-node')) {
            if ($Force -or (Read-Host "Kill Node.js process (PID: $($proc.Id))? [y/N]") -eq 'y') {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                Write-Host "Killed Node.js process (PID: $($proc.Id))" -ForegroundColor Green
                $killed++
            }
        } else {
            Write-Verbose "Skipping non-development Node.js process (PID: $($proc.Id))"
        }
    } catch {
        Write-Verbose "Could not check process $($proc.Id): $($_.Exception.Message)"
    }
}

if($killed -eq 0) {
    Write-Host 'No Node.js development processes were killed' -ForegroundColor Gray
} else {
    Write-Host "Killed $killed Node.js development processes" -ForegroundColor Green
}

Write-Host ""