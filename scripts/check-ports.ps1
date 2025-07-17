# PowerShell script to check which projects are running

Write-Host "🔍 Checking Project Ports..." -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

$ports = @{
    3000 = "Portfolio"
    3001 = "Portfolio (alternate)"
    3002 = "Matrix Cards"
    3003 = "Sleak Card"
    5173 = "GGPrompts Main"
    5174 = "Style Guide"
}

foreach ($port in $ports.Keys) {
    $result = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
    
    if ($result.TcpTestSucceeded) {
        Write-Host "✅ Port $port" -NoNewline -ForegroundColor Green
        Write-Host " - $($ports[$port]) is RUNNING" -ForegroundColor White
        
        # Try to find the process
        $netstat = netstat -ano | Select-String ":$port"
        if ($netstat) {
            $pid = ($netstat -split '\s+')[-1]
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "   Process: $($process.ProcessName) (PID: $pid)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "❌ Port $port" -NoNewline -ForegroundColor Red
        Write-Host " - $($ports[$port]) is NOT running" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "💡 Tip: Use './start-all.ps1' to start all projects" -ForegroundColor Yellow