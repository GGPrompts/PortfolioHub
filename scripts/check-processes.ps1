# Check Running Development Processes
param(
    [switch]$Verbose
)

if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host 'Development Processes:' -ForegroundColor Green
Write-Host '===================' -ForegroundColor Green

$processes = Get-Process -Name node,python,npm -ErrorAction SilentlyContinue
if ($processes) {
    $processes | Format-Table Name,Id,CPU,WorkingSet -AutoSize
} else {
    Write-Host "No development processes found" -ForegroundColor Gray
}

Write-Host ""
Write-Host 'Port Usage:' -ForegroundColor Green  
Write-Host '===========' -ForegroundColor Green

$portOutput = netstat -ano | Select-String ':300[0-9]|:500[0-9]|:517[3-9]|:800[0-9]|:900[0-9]'
if ($portOutput) {
    $portOutput
} else {
    Write-Host "No processes found on development ports" -ForegroundColor Gray
}

Write-Host ""