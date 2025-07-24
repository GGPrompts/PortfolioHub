# Enhanced Port Scanner - Differentiates between terminal vs standalone processes
param(
    [switch]$Verbose,
    [switch]$ShowContext,    # Show whether process is terminal-launched or standalone
    [switch]$TerminalOnly,   # Only show terminal-launched processes
    [switch]$StandaloneOnly  # Only show standalone processes
)

if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host 'Enhanced Port Scanner' -ForegroundColor Cyan
Write-Host '====================' -ForegroundColor Cyan

$ports = @(3000..3010) + @(5173..5179) + @(8000..8009) + @(9000..9009)
$found = 0
$terminalProcesses = 0
$standaloneProcesses = 0

# Function to determine execution context
function Get-ExecutionContext($processId) {
    try {
        $processInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
        if (-not $processInfo) { 
            return @{ Context = "Unknown"; IsTerminal = $false; Symbol = "[?]" } 
        }
        
        $parentPid = $processInfo.ParentProcessId
        $parentProcess = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
        
        if (-not $parentProcess) { 
            return @{ Context = "Orphaned"; IsTerminal = $false; Symbol = "[!]" }
        }
        
        $isTerminal = $false
        $context = "Unknown"
        $symbol = "[?]"
        
        switch ($parentProcess.ProcessName) {
            { $_ -in @("powershell", "pwsh") } { 
                $context = "PowerShell Terminal"
                $isTerminal = $true
                $symbol = "[PS]"
            }
            "cmd" { 
                $context = "Command Prompt"
                $isTerminal = $true
                $symbol = "[CMD]"
            }
            { $_ -in @("bash", "sh") } { 
                $context = "Shell Terminal"
                $isTerminal = $true
                $symbol = "[SH]"
            }
            "WindowsTerminal" { 
                $context = "Windows Terminal"
                $isTerminal = $true
                $symbol = "[WT]"
            }
            "Code" { 
                $context = "VS Code Terminal"
                $isTerminal = $true
                $symbol = "[VSC]"
            }
            "conhost" {
                # Check grandparent for console host processes
                $parentInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $parentPid" -ErrorAction SilentlyContinue
                if ($parentInfo) {
                    $grandparent = Get-Process -Id $parentInfo.ParentProcessId -ErrorAction SilentlyContinue
                    if ($grandparent) {
                        switch ($grandparent.ProcessName) {
                            "Code" { 
                                $context = "VS Code (Console Host)"
                                $isTerminal = $true
                                $symbol = "[VSC]"
                            }
                            "WindowsTerminal" { 
                                $context = "Windows Terminal (Console Host)"
                                $isTerminal = $true
                                $symbol = "[WT]"
                            }
                            default { 
                                $context = "Terminal (Console Host)"
                                $isTerminal = $true
                                $symbol = "[CON]"
                            }
                        }
                    }
                }
            }
            "explorer" { 
                $context = "File Explorer Launch"
                $isTerminal = $false
                $symbol = "[EXP]"
            }
            "services" { 
                $context = "Windows Service"
                $isTerminal = $false
                $symbol = "[SVC]"
            }
            default { 
                $parentCmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $parentPid" -ErrorAction SilentlyContinue).CommandLine
                if ($parentCmdLine -match 'npm|yarn|pnpm') {
                    $context = "Package Manager"
                    $isTerminal = $false
                    $symbol = "[NPM]"
                } else {
                    $context = "Other: $($parentProcess.ProcessName)"
                    $isTerminal = $false
                    $symbol = "[OTH]"
                }
            }
        }
        
        return @{ Context = $context; IsTerminal = $isTerminal; Symbol = $symbol }
    } catch {
        return @{ Context = "Error analyzing"; IsTerminal = $false; Symbol = "[ERR]" }
    }
}

foreach($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if($connection) {
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        if($process) {
            $contextInfo = Get-ExecutionContext $process.Id
            
            # Apply filtering
            if ($TerminalOnly -and -not $contextInfo.IsTerminal) { continue }
            if ($StandaloneOnly -and $contextInfo.IsTerminal) { continue }
            
            if ($ShowContext) {
                $typeColor = if ($contextInfo.IsTerminal) { "Cyan" } else { "Magenta" }
                Write-Host "Port $port - $($process.ProcessName) (PID: $($process.Id)) $($contextInfo.Symbol) $($contextInfo.Context)" -ForegroundColor $typeColor
            } else {
                Write-Host "Port $port - $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Yellow
            }
            
            $found++
            if ($contextInfo.IsTerminal) {
                $terminalProcesses++
            } else {
                $standaloneProcesses++
            }
        }
    }
}

Write-Host ""
if($found -eq 0) {
    $filterMsg = ""
    if ($TerminalOnly) { $filterMsg = " (terminal-only filter applied)" }
    if ($StandaloneOnly) { $filterMsg = " (standalone-only filter applied)" }
    Write-Host "No processes found on development ports$filterMsg" -ForegroundColor Gray
} else {
    Write-Host "Found $found processes using development ports" -ForegroundColor Green
    if ($ShowContext -and -not $TerminalOnly -and -not $StandaloneOnly) {
        Write-Host "  Terminal-launched: $terminalProcesses" -ForegroundColor Cyan
        Write-Host "  Standalone: $standaloneProcesses" -ForegroundColor Magenta
    }
    
    if ($ShowContext) {
        Write-Host ""
        Write-Host "Symbol Legend:" -ForegroundColor White
        Write-Host "  [PS]  = PowerShell Terminal" -ForegroundColor Cyan
        Write-Host "  [CMD] = Command Prompt" -ForegroundColor Cyan
        Write-Host "  [SH]  = Shell Terminal" -ForegroundColor Cyan
        Write-Host "  [WT]  = Windows Terminal" -ForegroundColor Cyan
        Write-Host "  [VSC] = VS Code Terminal" -ForegroundColor Green
        Write-Host "  [EXP] = File Explorer Launch" -ForegroundColor Magenta
        Write-Host "  [NPM] = Package Manager" -ForegroundColor Yellow
        Write-Host "  [SVC] = Windows Service" -ForegroundColor Red
    }
}

Write-Host ""