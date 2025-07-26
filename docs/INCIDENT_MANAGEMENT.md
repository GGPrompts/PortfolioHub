# Incident Management & Disaster Recovery

## Overview

This document provides comprehensive incident management and disaster recovery procedures for the Claude Development Portfolio's standalone terminal system. It includes incident response workflows, escalation procedures, recovery plans, and business continuity strategies.

## Incident Classification System

### Severity Levels

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| **P0 - Critical** | Complete system outage affecting all users | 15 minutes | Total service down, data corruption, security breach |
| **P1 - High** | Major functionality impaired, large user impact | 1 hour | WebSocket service down, terminal creation failing |
| **P2 - Medium** | Moderate functionality impaired, some users affected | 4 hours | Performance degradation, specific features broken |
| **P3 - Low** | Minor issues, limited user impact | 24 hours | UI glitches, non-critical feature issues |
| **P4 - Informational** | No immediate user impact | 72 hours | Monitoring alerts, capacity planning |

### Impact Assessment Matrix

```
        Low Impact    Medium Impact    High Impact    Critical Impact
Low     P4            P3               P2             P1
Medium  P3            P2               P1             P0
High    P2            P1               P0             P0
Critical P1           P0               P0             P0
```

## Incident Response Team Structure

### On-Call Rotation

```yaml
# on-call-schedule.yml
primary_engineer:
  - name: "Site Reliability Engineer"
  - escalation_time: 15_minutes
  - contact: "sre@company.com"
  - phone: "+1-xxx-xxx-xxxx"

secondary_engineer:
  - name: "DevOps Engineer"
  - escalation_time: 30_minutes
  - contact: "devops@company.com"
  - phone: "+1-xxx-xxx-xxxx"

incident_commander:
  - name: "Engineering Manager"
  - escalation_time: 60_minutes
  - contact: "eng-manager@company.com"
  - phone: "+1-xxx-xxx-xxxx"

security_team:
  - name: "Security Engineer"
  - trigger: "security_incident"
  - contact: "security@company.com"
  - phone: "+1-xxx-xxx-xxxx"

executive_team:
  - name: "CTO"
  - trigger: "p0_incident_30min"
  - contact: "cto@company.com"
  - phone: "+1-xxx-xxx-xxxx"
```

### Communication Channels

- **Primary**: Slack #claude-incidents
- **Secondary**: Microsoft Teams incident room
- **Emergency**: Phone bridge +1-xxx-xxx-xxxx (PIN: 123456)
- **External**: Status page at status.company.com

## Incident Response Procedures

### 1. Incident Detection and Alerting

#### Automated Detection

```python
#!/usr/bin/env python3
# incident-detector.py

import requests
import json
import time
from datetime import datetime
from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class Alert:
    severity: str
    service: str
    message: str
    details: Dict[str, Any]
    timestamp: datetime

class IncidentDetector:
    def __init__(self):
        self.active_incidents = {}
        self.alert_thresholds = {
            'response_time': 5.0,  # seconds
            'error_rate': 0.05,    # 5%
            'memory_usage': 0.85,  # 85%
            'cpu_usage': 0.80,     # 80%
            'active_sessions': 45   # sessions
        }
    
    def check_service_health(self) -> List[Alert]:
        """Check all service health endpoints"""
        alerts = []
        services = [
            ('frontend', 'http://localhost:5173/health'),
            ('terminal-service', 'http://localhost:8002/health'),
            ('websocket', 'ws://localhost:8002')
        ]
        
        for service_name, endpoint in services:
            try:
                if endpoint.startswith('ws://'):
                    alert = self.check_websocket_health(service_name, endpoint)
                else:
                    alert = self.check_http_health(service_name, endpoint)
                
                if alert:
                    alerts.append(alert)
                    
            except Exception as e:
                alerts.append(Alert(
                    severity='critical',
                    service=service_name,
                    message=f'Service health check failed: {str(e)}',
                    details={'endpoint': endpoint, 'error': str(e)},
                    timestamp=datetime.now()
                ))
        
        return alerts
    
    def check_http_health(self, service: str, endpoint: str) -> Alert:
        """Check HTTP service health"""
        try:
            response = requests.get(endpoint, timeout=10)
            response_time = response.elapsed.total_seconds()
            
            if response.status_code != 200:
                return Alert(
                    severity='critical',
                    service=service,
                    message=f'Service returning {response.status_code}',
                    details={'status_code': response.status_code, 'endpoint': endpoint},
                    timestamp=datetime.now()
                )
            
            if response_time > self.alert_thresholds['response_time']:
                return Alert(
                    severity='high',
                    service=service,
                    message=f'High response time: {response_time:.2f}s',
                    details={'response_time': response_time, 'threshold': self.alert_thresholds['response_time']},
                    timestamp=datetime.now()
                )
                
        except requests.exceptions.ConnectionError:
            return Alert(
                severity='critical',
                service=service,
                message='Service connection refused',
                details={'endpoint': endpoint},
                timestamp=datetime.now()
            )
        except requests.exceptions.Timeout:
            return Alert(
                severity='high',
                service=service,
                message='Service timeout',
                details={'endpoint': endpoint, 'timeout': 10},
                timestamp=datetime.now()
            )
            
        return None
    
    def check_websocket_health(self, service: str, endpoint: str) -> Alert:
        """Check WebSocket service health"""
        import websocket
        
        try:
            ws = websocket.create_connection(endpoint, timeout=10)
            ws.send(json.dumps({'type': 'ping'}))
            response = ws.recv()
            ws.close()
            
            if not response:
                return Alert(
                    severity='high',
                    service=service,
                    message='WebSocket not responding to ping',
                    details={'endpoint': endpoint},
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            return Alert(
                severity='critical',
                service=service,
                message=f'WebSocket connection failed: {str(e)}',
                details={'endpoint': endpoint, 'error': str(e)},
                timestamp=datetime.now()
            )
            
        return None
    
    def check_metrics(self) -> List[Alert]:
        """Check system metrics for anomalies"""
        alerts = []
        
        try:
            # Get metrics from Prometheus/monitoring endpoint
            response = requests.get('http://localhost:8002/metrics', timeout=5)
            metrics = self.parse_metrics(response.text)
            
            # Check CPU usage
            cpu_usage = metrics.get('cpu_usage_percent', 0) / 100
            if cpu_usage > self.alert_thresholds['cpu_usage']:
                alerts.append(Alert(
                    severity='high' if cpu_usage < 0.95 else 'critical',
                    service='system',
                    message=f'High CPU usage: {cpu_usage*100:.1f}%',
                    details={'cpu_usage': cpu_usage, 'threshold': self.alert_thresholds['cpu_usage']},
                    timestamp=datetime.now()
                ))
            
            # Check memory usage
            memory_usage = metrics.get('memory_usage_percent', 0) / 100
            if memory_usage > self.alert_thresholds['memory_usage']:
                alerts.append(Alert(
                    severity='high' if memory_usage < 0.95 else 'critical',
                    service='system',
                    message=f'High memory usage: {memory_usage*100:.1f}%',
                    details={'memory_usage': memory_usage, 'threshold': self.alert_thresholds['memory_usage']},
                    timestamp=datetime.now()
                ))
            
            # Check active sessions
            active_sessions = metrics.get('claude_terminal_active_sessions', 0)
            if active_sessions > self.alert_thresholds['active_sessions']:
                alerts.append(Alert(
                    severity='medium',
                    service='terminal',
                    message=f'High number of active sessions: {active_sessions}',
                    details={'active_sessions': active_sessions, 'threshold': self.alert_thresholds['active_sessions']},
                    timestamp=datetime.now()
                ))
                
        except Exception as e:
            alerts.append(Alert(
                severity='medium',
                service='monitoring',
                message=f'Failed to collect metrics: {str(e)}',
                details={'error': str(e)},
                timestamp=datetime.now()
            ))
        
        return alerts
    
    def parse_metrics(self, metrics_text: str) -> Dict[str, float]:
        """Parse Prometheus metrics format"""
        metrics = {}
        for line in metrics_text.split('\n'):
            if line.startswith('#') or not line.strip():
                continue
            
            if ' ' in line:
                metric_name, value = line.rsplit(' ', 1)
                try:
                    metrics[metric_name] = float(value)
                except ValueError:
                    continue
        
        return metrics
    
    def create_incident(self, alerts: List[Alert]) -> str:
        """Create incident from alerts"""
        if not alerts:
            return None
        
        # Determine incident severity
        max_severity = max(alerts, key=lambda a: ['informational', 'low', 'medium', 'high', 'critical'].index(a.severity)).severity
        
        # Create incident ID
        incident_id = f"INC-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        incident = {
            'id': incident_id,
            'severity': max_severity,
            'status': 'open',
            'created_at': datetime.now().isoformat(),
            'alerts': [
                {
                    'severity': alert.severity,
                    'service': alert.service,
                    'message': alert.message,
                    'details': alert.details,
                    'timestamp': alert.timestamp.isoformat()
                }
                for alert in alerts
            ],
            'title': f"{max_severity.capitalize()} incident affecting {', '.join(set(a.service for a in alerts))}"
        }
        
        # Store incident
        self.active_incidents[incident_id] = incident
        
        # Send notifications
        self.send_incident_notification(incident)
        
        return incident_id
    
    def send_incident_notification(self, incident: Dict[str, Any]):
        """Send incident notification to appropriate channels"""
        severity = incident['severity']
        
        # Slack notification
        slack_webhook = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
        slack_message = {
            "text": f"🚨 {severity.upper()} Incident: {incident['title']}",
            "attachments": [
                {
                    "color": {"critical": "danger", "high": "warning", "medium": "good"}.get(severity, "good"),
                    "fields": [
                        {"title": "Incident ID", "value": incident['id'], "short": True},
                        {"title": "Severity", "value": severity.upper(), "short": True},
                        {"title": "Time", "value": incident['created_at'], "short": True},
                        {"title": "Status", "value": incident['status'].upper(), "short": True}
                    ]
                }
            ]
        }
        
        try:
            requests.post(slack_webhook, json=slack_message, timeout=10)
        except Exception as e:
            print(f"Failed to send Slack notification: {e}")
        
        # PagerDuty notification for critical/high incidents
        if severity in ['critical', 'high']:
            pagerduty_payload = {
                "routing_key": "YOUR_PAGERDUTY_INTEGRATION_KEY",
                "event_action": "trigger",
                "payload": {
                    "summary": incident['title'],
                    "severity": severity,
                    "source": "claude-portfolio-monitoring",
                    "custom_details": {
                        "incident_id": incident['id'],
                        "alerts_count": len(incident['alerts'])
                    }
                }
            }
            
            try:
                requests.post(
                    "https://events.pagerduty.com/v2/enqueue",
                    json=pagerduty_payload,
                    timeout=10
                )
            except Exception as e:
                print(f"Failed to send PagerDuty notification: {e}")
    
    def monitor_loop(self):
        """Main monitoring loop"""
        print("Starting incident detection monitoring...")
        
        while True:
            try:
                # Check service health
                health_alerts = self.check_service_health()
                
                # Check metrics
                metric_alerts = self.check_metrics()
                
                # Combine alerts
                all_alerts = health_alerts + metric_alerts
                
                # Create incident if alerts exist
                if all_alerts:
                    incident_id = self.create_incident(all_alerts)
                    if incident_id:
                        print(f"Created incident: {incident_id}")
                
                # Sleep before next check
                time.sleep(30)  # Check every 30 seconds
                
            except KeyboardInterrupt:
                print("Monitoring stopped")
                break
            except Exception as e:
                print(f"Error in monitoring loop: {e}")
                time.sleep(60)  # Wait longer on error

if __name__ == "__main__":
    detector = IncidentDetector()
    detector.monitor_loop()
```

#### Manual Incident Creation

```bash
#!/bin/bash
# create-incident.sh

SEVERITY=$1
TITLE=$2
DESCRIPTION=$3

if [ -z "$SEVERITY" ] || [ -z "$TITLE" ]; then
    echo "Usage: $0 <severity> <title> [description]"
    echo "Severity: critical, high, medium, low"
    exit 1
fi

INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"

# Create incident record
cat > "/tmp/incident-${INCIDENT_ID}.json" << EOF
{
    "id": "$INCIDENT_ID",
    "severity": "$SEVERITY",
    "title": "$TITLE",
    "description": "$DESCRIPTION",
    "status": "open",
    "created_at": "$(date -Iseconds)",
    "created_by": "$(whoami)",
    "source": "manual"
}
EOF

# Send to incident management system
curl -X POST http://localhost:8080/api/incidents \
     -H "Content-Type: application/json" \
     -d @"/tmp/incident-${INCIDENT_ID}.json"

# Send Slack notification
curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
     -H "Content-Type: application/json" \
     -d "{
         \"text\": \"🚨 ${SEVERITY^^} Incident Created: $TITLE\",
         \"attachments\": [{
             \"color\": \"danger\",
             \"fields\": [
                 {\"title\": \"Incident ID\", \"value\": \"$INCIDENT_ID\", \"short\": true},
                 {\"title\": \"Severity\", \"value\": \"${SEVERITY^^}\", \"short\": true},
                 {\"title\": \"Created by\", \"value\": \"$(whoami)\", \"short\": true}
             ]
         }]
     }"

echo "Incident created: $INCIDENT_ID"
```

### 2. Initial Response Workflow

#### Immediate Response Checklist

```bash
#!/bin/bash
# incident-response-checklist.sh

INCIDENT_ID=$1

if [ -z "$INCIDENT_ID" ]; then
    echo "Usage: $0 <incident_id>"
    exit 1
fi

echo "=== Incident Response Checklist for $INCIDENT_ID ==="
echo "Start time: $(date)"

# Step 1: Acknowledge incident
echo "1. ✅ Incident acknowledged by $(whoami) at $(date)"

# Step 2: Initial assessment
echo "2. Initial Assessment:"
echo "   - Checking service status..."
systemctl status claude-portfolio | grep -E "(Active|Main PID)"

echo "   - Checking system resources..."
free -h | head -2
df -h / | tail -1

echo "   - Checking active connections..."
ss -tupln | grep -E ":5173|:8002|:8123" | wc -l

# Step 3: Impact assessment
echo "3. Impact Assessment:"
ACTIVE_USERS=$(curl -s http://localhost:8002/metrics | grep claude_websocket_connections | awk '{print $2}' || echo "unknown")
echo "   - Active users affected: $ACTIVE_USERS"

ACTIVE_SESSIONS=$(curl -s http://localhost:8002/metrics | grep claude_terminal_active_sessions | awk '{print $2}' || echo "unknown")
echo "   - Active terminal sessions: $ACTIVE_SESSIONS"

# Step 4: Collect logs
echo "4. Collecting recent logs..."
mkdir -p "/tmp/incident-logs-$INCIDENT_ID"
journalctl -u claude-portfolio --since "30 minutes ago" > "/tmp/incident-logs-$INCIDENT_ID/systemd.log"
cp /var/log/claude-portfolio/*.log "/tmp/incident-logs-$INCIDENT_ID/" 2>/dev/null

# Step 5: Notify stakeholders
echo "5. Stakeholder notification..."
cat > "/tmp/incident-update-$INCIDENT_ID.json" << EOF
{
    "incident_id": "$INCIDENT_ID",
    "status": "investigating",
    "responder": "$(whoami)",
    "update": "Initial response in progress. Collecting diagnostic information.",
    "timestamp": "$(date -Iseconds)"
}
EOF

# Step 6: Create war room
echo "6. Creating incident war room..."
echo "   - Slack channel: #incident-$INCIDENT_ID"
echo "   - Bridge line: +1-xxx-xxx-xxxx PIN: 123456"

# Step 7: Begin investigation
echo "7. Starting investigation workflow..."
echo "   - Next steps: Run ./investigate-incident.sh $INCIDENT_ID"

echo "=== Initial response completed at $(date) ==="
```

### 3. Investigation and Diagnosis

#### Automated Diagnosis Script

```python
#!/usr/bin/env python3
# investigate-incident.py

import sys
import subprocess
import json
import requests
import re
from datetime import datetime, timedelta
from typing import Dict, List, Any

class IncidentInvestigator:
    def __init__(self, incident_id: str):
        self.incident_id = incident_id
        self.findings = {
            'incident_id': incident_id,
            'investigation_start': datetime.now().isoformat(),
            'symptoms': [],
            'root_causes': [],
            'affected_components': [],
            'timeline': [],
            'recommendations': []
        }
    
    def collect_symptoms(self):
        """Collect observable symptoms"""
        print("Collecting symptoms...")
        
        # Check service status
        try:
            result = subprocess.run(['systemctl', 'status', 'claude-portfolio'], 
                                  capture_output=True, text=True)
            if result.returncode != 0:
                self.findings['symptoms'].append({
                    'type': 'service_down',
                    'description': 'Claude Portfolio service is not running',
                    'details': result.stdout + result.stderr
                })
        except Exception as e:
            self.findings['symptoms'].append({
                'type': 'check_failed',
                'description': f'Failed to check service status: {e}'
            })
        
        # Check HTTP endpoints
        endpoints = [
            ('frontend', 'http://localhost:5173/health'),
            ('terminal-service', 'http://localhost:8002/health')
        ]
        
        for name, url in endpoints:
            try:
                response = requests.get(url, timeout=5)
                if response.status_code != 200:
                    self.findings['symptoms'].append({
                        'type': 'endpoint_error',
                        'description': f'{name} endpoint returning {response.status_code}',
                        'details': {'url': url, 'status_code': response.status_code}
                    })
            except requests.exceptions.ConnectionError:
                self.findings['symptoms'].append({
                    'type': 'endpoint_unreachable',
                    'description': f'{name} endpoint unreachable',
                    'details': {'url': url}
                })
            except Exception as e:
                self.findings['symptoms'].append({
                    'type': 'endpoint_check_failed',
                    'description': f'Failed to check {name} endpoint: {e}',
                    'details': {'url': url, 'error': str(e)}
                })
        
        # Check system resources
        try:
            # Memory usage
            result = subprocess.run(['free'], capture_output=True, text=True)
            memory_lines = result.stdout.split('\n')
            if len(memory_lines) > 1:
                mem_info = memory_lines[1].split()
                if len(mem_info) >= 3:
                    total_mem = int(mem_info[1])
                    used_mem = int(mem_info[2])
                    mem_percent = (used_mem / total_mem) * 100
                    
                    if mem_percent > 90:
                        self.findings['symptoms'].append({
                            'type': 'high_memory_usage',
                            'description': f'High memory usage: {mem_percent:.1f}%',
                            'details': {'memory_percent': mem_percent}
                        })
            
            # Disk usage
            result = subprocess.run(['df', '-h', '/'], capture_output=True, text=True)
            disk_lines = result.stdout.split('\n')
            if len(disk_lines) > 1:
                disk_info = disk_lines[1].split()
                if len(disk_info) >= 5:
                    disk_percent = float(disk_info[4].rstrip('%'))
                    if disk_percent > 85:
                        self.findings['symptoms'].append({
                            'type': 'high_disk_usage',
                            'description': f'High disk usage: {disk_percent}%',
                            'details': {'disk_percent': disk_percent}
                        })
                        
        except Exception as e:
            self.findings['symptoms'].append({
                'type': 'resource_check_failed',
                'description': f'Failed to check system resources: {e}'
            })
    
    def analyze_logs(self):
        """Analyze logs for patterns and errors"""
        print("Analyzing logs...")
        
        log_sources = [
            ('systemd', ['journalctl', '-u', 'claude-portfolio', '--since', '1 hour ago']),
            ('application', ['tail', '-100', '/var/log/claude-portfolio/error.log']),
            ('nginx', ['tail', '-100', '/var/log/nginx/error.log'])
        ]
        
        error_patterns = [
            (r'ECONNREFUSED', 'connection_refused'),
            (r'ENOTFOUND', 'dns_resolution_failed'),
            (r'timeout', 'timeout_error'),
            (r'out of memory|OOM', 'out_of_memory'),
            (r'EMFILE|ENFILE', 'file_descriptor_limit'),
            (r'permission denied', 'permission_error'),
            (r'port.*already in use', 'port_conflict'),
            (r'certificate.*expired', 'certificate_expired')
        ]
        
        for source_name, command in log_sources:
            try:
                result = subprocess.run(command, capture_output=True, text=True, timeout=30)
                log_content = result.stdout
                
                # Look for error patterns
                for pattern, error_type in error_patterns:
                    matches = re.findall(pattern, log_content, re.IGNORECASE)
                    if matches:
                        self.findings['symptoms'].append({
                            'type': 'log_pattern',
                            'description': f'Found {error_type} pattern in {source_name} logs',
                            'details': {
                                'source': source_name,
                                'pattern': pattern,
                                'matches': len(matches)
                            }
                        })
                
                # Look for recent errors
                error_lines = [line for line in log_content.split('\n') 
                              if any(keyword in line.lower() for keyword in ['error', 'fatal', 'exception', 'failed'])]
                
                if error_lines:
                    self.findings['symptoms'].append({
                        'type': 'recent_errors',
                        'description': f'Found {len(error_lines)} recent errors in {source_name} logs',
                        'details': {
                            'source': source_name,
                            'error_count': len(error_lines),
                            'recent_errors': error_lines[-5:]  # Last 5 errors
                        }
                    })
                    
            except subprocess.TimeoutExpired:
                self.findings['symptoms'].append({
                    'type': 'log_analysis_timeout',
                    'description': f'Timeout analyzing {source_name} logs'
                })
            except Exception as e:
                self.findings['symptoms'].append({
                    'type': 'log_analysis_failed',
                    'description': f'Failed to analyze {source_name} logs: {e}'
                })
    
    def determine_root_causes(self):
        """Determine potential root causes based on symptoms"""
        print("Determining root causes...")
        
        symptom_types = [s['type'] for s in self.findings['symptoms']]
        
        # Service down scenarios
        if 'service_down' in symptom_types:
            self.findings['root_causes'].append({
                'cause': 'Service failure',
                'likelihood': 'high',
                'description': 'The Claude Portfolio service has stopped running',
                'investigation_steps': [
                    'Check systemd service logs',
                    'Verify configuration files',
                    'Check for resource exhaustion',
                    'Verify dependencies are running'
                ]
            })
        
        # Resource exhaustion scenarios
        if any(t in symptom_types for t in ['high_memory_usage', 'high_disk_usage', 'out_of_memory']):
            self.findings['root_causes'].append({
                'cause': 'Resource exhaustion',
                'likelihood': 'high',
                'description': 'System resources (memory/disk) are exhausted',
                'investigation_steps': [
                    'Identify memory/disk consuming processes',
                    'Clean up temporary files',
                    'Restart services to free resources',
                    'Scale resources if needed'
                ]
            })
        
        # Network/connectivity issues
        if any(t in symptom_types for t in ['endpoint_unreachable', 'connection_refused', 'timeout_error']):
            self.findings['root_causes'].append({
                'cause': 'Network connectivity issues',
                'likelihood': 'medium',
                'description': 'Network connectivity or port binding issues',
                'investigation_steps': [
                    'Check port bindings',
                    'Verify firewall rules',
                    'Test network connectivity',
                    'Check for port conflicts'
                ]
            })
        
        # Configuration issues
        if any(t in symptom_types for t in ['permission_error', 'certificate_expired']):
            self.findings['root_causes'].append({
                'cause': 'Configuration issues',
                'likelihood': 'medium',
                'description': 'Configuration or permission problems',
                'investigation_steps': [
                    'Verify file permissions',
                    'Check configuration syntax',
                    'Validate certificates',
                    'Review recent configuration changes'
                ]
            })
    
    def create_timeline(self):
        """Create incident timeline"""
        print("Creating timeline...")
        
        # This would integrate with log aggregation systems to create a timeline
        # For now, we'll create a basic timeline based on log analysis
        
        timeline_events = []
        
        # Add investigation start
        timeline_events.append({
            'timestamp': datetime.now().isoformat(),
            'event': 'Investigation started',
            'source': 'incident_response',
            'details': f'Investigation of incident {self.incident_id} started'
        })
        
        # Add symptom discovery times (would be extracted from logs in real implementation)
        for symptom in self.findings['symptoms']:
            timeline_events.append({
                'timestamp': datetime.now().isoformat(),  # Would be actual symptom time
                'event': 'Symptom detected',
                'source': 'monitoring',
                'details': symptom['description']
            })
        
        self.findings['timeline'] = sorted(timeline_events, key=lambda x: x['timestamp'])
    
    def generate_recommendations(self):
        """Generate remediation recommendations"""
        print("Generating recommendations...")
        
        symptom_types = [s['type'] for s in self.findings['symptoms']]
        
        # Service down recommendations
        if 'service_down' in symptom_types:
            self.findings['recommendations'].extend([
                {
                    'action': 'Restart service',
                    'priority': 'immediate',
                    'command': 'systemctl restart claude-portfolio',
                    'description': 'Restart the Claude Portfolio service'
                },
                {
                    'action': 'Verify service health',
                    'priority': 'immediate',
                    'command': 'systemctl status claude-portfolio && curl http://localhost:5173/health',
                    'description': 'Verify service is running and healthy'
                }
            ])
        
        # Resource exhaustion recommendations
        if any(t in symptom_types for t in ['high_memory_usage', 'high_disk_usage']):
            self.findings['recommendations'].extend([
                {
                    'action': 'Clean up resources',
                    'priority': 'immediate',
                    'command': './cleanup-resources.sh',
                    'description': 'Free up system resources'
                },
                {
                    'action': 'Scale resources',
                    'priority': 'short_term',
                    'command': 'Review resource allocation and scale if needed',
                    'description': 'Increase system resources to prevent recurrence'
                }
            ])
        
        # Network issue recommendations
        if any(t in symptom_types for t in ['endpoint_unreachable', 'connection_refused']):
            self.findings['recommendations'].extend([
                {
                    'action': 'Check port bindings',
                    'priority': 'immediate',
                    'command': 'netstat -tulpn | grep -E ":5173|:8002|:8123"',
                    'description': 'Verify services are listening on expected ports'
                },
                {
                    'action': 'Restart networking',
                    'priority': 'high',
                    'command': 'systemctl restart networking',
                    'description': 'Restart network services if needed'
                }
            ])
        
        # General recommendations
        self.findings['recommendations'].extend([
            {
                'action': 'Monitor recovery',
                'priority': 'ongoing',
                'command': './monitor-recovery.sh',
                'description': 'Monitor system recovery and stability'
            },
            {
                'action': 'Update documentation',
                'priority': 'post_incident',
                'command': 'Update runbooks based on findings',
                'description': 'Update operational procedures to prevent recurrence'
            }
        ])
    
    def run_investigation(self):
        """Run complete investigation"""
        print(f"Starting investigation for incident {self.incident_id}")
        
        self.collect_symptoms()
        self.analyze_logs()
        self.determine_root_causes()
        self.create_timeline()
        self.generate_recommendations()
        
        self.findings['investigation_complete'] = datetime.now().isoformat()
        
        return self.findings
    
    def generate_report(self):
        """Generate investigation report"""
        print(f"\n=== Investigation Report for {self.incident_id} ===")
        print(f"Investigation completed: {self.findings['investigation_complete']}")
        
        print(f"\nSymptoms Found ({len(self.findings['symptoms'])}):")
        for symptom in self.findings['symptoms']:
            print(f"  - {symptom['description']}")
        
        print(f"\nRoot Causes ({len(self.findings['root_causes'])}):")
        for cause in self.findings['root_causes']:
            print(f"  - {cause['cause']} (likelihood: {cause['likelihood']})")
            print(f"    {cause['description']}")
        
        print(f"\nRecommendations ({len(self.findings['recommendations'])}):")
        for rec in self.findings['recommendations']:
            print(f"  - [{rec['priority'].upper()}] {rec['action']}")
            print(f"    Command: {rec['command']}")
        
        # Save report
        report_file = f"/tmp/investigation-report-{self.incident_id}.json"
        with open(report_file, 'w') as f:
            json.dump(self.findings, f, indent=2)
        
        print(f"\nDetailed report saved: {report_file}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 investigate-incident.py <incident_id>")
        sys.exit(1)
    
    incident_id = sys.argv[1]
    investigator = IncidentInvestigator(incident_id)
    
    findings = investigator.run_investigation()
    investigator.generate_report()
```

## Escalation Procedures

### 1. Escalation Matrix

```yaml
# escalation-matrix.yml
escalation_levels:
  level_1:
    title: "Primary On-Call Engineer"
    trigger_time: 0
    roles:
      - "Site Reliability Engineer"
      - "DevOps Engineer"
    contact_methods:
      - email
      - slack
      - sms
    
  level_2:
    title: "Secondary On-Call Engineer"
    trigger_time: 15_minutes
    roles:
      - "Senior DevOps Engineer"
      - "Platform Engineer"
    contact_methods:
      - phone
      - email
      - slack
    
  level_3:
    title: "Engineering Manager"
    trigger_time: 30_minutes
    roles:
      - "Engineering Manager"
      - "Technical Lead"
    contact_methods:
      - phone
      - email
    
  level_4:
    title: "Director of Engineering"
    trigger_time: 60_minutes
    roles:
      - "Director of Engineering"
      - "VP of Engineering"
    contact_methods:
      - phone
      - email
    
  level_5:
    title: "Executive Team"
    trigger_time: 120_minutes
    roles:
      - "CTO"
      - "CEO"
    contact_methods:
      - phone

severity_escalation:
  P0:
    immediate: [level_1, level_2]
    15_minutes: [level_3]
    30_minutes: [level_4]
    60_minutes: [level_5]
  
  P1:
    immediate: [level_1]
    30_minutes: [level_2]
    60_minutes: [level_3]
    120_minutes: [level_4]
  
  P2:
    immediate: [level_1]
    60_minutes: [level_2]
    240_minutes: [level_3]
  
  P3:
    immediate: [level_1]
    240_minutes: [level_2]
```

### 2. Automated Escalation Script

```bash
#!/bin/bash
# auto-escalate.sh

INCIDENT_ID=$1
CURRENT_LEVEL=$2
ELAPSED_MINUTES=$3

if [ -z "$INCIDENT_ID" ] || [ -z "$CURRENT_LEVEL" ] || [ -z "$ELAPSED_MINUTES" ]; then
    echo "Usage: $0 <incident_id> <current_level> <elapsed_minutes>"
    exit 1
fi

echo "Checking escalation for incident $INCIDENT_ID (Level $CURRENT_LEVEL, ${ELAPSED_MINUTES}m elapsed)"

# Get incident details
INCIDENT_FILE="/tmp/incident-${INCIDENT_ID}.json"
if [ ! -f "$INCIDENT_FILE" ]; then
    echo "Error: Incident file not found"
    exit 1
fi

SEVERITY=$(jq -r '.severity' "$INCIDENT_FILE")
echo "Incident severity: $SEVERITY"

# Check if escalation is needed
case "$SEVERITY" in
    "critical"|"P0")
        case "$ELAPSED_MINUTES" in
            1[5-9]|2[0-9])  # 15-29 minutes
                if [ "$CURRENT_LEVEL" -lt 3 ]; then
                    echo "Escalating to Level 3 (Engineering Manager)"
                    ./notify-escalation.sh "$INCIDENT_ID" 3 "engineering-manager"
                fi
                ;;
            3[0-9]|[4-5][0-9])  # 30-59 minutes
                if [ "$CURRENT_LEVEL" -lt 4 ]; then
                    echo "Escalating to Level 4 (Director)"
                    ./notify-escalation.sh "$INCIDENT_ID" 4 "director"
                fi
                ;;
            [6-9][0-9]|1[0-9][0-9])  # 60+ minutes
                if [ "$CURRENT_LEVEL" -lt 5 ]; then
                    echo "Escalating to Level 5 (Executive)"
                    ./notify-escalation.sh "$INCIDENT_ID" 5 "executive"
                fi
                ;;
        esac
        ;;
    "high"|"P1")
        case "$ELAPSED_MINUTES" in
            3[0-9]|[4-5][0-9])  # 30-59 minutes
                if [ "$CURRENT_LEVEL" -lt 2 ]; then
                    echo "Escalating to Level 2"
                    ./notify-escalation.sh "$INCIDENT_ID" 2 "secondary-oncall"
                fi
                ;;
            [6-9][0-9]|1[0-1][0-9])  # 60-119 minutes
                if [ "$CURRENT_LEVEL" -lt 3 ]; then
                    echo "Escalating to Level 3"
                    ./notify-escalation.sh "$INCIDENT_ID" 3 "engineering-manager"
                fi
                ;;
            1[2-9][0-9]|2[0-9][0-9])  # 120+ minutes
                if [ "$CURRENT_LEVEL" -lt 4 ]; then
                    echo "Escalating to Level 4"
                    ./notify-escalation.sh "$INCIDENT_ID" 4 "director"
                fi
                ;;
        esac
        ;;
    *)
        echo "No escalation needed for severity $SEVERITY at ${ELAPSED_MINUTES} minutes"
        ;;
esac

# Update incident record with escalation
jq --arg level "$CURRENT_LEVEL" --arg time "$(date -Iseconds)" \
   '.escalation_history += [{"level": $level, "time": $time}]' \
   "$INCIDENT_FILE" > "${INCIDENT_FILE}.tmp" && mv "${INCIDENT_FILE}.tmp" "$INCIDENT_FILE"
```

## Recovery Procedures

### 1. Service Recovery Workflow

```bash
#!/bin/bash
# service-recovery.sh

INCIDENT_ID=$1
RECOVERY_TYPE=${2:-"standard"}  # standard, emergency, rollback

echo "=== Service Recovery for Incident $INCIDENT_ID ==="
echo "Recovery type: $RECOVERY_TYPE"
echo "Start time: $(date)"

# Pre-recovery checks
echo "1. Pre-recovery System Check:"
./system-health-check.sh --brief

# Create recovery checkpoint
echo "2. Creating recovery checkpoint..."
CHECKPOINT="/tmp/recovery-checkpoint-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$CHECKPOINT"

# Backup current state
cp -r /opt/claude-portfolio/config "$CHECKPOINT/"
systemctl status claude-portfolio > "$CHECKPOINT/service-status.txt"
ps aux | grep node > "$CHECKPOINT/processes.txt"

case "$RECOVERY_TYPE" in
    "emergency")
        echo "3. Emergency Recovery Process:"
        
        # Kill all related processes
        echo "   - Stopping all Claude processes..."
        pkill -f "claude-portfolio"
        pkill -f "node.*8002"
        
        # Clear port bindings
        echo "   - Clearing port bindings..."
        for port in 5173 8002 8123; do
            PID=$(lsof -ti :$port)
            if [ -n "$PID" ]; then
                kill -9 "$PID"
                echo "     - Killed process $PID on port $port"
            fi
        done
        
        # Clean temporary files
        echo "   - Cleaning temporary files..."
        rm -rf /tmp/claude-*
        rm -rf /opt/claude-portfolio/workspace/.temp-*
        
        # Restart services
        echo "   - Restarting services..."
        systemctl daemon-reload
        systemctl restart claude-portfolio
        
        # Wait for startup
        sleep 30
        ;;
        
    "rollback")
        echo "3. Rollback Recovery Process:"
        
        # Stop services
        systemctl stop claude-portfolio
        
        # Restore from backup
        BACKUP_DATE=${3:-$(ls -t /opt/backups/daily/ | head -1)}
        if [ -n "$BACKUP_DATE" ] && [ -d "/opt/backups/daily/$BACKUP_DATE" ]; then
            echo "   - Rolling back to backup: $BACKUP_DATE"
            
            # Backup current state
            cp -r /opt/claude-portfolio "/opt/claude-portfolio.backup.$(date +%H%M%S)"
            
            # Restore from backup
            rm -rf /opt/claude-portfolio/config
            cp -r "/opt/backups/daily/$BACKUP_DATE/config" /opt/claude-portfolio/
            
            # Restore database if needed
            if [ -f "/opt/backups/daily/$BACKUP_DATE/redis-backup.rdb" ]; then
                cp "/opt/backups/daily/$BACKUP_DATE/redis-backup.rdb" /var/lib/redis/dump.rdb
                systemctl restart redis
            fi
            
            # Start services
            systemctl start claude-portfolio
        else
            echo "   - No valid backup found for rollback"
            exit 1
        fi
        ;;
        
    "standard")
        echo "3. Standard Recovery Process:"
        
        # Restart services gracefully
        echo "   - Graceful service restart..."
        systemctl restart claude-portfolio
        
        # Wait for startup
        sleep 15
        
        # Clear caches if needed
        if [ -f /tmp/high-memory-usage ]; then
            echo "   - Clearing system caches..."
            echo 3 > /proc/sys/vm/drop_caches
            rm -f /tmp/high-memory-usage
        fi
        
        # Restart dependencies if needed
        if ! systemctl is-active --quiet nginx; then
            echo "   - Restarting nginx..."
            systemctl restart nginx
        fi
        ;;
        
    *)
        echo "Unknown recovery type: $RECOVERY_TYPE"
        exit 1
        ;;
esac

# Post-recovery verification
echo "4. Post-recovery Verification:"

# Wait for services to stabilize
echo "   - Waiting for services to stabilize..."
sleep 30

# Check service status
echo "   - Checking service status..."
if systemctl is-active --quiet claude-portfolio; then
    echo "     ✅ Claude Portfolio service is running"
else
    echo "     ❌ Claude Portfolio service failed to start"
    journalctl -u claude-portfolio --since "5 minutes ago" | tail -10
fi

# Check HTTP endpoints
echo "   - Checking HTTP endpoints..."
for endpoint in "http://localhost:5173/health" "http://localhost:8002/health"; do
    if curl -sf "$endpoint" > /dev/null; then
        echo "     ✅ $endpoint is responding"
    else
        echo "     ❌ $endpoint is not responding"
    fi
done

# Check WebSocket connectivity
echo "   - Checking WebSocket connectivity..."
timeout 10 python3 << 'EOF'
import websocket
import json

try:
    ws = websocket.create_connection("ws://localhost:8002", timeout=5)
    ws.send(json.dumps({"type": "ping"}))
    response = ws.recv()
    ws.close()
    print("     ✅ WebSocket is responding")
except Exception as e:
    print(f"     ❌ WebSocket failed: {e}")
EOF

# Check system resources
echo "   - Checking system resources..."
MEMORY_USAGE=$(free | awk '/Mem:/ {printf "%.1f", $3/$2 * 100.0}')
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)

echo "     - Memory usage: ${MEMORY_USAGE}%"
echo "     - CPU usage: ${CPU_USAGE}%"

if (( $(echo "$MEMORY_USAGE < 80" | bc -l) )) && (( $(echo "$CPU_USAGE < 80" | bc -l) )); then
    echo "     ✅ System resources are healthy"
else
    echo "     ⚠️  System resources may be stressed"
fi

# Final status
echo "5. Recovery Summary:"
RECOVERY_SUCCESS=true

# Check if all critical services are running
for service in "claude-portfolio"; do
    if ! systemctl is-active --quiet "$service"; then
        echo "   ❌ Service $service is not running"
        RECOVERY_SUCCESS=false
    fi
done

# Check if endpoints are responding
for endpoint in "http://localhost:5173/health" "http://localhost:8002/health"; do
    if ! curl -sf "$endpoint" > /dev/null; then
        echo "   ❌ Endpoint $endpoint is not responding"
        RECOVERY_SUCCESS=false
    fi
done

if [ "$RECOVERY_SUCCESS" = true ]; then
    echo "   ✅ Recovery completed successfully"
    
    # Update incident status
    if [ -n "$INCIDENT_ID" ]; then
        echo "   - Updating incident status to resolved"
        jq --arg status "resolved" --arg time "$(date -Iseconds)" \
           '.status = $status | .resolved_at = $time' \
           "/tmp/incident-${INCIDENT_ID}.json" > "/tmp/incident-${INCIDENT_ID}.json.tmp"
        mv "/tmp/incident-${INCIDENT_ID}.json.tmp" "/tmp/incident-${INCIDENT_ID}.json"
        
        # Send resolution notification
        curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
             -H "Content-Type: application/json" \
             -d "{
                 \"text\": \"✅ Incident $INCIDENT_ID has been resolved\",
                 \"attachments\": [{
                     \"color\": \"good\",
                     \"fields\": [
                         {\"title\": \"Recovery Type\", \"value\": \"$RECOVERY_TYPE\", \"short\": true},
                         {\"title\": \"Duration\", \"value\": \"$(( ($(date +%s) - $(date -d "$(jq -r '.created_at' /tmp/incident-${INCIDENT_ID}.json)" +%s)) / 60 )) minutes\", \"short\": true}
                     ]
                 }]
             }"
    fi
    
    exit 0
else
    echo "   ❌ Recovery failed - manual intervention required"
    
    # Send escalation notification
    curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
         -H "Content-Type: application/json" \
         -d "{
             \"text\": \"🚨 Recovery failed for incident $INCIDENT_ID - manual intervention required\",
             \"attachments\": [{
                 \"color\": \"danger\",
                 \"fields\": [
                     {\"title\": \"Recovery Type\", \"value\": \"$RECOVERY_TYPE\", \"short\": true},
                     {\"title\": \"Status\", \"value\": \"RECOVERY FAILED\", \"short\": true}
                 ]
             }]
         }"
    
    exit 1
fi
```

### 2. Data Recovery Procedures

```bash
#!/bin/bash
# data-recovery.sh

RECOVERY_SCOPE=$1  # session-data, user-data, configuration, full
BACKUP_DATE=${2:-"latest"}

echo "=== Data Recovery Process ==="
echo "Scope: $RECOVERY_SCOPE"
echo "Backup date: $BACKUP_DATE"

# Determine backup location
if [ "$BACKUP_DATE" = "latest" ]; then
    BACKUP_DIR=$(ls -td /opt/backups/daily/*/ | head -1)
else
    BACKUP_DIR="/opt/backups/daily/$BACKUP_DATE"
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory not found: $BACKUP_DIR"
    exit 1
fi

echo "Using backup: $BACKUP_DIR"

# Create recovery point
RECOVERY_POINT="/tmp/recovery-point-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RECOVERY_POINT"

case "$RECOVERY_SCOPE" in
    "session-data")
        echo "Recovering session data..."
        
        # Stop services temporarily
        systemctl stop claude-portfolio
        
        # Backup current session data
        if [ -d "/opt/claude-portfolio/workspace" ]; then
            cp -r /opt/claude-portfolio/workspace "$RECOVERY_POINT/"
        fi
        
        # Restore session data
        if [ -f "$BACKUP_DIR/workspace.tar.gz" ]; then
            cd /opt/claude-portfolio
            tar -xzf "$BACKUP_DIR/workspace.tar.gz"
            chown -R claude-portfolio:claude-portfolio workspace/
            echo "Session data restored"
        else
            echo "No session data backup found"
        fi
        
        # Restart services
        systemctl start claude-portfolio
        ;;
        
    "user-data")
        echo "Recovering user data..."
        
        # This would recover user-specific data
        # Implementation depends on how user data is stored
        echo "User data recovery not implemented yet"
        ;;
        
    "configuration")
        echo "Recovering configuration..."
        
        # Stop services
        systemctl stop claude-portfolio
        systemctl stop nginx 2>/dev/null || true
        
        # Backup current configuration
        cp -r /opt/claude-portfolio/config "$RECOVERY_POINT/"
        cp /etc/nginx/sites-available/claude-portfolio "$RECOVERY_POINT/" 2>/dev/null || true
        
        # Restore configuration
        if [ -d "$BACKUP_DIR/config" ]; then
            rm -rf /opt/claude-portfolio/config
            cp -r "$BACKUP_DIR/config" /opt/claude-portfolio/
            chown -R claude-portfolio:claude-portfolio /opt/claude-portfolio/config
            echo "Application configuration restored"
        fi
        
        if [ -f "$BACKUP_DIR/nginx-claude-portfolio" ]; then
            cp "$BACKUP_DIR/nginx-claude-portfolio" /etc/nginx/sites-available/claude-portfolio
            echo "Nginx configuration restored"
        fi
        
        # Restart services
        systemctl start claude-portfolio
        systemctl start nginx 2>/dev/null || true
        ;;
        
    "full")
        echo "Performing full system recovery..."
        
        # Stop all services
        systemctl stop claude-portfolio
        systemctl stop nginx 2>/dev/null || true
        systemctl stop redis 2>/dev/null || true
        
        # Create full backup of current state
        tar -czf "$RECOVERY_POINT/pre-recovery-backup.tar.gz" \
            --exclude='node_modules' \
            --exclude='*.log' \
            /opt/claude-portfolio
        
        # Restore full backup
        if [ -f "$BACKUP_DIR/claude-portfolio-full.tar.gz" ]; then
            cd /
            tar -xzf "$BACKUP_DIR/claude-portfolio-full.tar.gz"
            chown -R claude-portfolio:claude-portfolio /opt/claude-portfolio
            echo "Full application restored"
        fi
        
        # Restore database
        if [ -f "$BACKUP_DIR/redis-backup.rdb" ]; then
            cp "$BACKUP_DIR/redis-backup.rdb" /var/lib/redis/dump.rdb
            chown redis:redis /var/lib/redis/dump.rdb
            echo "Database restored"
        fi
        
        # Restart all services
        systemctl start redis 2>/dev/null || true
        systemctl start nginx 2>/dev/null || true
        systemctl start claude-portfolio
        ;;
        
    *)
        echo "Unknown recovery scope: $RECOVERY_SCOPE"
        echo "Valid scopes: session-data, user-data, configuration, full"
        exit 1
        ;;
esac

# Verify recovery
echo "Verifying recovery..."
sleep 30

# Check service status
if systemctl is-active --quiet claude-portfolio; then
    echo "✅ Claude Portfolio service is running"
else
    echo "❌ Claude Portfolio service failed to start"
    exit 1
fi

# Check HTTP endpoints
for endpoint in "http://localhost:5173/health" "http://localhost:8002/health"; do
    if curl -sf "$endpoint" > /dev/null; then
        echo "✅ $endpoint is responding"
    else
        echo "❌ $endpoint is not responding"
        exit 1
    fi
done

echo "✅ Data recovery completed successfully"
echo "Recovery point created at: $RECOVERY_POINT"
```

## Post-Incident Procedures

### 1. Post-Incident Review Template

```markdown
# Post-Incident Review - {{INCIDENT_ID}}

## Incident Summary
- **Incident ID**: {{INCIDENT_ID}}
- **Date**: {{INCIDENT_DATE}}
- **Duration**: {{INCIDENT_DURATION}}
- **Severity**: {{INCIDENT_SEVERITY}}
- **Services Affected**: {{AFFECTED_SERVICES}}
- **User Impact**: {{USER_IMPACT}}

## Timeline
| Time (UTC) | Event | Action Taken | Notes |
|------------|-------|--------------|-------|
| {{TIME1}} | {{EVENT1}} | {{ACTION1}} | {{NOTES1}} |
| {{TIME2}} | {{EVENT2}} | {{ACTION2}} | {{NOTES2}} |

## Root Cause Analysis

### What Happened?
{{WHAT_HAPPENED_DESCRIPTION}}

### Why Did It Happen?
{{ROOT_CAUSE_ANALYSIS}}

### Contributing Factors
- {{FACTOR1}}
- {{FACTOR2}}
- {{FACTOR3}}

## Response Evaluation

### What Went Well?
- {{POSITIVE_ASPECT1}}
- {{POSITIVE_ASPECT2}}

### What Could Be Improved?
- {{IMPROVEMENT_AREA1}}
- {{IMPROVEMENT_AREA2}}

### Detection and Response Times
- **Detection Time**: {{DETECTION_TIME}}
- **Response Time**: {{RESPONSE_TIME}}
- **Resolution Time**: {{RESOLUTION_TIME}}

## Action Items

| Action Item | Owner | Due Date | Priority | Status |
|-------------|-------|----------|----------|--------|
| {{ACTION1}} | {{OWNER1}} | {{DATE1}} | High | Open |
| {{ACTION2}} | {{OWNER2}} | {{DATE2}} | Medium | Open |

## Lessons Learned

### Technical Lessons
- {{TECHNICAL_LESSON1}}
- {{TECHNICAL_LESSON2}}

### Process Lessons
- {{PROCESS_LESSON1}}
- {{PROCESS_LESSON2}}

## Prevention Measures

### Immediate Actions (0-30 days)
- {{IMMEDIATE_ACTION1}}
- {{IMMEDIATE_ACTION2}}

### Short-term Actions (1-3 months)
- {{SHORT_TERM_ACTION1}}
- {{SHORT_TERM_ACTION2}}

### Long-term Actions (3+ months)
- {{LONG_TERM_ACTION1}}
- {{LONG_TERM_ACTION2}}

## Communication

### Internal Communication
- {{INTERNAL_COMM1}}
- {{INTERNAL_COMM2}}

### External Communication
- {{EXTERNAL_COMM1}}
- {{EXTERNAL_COMM2}}

## Metrics and Impact

### Availability Impact
- **Downtime**: {{DOWNTIME_MINUTES}} minutes
- **Availability**: {{AVAILABILITY_PERCENTAGE}}%
- **SLA Impact**: {{SLA_IMPACT}}

### Business Impact
- **Users Affected**: {{USERS_AFFECTED}}
- **Revenue Impact**: {{REVENUE_IMPACT}}
- **Customer Complaints**: {{CUSTOMER_COMPLAINTS}}

## Sign-off
- **Incident Commander**: {{IC_NAME}} - {{IC_SIGNATURE}} - {{DATE}}
- **Engineering Manager**: {{EM_NAME}} - {{EM_SIGNATURE}} - {{DATE}}
- **Product Manager**: {{PM_NAME}} - {{PM_SIGNATURE}} - {{DATE}}
```

### 2. Automated Post-Incident Report Generation

```python
#!/usr/bin/env python3
# generate-postincident-report.py

import json
import sys
from datetime import datetime, timedelta
from jinja2 import Template

class PostIncidentReportGenerator:
    def __init__(self, incident_id):
        self.incident_id = incident_id
        self.incident_data = self.load_incident_data()
        
    def load_incident_data(self):
        """Load incident data from various sources"""
        try:
            with open(f'/tmp/incident-{self.incident_id}.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Error: Incident data file not found for {self.incident_id}")
            sys.exit(1)
    
    def calculate_metrics(self):
        """Calculate incident metrics"""
        created_at = datetime.fromisoformat(self.incident_data['created_at'])
        resolved_at = datetime.fromisoformat(self.incident_data.get('resolved_at', datetime.now().isoformat()))
        
        duration = resolved_at - created_at
        
        return {
            'duration_minutes': int(duration.total_seconds() / 60),
            'duration_hours': round(duration.total_seconds() / 3600, 2),
            'created_at': created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
            'resolved_at': resolved_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        }
    
    def extract_timeline(self):
        """Extract timeline from incident data"""
        timeline = []
        
        # Add creation event
        timeline.append({
            'time': self.incident_data['created_at'],
            'event': 'Incident detected',
            'action': 'Initial alert triggered',
            'notes': f"Severity: {self.incident_data['severity']}"
        })
        
        # Add escalation events
        for escalation in self.incident_data.get('escalation_history', []):
            timeline.append({
                'time': escalation['time'],
                'event': f"Escalated to level {escalation['level']}",
                'action': 'Escalation notification sent',
                'notes': f"Level {escalation['level']} responder notified"
            })
        
        # Add resolution event
        if 'resolved_at' in self.incident_data:
            timeline.append({
                'time': self.incident_data['resolved_at'],
                'event': 'Incident resolved',
                'action': 'Service restored to normal operation',
                'notes': 'All systems operational'
            })
        
        return sorted(timeline, key=lambda x: x['time'])
    
    def analyze_response_effectiveness(self):
        """Analyze response effectiveness"""
        metrics = self.calculate_metrics()
        severity = self.incident_data['severity']
        
        # Define SLA targets by severity
        sla_targets = {
            'critical': {'detection': 5, 'response': 15, 'resolution': 120},
            'high': {'detection': 10, 'response': 60, 'resolution': 240},
            'medium': {'detection': 30, 'response': 240, 'resolution': 480},
            'low': {'detection': 60, 'response': 480, 'resolution': 1440}
        }
        
        target = sla_targets.get(severity, sla_targets['medium'])
        
        analysis = {
            'sla_met': metrics['duration_minutes'] <= target['resolution'],
            'target_resolution': target['resolution'],
            'actual_resolution': metrics['duration_minutes'],
            'performance': 'Met' if metrics['duration_minutes'] <= target['resolution'] else 'Exceeded'
        }
        
        return analysis
    
    def generate_action_items(self):
        """Generate action items based on incident analysis"""
        action_items = []
        
        # Based on duration
        metrics = self.calculate_metrics()
        if metrics['duration_minutes'] > 60:
            action_items.append({
                'item': 'Review and improve incident response procedures',
                'owner': 'Engineering Manager',
                'due_date': (datetime.now() + timedelta(days=14)).strftime('%Y-%m-%d'),
                'priority': 'High'
            })
        
        # Based on severity
        if self.incident_data['severity'] in ['critical', 'high']:
            action_items.append({
                'item': 'Implement additional monitoring for early detection',
                'owner': 'SRE Team',
                'due_date': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
                'priority': 'High'
            })
        
        # Based on root cause (if available in investigation data)
        investigation_file = f'/tmp/investigation-report-{self.incident_id}.json'
        try:
            with open(investigation_file, 'r') as f:
                investigation = json.load(f)
                
            for cause in investigation.get('root_causes', []):
                if 'resource exhaustion' in cause.get('cause', '').lower():
                    action_items.append({
                        'item': 'Review and increase resource allocation',
                        'owner': 'Infrastructure Team',
                        'due_date': (datetime.now() + timedelta(days=21)).strftime('%Y-%m-%d'),
                        'priority': 'Medium'
                    })
                elif 'configuration' in cause.get('cause', '').lower():
                    action_items.append({
                        'item': 'Implement configuration validation and testing',
                        'owner': 'DevOps Team',
                        'due_date': (datetime.now() + timedelta(days=28)).strftime('%Y-%m-%d'),
                        'priority': 'Medium'
                    })
        except FileNotFoundError:
            pass
        
        return action_items
    
    def generate_report(self):
        """Generate the complete post-incident report"""
        metrics = self.calculate_metrics()
        timeline = self.extract_timeline()
        response_analysis = self.analyze_response_effectiveness()
        action_items = self.generate_action_items()
        
        report_template = Template('''
# Post-Incident Review - {{ incident_id }}

## Incident Summary
- **Incident ID**: {{ incident_id }}
- **Date**: {{ metrics.created_at }}
- **Duration**: {{ metrics.duration_minutes }} minutes ({{ metrics.duration_hours }} hours)
- **Severity**: {{ severity|title }}
- **Status**: {{ status|title }}
- **Services Affected**: {{ affected_services|join(', ') }}

## Timeline
| Time (UTC) | Event | Action Taken | Notes |
|------------|-------|--------------|-------|
{% for event in timeline -%}
| {{ event.time }} | {{ event.event }} | {{ event.action }} | {{ event.notes }} |
{% endfor %}

## Response Analysis
- **SLA Performance**: {{ response_analysis.performance }}
- **Target Resolution Time**: {{ response_analysis.target_resolution }} minutes
- **Actual Resolution Time**: {{ response_analysis.actual_resolution }} minutes
- **SLA Met**: {{ "Yes" if response_analysis.sla_met else "No" }}

## Root Cause Analysis
{% if investigation_available -%}
### Primary Root Causes
{% for cause in root_causes -%}
- **{{ cause.cause }}** (Likelihood: {{ cause.likelihood }})
  - {{ cause.description }}
{% endfor %}

### Contributing Factors
{% for symptom in symptoms -%}
- {{ symptom.description }}
{% endfor %}
{% else -%}
*Investigation report not available - manual root cause analysis required*
{% endif %}

## Action Items
| Action Item | Owner | Due Date | Priority |
|-------------|-------|----------|----------|
{% for item in action_items -%}
| {{ item.item }} | {{ item.owner }} | {{ item.due_date }} | {{ item.priority }} |
{% endfor %}

## Lessons Learned

### What Went Well
- Incident was detected and response initiated
- Escalation procedures were followed
- Service was restored to normal operation

### Areas for Improvement
- Review detection capabilities for faster identification
- Improve diagnostic tools and procedures
- Enhance monitoring and alerting

## Prevention Measures

### Immediate Actions (0-30 days)
{% for item in action_items -%}
{% if item.priority == 'High' -%}
- {{ item.item }} (Owner: {{ item.owner }}, Due: {{ item.due_date }})
{% endif -%}
{% endfor %}

### Short-term Actions (1-3 months)
{% for item in action_items -%}
{% if item.priority == 'Medium' -%}
- {{ item.item }} (Owner: {{ item.owner }}, Due: {{ item.due_date }})
{% endif -%}
{% endfor %}

## Communication Summary
- Internal stakeholders were notified via Slack and email
- External communication via status page (if applicable)
- Post-incident review scheduled and completed

---
*Report generated on {{ report_date }} by automated post-incident analysis*
        ''')
        
        # Load investigation data if available
        investigation_data = {}
        investigation_available = False
        try:
            with open(f'/tmp/investigation-report-{self.incident_id}.json', 'r') as f:
                investigation_data = json.load(f)
                investigation_available = True
        except FileNotFoundError:
            pass
        
        # Determine affected services from alerts
        affected_services = list(set(
            alert.get('service', 'unknown') 
            for alert in self.incident_data.get('alerts', [])
        ))
        
        report_content = report_template.render(
            incident_id=self.incident_id,
            metrics=metrics,
            severity=self.incident_data['severity'],
            status=self.incident_data.get('status', 'unknown'),
            affected_services=affected_services,
            timeline=timeline,
            response_analysis=response_analysis,
            investigation_available=investigation_available,
            root_causes=investigation_data.get('root_causes', []),
            symptoms=investigation_data.get('symptoms', []),
            action_items=action_items,
            report_date=datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')
        )
        
        return report_content
    
    def save_report(self, content):
        """Save report to file"""
        filename = f'/tmp/post-incident-report-{self.incident_id}.md'
        with open(filename, 'w') as f:
            f.write(content)
        return filename

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 generate-postincident-report.py <incident_id>")
        sys.exit(1)
    
    incident_id = sys.argv[1]
    generator = PostIncidentReportGenerator(incident_id)
    
    report_content = generator.generate_report()
    filename = generator.save_report(report_content)
    
    print(f"Post-incident report generated: {filename}")
    print("\nReport summary:")
    print(f"- Incident ID: {incident_id}")
    print(f"- Duration: {generator.calculate_metrics()['duration_minutes']} minutes")
    print(f"- Action items: {len(generator.generate_action_items())}")
```

This comprehensive incident management and disaster recovery guide provides the framework for handling incidents at all severity levels, ensuring rapid response, effective recovery, and continuous improvement of the Claude Development Portfolio's terminal system.