# PowerShell script to kill a process on a specific port

param(
    [Parameter(Mandatory=$true)]
    [int]$Port
)

Write-Host "Finding process on port $Port..." -ForegroundColor Yellow

$netstat = netstat -ano | Select-String ":$Port"
if ($netstat) {
    $pid = ($netstat -split '\s+')[-1]
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-Host "Found process: $($process.ProcessName) (PID: $pid)" -ForegroundColor Cyan
        
        $confirm = Read-Host "Kill this process? (y/n)"
        if ($confirm -eq 'y') {
            Stop-Process -Id $pid -Force
            Write-Host "✅ Process killed" -ForegroundColor Green
        } else {
            Write-Host "❌ Cancelled" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ No process found on port $Port" -ForegroundColor Red
}