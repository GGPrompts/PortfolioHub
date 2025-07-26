# Capacity Planning & Scaling Guide

## Overview

This document provides comprehensive capacity planning and scaling strategies for the Claude Development Portfolio's standalone terminal system. It includes performance baselines, scaling triggers, resource planning, and automated scaling procedures for enterprise deployment.

## System Architecture for Scaling

### Current Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Load Balancer   │    │   Application    │    │   Data Layer    │
│ (Nginx/HAProxy) │    │     Tier         │    │                 │
│                 │    │                  │    │                 │
│ • SSL Termination│   │ • React Frontend │    │ • Redis Sessions│
│ • Rate Limiting │◄──►│ • Terminal Svc   │◄──►│ • File Storage  │
│ • Health Checks │    │ • WebSocket      │    │ • Logs/Metrics  │
│ • Sticky Sessions│   │   Bridge         │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Target Scaled Architecture
```
                    ┌─────────────────┐
                    │ Load Balancer   │
                    │ (HA Pair)       │
                    └─────────┬───────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼─────┐ ┌───────▼──────┐ ┌─────▼──────┐
    │ App Instance  │ │ App Instance │ │ App Instance│
    │    Node 1     │ │    Node 2    │ │    Node N   │
    │               │ │              │ │             │
    │ • Frontend    │ │ • Frontend   │ │ • Frontend  │
    │ • Terminal    │ │ • Terminal   │ │ • Terminal  │
    │ • WebSocket   │ │ • WebSocket  │ │ • WebSocket │
    └─────────┬─────┘ └──────┬───────┘ └─────┬───────┘
              │              │               │
              └──────────────┼───────────────┘
                             │
                    ┌────────▼────────┐
                    │  Shared Data    │
                    │     Layer       │
                    │                 │
                    │ • Redis Cluster │
                    │ • Shared Storage│
                    │ • Monitoring DB │
                    └─────────────────┘
```

## Performance Baselines

### 1. System Resource Baselines

#### Single Instance Baseline
```yaml
# baseline-single-instance.yml
system_specs:
  cpu_cores: 4
  memory_gb: 8
  storage_gb: 50
  network_mbps: 1000

performance_baseline:
  concurrent_users: 50
  concurrent_sessions: 100
  terminal_sessions_per_user: 2
  websocket_connections: 150
  requests_per_second: 1000
  response_time_p95: 200ms
  memory_usage_idle: 25%
  memory_usage_peak: 60%
  cpu_usage_idle: 10%
  cpu_usage_peak: 70%
  disk_io_read: 50MB/s
  disk_io_write: 30MB/s

resource_consumption:
  memory_per_session: 15MB
  memory_per_websocket: 2MB
  cpu_per_session: 0.5%
  disk_per_session: 10MB
  network_per_session: 50KB/s

limits:
  max_sessions_per_instance: 200
  max_websocket_connections: 500
  max_concurrent_commands: 100
  session_timeout: 30_minutes
  memory_limit_per_process: 2GB
```

#### Load Testing Results
```python
#!/usr/bin/env python3
# load-test-analysis.py

import json
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime

class LoadTestAnalysis:
    def __init__(self):
        self.baseline_data = self.load_baseline_data()
        
    def load_baseline_data(self):
        """Load baseline performance data"""
        return {
            'concurrent_users': [10, 25, 50, 75, 100, 150, 200, 250, 300],
            'response_time_ms': [120, 140, 180, 220, 280, 380, 520, 720, 1200],
            'cpu_usage_percent': [15, 25, 35, 50, 65, 75, 85, 95, 98],
            'memory_usage_percent': [30, 35, 45, 55, 65, 75, 85, 92, 95],
            'error_rate_percent': [0, 0, 0.1, 0.2, 0.5, 1.2, 3.5, 8.2, 15.8],
            'throughput_rps': [450, 850, 1200, 1400, 1550, 1600, 1550, 1300, 900]
        }
    
    def analyze_performance_curves(self):
        """Analyze performance degradation curves"""
        data = self.baseline_data
        
        # Find performance thresholds
        thresholds = {
            'optimal_users': self.find_optimal_capacity(data),
            'warning_users': self.find_warning_threshold(data),
            'critical_users': self.find_critical_threshold(data),
            'max_users': self.find_maximum_capacity(data)
        }
        
        return thresholds
    
    def find_optimal_capacity(self, data):
        """Find optimal capacity point (best throughput/response time ratio)"""
        users = data['concurrent_users']
        response_times = data['response_time_ms']
        throughput = data['throughput_rps']
        
        # Calculate efficiency ratio
        efficiency = [t / r for t, r in zip(throughput, response_times)]
        max_efficiency_idx = efficiency.index(max(efficiency))
        
        return users[max_efficiency_idx]
    
    def find_warning_threshold(self, data):
        """Find warning threshold (response time > 300ms or CPU > 80%)"""
        users = data['concurrent_users']
        response_times = data['response_time_ms']
        cpu_usage = data['cpu_usage_percent']
        
        for i, (rt, cpu) in enumerate(zip(response_times, cpu_usage)):
            if rt > 300 or cpu > 80:
                return users[i]
        
        return users[-1]
    
    def find_critical_threshold(self, data):
        """Find critical threshold (error rate > 1% or response time > 500ms)"""
        users = data['concurrent_users']
        response_times = data['response_time_ms']
        error_rates = data['error_rate_percent']
        
        for i, (rt, err) in enumerate(zip(response_times, error_rates)):
            if rt > 500 or err > 1:
                return users[i]
        
        return users[-1]
    
    def find_maximum_capacity(self, data):
        """Find maximum capacity (error rate > 5% or system failure)"""
        users = data['concurrent_users']
        error_rates = data['error_rate_percent']
        
        for i, err in enumerate(error_rates):
            if err > 5:
                return users[i]
        
        return users[-1]
    
    def generate_capacity_report(self):
        """Generate capacity planning report"""
        thresholds = self.analyze_performance_curves()
        
        report = f"""
# Capacity Analysis Report - {datetime.now().strftime('%Y-%m-%d')}

## Performance Thresholds
- **Optimal Capacity**: {thresholds['optimal_users']} concurrent users
- **Warning Threshold**: {thresholds['warning_users']} concurrent users  
- **Critical Threshold**: {thresholds['critical_users']} concurrent users
- **Maximum Capacity**: {thresholds['max_users']} concurrent users

## Scaling Recommendations
- **Scale Out Trigger**: {int(thresholds['warning_users'] * 0.8)} concurrent users
- **Scale In Trigger**: {int(thresholds['optimal_users'] * 0.6)} concurrent users
- **Emergency Scale**: {int(thresholds['critical_users'] * 0.9)} concurrent users

## Resource Requirements per Instance
- **Target Load**: {thresholds['optimal_users']} concurrent users
- **CPU**: 4 cores (peak 65% utilization)
- **Memory**: 8GB (peak 65% utilization)  
- **Network**: 100Mbps per instance
- **Storage**: 50GB + 10MB per active session

## Scaling Formula
```
Required_Instances = ceil(Total_Users / {thresholds['optimal_users']})
Buffer_Instances = max(1, Required_Instances * 0.2)
Total_Instances = Required_Instances + Buffer_Instances
```
        """
        
        return report

if __name__ == "__main__":
    analyzer = LoadTestAnalysis()
    report = analyzer.generate_capacity_report()
    
    with open('/tmp/capacity-analysis-report.md', 'w') as f:
        f.write(report)
    
    print("Capacity analysis report generated: /tmp/capacity-analysis-report.md")
```

### 2. Application-Specific Metrics

#### Terminal Session Metrics
```javascript
// terminal-session-metrics.js
class TerminalSessionMetrics {
    constructor() {
        this.metrics = {
            session_lifecycle: {
                average_creation_time: 150, // ms
                average_destruction_time: 50, // ms
                median_session_duration: 15 * 60 * 1000, // 15 minutes
                peak_concurrent_sessions: 180
            },
            resource_usage: {
                memory_per_session: 15 * 1024 * 1024, // 15MB
                cpu_per_session: 0.5, // 0.5% CPU
                network_per_session: 50 * 1024, // 50KB/s
                disk_per_session: 10 * 1024 * 1024 // 10MB
            },
            performance_benchmarks: {
                command_execution_p50: 45, // ms
                command_execution_p95: 150, // ms
                command_execution_p99: 300, // ms
                websocket_message_latency: 15, // ms
                terminal_render_time: 25 // ms
            },
            scaling_factors: {
                sessions_per_cpu_core: 50,
                sessions_per_gb_memory: 65,
                websockets_per_cpu_core: 125,
                max_sessions_per_process: 200
            }
        };
    }

    calculateCapacityRequirements(targetUsers, sessionsPerUser = 2) {
        const totalSessions = targetUsers * sessionsPerUser;
        const totalWebsockets = targetUsers; // One WebSocket per user
        
        const cpuCoresNeeded = Math.ceil(
            Math.max(
                totalSessions / this.metrics.scaling_factors.sessions_per_cpu_core,
                totalWebsockets / this.metrics.scaling_factors.websockets_per_cpu_core
            )
        );
        
        const memoryGbNeeded = Math.ceil(
            totalSessions / this.metrics.scaling_factors.sessions_per_gb_memory
        );
        
        const instancesNeeded = Math.ceil(
            totalSessions / this.metrics.scaling_factors.max_sessions_per_process
        );
        
        return {
            target_users: targetUsers,
            total_sessions: totalSessions,
            cpu_cores_needed: cpuCoresNeeded,
            memory_gb_needed: memoryGbNeeded,
            instances_needed: instancesNeeded,
            estimated_cost_per_hour: this.estimateCost(instancesNeeded)
        };
    }

    estimateCost(instances) {
        const costPerInstancePerHour = 0.50; // Example: $0.50/hour per instance
        return instances * costPerInstancePerHour;
    }

    generateCapacityPlan(userGrowthScenarios) {
        const capacityPlan = {};
        
        for (const [scenario, userCount] of Object.entries(userGrowthScenarios)) {
            capacityPlan[scenario] = this.calculateCapacityRequirements(userCount);
        }
        
        return capacityPlan;
    }
}

// Usage example
const metrics = new TerminalSessionMetrics();

const growthScenarios = {
    current: 100,
    growth_3_months: 250,
    growth_6_months: 500,
    growth_1_year: 1000,
    peak_load: 1500
};

const capacityPlan = metrics.generateCapacityPlan(growthScenarios);
console.log('Capacity Planning Results:', JSON.stringify(capacityPlan, null, 2));

module.exports = TerminalSessionMetrics;
```

## Scaling Triggers and Thresholds

### 1. Automated Scaling Triggers

```yaml
# scaling-triggers.yml
scaling_policies:
  scale_out_triggers:
    # CPU-based scaling
    cpu_threshold:
      metric: "cpu_usage_percent"
      threshold: 70
      duration: 300  # 5 minutes
      cooldown: 600  # 10 minutes
      scale_increment: 1
    
    # Memory-based scaling
    memory_threshold:
      metric: "memory_usage_percent" 
      threshold: 75
      duration: 300
      cooldown: 600
      scale_increment: 1
    
    # Session-based scaling
    session_threshold:
      metric: "active_terminal_sessions"
      threshold: 160  # 80% of 200 max
      duration: 180   # 3 minutes
      cooldown: 300   # 5 minutes
      scale_increment: 1
    
    # Response time-based scaling
    latency_threshold:
      metric: "response_time_p95"
      threshold: 300  # 300ms
      duration: 120   # 2 minutes
      cooldown: 600   # 10 minutes
      scale_increment: 1
    
    # Error rate-based scaling
    error_threshold:
      metric: "error_rate_percent"
      threshold: 2    # 2% error rate
      duration: 60    # 1 minute
      cooldown: 300   # 5 minutes
      scale_increment: 2  # Scale faster on errors

  scale_in_triggers:
    # Conservative scale-in to avoid thrashing
    resource_utilization:
      cpu_threshold: 30
      memory_threshold: 40
      session_threshold: 50  # 25% of max capacity
      duration: 900          # 15 minutes
      cooldown: 1800         # 30 minutes
      scale_decrement: 1
    
    # Time-based scale-in (off-peak hours)
    time_based:
      schedules:
        - time: "02:00"
          target_instances: 2
          min_instances: 1
        - time: "06:00" 
          target_instances: 4
          min_instances: 2

  scaling_limits:
    min_instances: 2
    max_instances: 20
    max_scale_out_per_hour: 10
    max_scale_in_per_hour: 5

health_checks:
  endpoint: "/health"
  interval: 30
  timeout: 10
  healthy_threshold: 2
  unhealthy_threshold: 3
  grace_period: 300  # 5 minutes for new instances
```

### 2. Scaling Decision Engine

```python
#!/usr/bin/env python3
# scaling-decision-engine.py

import json
import time
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
from dataclasses import dataclass
from enum import Enum

class ScalingAction(Enum):
    SCALE_OUT = "scale_out"
    SCALE_IN = "scale_in"
    NO_ACTION = "no_action"

@dataclass
class ScalingDecision:
    action: ScalingAction
    target_instances: int
    current_instances: int
    reason: str
    confidence: float
    metrics: Dict

class ScalingDecisionEngine:
    def __init__(self, config_file='scaling-triggers.yml'):
        self.config = self.load_config(config_file)
        self.current_instances = self.get_current_instances()
        self.last_scaling_action = None
        self.scaling_history = []
        
    def load_config(self, config_file):
        """Load scaling configuration"""
        # In real implementation, this would load from YAML
        return {
            'scale_out_triggers': {
                'cpu_threshold': {'threshold': 70, 'duration': 300, 'cooldown': 600},
                'memory_threshold': {'threshold': 75, 'duration': 300, 'cooldown': 600},
                'session_threshold': {'threshold': 160, 'duration': 180, 'cooldown': 300},
                'latency_threshold': {'threshold': 300, 'duration': 120, 'cooldown': 600},
                'error_threshold': {'threshold': 2, 'duration': 60, 'cooldown': 300}
            },
            'scale_in_triggers': {
                'resource_utilization': {
                    'cpu_threshold': 30,
                    'memory_threshold': 40,
                    'session_threshold': 50,
                    'duration': 900,
                    'cooldown': 1800
                }
            },
            'scaling_limits': {
                'min_instances': 2,
                'max_instances': 20,
                'max_scale_out_per_hour': 10,
                'max_scale_in_per_hour': 5
            }
        }
    
    def get_current_instances(self):
        """Get current number of running instances"""
        try:
            # This would integrate with your orchestration platform
            # (Kubernetes, Docker Swarm, AWS Auto Scaling, etc.)
            response = requests.get('http://localhost:8080/api/instances')
            return response.json().get('count', 2)
        except:
            return 2  # Default fallback
    
    def collect_metrics(self) -> Dict:
        """Collect current system metrics"""
        metrics = {}
        
        try:
            # Collect from monitoring endpoints
            prometheus_response = requests.get('http://localhost:9090/api/v1/query', 
                params={'query': 'claude_system_metrics'})
            
            # Parse metrics (simplified example)
            metrics = {
                'cpu_usage_percent': 65.0,
                'memory_usage_percent': 70.0,
                'active_terminal_sessions': 145,
                'response_time_p95': 250.0,
                'error_rate_percent': 0.5,
                'websocket_connections': 95,
                'requests_per_second': 850,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error collecting metrics: {e}")
            # Return safe default metrics
            metrics = {
                'cpu_usage_percent': 50.0,
                'memory_usage_percent': 60.0,
                'active_terminal_sessions': 100,
                'response_time_p95': 200.0,
                'error_rate_percent': 0.1,
                'websocket_connections': 75,
                'requests_per_second': 500,
                'timestamp': datetime.now().isoformat()
            }
        
        return metrics
    
    def evaluate_scale_out_conditions(self, metrics: Dict) -> Tuple[bool, str, float]:
        """Evaluate if scale-out is needed"""
        triggers = self.config['scale_out_triggers']
        triggered_conditions = []
        
        # CPU threshold
        if metrics['cpu_usage_percent'] > triggers['cpu_threshold']['threshold']:
            triggered_conditions.append(
                ('cpu', metrics['cpu_usage_percent'], triggers['cpu_threshold']['threshold'])
            )
        
        # Memory threshold
        if metrics['memory_usage_percent'] > triggers['memory_threshold']['threshold']:
            triggered_conditions.append(
                ('memory', metrics['memory_usage_percent'], triggers['memory_threshold']['threshold'])
            )
        
        # Session threshold
        if metrics['active_terminal_sessions'] > triggers['session_threshold']['threshold']:
            triggered_conditions.append(
                ('sessions', metrics['active_terminal_sessions'], triggers['session_threshold']['threshold'])
            )
        
        # Latency threshold
        if metrics['response_time_p95'] > triggers['latency_threshold']['threshold']:
            triggered_conditions.append(
                ('latency', metrics['response_time_p95'], triggers['latency_threshold']['threshold'])
            )
        
        # Error rate threshold
        if metrics['error_rate_percent'] > triggers['error_threshold']['threshold']:
            triggered_conditions.append(
                ('errors', metrics['error_rate_percent'], triggers['error_threshold']['threshold'])
            )
        
        if triggered_conditions:
            # Calculate confidence based on how many thresholds are exceeded
            confidence = min(1.0, len(triggered_conditions) * 0.3 + 0.4)
            reason = f"Scale-out triggered by: {', '.join([f'{c[0]} ({c[1]:.1f} > {c[2]})' for c in triggered_conditions])}"
            return True, reason, confidence
        
        return False, "No scale-out conditions met", 0.0
    
    def evaluate_scale_in_conditions(self, metrics: Dict) -> Tuple[bool, str, float]:
        """Evaluate if scale-in is possible"""
        if self.current_instances <= self.config['scaling_limits']['min_instances']:
            return False, "Already at minimum instances", 0.0
        
        triggers = self.config['scale_in_triggers']['resource_utilization']
        
        conditions_met = []
        
        # All conditions must be met for scale-in
        if metrics['cpu_usage_percent'] < triggers['cpu_threshold']:
            conditions_met.append('cpu')
        
        if metrics['memory_usage_percent'] < triggers['memory_threshold']:
            conditions_met.append('memory')
        
        if metrics['active_terminal_sessions'] < triggers['session_threshold']:
            conditions_met.append('sessions')
        
        # All conditions must be met
        if len(conditions_met) == 3:
            confidence = 0.7  # Conservative confidence for scale-in
            reason = f"Scale-in possible: CPU {metrics['cpu_usage_percent']:.1f}%, Memory {metrics['memory_usage_percent']:.1f}%, Sessions {metrics['active_terminal_sessions']}"
            return True, reason, confidence
        
        return False, f"Scale-in conditions not met (only {len(conditions_met)}/3 conditions satisfied)", 0.0
    
    def check_cooldown_period(self, action: ScalingAction) -> bool:
        """Check if enough time has passed since last scaling action"""
        if not self.last_scaling_action:
            return True
        
        last_action_time = self.last_scaling_action['timestamp']
        time_since_last = datetime.now() - last_action_time
        
        if action == ScalingAction.SCALE_OUT:
            cooldown = timedelta(seconds=self.config['scale_out_triggers']['cpu_threshold']['cooldown'])
        else:
            cooldown = timedelta(seconds=self.config['scale_in_triggers']['resource_utilization']['cooldown'])
        
        return time_since_last >= cooldown
    
    def calculate_target_instances(self, metrics: Dict, action: ScalingAction) -> int:
        """Calculate target number of instances"""
        current = self.current_instances
        limits = self.config['scaling_limits']
        
        if action == ScalingAction.SCALE_OUT:
            # Calculate instances needed based on current load
            cpu_instances = max(1, int(metrics['cpu_usage_percent'] / 60))  # Target 60% CPU
            memory_instances = max(1, int(metrics['memory_usage_percent'] / 65))  # Target 65% memory
            session_instances = max(1, int(metrics['active_terminal_sessions'] / 120))  # Target 120 sessions per instance
            
            # Use the highest requirement
            needed_instances = max(cpu_instances, memory_instances, session_instances)
            target = min(needed_instances, current + 2, limits['max_instances'])  # Scale by max 2 at a time
            
        else:  # SCALE_IN
            # Conservative scale-in - remove one instance at a time
            target = max(current - 1, limits['min_instances'])
        
        return target
    
    def check_scaling_rate_limits(self, action: ScalingAction) -> bool:
        """Check if we're within scaling rate limits"""
        current_hour = datetime.now().replace(minute=0, second=0, microsecond=0)
        
        # Count scaling actions in the last hour
        recent_actions = [
            h for h in self.scaling_history 
            if h['timestamp'] >= current_hour and h['action'] == action.value
        ]
        
        if action == ScalingAction.SCALE_OUT:
            return len(recent_actions) < self.config['scaling_limits']['max_scale_out_per_hour']
        else:
            return len(recent_actions) < self.config['scaling_limits']['max_scale_in_per_hour']
    
    def make_scaling_decision(self) -> ScalingDecision:
        """Make scaling decision based on current metrics"""
        metrics = self.collect_metrics()
        
        # Evaluate scale-out conditions first (higher priority)
        scale_out_needed, scale_out_reason, scale_out_confidence = self.evaluate_scale_out_conditions(metrics)
        
        if scale_out_needed:
            if not self.check_cooldown_period(ScalingAction.SCALE_OUT):
                return ScalingDecision(
                    action=ScalingAction.NO_ACTION,
                    target_instances=self.current_instances,
                    current_instances=self.current_instances,
                    reason="Scale-out needed but in cooldown period",
                    confidence=0.0,
                    metrics=metrics
                )
            
            if not self.check_scaling_rate_limits(ScalingAction.SCALE_OUT):
                return ScalingDecision(
                    action=ScalingAction.NO_ACTION,
                    target_instances=self.current_instances,
                    current_instances=self.current_instances,
                    reason="Scale-out rate limit exceeded",
                    confidence=0.0,
                    metrics=metrics
                )
            
            target_instances = self.calculate_target_instances(metrics, ScalingAction.SCALE_OUT)
            
            return ScalingDecision(
                action=ScalingAction.SCALE_OUT,
                target_instances=target_instances,
                current_instances=self.current_instances,
                reason=scale_out_reason,
                confidence=scale_out_confidence,
                metrics=metrics
            )
        
        # Evaluate scale-in conditions
        scale_in_possible, scale_in_reason, scale_in_confidence = self.evaluate_scale_in_conditions(metrics)
        
        if scale_in_possible:
            if not self.check_cooldown_period(ScalingAction.SCALE_IN):
                return ScalingDecision(
                    action=ScalingAction.NO_ACTION,
                    target_instances=self.current_instances,
                    current_instances=self.current_instances,
                    reason="Scale-in possible but in cooldown period",
                    confidence=0.0,
                    metrics=metrics
                )
            
            if not self.check_scaling_rate_limits(ScalingAction.SCALE_IN):
                return ScalingDecision(
                    action=ScalingAction.NO_ACTION,
                    target_instances=self.current_instances,
                    current_instances=self.current_instances,
                    reason="Scale-in rate limit exceeded",
                    confidence=0.0,
                    metrics=metrics
                )
            
            target_instances = self.calculate_target_instances(metrics, ScalingAction.SCALE_IN)
            
            return ScalingDecision(
                action=ScalingAction.SCALE_IN,
                target_instances=target_instances,
                current_instances=self.current_instances,
                reason=scale_in_reason,
                confidence=scale_in_confidence,
                metrics=metrics
            )
        
        # No scaling needed
        return ScalingDecision(
            action=ScalingAction.NO_ACTION,
            target_instances=self.current_instances,
            current_instances=self.current_instances,
            reason="System within normal operating parameters",
            confidence=1.0,
            metrics=metrics
        )
    
    def execute_scaling_decision(self, decision: ScalingDecision) -> bool:
        """Execute the scaling decision"""
        if decision.action == ScalingAction.NO_ACTION:
            return True
        
        try:
            # This would integrate with your orchestration platform
            scaling_api_url = f"http://localhost:8080/api/scaling"
            
            payload = {
                'action': decision.action.value,
                'target_instances': decision.target_instances,
                'reason': decision.reason,
                'timestamp': datetime.now().isoformat()
            }
            
            response = requests.post(scaling_api_url, json=payload, timeout=30)
            
            if response.status_code == 200:
                # Record successful scaling action
                self.last_scaling_action = {
                    'action': decision.action.value,
                    'target_instances': decision.target_instances,
                    'timestamp': datetime.now(),
                    'reason': decision.reason
                }
                
                self.scaling_history.append(self.last_scaling_action)
                
                # Keep only last 24 hours of history
                cutoff_time = datetime.now() - timedelta(hours=24)
                self.scaling_history = [
                    h for h in self.scaling_history 
                    if h['timestamp'] >= cutoff_time
                ]
                
                print(f"✅ Scaling action executed: {decision.action.value} to {decision.target_instances} instances")
                return True
            else:
                print(f"❌ Scaling action failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error executing scaling action: {e}")
            return False
    
    def run_scaling_loop(self, interval=30):
        """Run continuous scaling decision loop"""
        print("Starting scaling decision engine...")
        
        while True:
            try:
                decision = self.make_scaling_decision()
                
                print(f"Scaling Decision: {decision.action.value}")
                print(f"Current/Target Instances: {decision.current_instances}/{decision.target_instances}")
                print(f"Reason: {decision.reason}")
                print(f"Confidence: {decision.confidence:.2f}")
                
                if decision.action != ScalingAction.NO_ACTION:
                    success = self.execute_scaling_decision(decision)
                    if success:
                        self.current_instances = decision.target_instances
                
                time.sleep(interval)
                
            except KeyboardInterrupt:
                print("Scaling engine stopped")
                break
            except Exception as e:
                print(f"Error in scaling loop: {e}")
                time.sleep(interval)

if __name__ == "__main__":
    engine = ScalingDecisionEngine()
    engine.run_scaling_loop()
```

## Resource Planning

### 1. Growth Projection Models

```python
#!/usr/bin/env python3
# growth-projection-models.py

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
import json

class GrowthProjectionModel:
    def __init__(self):
        self.historical_data = self.load_historical_data()
        self.growth_scenarios = self.define_growth_scenarios()
        
    def load_historical_data(self):
        """Load historical usage data"""
        # In production, this would load from your metrics database
        dates = pd.date_range(start='2024-01-01', end='2024-12-31', freq='D')
        
        # Simulate historical growth with some seasonality
        base_users = 50
        growth_rate = 0.008  # ~0.8% daily growth
        seasonal_factor = np.sin(np.arange(len(dates)) * 2 * np.pi / 365) * 0.2
        noise = np.random.normal(0, 0.1, len(dates))
        
        users = []
        for i, date in enumerate(dates):
            daily_users = base_users * (1 + growth_rate) ** i
            daily_users *= (1 + seasonal_factor[i] + noise[i])
            users.append(max(1, int(daily_users)))
        
        return pd.DataFrame({
            'date': dates,
            'daily_active_users': users,
            'concurrent_users': [u * 0.15 for u in users],  # 15% concurrency
            'terminal_sessions': [u * 0.3 for u in users],  # 30% use terminals
            'cpu_usage': [min(95, max(10, u * 0.4)) for u in users],
            'memory_usage': [min(90, max(20, u * 0.35)) for u in users]
        })
    
    def define_growth_scenarios(self):
        """Define different growth scenarios"""
        return {
            'conservative': {
                'monthly_growth_rate': 0.15,  # 15% monthly growth
                'description': 'Steady organic growth',
                'factors': ['word_of_mouth', 'feature_improvements']
            },
            'moderate': {
                'monthly_growth_rate': 0.25,  # 25% monthly growth
                'description': 'Marketing campaign success',
                'factors': ['marketing_campaigns', 'partnership_growth']
            },
            'aggressive': {
                'monthly_growth_rate': 0.40,  # 40% monthly growth
                'description': 'Viral adoption or major announcement',
                'factors': ['viral_growth', 'major_feature_launch', 'media_coverage']
            },
            'hockey_stick': {
                'monthly_growth_rate': 0.60,  # 60% monthly growth
                'description': 'Explosive growth phase',
                'factors': ['product_market_fit', 'network_effects', 'viral_coefficient']
            }
        }
    
    def project_linear_growth(self, months_ahead=12):
        """Project growth using linear regression"""
        df = self.historical_data.copy()
        df['days_since_start'] = (df['date'] - df['date'].min()).dt.days
        
        # Fit linear model
        X = df[['days_since_start']]
        y = df['daily_active_users']
        
        model = LinearRegression()
        model.fit(X, y)
        
        # Project future
        last_day = df['days_since_start'].max()
        future_days = np.arange(last_day + 1, last_day + 1 + (months_ahead * 30))
        future_predictions = model.predict(future_days.reshape(-1, 1))
        
        return {
            'model': 'linear',
            'r_squared': model.score(X, y),
            'predictions': future_predictions.tolist(),
            'dates': [(df['date'].max() + timedelta(days=int(d-last_day))).isoformat() 
                     for d in future_days]
        }
    
    def project_polynomial_growth(self, months_ahead=12, degree=2):
        """Project growth using polynomial regression"""
        df = self.historical_data.copy()
        df['days_since_start'] = (df['date'] - df['date'].min()).dt.days
        
        # Fit polynomial model
        X = df[['days_since_start']]
        y = df['daily_active_users']
        
        poly_features = PolynomialFeatures(degree=degree)
        X_poly = poly_features.fit_transform(X)
        
        model = LinearRegression()
        model.fit(X_poly, y)
        
        # Project future
        last_day = df['days_since_start'].max()
        future_days = np.arange(last_day + 1, last_day + 1 + (months_ahead * 30))
        future_X_poly = poly_features.transform(future_days.reshape(-1, 1))
        future_predictions = model.predict(future_X_poly)
        
        return {
            'model': f'polynomial_degree_{degree}',
            'r_squared': model.score(X_poly, y),
            'predictions': future_predictions.tolist(),
            'dates': [(df['date'].max() + timedelta(days=int(d-last_day))).isoformat() 
                     for d in future_days]
        }
    
    def project_scenario_growth(self, scenario, months_ahead=12):
        """Project growth based on defined scenarios"""
        if scenario not in self.growth_scenarios:
            raise ValueError(f"Unknown scenario: {scenario}")
        
        config = self.growth_scenarios[scenario]
        monthly_rate = config['monthly_growth_rate']
        
        current_users = self.historical_data['daily_active_users'].iloc[-1]
        projections = []
        dates = []
        
        for month in range(months_ahead):
            # Calculate users for this month
            users_this_month = current_users * (1 + monthly_rate) ** month
            
            # Add some randomness to make it more realistic
            variance = users_this_month * 0.1  # 10% variance
            users_this_month += np.random.normal(0, variance)
            users_this_month = max(current_users, int(users_this_month))
            
            projections.append(users_this_month)
            
            # Calculate date (approximate month)
            future_date = self.historical_data['date'].max() + timedelta(days=30 * (month + 1))
            dates.append(future_date.isoformat())
        
        return {
            'model': f'scenario_{scenario}',
            'scenario_config': config,
            'monthly_growth_rate': monthly_rate,
            'predictions': projections,
            'dates': dates
        }
    
    def calculate_resource_requirements(self, user_projections):
        """Calculate infrastructure requirements based on user projections"""
        requirements = []
        
        for users in user_projections:
            # Calculate derived metrics
            concurrent_users = int(users * 0.15)  # 15% concurrency
            terminal_sessions = int(users * 0.3)   # 30% use terminals
            websocket_connections = concurrent_users
            
            # Calculate resource requirements
            # Based on baseline: 50 users per instance at optimal performance
            instances_needed = max(2, int(np.ceil(concurrent_users / 50)))
            
            # Resource calculations per instance
            cpu_cores_per_instance = 4
            memory_gb_per_instance = 8
            storage_gb_per_instance = 50
            
            total_cpu_cores = instances_needed * cpu_cores_per_instance
            total_memory_gb = instances_needed * memory_gb_per_instance
            total_storage_gb = instances_needed * storage_gb_per_instance
            
            # Add buffer for scaling and redundancy
            total_cpu_cores = int(total_cpu_cores * 1.3)  # 30% buffer
            total_memory_gb = int(total_memory_gb * 1.3)
            total_storage_gb = int(total_storage_gb * 1.2)  # 20% buffer
            
            # Cost estimation (example pricing)
            cost_per_cpu_core_hour = 0.05
            cost_per_gb_memory_hour = 0.01
            cost_per_gb_storage_month = 0.10
            
            monthly_cost = (
                total_cpu_cores * cost_per_cpu_core_hour * 24 * 30 +
                total_memory_gb * cost_per_gb_memory_hour * 24 * 30 +
                total_storage_gb * cost_per_gb_storage_month
            )
            
            requirements.append({
                'daily_active_users': users,
                'concurrent_users': concurrent_users,
                'terminal_sessions': terminal_sessions,
                'websocket_connections': websocket_connections,
                'instances_needed': instances_needed,
                'total_cpu_cores': total_cpu_cores,
                'total_memory_gb': total_memory_gb,
                'total_storage_gb': total_storage_gb,
                'estimated_monthly_cost_usd': round(monthly_cost, 2)
            })
        
        return requirements
    
    def generate_capacity_plan(self, months_ahead=12):
        """Generate comprehensive capacity plan"""
        plan = {
            'generated_at': datetime.now().isoformat(),
            'projection_period_months': months_ahead,
            'scenarios': {}
        }
        
        # Generate projections for each scenario
        for scenario_name in self.growth_scenarios.keys():
            projection = self.project_scenario_growth(scenario_name, months_ahead)
            requirements = self.calculate_resource_requirements(projection['predictions'])
            
            plan['scenarios'][scenario_name] = {
                'description': self.growth_scenarios[scenario_name]['description'],
                'growth_rate': self.growth_scenarios[scenario_name]['monthly_growth_rate'],
                'projections': [
                    {
                        'date': date,
                        'users': pred,
                        'resources': req
                    }
                    for date, pred, req in zip(projection['dates'], projection['predictions'], requirements)
                ]
            }
        
        # Add baseline projections
        linear_projection = self.project_linear_growth(months_ahead)
        linear_requirements = self.calculate_resource_requirements(linear_projection['predictions'])
        
        plan['baseline'] = {
            'model': 'linear_regression',
            'r_squared': linear_projection['r_squared'],
            'projections': [
                {
                    'date': date,
                    'users': pred,
                    'resources': req
                }
                for date, pred, req in zip(linear_projection['dates'], linear_projection['predictions'], linear_requirements)
            ]
        }
        
        return plan
    
    def generate_summary_report(self, capacity_plan):
        """Generate executive summary report"""
        scenarios = capacity_plan['scenarios']
        
        # Calculate ranges across scenarios
        month_6_costs = [s['projections'][5]['resources']['estimated_monthly_cost_usd'] for s in scenarios.values()]
        month_12_costs = [s['projections'][11]['resources']['estimated_monthly_cost_usd'] for s in scenarios.values()]
        
        month_6_instances = [s['projections'][5]['resources']['instances_needed'] for s in scenarios.values()]
        month_12_instances = [s['projections'][11]['resources']['instances_needed'] for s in scenarios.values()]
        
        summary = f"""
# Infrastructure Capacity Planning Summary

## Executive Summary
Based on historical usage patterns and growth scenarios, we project the following infrastructure requirements:

### 6-Month Projections
- **Instance Range**: {min(month_6_instances)} - {max(month_6_instances)} instances
- **Cost Range**: ${min(month_6_costs):,.2f} - ${max(month_6_costs):,.2f} per month
- **Most Likely**: {scenarios['moderate']['projections'][5]['resources']['instances_needed']} instances (${scenarios['moderate']['projections'][5]['resources']['estimated_monthly_cost_usd']:,.2f}/month)

### 12-Month Projections  
- **Instance Range**: {min(month_12_instances)} - {max(month_12_instances)} instances
- **Cost Range**: ${min(month_12_costs):,.2f} - ${max(month_12_costs):,.2f} per month
- **Most Likely**: {scenarios['moderate']['projections'][11]['resources']['instances_needed']} instances (${scenarios['moderate']['projections'][11]['resources']['estimated_monthly_cost_usd']:,.2f}/month)

## Scenario Analysis
### Conservative Growth (15% monthly)
- Steady organic growth through word-of-mouth and feature improvements
- 12-month cost: ${scenarios['conservative']['projections'][11]['resources']['estimated_monthly_cost_usd']:,.2f}/month

### Moderate Growth (25% monthly) - RECOMMENDED PLANNING BASIS
- Successful marketing campaigns and partnership development
- 12-month cost: ${scenarios['moderate']['projections'][11]['resources']['estimated_monthly_cost_usd']:,.2f}/month

### Aggressive Growth (40% monthly)
- Viral adoption or major product announcement
- 12-month cost: ${scenarios['aggressive']['projections'][11]['resources']['estimated_monthly_cost_usd']:,.2f}/month

### Hockey Stick Growth (60% monthly)
- Product-market fit achieved with network effects
- 12-month cost: ${scenarios['hockey_stick']['projections'][11]['resources']['estimated_monthly_cost_usd']:,.2f}/month

## Recommendations
1. **Plan for Moderate Growth**: Use the moderate scenario as the baseline for capacity planning
2. **Build Auto-Scaling**: Implement auto-scaling to handle unexpected growth spurts
3. **Budget Range**: Budget ${min(month_12_costs):,.2f} - ${max(month_12_costs):,.2f}/month for infrastructure
4. **Quarterly Reviews**: Review and update projections quarterly based on actual growth
5. **Scale-Out Architecture**: Ensure architecture supports horizontal scaling to {max(month_12_instances)} instances

## Action Items
- [ ] Implement auto-scaling policies by end of Q1
- [ ] Establish monitoring for early growth detection
- [ ] Review pricing and cost optimization quarterly
- [ ] Test scaling procedures to {max(month_12_instances)} instances
- [ ] Plan for potential budget increases if aggressive growth materializes
        """
        
        return summary

if __name__ == "__main__":
    model = GrowthProjectionModel()
    capacity_plan = model.generate_capacity_plan(12)
    
    # Save detailed plan
    with open('/tmp/capacity-plan-detailed.json', 'w') as f:
        json.dump(capacity_plan, f, indent=2)
    
    # Generate and save summary report
    summary = model.generate_summary_report(capacity_plan)
    with open('/tmp/capacity-plan-summary.md', 'w') as f:
        f.write(summary)
    
    print("Capacity planning analysis completed:")
    print("- Detailed plan: /tmp/capacity-plan-detailed.json")
    print("- Executive summary: /tmp/capacity-plan-summary.md")
```

### 2. Cost Optimization Strategies

```bash
#!/bin/bash
# cost-optimization.sh

echo "=== Cost Optimization Analysis - $(date) ==="

# 1. Right-sizing analysis
echo "1. Instance Right-sizing Analysis:"

# Check current resource utilization
CURRENT_CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
CURRENT_MEMORY=$(free | awk '/Mem:/ {printf "%.1f", $3/$2 * 100.0}')
CURRENT_INSTANCES=$(curl -s http://localhost:8080/api/instances | jq -r '.count // 2')

echo "   Current utilization:"
echo "   - CPU: ${CURRENT_CPU}%"
echo "   - Memory: ${CURRENT_MEMORY}%"
echo "   - Instances: ${CURRENT_INSTANCES}"

# Calculate optimal instance count
OPTIMAL_CPU_INSTANCES=$(echo "scale=0; ($CURRENT_INSTANCES * $CURRENT_CPU) / 65" | bc)
OPTIMAL_MEMORY_INSTANCES=$(echo "scale=0; ($CURRENT_INSTANCES * $CURRENT_MEMORY) / 70" | bc)
OPTIMAL_INSTANCES=$(echo "$OPTIMAL_CPU_INSTANCES $OPTIMAL_MEMORY_INSTANCES" | tr ' ' '\n' | sort -nr | head -1)

if [ "$OPTIMAL_INSTANCES" -lt "$CURRENT_INSTANCES" ]; then
    POTENTIAL_SAVINGS=$(echo "scale=2; ($CURRENT_INSTANCES - $OPTIMAL_INSTANCES) * 720 * 0.50" | bc)
    echo "   💰 Right-sizing opportunity: Reduce to $OPTIMAL_INSTANCES instances"
    echo "   💰 Potential monthly savings: \$${POTENTIAL_SAVINGS}"
else
    echo "   ✅ Instances are appropriately sized"
fi

# 2. Reserved instance analysis
echo "2. Reserved Instance Analysis:"

CURRENT_MONTHLY_COST=$(echo "$CURRENT_INSTANCES * 720 * 0.50" | bc)
RESERVED_MONTHLY_COST=$(echo "$CURRENT_INSTANCES * 720 * 0.35" | bc)
RESERVED_SAVINGS=$(echo "$CURRENT_MONTHLY_COST - $RESERVED_MONTHLY_COST" | bc)

echo "   On-demand cost: \$${CURRENT_MONTHLY_COST}/month"
echo "   Reserved cost: \$${RESERVED_MONTHLY_COST}/month"
echo "   💰 Potential savings: \$${RESERVED_SAVINGS}/month (30% discount)"

# 3. Spot instance analysis
echo "3. Spot Instance Analysis:"

# Check if workload is suitable for spot instances
SPOT_SUITABILITY="high"  # This would be determined by workload analysis

if [ "$SPOT_SUITABILITY" = "high" ]; then
    SPOT_MONTHLY_COST=$(echo "$CURRENT_INSTANCES * 720 * 0.20" | bc)
    SPOT_SAVINGS=$(echo "$CURRENT_MONTHLY_COST - $SPOT_MONTHLY_COST" | bc)
    echo "   Spot instance cost: \$${SPOT_MONTHLY_COST}/month"
    echo "   💰 Potential savings: \$${SPOT_SAVINGS}/month (60% discount)"
    echo "   ⚠️  Requires fault-tolerant architecture"
else
    echo "   ❌ Workload not suitable for spot instances"
fi

# 4. Auto-scaling optimization
echo "4. Auto-scaling Optimization:"

# Analyze historical scaling patterns
SCALE_OUT_EVENTS=$(grep -c "scale_out" /var/log/scaling.log 2>/dev/null || echo "0")
SCALE_IN_EVENTS=$(grep -c "scale_in" /var/log/scaling.log 2>/dev/null || echo "0")

echo "   Recent scaling events (30 days):"
echo "   - Scale-out: $SCALE_OUT_EVENTS"
echo "   - Scale-in: $SCALE_IN_EVENTS"

if [ "$SCALE_OUT_EVENTS" -gt "$SCALE_IN_EVENTS" ]; then
    echo "   💡 Consider more aggressive scale-in policies"
elif [ "$SCALE_IN_EVENTS" -gt "$SCALE_OUT_EVENTS" ]; then
    echo "   💡 Consider more conservative scale-out policies"
else
    echo "   ✅ Scaling patterns appear balanced"
fi

# 5. Storage optimization
echo "5. Storage Optimization:"

STORAGE_USAGE=$(df -h /opt/claude-portfolio | awk 'NR==2 {print $5}' | sed 's/%//')
STORAGE_TOTAL=$(df -h /opt/claude-portfolio | awk 'NR==2 {print $2}')

echo "   Storage usage: ${STORAGE_USAGE}% of ${STORAGE_TOTAL}"

if [ "$STORAGE_USAGE" -lt 50 ]; then
    echo "   💰 Consider smaller storage volumes"
elif [ "$STORAGE_USAGE" -gt 80 ]; then
    echo "   ⚠️  Consider larger storage or cleanup policies"
else
    echo "   ✅ Storage utilization is appropriate"
fi

# 6. Network optimization
echo "6. Network Optimization:"

# Check for data transfer patterns
NETWORK_USAGE=$(cat /proc/net/dev | awk '/eth0/ {print $2}' | head -1)
echo "   Network bytes received: $NETWORK_USAGE"

# Suggest CDN if high outbound traffic
if [ "$NETWORK_USAGE" -gt 1000000000 ]; then  # 1GB
    echo "   💡 Consider CDN for static content delivery"
else
    echo "   ✅ Network usage is reasonable"
fi

# 7. Generate optimization recommendations
echo "7. Cost Optimization Recommendations:"

cat > /tmp/cost-optimization-report.md << EOF
# Cost Optimization Report - $(date)

## Current State
- **Instances**: $CURRENT_INSTANCES
- **Monthly Cost**: \$${CURRENT_MONTHLY_COST}
- **CPU Utilization**: ${CURRENT_CPU}%
- **Memory Utilization**: ${CURRENT_MEMORY}%

## Optimization Opportunities

### 1. Right-sizing (Immediate)
- **Action**: Optimize instance count based on utilization
- **Potential Savings**: \$${POTENTIAL_SAVINGS}/month
- **Risk**: Low
- **Effort**: Medium

### 2. Reserved Instances (Short-term)
- **Action**: Convert stable workloads to reserved instances
- **Potential Savings**: \$${RESERVED_SAVINGS}/month
- **Risk**: Medium (capacity commitment)
- **Effort**: Low

### 3. Spot Instances (Medium-term)
- **Action**: Use spot instances for fault-tolerant components
- **Potential Savings**: \$${SPOT_SAVINGS}/month
- **Risk**: High (interruption risk)
- **Effort**: High (architecture changes)

### 4. Auto-scaling Tuning (Ongoing)
- **Action**: Optimize scaling policies based on usage patterns
- **Potential Savings**: 10-20% of compute costs
- **Risk**: Low
- **Effort**: Medium

## Implementation Roadmap

### Phase 1 (0-30 days)
- [ ] Implement right-sizing recommendations
- [ ] Review and optimize auto-scaling policies
- [ ] Clean up unused storage and resources

### Phase 2 (1-3 months)
- [ ] Evaluate reserved instance purchases
- [ ] Implement advanced monitoring for cost tracking
- [ ] Set up budget alerts and cost anomaly detection

### Phase 3 (3-6 months)
- [ ] Architect fault-tolerant components for spot instances
- [ ] Implement multi-region deployment for better pricing
- [ ] Evaluate alternative cloud providers for best pricing

## Expected Total Savings
- **Conservative**: \$${RESERVED_SAVINGS}/month ($(echo "scale=1; $RESERVED_SAVINGS * 100 / $CURRENT_MONTHLY_COST" | bc)% reduction)
- **Aggressive**: \$$(echo "$RESERVED_SAVINGS + $SPOT_SAVINGS" | bc)/month ($(echo "scale=1; ($RESERVED_SAVINGS + $SPOT_SAVINGS) * 100 / $CURRENT_MONTHLY_COST" | bc)% reduction)

EOF

echo "   📊 Detailed report saved: /tmp/cost-optimization-report.md"

# 8. Set up cost monitoring alerts
echo "8. Setting up cost monitoring:"

# Create budget alert script
cat > /opt/claude-portfolio/scripts/budget-alert.sh << 'EOF'
#!/bin/bash

MONTHLY_BUDGET=5000  # $5000 monthly budget
CURRENT_SPEND=$(curl -s http://localhost:8080/api/billing/current-month | jq -r '.amount // 0')
BUDGET_PERCENT=$(echo "scale=1; $CURRENT_SPEND * 100 / $MONTHLY_BUDGET" | bc)

if (( $(echo "$BUDGET_PERCENT > 80" | bc -l) )); then
    # Send alert
    curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
         -H "Content-Type: application/json" \
         -d "{
             \"text\": \"💰 Budget Alert: Current spend is ${BUDGET_PERCENT}% of monthly budget (\$${CURRENT_SPEND}/\$${MONTHLY_BUDGET})\",
             \"color\": \"warning\"
         }"
fi
EOF

chmod +x /opt/claude-portfolio/scripts/budget-alert.sh

# Add to cron for daily monitoring
(crontab -l 2>/dev/null; echo "0 9 * * * /opt/claude-portfolio/scripts/budget-alert.sh") | crontab -

echo "   ✅ Budget monitoring alerts configured"

echo "=== Cost optimization analysis completed ==="
```

This comprehensive capacity planning and scaling guide provides the foundation for managing the Claude Development Portfolio's terminal system at enterprise scale, ensuring optimal performance while controlling costs through intelligent scaling and resource optimization strategies.