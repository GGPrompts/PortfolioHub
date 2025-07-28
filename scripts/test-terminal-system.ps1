# Terminal System Test Script
# Tests all components of the Claude Dev Portfolio Terminal System

Write-Host "Testing Claude Dev Portfolio Terminal System..." -ForegroundColor Cyan

# Test WebSocket connection
function Test-WebSocket {
    param($Port)
    Write-Host "`nTesting WebSocket on port $Port..." -ForegroundColor Yellow
    
    try {
        $ws = New-Object System.Net.WebSockets.ClientWebSocket
        $uri = New-Object System.Uri("ws://localhost:$Port")
        $cts = New-Object System.Threading.CancellationTokenSource
        
        $connect = $ws.ConnectAsync($uri, $cts.Token)
        $timeout = [System.Threading.Tasks.Task]::Delay(5000)
        
        $completed = [System.Threading.Tasks.Task]::WhenAny($connect, $timeout).Result
        
        if ($completed -eq $timeout) {
            Write-Host "WebSocket connection timeout" -ForegroundColor Red
            return $false
        }
        
        if ($ws.State -eq 'Open') {
            Write-Host "WebSocket connected successfully!" -ForegroundColor Green
            $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "", $cts.Token).Wait()
            return $true
        } else {
            Write-Host "WebSocket connection failed: $($ws.State)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "WebSocket test error: $_" -ForegroundColor Red
        return $false
    }
}

# Test React app
function Test-ReactApp {
    Write-Host "`nTesting React app..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "React app is running!" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "React app is not accessible: $_" -ForegroundColor Red
        return $false
    }
}

# Test terminal commands
function Test-TerminalCommands {
    Write-Host "`nTesting terminal commands..." -ForegroundColor Yellow
    
    $commands = @(
        @{cmd = "echo 'Hello Terminal'"; desc = "Basic echo"},
        @{cmd = "dir"; desc = "Directory listing"},
        @{cmd = "node --version"; desc = "Node.js version"}
    )
    
    foreach ($test in $commands) {
        Write-Host "  Testing: $($test.desc)" -ForegroundColor Gray
        try {
            $result = Invoke-Expression $test.cmd 2>&1
            if ($?) {
                Write-Host "    ✓ Passed" -ForegroundColor Green
            } else {
                Write-Host "    ✗ Failed" -ForegroundColor Red
            }
        } catch {
            Write-Host "    ✗ Error: $_" -ForegroundColor Red
        }
    }
}

# Run all tests
$results = @{
    "React App" = Test-ReactApp
    "Terminal WebSocket" = Test-WebSocket -Port 3002
}

# Test commands
Test-TerminalCommands

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
foreach ($test in $results.GetEnumerator()) {
    $status = if ($test.Value) { "PASSED" } else { "FAILED" }
    $color = if ($test.Value) { "Green" } else { "Red" }
    Write-Host "$($test.Key): $status" -ForegroundColor $color
}

$passed = ($results.Values | Where-Object { $_ }).Count
$total = $results.Count
Write-Host "`nTotal: $passed/$total tests passed" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })
