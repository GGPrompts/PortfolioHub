# Test Process Context Detection
# This script demonstrates how to differentiate between terminal vs standalone processes

param(
    [switch]$Verbose
)

if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host 'Process Context Analysis' -ForegroundColor Cyan
Write-Host '========================' -ForegroundColor Cyan

$nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue

if (-not $nodeProcs) {
    Write-Host 'No Node.js processes found' -ForegroundColor Gray
    return
}

foreach($proc in $nodeProcs) {
    try {
        $processInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue
        
        if ($processInfo) {
            $cmdLine = $processInfo.CommandLine
            $parentPid = $processInfo.ParentProcessId
            
            # Get parent process info
            $parentProcess = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
            $parentInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $parentPid" -ErrorAction SilentlyContinue
            
            Write-Host ""
            Write-Host "Process ID: $($proc.Id)" -ForegroundColor Yellow
            Write-Host "Command Line: $cmdLine" -ForegroundColor White
            Write-Host "Parent PID: $parentPid" -ForegroundColor Gray
            
            if ($parentProcess) {
                Write-Host "Parent Process: $($parentProcess.ProcessName)" -ForegroundColor Gray
                
                # Determine execution context
                $context = "Unknown"
                $contextColor = "Gray"
                
                switch ($parentProcess.ProcessName) {
                    "powershell" { 
                        $context = "PowerShell Terminal"
                        $contextColor = "Blue"
                    }
                    "cmd" { 
                        $context = "Command Prompt"
                        $contextColor = "Blue"
                    }
                    "WindowsTerminal" { 
                        $context = "Windows Terminal"
                        $contextColor = "Blue"
                    }
                    "Code" { 
                        $context = "VS Code Integrated Terminal"
                        $contextColor = "Green"
                    }
                    "conhost" {
                        # conhost is a console host - check its parent
                        $grandparentPid = $parentInfo.ParentProcessId
                        $grandparent = Get-Process -Id $grandparentPid -ErrorAction SilentlyContinue
                        if ($grandparent) {
                            switch ($grandparent.ProcessName) {
                                "Code" { 
                                    $context = "VS Code Terminal (via conhost)"
                                    $contextColor = "Green"
                                }
                                "WindowsTerminal" { 
                                    $context = "Windows Terminal (via conhost)"
                                    $contextColor = "Blue"
                                }
                                default { 
                                    $context = "Terminal (via conhost) - Parent: $($grandparent.ProcessName)"
                                    $contextColor = "Blue"
                                }
                            }
                        } else {
                            $context = "Console Host Terminal"
                            $contextColor = "Blue"
                        }
                    }
                    "explorer" { 
                        $context = "Started from File Explorer (standalone)"
                        $contextColor = "Magenta"
                    }
                    "services" { 
                        $context = "Windows Service"
                        $contextColor = "Red"
                    }
                    default { 
                        if ($cmdLine -match 'npm|yarn|pnpm') {
                            $context = "Package Manager Child Process"
                            $contextColor = "Yellow"
                        } else {
                            $context = "Other Parent: $($parentProcess.ProcessName)"
                            $contextColor = "White"
                        }
                    }
                }
                
                Write-Host "Execution Context: $context" -ForegroundColor $contextColor
                
                # Determine if it's a development server
                $isDev = $cmdLine -match 'dev|start|serve|webpack|vite|nodemon|ts-node'
                Write-Host "Development Server: $(if($isDev) { 'Yes' } else { 'No' })" -ForegroundColor $(if($isDev) { 'Green' } else { 'Red' })
                
                # Show terminal vs standalone classification
                $isTerminal = $context -match 'Terminal|PowerShell|Command Prompt|VS Code'
                Write-Host "Terminal Process: $(if($isTerminal) { 'Yes' } else { 'No' })" -ForegroundColor $(if($isTerminal) { 'Cyan' } else { 'Magenta' })
            }
            
            Write-Host "-" * 60 -ForegroundColor DarkGray
        }
        
    } catch {
        Write-Verbose "Could not analyze process $($proc.Id): $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "Context Legend:" -ForegroundColor White
Write-Host "  🟦 Blue    = External Terminal (PowerShell, CMD, Windows Terminal)" -ForegroundColor Blue
Write-Host "  🟩 Green   = VS Code Integrated Terminal" -ForegroundColor Green  
Write-Host "  🟪 Magenta = Standalone Process (File Explorer, Direct Launch)" -ForegroundColor Magenta
Write-Host "  🟨 Yellow  = Package Manager Child Process" -ForegroundColor Yellow
Write-Host "  🟥 Red     = System Service" -ForegroundColor Red
Write-Host ""