# Operations Runbooks

## Overview

This document provides detailed operational procedures and troubleshooting runbooks for the Claude Development Portfolio's standalone terminal system. These runbooks are designed for production operations teams to maintain high system availability and resolve incidents efficiently.

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [System Health Checks](#system-health-checks)
3. [Incident Response Procedures](#incident-response-procedures)
4. [Performance Optimization](#performance-optimization)
5. [Security Operations](#security-operations)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Emergency Procedures](#emergency-procedures)

## Daily Operations

### 1. Morning Health Check Routine

```bash
#!/bin/bash
# daily-health-check.sh

echo "=== Claude Portfolio Daily Health Check - $(date) ==="

# Check service status
echo "1. Service Status:"
systemctl status claude-portfolio | grep -E "(Active|Main PID)"
systemctl status nginx | grep -E "(Active|Main PID)"

# Check ports
echo "2. Port Status:"
netstat -tulpn | grep -E ":5173|:8002|:8123" | awk '{print $1, $4, $7}'

# Check disk space
echo "3. Disk Usage:"
df -h | grep -E "/(|opt|var)" | awk '{print $1, $5, $6}'

# Check memory usage
echo "4. Memory Usage:"
free -h | head -2

# Check active terminal sessions
echo "5. Active Terminal Sessions:"
curl -s http://localhost:8002/health | jq '.sessions // "N/A"'

# Check recent errors
echo "6. Recent Errors (last hour):"
journalctl -u claude-portfolio --since "1 hour ago" --grep "ERROR|CRITICAL" | tail -5

# Check security events
echo "7. Security Events (last 24h):"
grep -c "security.event" /var/log/claude-portfolio/combined.log || echo "0"

echo "=== Health Check Complete ==="
```

### 2. Performance Monitoring Dashboard

```bash
#!/bin/bash
# performance-monitor.sh

# Real-time system monitoring
watch -n 5 '
echo "=== System Performance Monitor ==="
echo "Current Time: $(date)"
echo ""

echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk "{print \$2}" | cut -d"%" -f1

echo "Memory Usage:"  
free | awk "/Mem:/ {printf \"%.1f%%\n\", \$3/\$2 * 100.0}"

echo "Active Terminal Sessions:"
curl -s http://localhost:8002/metrics | grep "claude_terminal_active_sessions" | awk "{print \$2}"

echo "WebSocket Connections:"
ss -H state established sport = :8002 | wc -l

echo "Recent Command Rate (per minute):"
curl -s http://localhost:8002/metrics | grep "claude_terminal_command_execution_seconds_count" | tail -1 | awk "{print \$2}"

echo "Load Average:"
uptime | awk -F"load average:" "{print \$2}"
'
```

### 3. Log Rotation and Cleanup

```bash
#!/bin/bash
# log-maintenance.sh

LOG_DIR="/var/log/claude-portfolio"
BACKUP_DIR="/opt/backups/logs"
RETENTION_DAYS=30

echo "Starting log maintenance - $(date)"

# Create backup directory
mkdir -p "$BACKUP_DIR/$(date +%Y%m%d)"

# Compress and archive old logs
find "$LOG_DIR" -name "*.log" -mtime +1 -exec gzip {} \;
find "$LOG_DIR" -name "*.log.gz" -mtime +7 -exec mv {} "$BACKUP_DIR/$(date +%Y%m%d)/" \;

# Clean up old backups
find "$BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \;

# Clean up temporary files
find /tmp -name "claude-*" -mtime +1 -delete

# Clean up terminal session artifacts
find /opt/claude-portfolio/workspace -name ".terminal-*" -mtime +1 -delete

# Restart log services if needed
if [ $(du -s /var/log/claude-portfolio | cut -f1) -gt 1048576 ]; then  # 1GB
    systemctl reload rsyslog
fi

echo "Log maintenance completed"
```

## System Health Checks

### 1. Comprehensive Health Check Script

```python
#!/usr/bin/env python3
# comprehensive-health-check.py

import requests
import subprocess
import json
import psutil
import time
from datetime import datetime

class HealthChecker:
    def __init__(self):
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': 'healthy',
            'checks': {}
        }
    
    def check_service_health(self):
        """Check core service health"""
        services = {
            'frontend': 'http://localhost:5173/health',
            'terminal_service': 'http://localhost:8002/health',
            'metrics': 'http://localhost:8002/metrics'
        }
        
        for service, url in services.items():
            try:
                response = requests.get(url, timeout=5)
                self.results['checks'][f'{service}_health'] = {
                    'status': 'healthy' if response.status_code == 200 else 'unhealthy',
                    'response_time': response.elapsed.total_seconds(),
                    'status_code': response.status_code
                }
            except Exception as e:
                self.results['checks'][f'{service}_health'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
                self.results['overall_status'] = 'degraded'
    
    def check_websocket_connectivity(self):
        """Check WebSocket connectivity"""
        import websocket
        
        def on_message(ws, message):
            self.results['checks']['websocket_health'] = {
                'status': 'healthy',
                'message': 'Connected successfully'
            }
            ws.close()
        
        def on_error(ws, error):
            self.results['checks']['websocket_health'] = {
                'status': 'unhealthy',
                'error': str(error)
            }
            self.results['overall_status'] = 'degraded'
        
        try:
            ws = websocket.WebSocketApp(
                "ws://localhost:8002",
                on_message=on_message,
                on_error=on_error
            )
            ws.run_forever(timeout=10)
        except Exception as e:
            self.results['checks']['websocket_health'] = {
                'status': 'unhealthy',
                'error': str(e)
            }
    
    def check_system_resources(self):
        """Check system resource usage"""
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        self.results['checks']['cpu_usage'] = {
            'status': 'healthy' if cpu_percent < 80 else 'warning' if cpu_percent < 95 else 'critical',
            'value': cpu_percent,
            'unit': 'percent'
        }
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        self.results['checks']['memory_usage'] = {
            'status': 'healthy' if memory_percent < 80 else 'warning' if memory_percent < 95 else 'critical',
            'value': memory_percent,
            'unit': 'percent',
            'available': memory.available / (1024**3)  # GB
        }
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        self.results['checks']['disk_usage'] = {
            'status': 'healthy' if disk_percent < 80 else 'warning' if disk_percent < 95 else 'critical',
            'value': disk_percent,
            'unit': 'percent',
            'free': disk.free / (1024**3)  # GB
        }
    
    def check_process_health(self):
        """Check process health and resource usage"""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            if 'node' in proc.info['name'].lower() or 'claude' in proc.info['name'].lower():
                processes.append(proc.info)
        
        self.results['checks']['process_health'] = {
            'status': 'healthy' if len(processes) > 0 else 'unhealthy',
            'active_processes': len(processes),
            'processes': processes[:5]  # Top 5 processes
        }
    
    def check_network_connectivity(self):
        """Check network connectivity and port status"""
        import socket
        
        ports = [5173, 8002, 8123]
        port_status = {}
        
        for port in ports:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex(('localhost', port))
            port_status[port] = 'open' if result == 0 else 'closed'
            sock.close()
        
        all_ports_open = all(status == 'open' for status in port_status.values())
        self.results['checks']['network_connectivity'] = {
            'status': 'healthy' if all_ports_open else 'unhealthy',
            'ports': port_status
        }
    
    def check_log_health(self):
        """Check log file health and recent errors"""
        log_files = [
            '/var/log/claude-portfolio/error.log',
            '/var/log/claude-portfolio/combined.log'
        ]
        
        for log_file in log_files:
            try:
                # Check if log file exists and is writable
                with open(log_file, 'a') as f:
                    pass
                
                # Check recent error count
                with open(log_file, 'r') as f:
                    recent_errors = sum(1 for line in f.readlines()[-1000:] if 'ERROR' in line)
                
                self.results['checks'][f'log_health_{log_file.split("/")[-1]}'] = {
                    'status': 'healthy' if recent_errors < 10 else 'warning' if recent_errors < 50 else 'critical',
                    'recent_errors': recent_errors,
                    'file': log_file
                }
                
            except Exception as e:
                self.results['checks'][f'log_health_{log_file.split("/")[-1]}'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
    
    def run_all_checks(self):
        """Run all health checks"""
        print("Running comprehensive health checks...")
        
        try:
            self.check_service_health()
            self.check_websocket_connectivity()
            self.check_system_resources()
            self.check_process_health()
            self.check_network_connectivity()
            self.check_log_health()
        except Exception as e:
            self.results['overall_status'] = 'error'
            self.results['error'] = str(e)
        
        # Determine overall status
        statuses = [check.get('status', 'unknown') for check in self.results['checks'].values()]
        if 'critical' in statuses or 'unhealthy' in statuses:
            self.results['overall_status'] = 'unhealthy'
        elif 'warning' in statuses:
            self.results['overall_status'] = 'warning'
        
        return self.results
    
    def generate_report(self):
        """Generate human-readable report"""
        print(f"\n=== Health Check Report - {self.results['timestamp']} ===")
        print(f"Overall Status: {self.results['overall_status'].upper()}")
        print("\nDetailed Results:")
        
        for check_name, check_result in self.results['checks'].items():
            status = check_result.get('status', 'unknown')
            print(f"  {check_name}: {status.upper()}")
            
            if 'error' in check_result:
                print(f"    Error: {check_result['error']}")
            elif 'value' in check_result:
                print(f"    Value: {check_result['value']}{check_result.get('unit', '')}")

if __name__ == "__main__":
    checker = HealthChecker()
    results = checker.run_all_checks()
    checker.generate_report()
    
    # Save results to file
    with open('/var/log/claude-portfolio/health-check.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    # Exit with appropriate code
    exit(0 if results['overall_status'] == 'healthy' else 1)
```

### 2. Automated Health Monitoring

```bash
#!/bin/bash
# automated-health-monitor.sh

HEALTH_LOG="/var/log/claude-portfolio/health-monitor.log"
ALERT_THRESHOLD=3
FAILURE_COUNT_FILE="/tmp/claude-health-failures"

# Initialize failure count
if [ ! -f "$FAILURE_COUNT_FILE" ]; then
    echo "0" > "$FAILURE_COUNT_FILE"
fi

# Run health check
python3 /opt/claude-portfolio/scripts/comprehensive-health-check.py > /tmp/health-check-output.txt 2>&1
HEALTH_STATUS=$?

# Log result
echo "$(date): Health check exit code: $HEALTH_STATUS" >> "$HEALTH_LOG"

if [ $HEALTH_STATUS -eq 0 ]; then
    # Health check passed
    echo "0" > "$FAILURE_COUNT_FILE"
    echo "$(date): System healthy" >> "$HEALTH_LOG"
else
    # Health check failed
    FAILURE_COUNT=$(cat "$FAILURE_COUNT_FILE")
    FAILURE_COUNT=$((FAILURE_COUNT + 1))
    echo "$FAILURE_COUNT" > "$FAILURE_COUNT_FILE"
    
    echo "$(date): Health check failed (failure count: $FAILURE_COUNT)" >> "$HEALTH_LOG"
    
    # Send alert if threshold exceeded
    if [ $FAILURE_COUNT -ge $ALERT_THRESHOLD ]; then
        # Send alert to monitoring system
        curl -X POST http://localhost:9093/api/v1/alerts \
             -H "Content-Type: application/json" \
             -d '[{
                 "labels": {
                     "alertname": "SystemHealthDegraded",
                     "severity": "critical",
                     "service": "claude-portfolio"
                 },
                 "annotations": {
                     "summary": "System health check failed multiple times",
                     "description": "Health check has failed '${FAILURE_COUNT}' consecutive times"
                 }
             }]'
        
        # Reset counter after alerting
        echo "0" > "$FAILURE_COUNT_FILE"
    fi
fi
```

## Incident Response Procedures

### 1. Service Down Response

```bash
#!/bin/bash
# service-down-response.sh

SERVICE_NAME=$1
INCIDENT_ID=$2

if [ -z "$SERVICE_NAME" ]; then
    echo "Usage: $0 <service_name> [incident_id]"
    exit 1
fi

echo "=== Incident Response: $SERVICE_NAME Down - $(date) ==="

# Step 1: Immediate assessment
echo "1. Service Status Assessment:"
systemctl status "$SERVICE_NAME"

# Step 2: Check resource availability
echo "2. Resource Check:"
free -h
df -h /
uptime

# Step 3: Check logs for errors
echo "3. Recent Error Logs:"
journalctl -u "$SERVICE_NAME" --since "10 minutes ago" | tail -20

# Step 4: Attempt service restart
echo "4. Attempting Service Restart:"
systemctl restart "$SERVICE_NAME"
sleep 10

# Step 5: Verify restart success
echo "5. Post-Restart Verification:"
systemctl is-active "$SERVICE_NAME"

if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "✅ Service restart successful"
    
    # Update incident if ID provided
    if [ -n "$INCIDENT_ID" ]; then
        curl -X POST "http://monitoring-api/incidents/$INCIDENT_ID/resolve" \
             -H "Content-Type: application/json" \
             -d '{"status": "resolved", "resolution": "Service restarted successfully"}'
    fi
else
    echo "❌ Service restart failed - escalating"
    
    # Escalate incident
    if [ -n "$INCIDENT_ID" ]; then
        curl -X POST "http://monitoring-api/incidents/$INCIDENT_ID/escalate" \
             -H "Content-Type: application/json" \
             -d '{"level": "high", "reason": "Service restart failed"}'
    fi
    
    # Collect diagnostic information
    ./collect-diagnostics.sh "$SERVICE_NAME"
fi
```

### 2. High Memory Usage Response

```bash
#!/bin/bash
# high-memory-response.sh

MEMORY_THRESHOLD=85
CURRENT_MEMORY=$(free | awk '/Mem:/ {printf "%.1f", $3/$2 * 100.0}')

echo "=== High Memory Usage Response - $(date) ==="
echo "Current Memory Usage: ${CURRENT_MEMORY}%"

if (( $(echo "$CURRENT_MEMORY > $MEMORY_THRESHOLD" | bc -l) )); then
    echo "Memory usage above threshold (${MEMORY_THRESHOLD}%)"
    
    # Find top memory consumers
    echo "Top Memory Consumers:"
    ps aux --sort=-%mem | head -10
    
    # Check for memory leaks in Claude services
    echo "Claude Service Memory Usage:"
    ps aux | grep -E "(node|claude)" | awk '{print $2, $4, $11}' | sort -k2 -nr
    
    # Check for zombie processes
    ZOMBIE_COUNT=$(ps aux | awk '$8 ~ /^Z/ { count++ } END { print count+0 }')
    if [ "$ZOMBIE_COUNT" -gt 0 ]; then
        echo "Found $ZOMBIE_COUNT zombie processes"
        ps aux | awk '$8 ~ /^Z/ { print $2, $11 }'
    fi
    
    # Clear system caches if safe to do so
    if (( $(echo "$CURRENT_MEMORY > 90" | bc -l) )); then
        echo "Clearing system caches..."
        sync
        echo 1 > /proc/sys/vm/drop_caches
        echo 2 > /proc/sys/vm/drop_caches
        echo 3 > /proc/sys/vm/drop_caches
    fi
    
    # Restart services if memory usage is critical
    if (( $(echo "$CURRENT_MEMORY > 95" | bc -l) )); then
        echo "Critical memory usage - restarting Claude services"
        systemctl restart claude-portfolio
        
        # Wait and verify
        sleep 30
        NEW_MEMORY=$(free | awk '/Mem:/ {printf "%.1f", $3/$2 * 100.0}')
        echo "Memory usage after restart: ${NEW_MEMORY}%"
    fi
else
    echo "Memory usage within acceptable limits"
fi
```

### 3. WebSocket Connection Issues

```bash
#!/bin/bash
# websocket-issues-response.sh

echo "=== WebSocket Connection Issues Response - $(date) ==="

# Check WebSocket server status
echo "1. WebSocket Server Status:"
netstat -tulpn | grep :8002

# Check active connections
echo "2. Active WebSocket Connections:"
ss -H state established sport = :8002 | wc -l

# Test WebSocket connectivity
echo "3. Testing WebSocket Connectivity:"
timeout 10 python3 << 'EOF'
import websocket
import json

def on_message(ws, message):
    print(f"✅ WebSocket message received: {message[:100]}...")
    ws.close()

def on_error(ws, error):
    print(f"❌ WebSocket error: {error}")

def on_open(ws):
    print("✅ WebSocket connection opened")
    ws.send(json.dumps({"type": "ping", "timestamp": 1234567890}))

try:
    ws = websocket.WebSocketApp(
        "ws://localhost:8002",
        on_message=on_message,
        on_error=on_error,
        on_open=on_open
    )
    ws.run_forever(timeout=10)
except Exception as e:
    print(f"❌ WebSocket test failed: {e}")
EOF

# Check for port conflicts
echo "4. Checking for Port Conflicts:"
lsof -i :8002

# Check firewall status
echo "5. Firewall Status:"
if command -v ufw &> /dev/null; then
    ufw status | grep 8002
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --list-ports | grep 8002
fi

# Check terminal service logs
echo "6. Recent Terminal Service Logs:"
journalctl -u claude-portfolio --since "5 minutes ago" | grep -i websocket | tail -10

# Restart WebSocket service if needed
echo "7. Service Recovery Actions:"
if ! ss -tulpn | grep -q :8002; then
    echo "WebSocket port not listening - restarting service"
    systemctl restart claude-portfolio
    sleep 10
    
    if ss -tulpn | grep -q :8002; then
        echo "✅ WebSocket service restarted successfully"
    else
        echo "❌ WebSocket service restart failed"
    fi
fi
```

## Performance Optimization

### 1. Terminal Session Optimization

```bash
#!/bin/bash
# optimize-terminal-sessions.sh

echo "=== Terminal Session Optimization - $(date) ==="

# Get current session metrics
ACTIVE_SESSIONS=$(curl -s http://localhost:8002/metrics | grep "claude_terminal_active_sessions" | awk '{print $2}')
echo "Current Active Sessions: $ACTIVE_SESSIONS"

# Check session memory usage
echo "Session Memory Usage:"
ps aux | grep -E "(node.*terminal|pty)" | awk '{print $2, $4, $6, $11}' | sort -k3 -nr

# Identify long-running sessions
echo "Long-running Sessions (>1 hour):"
find /tmp -name "terminal-session-*" -mmin +60 -ls 2>/dev/null

# Clean up orphaned sessions
echo "Cleaning up orphaned sessions:"
ORPHANED_COUNT=0
for session_file in /tmp/terminal-session-*; do
    if [ -f "$session_file" ]; then
        SESSION_PID=$(cat "$session_file" 2>/dev/null)
        if [ -n "$SESSION_PID" ] && ! kill -0 "$SESSION_PID" 2>/dev/null; then
            echo "Removing orphaned session file: $session_file"
            rm -f "$session_file"
            ((ORPHANED_COUNT++))
        fi
    fi
done
echo "Cleaned up $ORPHANED_COUNT orphaned sessions"

# Optimize node-pty settings
echo "Optimizing node-pty performance:"
cat > /tmp/terminal-optimization.js << 'EOF'
const fs = require('fs');

// Optimize terminal buffer sizes
const optimizations = {
    maxBuffer: 1024 * 1024,  // 1MB buffer
    windowSize: { cols: 80, rows: 24 },
    cleanupInterval: 30000   // 30 seconds
};

console.log('Terminal optimizations:', JSON.stringify(optimizations, null, 2));

// Apply optimizations to running processes
// This would integrate with the actual terminal service configuration
EOF

node /tmp/terminal-optimization.js

# Monitor session cleanup effectiveness
SESSIONS_AFTER=$(curl -s http://localhost:8002/metrics | grep "claude_terminal_active_sessions" | awk '{print $2}')
echo "Sessions after cleanup: $SESSIONS_AFTER"

if [ "$SESSIONS_AFTER" -lt "$ACTIVE_SESSIONS" ]; then
    echo "✅ Successfully reduced session count by $((ACTIVE_SESSIONS - SESSIONS_AFTER))"
else
    echo "ℹ️ No session reduction achieved"
fi
```

### 2. Database Performance Tuning

```bash
#!/bin/bash
# database-performance-tuning.sh

# Note: This assumes Redis is used for session storage
echo "=== Database Performance Tuning - $(date) ==="

# Redis optimization
if command -v redis-cli &> /dev/null; then
    echo "1. Redis Memory Usage:"
    redis-cli info memory | grep -E "(used_memory_human|used_memory_peak_human|mem_fragmentation_ratio)"
    
    echo "2. Redis Keyspace:"
    redis-cli info keyspace
    
    echo "3. Redis Slow Queries:"
    redis-cli slowlog get 10
    
    # Clean up expired keys
    echo "4. Cleaning up expired keys:"
    redis-cli eval "return redis.call('del', unpack(redis.call('keys', 'session:*:expired')))" 0
    
    # Optimize Redis configuration
    echo "5. Applying Redis optimizations:"
    redis-cli config set maxmemory-policy allkeys-lru
    redis-cli config set save "900 1 300 10 60 10000"
    redis-cli config rewrite
fi

# File system optimization
echo "6. File System Optimization:"
# Clean up temporary files
find /tmp -name "claude-*" -mtime +1 -delete
find /opt/claude-portfolio/workspace -name ".temp-*" -mtime +1 -delete

# Optimize log file sizes
for log_file in /var/log/claude-portfolio/*.log; do
    if [ -f "$log_file" ] && [ $(stat -c%s "$log_file") -gt 104857600 ]; then  # 100MB
        echo "Rotating large log file: $log_file"
        cp "$log_file" "${log_file}.$(date +%Y%m%d)"
        > "$log_file"
    fi
done

echo "Performance tuning completed"
```

### 3. Network Optimization

```bash
#!/bin/bash
# network-optimization.sh

echo "=== Network Optimization - $(date) ==="

# Check current network settings
echo "1. Current Network Configuration:"
sysctl net.core.somaxconn
sysctl net.core.netdev_max_backlog
sysctl net.ipv4.tcp_max_syn_backlog

# WebSocket-specific optimizations
echo "2. Applying WebSocket Optimizations:"
sysctl -w net.core.somaxconn=65535
sysctl -w net.core.netdev_max_backlog=5000
sysctl -w net.ipv4.tcp_max_syn_backlog=65535
sysctl -w net.ipv4.tcp_fin_timeout=30
sysctl -w net.ipv4.tcp_keepalive_time=1200
sysctl -w net.ipv4.tcp_keepalive_intvl=30
sysctl -w net.ipv4.tcp_keepalive_probes=3

# Check connection states
echo "3. Connection State Analysis:"
ss -s

# Monitor active connections to Claude services
echo "4. Active Connections to Claude Services:"
ss -tupln | grep -E ":5173|:8002|:8123"

# Test network latency
echo "5. Network Latency Test:"
ping -c 3 localhost | tail -1

# Apply persistent network optimizations
echo "6. Making network optimizations persistent:"
cat >> /etc/sysctl.d/99-claude-portfolio.conf << EOF
# Claude Portfolio Network Optimizations
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 3
EOF

echo "Network optimization completed"
```

## Security Operations

### 1. Security Audit Script

```python
#!/usr/bin/env python3
# security-audit.py

import os
import subprocess
import json
import hashlib
import stat
from datetime import datetime, timedelta

class SecurityAuditor:
    def __init__(self):
        self.report = {
            'timestamp': datetime.now().isoformat(),
            'checks': {},
            'issues': [],
            'recommendations': []
        }
    
    def check_file_permissions(self):
        """Check critical file permissions"""
        critical_files = [
            '/opt/claude-portfolio',
            '/var/log/claude-portfolio',
            '/etc/systemd/system/claude-portfolio.service'
        ]
        
        issues = []
        for file_path in critical_files:
            if os.path.exists(file_path):
                file_stat = os.stat(file_path)
                file_mode = stat.filemode(file_stat.st_mode)
                
                # Check if files are world-writable
                if file_stat.st_mode & stat.S_IWOTH:
                    issues.append(f"World-writable file: {file_path} ({file_mode})")
                
                # Check ownership
                if file_stat.st_uid == 0 and file_path.startswith('/opt/claude-portfolio'):
                    issues.append(f"Root-owned application file: {file_path}")
        
        self.report['checks']['file_permissions'] = {
            'status': 'pass' if not issues else 'fail',
            'issues': issues
        }
    
    def check_process_security(self):
        """Check process security settings"""
        try:
            # Check if processes are running as correct user
            result = subprocess.run(['ps', '-eo', 'user,pid,comm'], 
                                  capture_output=True, text=True)
            
            root_processes = []
            for line in result.stdout.split('\n'):
                if 'node' in line and 'root' in line:
                    root_processes.append(line.strip())
            
            self.report['checks']['process_security'] = {
                'status': 'pass' if not root_processes else 'warning',
                'root_processes': root_processes
            }
            
        except Exception as e:
            self.report['checks']['process_security'] = {
                'status': 'error',
                'error': str(e)
            }
    
    def check_network_security(self):
        """Check network security configuration"""
        try:
            # Check open ports
            result = subprocess.run(['ss', '-tulpn'], capture_output=True, text=True)
            
            unexpected_ports = []
            expected_ports = ['5173', '8002', '8123']
            
            for line in result.stdout.split('\n'):
                if 'LISTEN' in line and 'node' in line:
                    # Extract port number
                    parts = line.split()
                    for part in parts:
                        if ':' in part and part.split(':')[-1].isdigit():
                            port = part.split(':')[-1]
                            if port not in expected_ports and int(port) > 1024:
                                unexpected_ports.append(port)
            
            self.report['checks']['network_security'] = {
                'status': 'pass' if not unexpected_ports else 'warning',
                'unexpected_ports': unexpected_ports
            }
            
        except Exception as e:
            self.report['checks']['network_security'] = {
                'status': 'error',
                'error': str(e)
            }
    
    def check_log_security(self):
        """Check log file security and recent security events"""
        log_files = [
            '/var/log/claude-portfolio/combined.log',
            '/var/log/claude-portfolio/error.log'
        ]
        
        security_events = []
        for log_file in log_files:
            if os.path.exists(log_file):
                try:
                    with open(log_file, 'r') as f:
                        # Check last 1000 lines for security events
                        lines = f.readlines()[-1000:]
                        for line in lines:
                            if any(keyword in line.lower() for keyword in 
                                  ['security', 'blocked', 'unauthorized', 'failed', 'attack']):
                                security_events.append(line.strip())
                except Exception as e:
                    security_events.append(f"Error reading {log_file}: {e}")
        
        self.report['checks']['log_security'] = {
            'status': 'pass',
            'recent_security_events': len(security_events),
            'events': security_events[-10:]  # Last 10 events
        }
    
    def check_configuration_security(self):
        """Check configuration security"""
        config_issues = []
        
        # Check if default passwords are being used
        config_files = [
            '/opt/claude-portfolio/.env',
            '/opt/claude-portfolio/config.json'
        ]
        
        for config_file in config_files:
            if os.path.exists(config_file):
                try:
                    with open(config_file, 'r') as f:
                        content = f.read().lower()
                        if 'password=password' in content or 'secret=secret' in content:
                            config_issues.append(f"Default credentials in {config_file}")
                except Exception as e:
                    config_issues.append(f"Error reading {config_file}: {e}")
        
        self.report['checks']['configuration_security'] = {
            'status': 'pass' if not config_issues else 'fail',
            'issues': config_issues
        }
    
    def generate_recommendations(self):
        """Generate security recommendations"""
        recommendations = []
        
        # Check for failed security checks
        for check_name, check_result in self.report['checks'].items():
            if check_result['status'] in ['fail', 'warning']:
                if check_name == 'file_permissions':
                    recommendations.append("Fix file permissions using: chmod 750 /opt/claude-portfolio && chown -R claude-portfolio:claude-portfolio /opt/claude-portfolio")
                elif check_name == 'process_security':
                    recommendations.append("Ensure Claude processes run as non-root user")
                elif check_name == 'network_security':
                    recommendations.append("Review and close unnecessary open ports")
                elif check_name == 'configuration_security':
                    recommendations.append("Change default passwords and secrets")
        
        # General recommendations
        recommendations.extend([
            "Enable firewall and restrict access to necessary ports only",
            "Implement regular security updates and patches",
            "Set up log monitoring and alerting for security events",
            "Configure SSL/TLS for all external communications",
            "Implement rate limiting and DDoS protection"
        ])
        
        self.report['recommendations'] = recommendations
    
    def run_audit(self):
        """Run complete security audit"""
        print("Running security audit...")
        
        self.check_file_permissions()
        self.check_process_security()
        self.check_network_security()
        self.check_log_security()
        self.check_configuration_security()
        self.generate_recommendations()
        
        return self.report
    
    def generate_report(self):
        """Generate human-readable security report"""
        print(f"\n=== Security Audit Report - {self.report['timestamp']} ===")
        
        # Overall status
        failed_checks = sum(1 for check in self.report['checks'].values() 
                          if check['status'] == 'fail')
        warning_checks = sum(1 for check in self.report['checks'].values() 
                           if check['status'] == 'warning')
        
        if failed_checks > 0:
            print(f"🔴 SECURITY ISSUES FOUND: {failed_checks} critical, {warning_checks} warnings")
        elif warning_checks > 0:
            print(f"🟡 SECURITY WARNINGS: {warning_checks} warnings found")
        else:
            print("🟢 SECURITY STATUS: All checks passed")
        
        # Detailed results
        print("\nDetailed Results:")
        for check_name, result in self.report['checks'].items():
            status_emoji = {'pass': '✅', 'warning': '⚠️', 'fail': '❌', 'error': '💥'}
            print(f"  {status_emoji.get(result['status'], '❓')} {check_name}: {result['status'].upper()}")
            
            if 'issues' in result and result['issues']:
                for issue in result['issues']:
                    print(f"    - {issue}")
            
            if 'error' in result:
                print(f"    Error: {result['error']}")
        
        # Recommendations
        if self.report['recommendations']:
            print("\nSecurity Recommendations:")
            for i, rec in enumerate(self.report['recommendations'], 1):
                print(f"  {i}. {rec}")

if __name__ == "__main__":
    auditor = SecurityAuditor()
    results = auditor.run_audit()
    auditor.generate_report()
    
    # Save results
    with open('/var/log/claude-portfolio/security-audit.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    # Set exit code based on findings
    failed_checks = sum(1 for check in results['checks'].values() 
                       if check['status'] == 'fail')
    exit(1 if failed_checks > 0 else 0)
```

### 2. Intrusion Detection

```bash
#!/bin/bash
# intrusion-detection.sh

echo "=== Intrusion Detection Scan - $(date) ==="

# Check for suspicious login attempts
echo "1. Suspicious Login Attempts:"
lastb | head -10

# Check for unusual network connections
echo "2. Unusual Network Connections:"
netstat -tupln | grep -v -E ":(5173|8002|8123|22|80|443)" | grep LISTEN

# Check for modified system files
echo "3. Modified System Files:"
find /opt/claude-portfolio -type f -mtime -1 -ls | head -10

# Check for suspicious processes
echo "4. Suspicious Processes:"
ps aux | grep -v grep | grep -E "(nc|ncat|wget|curl).*\s+[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+"

# Check log files for attack patterns
echo "5. Attack Patterns in Logs:"
grep -i -E "(attack|exploit|injection|xss|sql)" /var/log/claude-portfolio/*.log | tail -10

# Check for unusual file permissions
echo "6. Unusual File Permissions:"
find /opt/claude-portfolio -type f -perm /o+w -ls

# Check for backdoors or web shells
echo "7. Backdoor Detection:"
find /opt/claude-portfolio -name "*.php" -o -name "*.jsp" -o -name "*.asp" | head -10

echo "Intrusion detection scan completed"
```

## Maintenance Procedures

### 1. Weekly Maintenance

```bash
#!/bin/bash
# weekly-maintenance.sh

echo "=== Weekly Maintenance - $(date) ==="

# 1. System updates
echo "1. Checking for system updates:"
if command -v apt &> /dev/null; then
    apt update && apt list --upgradable
elif command -v yum &> /dev/null; then
    yum check-update
fi

# 2. Clean up old logs
echo "2. Log cleanup:"
find /var/log/claude-portfolio -name "*.log.*" -mtime +7 -delete
journalctl --vacuum-time=30d

# 3. Database maintenance
echo "3. Database maintenance:"
if command -v redis-cli &> /dev/null; then
    echo "Redis maintenance:"
    redis-cli bgrewriteaof
    redis-cli eval "return redis.call('del', unpack(redis.call('keys', 'temp:*')))" 0
fi

# 4. Certificate renewal check
echo "4. SSL Certificate check:"
if command -v certbot &> /dev/null; then
    certbot certificates | grep -E "(VALID|INVALID|EXPIRED)"
fi

# 5. Backup verification
echo "5. Backup verification:"
LATEST_BACKUP=$(find /opt/backups -name "*.tar.gz" -mtime -1 | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    echo "Latest backup: $LATEST_BACKUP"
    tar -tzf "$LATEST_BACKUP" > /dev/null && echo "✅ Backup integrity OK" || echo "❌ Backup corrupted"
else
    echo "⚠️ No recent backup found"
fi

# 6. Performance metrics collection
echo "6. Performance metrics:"
cat > /tmp/weekly-metrics.json << EOF
{
    "timestamp": "$(date -Iseconds)",
    "uptime": "$(uptime -p)",
    "disk_usage": "$(df -h / | awk 'NR==2 {print $5}')",
    "memory_usage": "$(free | awk '/Mem:/ {printf "%.1f%%", $3/$2 * 100.0}')",
    "active_sessions": "$(curl -s http://localhost:8002/metrics | grep claude_terminal_active_sessions | awk '{print $2}')",
    "total_requests": "$(journalctl -u claude-portfolio --since '1 week ago' | grep -c 'HTTP')"
}
EOF

echo "Weekly metrics saved to /tmp/weekly-metrics.json"

# 7. Security scan
echo "7. Security scan:"
python3 /opt/claude-portfolio/scripts/security-audit.py --summary

echo "Weekly maintenance completed"
```

### 2. Monthly Maintenance

```bash
#!/bin/bash
# monthly-maintenance.sh

echo "=== Monthly Maintenance - $(date) ==="

# 1. Full system backup
echo "1. Creating full system backup:"
BACKUP_DATE=$(date +%Y%m%d)
BACKUP_DIR="/opt/backups/monthly/$BACKUP_DATE"
mkdir -p "$BACKUP_DIR"

tar -czf "$BACKUP_DIR/claude-portfolio-full.tar.gz" \
    --exclude='node_modules' \
    --exclude='*.log' \
    /opt/claude-portfolio

echo "Full backup created: $BACKUP_DIR/claude-portfolio-full.tar.gz"

# 2. Dependency updates
echo "2. Dependency security updates:"
cd /opt/claude-portfolio
npm audit --audit-level moderate
npm update

# 3. Clean up old backups
echo "3. Backup cleanup (keeping 6 months):"
find /opt/backups -type d -mtime +180 -exec rm -rf {} \;

# 4. Performance analysis
echo "4. Monthly performance analysis:"
python3 << 'EOF'
import json
import glob
from datetime import datetime, timedelta

# Collect weekly metrics
metrics_files = glob.glob('/tmp/weekly-metrics-*.json')
metrics_data = []

for file in metrics_files[-4:]:  # Last 4 weeks
    try:
        with open(file, 'r') as f:
            data = json.load(f)
            metrics_data.append(data)
    except:
        continue

if metrics_data:
    print("Monthly Performance Summary:")
    print(f"  Average uptime: {sum(float(m.get('uptime', '0').split()[0]) for m in metrics_data)/len(metrics_data):.1f} days")
    print(f"  Average disk usage: {sum(float(m.get('disk_usage', '0%').rstrip('%')) for m in metrics_data)/len(metrics_data):.1f}%")
    print(f"  Peak active sessions: {max(int(m.get('active_sessions', 0)) for m in metrics_data)}")
else:
    print("No metrics data available for analysis")
EOF

# 5. Security hardening review
echo "5. Security hardening review:"
# Update security configurations
systemctl daemon-reload
systemctl restart fail2ban 2>/dev/null || echo "fail2ban not installed"

# 6. Documentation updates
echo "6. Updating system documentation:"
cat > /opt/claude-portfolio/docs/system-status.md << EOF
# System Status Report - $(date)

## System Information
- Hostname: $(hostname)
- OS: $(lsb_release -d 2>/dev/null | cut -f2 || uname -a)
- Uptime: $(uptime -p)
- Load Average: $(uptime | awk -F'load average:' '{print $2}')

## Service Status
- Claude Portfolio: $(systemctl is-active claude-portfolio)
- Nginx: $(systemctl is-active nginx 2>/dev/null || echo "not installed")
- Redis: $(systemctl is-active redis 2>/dev/null || echo "not installed")

## Resource Usage
- Disk Usage: $(df -h / | awk 'NR==2 {print $5}')
- Memory Usage: $(free | awk '/Mem:/ {printf "%.1f%%", $3/$2 * 100.0}')
- CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')

## Recent Maintenance
- Last backup: $(ls -lt /opt/backups/monthly/ | head -2 | tail -1 | awk '{print $6, $7, $8}')
- Last security scan: $(stat -c %y /var/log/claude-portfolio/security-audit.json 2>/dev/null || echo "never")

Generated on: $(date)
EOF

echo "Monthly maintenance completed"
```

This comprehensive operations runbook provides detailed procedures for maintaining high system availability, resolving incidents efficiently, and ensuring optimal performance of the Claude Development Portfolio's terminal system in production environments.