# Close All Terminals Script
# Cleanly closes all Windows Terminal instances and PowerShell windows

param(
    [switch]$Verbose
)

if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host "Closing All Terminal Windows..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Close Windows Terminal instances
$windowsTerminals = Get-Process -Name "WindowsTerminal" -ErrorAction SilentlyContinue
if ($windowsTerminals) {
    Write-Host "[CLOSE] Found $($windowsTerminals.Count) Windows Terminal instance(s)" -ForegroundColor Yellow
    foreach ($terminal in $windowsTerminals) {
        try {
            Write-Verbose "Closing Windows Terminal PID: $($terminal.Id)"
            Stop-Process -Id $terminal.Id -Force
        } catch {
            Write-Host "  [WARN] Could not close Windows Terminal PID: $($terminal.Id)" -ForegroundColor Red
        }
    }
    Write-Host "  [SUCCESS] Windows Terminal instances closed" -ForegroundColor Green
} else {
    Write-Host "[INFO] No Windows Terminal instances found" -ForegroundColor Gray
}

# Close PowerShell windows (but not the current one)
$currentPID = $PID
$powershellProcesses = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $currentPID }
if ($powershellProcesses) {
    Write-Host "[CLOSE] Found $($powershellProcesses.Count) PowerShell window(s)" -ForegroundColor Yellow
    foreach ($ps in $powershellProcesses) {
        try {
            Write-Verbose "Closing PowerShell PID: $($ps.Id)"
            Stop-Process -Id $ps.Id -Force
        } catch {
            Write-Host "  [WARN] Could not close PowerShell PID: $($ps.Id)" -ForegroundColor Red
        }
    }
    Write-Host "  [SUCCESS] PowerShell windows closed" -ForegroundColor Green
} else {
    Write-Host "[INFO] No other PowerShell windows found" -ForegroundColor Gray
}

# Close Command Prompt windows
$cmdProcesses = Get-Process -Name "cmd" -ErrorAction SilentlyContinue
if ($cmdProcesses) {
    Write-Host "[CLOSE] Found $($cmdProcesses.Count) Command Prompt window(s)" -ForegroundColor Yellow
    foreach ($cmd in $cmdProcesses) {
        try {
            Write-Verbose "Closing CMD PID: $($cmd.Id)"
            Stop-Process -Id $cmd.Id -Force
        } catch {
            Write-Host "  [WARN] Could not close CMD PID: $($cmd.Id)" -ForegroundColor Red
        }
    }
    Write-Host "  [SUCCESS] Command Prompt windows closed" -ForegroundColor Green
} else {
    Write-Host "[INFO] No Command Prompt windows found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[COMPLETE] All terminal windows closed!" -ForegroundColor Green
Write-Host ""
Write-Host "Note: This script does not close:" -ForegroundColor Yellow
Write-Host "  - VS Code integrated terminals" -ForegroundColor Gray
Write-Host "  - The current PowerShell session (this script)" -ForegroundColor Gray
Write-Host ""