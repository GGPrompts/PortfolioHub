# Enhanced Kill Node.js Development Processes
# Differentiates between terminal-launched vs standalone processes

param(
    [switch]$Verbose,
    [switch]$Force,
    [switch]$TerminalOnly,      # Only kill processes launched from terminals
    [switch]$StandaloneOnly,    # Only kill standalone processes (not terminal-launched)
    [switch]$ShowContext        # Show execution context for each process
)

if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host 'Enhanced Node.js Process Killer' -ForegroundColor Yellow
Write-Host '===============================' -ForegroundColor Yellow

$nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue
$killed = 0
$skipped = 0

if (-not $nodeProcs) {
    Write-Host 'No Node.js processes found' -ForegroundColor Gray
    return
}

# Function to determine execution context
function Get-ExecutionContext($processId) {
    try {
        $processInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
        if (-not $processInfo) { return @{ Context = "Unknown"; IsTerminal = $false; Color = "Gray" } }
        
        $parentPid = $processInfo.ParentProcessId
        $parentProcess = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
        
        if (-not $parentProcess) { 
            return @{ Context = "Orphaned Process"; IsTerminal = $false; Color = "Red" }
        }
        
        $context = "Unknown"
        $isTerminal = $false
        $color = "Gray"
        
        switch ($parentProcess.ProcessName) {
            "powershell" { 
                $context = "PowerShell Terminal"
                $isTerminal = $true
                $color = "Blue"
            }
            "pwsh" { 
                $context = "PowerShell Core Terminal"
                $isTerminal = $true
                $color = "Blue"
            }
            "cmd" { 
                $context = "Command Prompt"
                $isTerminal = $true
                $color = "Blue"
            }
            "WindowsTerminal" { 
                $context = "Windows Terminal"
                $isTerminal = $true
                $color = "Blue"
            }
            "Code" { 
                $context = "VS Code Integrated Terminal"
                $isTerminal = $true
                $color = "Green"
            }
            "bash" {
                $context = "Bash Shell (WSL/Git Bash)"
                $isTerminal = $true
                $color = "Blue"
            }
            "sh" {
                $context = "Shell Process"
                $isTerminal = $true
                $color = "Blue"
            }
            "conhost" {
                # conhost is a console host - check its parent
                $parentInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $parentPid" -ErrorAction SilentlyContinue
                if ($parentInfo) {
                    $grandparentPid = $parentInfo.ParentProcessId
                    $grandparent = Get-Process -Id $grandparentPid -ErrorAction SilentlyContinue
                    if ($grandparent) {
                        switch ($grandparent.ProcessName) {
                            "Code" { 
                                $context = "VS Code Terminal (via conhost)"
                                $isTerminal = $true
                                $color = "Green"
                            }
                            "WindowsTerminal" { 
                                $context = "Windows Terminal (via conhost)"
                                $isTerminal = $true
                                $color = "Blue"
                            }
                            default { 
                                $context = "Console Host Terminal"
                                $isTerminal = $true
                                $color = "Blue"
                            }
                        }
                    }
                }
            }
            "explorer" { 
                $context = "File Explorer (Standalone)"
                $isTerminal = $false
                $color = "Magenta"
            }
            "services" { 
                $context = "Windows Service"
                $isTerminal = $false
                $color = "Red"
            }
            default { 
                # Check if it's an npm/yarn child process
                $parentCmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $parentPid" -ErrorAction SilentlyContinue).CommandLine
                if ($parentCmdLine -match 'npm|yarn|pnpm') {
                    $context = "Package Manager Child"
                    $isTerminal = $false  # npm processes are usually not "terminal" processes themselves
                    $color = "Yellow"
                } else {
                    $context = "Other: $($parentProcess.ProcessName)"
                    $isTerminal = $false
                    $color = "White"
                }
            }
        }
        
        return @{ Context = $context; IsTerminal = $isTerminal; Color = $color }
    } catch {
        return @{ Context = "Error analyzing"; IsTerminal = $false; Color = "Red" }
    }
}

Write-Host ""
foreach($proc in $nodeProcs) {
    try {
        $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
        $isDev = $cmdLine -and ($cmdLine -match 'dev|start|serve|webpack|vite|nodemon|ts-node')
        
        if (-not $isDev) {
            Write-Verbose "Skipping non-development Node.js process (PID: $($proc.Id))"
            $skipped++
            continue
        }
        
        $contextInfo = Get-ExecutionContext $proc.Id
        
        # Apply filtering based on parameters
        $shouldKill = $true
        if ($TerminalOnly -and -not $contextInfo.IsTerminal) {
            Write-Verbose "Skipping non-terminal process (PID: $($proc.Id)): $($contextInfo.Context)"
            $skipped++
            continue
        }
        if ($StandaloneOnly -and $contextInfo.IsTerminal) {
            Write-Verbose "Skipping terminal process (PID: $($proc.Id)): $($contextInfo.Context)"
            $skipped++
            continue
        }
        
        # Show process information
        Write-Host "Process $($proc.Id):" -ForegroundColor White
        if ($ShowContext -or $Verbose) {
            Write-Host "  Command: $cmdLine" -ForegroundColor Gray
            Write-Host "  Context: $($contextInfo.Context)" -ForegroundColor $contextInfo.Color
            Write-Host "  Terminal Process: $(if($contextInfo.IsTerminal) { 'Yes' } else { 'No' })" -ForegroundColor $(if($contextInfo.IsTerminal) { 'Cyan' } else { 'Magenta' })
        }
        
        # Confirm killing
        $shouldProceed = $Force
        if (-not $Force) {
            $contextDesc = if ($contextInfo.IsTerminal) { "terminal" } else { "standalone" }
            $shouldProceed = (Read-Host "  Kill $contextDesc Node.js process (PID: $($proc.Id))? [y/N]") -eq 'y'
        }
        
        if ($shouldProceed) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Host "  ✅ Killed $($contextInfo.Context) process (PID: $($proc.Id))" -ForegroundColor Green
            $killed++
        } else {
            Write-Host "  ⏭️ Skipped process (PID: $($proc.Id))" -ForegroundColor Yellow
            $skipped++
        }
        
        Write-Host ""
    } catch {
        Write-Verbose "Could not check process $($proc.Id): $($_.Exception.Message)"
        $skipped++
    }
}

# Summary
Write-Host "Summary:" -ForegroundColor White
Write-Host "  Killed: $killed processes" -ForegroundColor Green
Write-Host "  Skipped: $skipped processes" -ForegroundColor Yellow

if ($killed -eq 0 -and $skipped -eq 0) {
    Write-Host 'No Node.js development processes found' -ForegroundColor Gray
}

Write-Host ""