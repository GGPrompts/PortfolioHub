# Port Scanner - Scan development ports for running processes
param(
    [switch]$Verbose,
    [switch]$ShowContext    # Show whether process is terminal-launched or standalone
)

if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host 'Scanning Development Ports...' -ForegroundColor Cyan
Write-Host '=================================' -ForegroundColor Cyan

$ports = @(3000..3010) + @(5173..5179) + @(8000..8009) + @(9000..9009)
$found = 0
$terminalProcesses = 0
$standaloneProcesses = 0

# Function to determine execution context
function Get-ExecutionContext($processId) {
    try {
        $processInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
        if (-not $processInfo) { return @{ Context = "Unknown"; IsTerminal = $false; Icon = "❓" } }
        
        $parentPid = $processInfo.ParentProcessId
        $parentProcess = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
        
        if (-not $parentProcess) { 
            return @{ Context = "Orphaned"; IsTerminal = $false; Icon = "🔴" }
        }
        
        $isTerminal = $false
        $context = "Unknown"
        $icon = "❓"
        
        switch ($parentProcess.ProcessName) {
            { $_ -in @("powershell", "pwsh", "cmd", "bash", "sh") } { 
                $context = "Terminal"
                $isTerminal = $true
                $icon = "🖥️"
            }
            "WindowsTerminal" { 
                $context = "Windows Terminal"
                $isTerminal = $true
                $icon = "🖥️"
            }
            "Code" { 
                $context = "VS Code Terminal"
                $isTerminal = $true
                $icon = "💻"
            }
            "conhost" {
                # Check grandparent for console host processes
                $parentInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $parentPid" -ErrorAction SilentlyContinue
                if ($parentInfo) {
                    $grandparent = Get-Process -Id $parentInfo.ParentProcessId -ErrorAction SilentlyContinue
                    if ($grandparent -and $grandparent.ProcessName -in @("Code", "WindowsTerminal")) {
                        $context = "Terminal (Console Host)"
                        $isTerminal = $true
                        $icon = if ($grandparent.ProcessName -eq "Code") { "💻" } else { "🖥️" }
                    }
                }
            }
            "explorer" { 
                $context = "File Explorer"
                $isTerminal = $false
                $icon = "📁"
            }
            "services" { 
                $context = "Windows Service"
                $isTerminal = $false
                $icon = "⚙️"
            }
            default { 
                $parentCmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $parentPid" -ErrorAction SilentlyContinue).CommandLine
                if ($parentCmdLine -match 'npm|yarn|pnpm') {
                    $context = "Package Manager"
                    $isTerminal = $false
                    $icon = "📦"
                } else {
                    $context = "Other"
                    $isTerminal = $false
                    $icon = "❓"
                }
            }
        }
        
        return @{ Context = $context; IsTerminal = $isTerminal; Icon = $icon }
    } catch {
        return @{ Context = "Error"; IsTerminal = $false; Icon = "❌" }
    }
}

foreach($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if($connection) {
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        if($process) {
            $contextInfo = Get-ExecutionContext $process.Id
            
            if ($ShowContext) {
                $contextLabel = if ($contextInfo.IsTerminal) { "Terminal" } else { "Standalone" }
                Write-Host "Port $port - $($process.ProcessName) (PID: $($process.Id)) $($contextInfo.Icon) $($contextInfo.Context)" -ForegroundColor Yellow
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

if($found -eq 0) {
    Write-Host 'No processes found on development ports' -ForegroundColor Gray
} else {
    Write-Host "Found $found processes using development ports" -ForegroundColor Green
    if ($ShowContext) {
        Write-Host "  🖥️ Terminal-launched: $terminalProcesses" -ForegroundColor Cyan
        Write-Host "  📁 Standalone: $standaloneProcesses" -ForegroundColor Magenta
    }
}

Write-Host ""