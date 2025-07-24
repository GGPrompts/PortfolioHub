# Enhanced Terminal Cleanup Script
# Automatically closes terminals after command completion with smart delays

param(
    [int]$DelaySeconds = 5,    # Delay before cleanup (allow processes to finish)
    [switch]$Force,            # Force close immediately
    [switch]$Verbose,          # Detailed logging
    [string[]]$KeepProcesses = @('code', 'devenv', 'notepad++'), # Processes to preserve
    [switch]$OnlyExternal      # Only close external terminals, keep VS Code integrated
)

if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host "Enhanced Terminal Cleanup" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

if (-not $Force -and $DelaySeconds -gt 0) {
    Write-Host "[DELAY] Waiting $DelaySeconds seconds for processes to complete..." -ForegroundColor Yellow
    Start-Sleep -Seconds $DelaySeconds
}

# Get current VS Code process to preserve VS Code terminals
$vsCodeProcesses = Get-Process -Name "Code" -ErrorAction SilentlyContinue
$vsCodePIDs = $vsCodeProcesses | ForEach-Object { $_.Id }

# Smart terminal cleanup function
function Close-TerminalProcesses {
    param(
        [string]$ProcessName,
        [string]$DisplayName,
        [scriptblock]$FilterLogic = { $true }
    )
    
    $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Where-Object $FilterLogic
    
    if ($processes) {
        Write-Host "[CLOSE] Found $($processes.Count) $DisplayName instance(s)" -ForegroundColor Yellow
        
        foreach ($process in $processes) {
            try {
                # Check if it's a child of VS Code (integrated terminal)
                $isVSCodeChild = $false
                if ($OnlyExternal -and $vsCodePIDs) {
                    # Simple parent check - if it's likely a VS Code integrated terminal, skip it
                    $parentProcess = Get-WmiObject -Class Win32_Process -Filter "ProcessId=$($process.Id)" -ErrorAction SilentlyContinue
                    if ($parentProcess -and $vsCodePIDs -contains $parentProcess.ParentProcessId) {
                        $isVSCodeChild = $true
                        Write-Verbose "Skipping $ProcessName PID: $($process.Id) (VS Code integrated terminal)"
                    }
                }
                
                if (-not $isVSCodeChild) {
                    Write-Verbose "Closing $ProcessName PID: $($process.Id)"
                    Stop-Process -Id $process.Id -Force
                    Write-Host "  ✅ Closed $DisplayName PID: $($process.Id)" -ForegroundColor Green
                }
            } catch {
                Write-Host "  ❌ Could not close $DisplayName PID: $($process.Id) - $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "[INFO] No $DisplayName instances found" -ForegroundColor Gray
    }
}

# Close Windows Terminal instances
Close-TerminalProcesses -ProcessName "WindowsTerminal" -DisplayName "Windows Terminal"

# Close external PowerShell windows (preserve current session and VS Code integrated)
$currentPID = $PID
Close-TerminalProcesses -ProcessName "powershell" -DisplayName "PowerShell" -FilterLogic { 
    $_.Id -ne $currentPID -and (-not $OnlyExternal -or $vsCodePIDs -notcontains $_.Id)
}

# Close Command Prompt windows
Close-TerminalProcesses -ProcessName "cmd" -DisplayName "Command Prompt"

# Optional: Close node processes that might be hanging
if (-not $OnlyExternal) {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        # Only close node processes not associated with VS Code or essential services
        $cmdLine = (Get-WmiObject -Class Win32_Process -Filter "ProcessId=$($_.Id)" -ErrorAction SilentlyContinue)?.CommandLine
        $cmdLine -and $cmdLine -notmatch "vscode|code\.exe|language-server" -and $cmdLine -match "(dev|start|serve)"
    }
    
    if ($nodeProcesses) {
        Write-Host "[CLOSE] Found $($nodeProcesses.Count) hanging node development process(es)" -ForegroundColor Yellow
        foreach ($node in $nodeProcesses) {
            try {
                Write-Verbose "Closing node PID: $($node.Id)"
                Stop-Process -Id $node.Id -Force
                Write-Host "  ✅ Closed node development server PID: $($node.Id)" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Could not close node PID: $($node.Id)" -ForegroundColor Red
            }
        }
    }
}

Write-Host ""
Write-Host "[COMPLETE] Terminal cleanup finished!" -ForegroundColor Green
Write-Host ""
Write-Host "Preserved:" -ForegroundColor Yellow
Write-Host "  - VS Code integrated terminals" -ForegroundColor Gray
Write-Host "  - Current PowerShell session" -ForegroundColor Gray
if ($OnlyExternal) {
    Write-Host "  - All VS Code child processes" -ForegroundColor Gray
}
Write-Host ""