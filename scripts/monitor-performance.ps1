# Performance monitoring script for portfolio projects
param(
    [switch]$Watch,
    [int]$Interval = 30, # seconds
    [switch]$Detailed
)

Write-Host "Portfolio Performance Monitor" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

$rootPath = Split-Path -Parent $PSScriptRoot

# Function to measure page load time
function Measure-PageLoad {
    param($Url, $ProjectName)
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $Url -Method HEAD -TimeoutSec 10 -UseBasicParsing
        $stopwatch.Stop()
        
        $status = if ($response.StatusCode -eq 200) { "✅" } else { "⚠️" }
        $loadTime = $stopwatch.ElapsedMilliseconds
        
        Write-Host "  $status $ProjectName - ${loadTime}ms" -ForegroundColor $(if ($loadTime -lt 1000) { "Green" } else { "Yellow" })
        
        return @{
            Name = $ProjectName
            Url = $Url
            LoadTime = $loadTime
            Status = $response.StatusCode
            Available = $true
        }
    } catch {
        Write-Host "  ❌ $ProjectName - Not available" -ForegroundColor Red
        return @{
            Name = $ProjectName
            Url = $Url
            LoadTime = $null
            Status = $null
            Available = $false
        }
    }
}

# Function to check resource usage
function Get-ResourceUsage {
    $processes = Get-Process | Where-Object { $_.ProcessName -like "*node*" -or $_.ProcessName -like "*chrome*" }
    
    $totalCpu = ($processes | Measure-Object -Property CPU -Sum).Sum
    $totalMemory = ($processes | Measure-Object -Property WorkingSet64 -Sum).Sum / 1MB
    
    Write-Host "  Resource Usage:" -ForegroundColor Yellow
    Write-Host "    CPU: $([math]::Round($totalCpu, 2))%" -ForegroundColor White
    Write-Host "    Memory: $([math]::Round($totalMemory, 2)) MB" -ForegroundColor White
    
    if ($Detailed) {
        Write-Host "  Process Details:" -ForegroundColor Yellow
        $processes | Select-Object Name, CPU, @{Name="Memory(MB)"; Expression={[math]::Round($_.WorkingSet64/1MB, 2)}} | Format-Table -AutoSize
    }
}

# Project URLs to monitor
$projects = @(
    @{ Name = "Portfolio"; Url = "http://localhost:5173" }
    @{ Name = "3D Matrix Cards"; Url = "http://localhost:3005" }
    @{ Name = "Matrix Cards"; Url = "http://localhost:3002" }
    @{ Name = "Sleak Card"; Url = "http://localhost:3003" }
    @{ Name = "GGPrompts"; Url = "http://localhost:9323" }
    @{ Name = "GGPrompts Style Guide"; Url = "http://localhost:3001" }
    @{ Name = "3D File System"; Url = "http://localhost:3004" }
)

# Performance monitoring function
function Monitor-Performance {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Performance Check" -ForegroundColor Cyan
    
    $results = @()
    foreach ($project in $projects) {
        $result = Measure-PageLoad -Url $project.Url -ProjectName $project.Name
        $results += $result
    }
    
    # Summary statistics
    $available = $results | Where-Object { $_.Available }
    $avgLoadTime = if ($available.Count -gt 0) { 
        ($available | Measure-Object -Property LoadTime -Average).Average 
    } else { 0 }
    
    Write-Host ""
    Write-Host "  Summary:" -ForegroundColor Green
    Write-Host "    Available Projects: $($available.Count)/$($results.Count)" -ForegroundColor White
    Write-Host "    Average Load Time: $([math]::Round($avgLoadTime, 2))ms" -ForegroundColor White
    
    # Check for performance issues
    $slowProjects = $available | Where-Object { $_.LoadTime -gt 2000 }
    if ($slowProjects.Count -gt 0) {
        Write-Host "  Performance Warnings:" -ForegroundColor Yellow
        $slowProjects | ForEach-Object {
            Write-Host "    $($_.Name): $($_.LoadTime)ms (>2000ms threshold)" -ForegroundColor Yellow
        }
    }
    
    Get-ResourceUsage
    
    # Log to file
    $logEntry = @{
        Timestamp = $timestamp
        Results = $results
        AverageLoadTime = $avgLoadTime
        AvailableCount = $available.Count
    }
    
    $logFile = "$rootPath\logs\performance-$(Get-Date -Format 'yyyy-MM-dd').json"
    if (-not (Test-Path (Split-Path $logFile))) {
        New-Item -ItemType Directory -Path (Split-Path $logFile) -Force | Out-Null
    }
    
    $logEntry | ConvertTo-Json -Depth 3 | Out-File -FilePath $logFile -Append -Encoding UTF8
    
    Write-Host ""
    return $results
}

# Main execution
if ($Watch) {
    Write-Host "Starting continuous monitoring (interval: ${Interval}s)" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    while ($true) {
        Monitor-Performance
        Write-Host "Waiting ${Interval} seconds..." -ForegroundColor Gray
        Start-Sleep -Seconds $Interval
        Write-Host ""
    }
} else {
    Monitor-Performance
}

Write-Host "Performance monitoring complete!" -ForegroundColor Green