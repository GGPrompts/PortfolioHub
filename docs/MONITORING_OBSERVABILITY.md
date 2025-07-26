# Monitoring & Observability Strategy

## Overview

This document outlines a comprehensive monitoring and observability strategy for the Claude Development Portfolio's standalone terminal system. The strategy includes metrics collection, alerting, dashboards, distributed tracing, and security monitoring.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Monitoring    │    │   Alerting &    │
│   Components    │───►│   Pipeline      │───►│   Dashboards    │
│                 │    │                 │    │                 │
│ • React App     │    │ • Prometheus    │    │ • Grafana       │
│ • Terminal Svc  │    │ • Node Exporter │    │ • AlertManager  │
│ • WebSocket     │    │ • Custom        │    │ • PagerDuty     │
│ • VS Code Ext   │    │   Exporters     │    │ • Slack         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Metrics Collection Strategy

### 1. Application Performance Metrics

#### A. Terminal Service Metrics
```javascript
// src/services/terminal-service/metrics.js
const prometheus = require('prom-client');

// Custom metrics for terminal service
const terminalMetrics = {
  // Active terminal sessions
  activeSessions: new prometheus.Gauge({
    name: 'claude_terminal_active_sessions',
    help: 'Number of active terminal sessions',
    labelNames: ['workbranch', 'shell_type']
  }),

  // Session creation rate
  sessionCreationRate: new prometheus.Counter({
    name: 'claude_terminal_sessions_created_total',
    help: 'Total number of terminal sessions created',
    labelNames: ['workbranch', 'shell_type', 'status']
  }),

  // Command execution metrics
  commandExecutionTime: new prometheus.Histogram({
    name: 'claude_terminal_command_execution_seconds',
    help: 'Time taken to execute terminal commands',
    labelNames: ['command_type', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  }),

  // WebSocket connection metrics
  websocketConnections: new prometheus.Gauge({
    name: 'claude_websocket_connections',
    help: 'Number of active WebSocket connections',
    labelNames: ['service']
  }),

  // Memory usage per session
  sessionMemoryUsage: new prometheus.Gauge({
    name: 'claude_terminal_session_memory_bytes',
    help: 'Memory usage per terminal session',
    labelNames: ['session_id', 'workbranch']
  }),

  // Security events
  securityEvents: new prometheus.Counter({
    name: 'claude_security_events_total',
    help: 'Total number of security events',
    labelNames: ['event_type', 'severity', 'source']
  })
};

// Export metrics endpoint
function setupMetricsEndpoint(app) {
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', prometheus.register.contentType);
      res.end(await prometheus.register.metrics());
    } catch (error) {
      res.status(500).end(error);
    }
  });
}

module.exports = { terminalMetrics, setupMetricsEndpoint };
```

#### B. Frontend Performance Metrics
```javascript
// src/utils/performanceMetrics.js
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      pageLoadTime: 0,
      terminalRenderTime: 0,
      websocketLatency: 0,
      componentUpdateTime: new Map()
    };
  }

  // Core Web Vitals
  collectWebVitals() {
    return new Promise((resolve) => {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        const vitals = {};
        
        getCLS((metric) => { vitals.cls = metric.value; });
        getFID((metric) => { vitals.fid = metric.value; });
        getFCP((metric) => { vitals.fcp = metric.value; });
        getLCP((metric) => { vitals.lcp = metric.value; });
        getTTFB((metric) => { vitals.ttfb = metric.value; });
        
        setTimeout(() => resolve(vitals), 1000);
      });
    });
  }

  // Terminal-specific metrics
  measureTerminalPerformance() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('terminal')) {
          this.metrics.terminalRenderTime = entry.duration;
        }
      }
    });
    
    observer.observe({ entryTypes: ['measure'] });
  }

  // WebSocket latency monitoring
  measureWebSocketLatency() {
    const startTime = performance.now();
    
    return {
      ping: () => {
        const pingTime = performance.now();
        return {
          sendPing: () => pingTime,
          receivePong: () => {
            const latency = performance.now() - pingTime;
            this.metrics.websocketLatency = latency;
            return latency;
          }
        };
      }
    };
  }

  // Export metrics to monitoring system
  exportMetrics() {
    if (window.gtag) {
      // Google Analytics 4
      window.gtag('event', 'performance_metrics', {
        'page_load_time': this.metrics.pageLoadTime,
        'terminal_render_time': this.metrics.terminalRenderTime,
        'websocket_latency': this.metrics.websocketLatency
      });
    }

    // Send to custom monitoring endpoint
    fetch('/api/metrics/frontend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.metrics)
    }).catch(console.error);
  }
}

export default new PerformanceMetrics();
```

### 2. System Resource Metrics

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "claude_portfolio_rules.yml"

scrape_configs:
  # Claude Portfolio Terminal Service
  - job_name: 'claude-terminal-service'
    static_configs:
      - targets: ['localhost:8002']
    metrics_path: '/metrics'
    scrape_interval: 5s

  # Claude Portfolio Frontend
  - job_name: 'claude-frontend'
    static_configs:
      - targets: ['localhost:5173']
    metrics_path: '/api/metrics'
    scrape_interval: 15s

  # System metrics
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  # Process metrics
  - job_name: 'process-exporter'
    static_configs:
      - targets: ['localhost:9256']

  # WebSocket monitoring
  - job_name: 'websocket-exporter'
    static_configs:
      - targets: ['localhost:9200']
```

#### Custom Exporter for Terminal Sessions
```javascript
// monitoring/terminal-exporter.js
const express = require('express');
const prometheus = require('prom-client');
const WebSocket = require('ws');

class TerminalExporter {
  constructor(terminalServiceUrl = 'ws://localhost:8002') {
    this.app = express();
    this.register = new prometheus.Registry();
    this.terminalServiceUrl = terminalServiceUrl;
    
    this.setupMetrics();
    this.setupWebSocketMonitoring();
    this.setupEndpoints();
  }

  setupMetrics() {
    // Terminal session health
    this.sessionHealth = new prometheus.Gauge({
      name: 'claude_terminal_session_health',
      help: 'Health status of terminal sessions (1=healthy, 0=unhealthy)',
      labelNames: ['session_id', 'workbranch', 'shell'],
      registers: [this.register]
    });

    // WebSocket connection status
    this.websocketStatus = new prometheus.Gauge({
      name: 'claude_websocket_status',
      help: 'WebSocket connection status (1=connected, 0=disconnected)',
      labelNames: ['service'],
      registers: [this.register]
    });

    // Terminal response time
    this.responseTime = new prometheus.Histogram({
      name: 'claude_terminal_response_time_seconds',
      help: 'Terminal response time for commands',
      labelNames: ['command_type'],
      buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register]
    });
  }

  setupWebSocketMonitoring() {
    this.ws = new WebSocket(this.terminalServiceUrl);
    
    this.ws.on('open', () => {
      console.log('Connected to terminal service for monitoring');
      this.websocketStatus.set({ service: 'terminal' }, 1);
    });

    this.ws.on('close', () => {
      console.log('Disconnected from terminal service');
      this.websocketStatus.set({ service: 'terminal' }, 0);
      
      // Attempt reconnection
      setTimeout(() => this.setupWebSocketMonitoring(), 5000);
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.processMessage(message);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
  }

  processMessage(message) {
    switch (message.type) {
      case 'session-status':
        this.sessionHealth.set(
          { 
            session_id: message.sessionId,
            workbranch: message.workbranchId,
            shell: message.shell 
          },
          message.healthy ? 1 : 0
        );
        break;
        
      case 'command-response':
        this.responseTime.observe(
          { command_type: message.commandType },
          message.responseTime / 1000
        );
        break;
    }
  }

  setupEndpoints() {
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', this.register.contentType);
      res.end(await this.register.metrics());
    });

    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        websocket_connected: this.ws?.readyState === WebSocket.OPEN,
        uptime: process.uptime()
      });
    });
  }

  start(port = 9200) {
    this.app.listen(port, () => {
      console.log(`Terminal exporter listening on port ${port}`);
    });
  }
}

module.exports = TerminalExporter;
```

## Alerting Configuration

### 1. Prometheus Alert Rules

```yaml
# claude_portfolio_rules.yml
groups:
  - name: claude_portfolio_alerts
    rules:
      # High terminal session count
      - alert: HighTerminalSessionCount
        expr: claude_terminal_active_sessions > 40
        for: 5m
        labels:
          severity: warning
          service: terminal
        annotations:
          summary: "High number of active terminal sessions"
          description: "{{ $value }} active terminal sessions detected"

      # Terminal service down
      - alert: TerminalServiceDown
        expr: up{job="claude-terminal-service"} == 0
        for: 1m
        labels:
          severity: critical
          service: terminal
        annotations:
          summary: "Claude Terminal Service is down"
          description: "Terminal service has been down for more than 1 minute"

      # High WebSocket latency
      - alert: HighWebSocketLatency
        expr: claude_websocket_latency_seconds > 1
        for: 2m
        labels:
          severity: warning
          service: websocket
        annotations:
          summary: "High WebSocket latency detected"
          description: "WebSocket latency is {{ $value }}s"

      # Security events spike
      - alert: SecurityEventsSpike
        expr: increase(claude_security_events_total[5m]) > 10
        for: 1m
        labels:
          severity: critical
          service: security
        annotations:
          summary: "Security events spike detected"
          description: "{{ $value }} security events in the last 5 minutes"

      # Memory usage per session
      - alert: HighSessionMemoryUsage
        expr: claude_terminal_session_memory_bytes / (1024*1024) > 100
        for: 5m
        labels:
          severity: warning
          service: terminal
        annotations:
          summary: "High memory usage for terminal session"
          description: "Session {{ $labels.session_id }} using {{ $value }}MB memory"

      # Failed command execution rate
      - alert: HighCommandFailureRate
        expr: rate(claude_terminal_command_execution_seconds_count{status="error"}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
          service: terminal
        annotations:
          summary: "High command failure rate"
          description: "{{ $value }} command failures per second"

  - name: claude_infrastructure_alerts
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
          service: infrastructure
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% for 5 minutes"

      # High memory usage
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: critical
          service: infrastructure
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 85%"

      # Disk space low
      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 5m
        labels:
          severity: critical
          service: infrastructure
        annotations:
          summary: "Low disk space"
          description: "Disk space is below 10% on {{ $labels.mountpoint }}"
```

### 2. AlertManager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@your-domain.com'
  smtp_auth_username: 'alerts@your-domain.com'
  smtp_auth_password: 'app_password'

route:
  group_by: ['alertname', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
    # Critical alerts go to PagerDuty
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    
    # Security alerts go to security team
    - match:
        service: security
      receiver: 'security-team'
      continue: true
    
    # Infrastructure alerts
    - match:
        service: infrastructure
      receiver: 'ops-team'

receivers:
  - name: 'default'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#claude-portfolio-alerts'
        username: 'AlertManager'
        title: 'Claude Portfolio Alert'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Severity:* {{ .Labels.severity }}
          {{ end }}

  - name: 'pagerduty'
    pagerduty_configs:
      - routing_key: 'YOUR_PAGERDUTY_INTEGRATION_KEY'
        description: 'Claude Portfolio Critical Alert'

  - name: 'security-team'
    email_configs:
      - to: 'security@your-domain.com'
        subject: 'SECURITY ALERT: Claude Portfolio'
        body: |
          Security alert detected in Claude Portfolio:
          
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Time: {{ .StartsAt }}
          {{ end }}

  - name: 'ops-team'
    email_configs:
      - to: 'ops@your-domain.com'
        subject: 'Infrastructure Alert: Claude Portfolio'
        body: |
          Infrastructure alert:
          
          {{ range .Alerts }}
          {{ .Annotations.summary }}
          {{ .Annotations.description }}
          {{ end }}
```

## Dashboard Configuration

### 1. Grafana Dashboard JSON

```json
{
  "dashboard": {
    "id": null,
    "title": "Claude Portfolio - Terminal System Overview",
    "tags": ["claude", "terminal", "monitoring"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Terminal Sessions Overview",
        "type": "stat",
        "targets": [
          {
            "expr": "claude_terminal_active_sessions",
            "legendFormat": "Active Sessions"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": { "mode": "thresholds" },
            "thresholds": {
              "steps": [
                { "color": "green", "value": null },
                { "color": "yellow", "value": 30 },
                { "color": "red", "value": 45 }
              ]
            }
          }
        },
        "gridPos": { "h": 8, "w": 6, "x": 0, "y": 0 }
      },
      {
        "id": 2,
        "title": "WebSocket Connections",
        "type": "timeseries",
        "targets": [
          {
            "expr": "claude_websocket_connections",
            "legendFormat": "{{ service }}"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 6, "y": 0 }
      },
      {
        "id": 3,
        "title": "Command Execution Time",
        "type": "histogram",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, claude_terminal_command_execution_seconds_bucket)",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, claude_terminal_command_execution_seconds_bucket)",
            "legendFormat": "Median"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 }
      },
      {
        "id": 4,
        "title": "Security Events",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(claude_security_events_total[5m])",
            "legendFormat": "{{ event_type }}"
          }
        ],
        "gridPos": { "h": 8, "w": 6, "x": 12, "y": 8 }
      },
      {
        "id": 5,
        "title": "System Resource Usage",
        "type": "timeseries",
        "targets": [
          {
            "expr": "100 - (avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU Usage %"
          },
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "Memory Usage %"
          }
        ],
        "gridPos": { "h": 8, "w": 18, "x": 0, "y": 16 }
      }
    ],
    "time": { "from": "now-1h", "to": "now" },
    "refresh": "5s"
  }
}
```

### 2. Custom Dashboard Components

```javascript
// monitoring/dashboard-components.js
class CustomDashboard {
  constructor() {
    this.setupRealTimeMetrics();
    this.setupHeatmaps();
    this.setupTopology();
  }

  // Real-time terminal session heatmap
  setupHeatmaps() {
    const heatmapData = {
      workbranches: {},
      shells: {},
      timeSlots: []
    };

    setInterval(async () => {
      const sessions = await this.fetchActiveSessions();
      this.updateHeatmap(sessions);
    }, 5000);
  }

  // Network topology visualization
  setupTopology() {
    const topology = {
      nodes: [
        { id: 'frontend', label: 'React Frontend', type: 'frontend' },
        { id: 'terminal-service', label: 'Terminal Service', type: 'backend' },
        { id: 'vscode-bridge', label: 'VS Code Bridge', type: 'bridge' },
        { id: 'sessions', label: 'Terminal Sessions', type: 'sessions' }
      ],
      edges: [
        { from: 'frontend', to: 'terminal-service', label: 'WebSocket' },
        { from: 'frontend', to: 'vscode-bridge', label: 'WebSocket' },
        { from: 'terminal-service', to: 'sessions', label: 'node-pty' }
      ]
    };

    this.renderTopology(topology);
  }

  // Performance metrics correlation
  setupCorrelationAnalysis() {
    const correlationMatrix = {
      'cpu_usage': [],
      'memory_usage': [],
      'active_sessions': [],
      'command_rate': [],
      'websocket_latency': []
    };

    // Collect correlation data
    setInterval(() => {
      this.collectCorrelationData(correlationMatrix);
      this.updateCorrelationVisualization(correlationMatrix);
    }, 30000);
  }
}
```

## Distributed Tracing

### 1. OpenTelemetry Integration

```javascript
// monitoring/tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Configure tracing
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'claude-portfolio',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new JaegerExporter({
    endpoint: 'http://localhost:14268/api/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

// Custom terminal instrumentation
const { trace, context, propagation } = require('@opentelemetry/api');

class TerminalTracer {
  constructor() {
    this.tracer = trace.getTracer('terminal-service');
  }

  // Trace terminal session lifecycle
  traceSessionLifecycle(sessionId, operation, fn) {
    return this.tracer.startActiveSpan(`terminal.${operation}`, {
      attributes: {
        'terminal.session.id': sessionId,
        'terminal.operation': operation
      }
    }, async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: trace.SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({
          code: trace.SpanStatusCode.ERROR,
          message: error.message
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  // Trace command execution
  traceCommandExecution(sessionId, command) {
    return this.tracer.startActiveSpan('terminal.command.execute', {
      attributes: {
        'terminal.session.id': sessionId,
        'terminal.command': command.substring(0, 100), // Truncate for security
        'terminal.command.length': command.length
      }
    });
  }

  // Trace WebSocket messages
  traceWebSocketMessage(messageType, direction) {
    return this.tracer.startActiveSpan('websocket.message', {
      attributes: {
        'websocket.message.type': messageType,
        'websocket.direction': direction
      }
    });
  }
}

module.exports = { sdk, TerminalTracer };
```

### 2. Trace Correlation

```javascript
// monitoring/trace-correlation.js
class TraceCorrelation {
  constructor() {
    this.correlationMap = new Map();
    this.setupCorrelationTracking();
  }

  // Correlate traces across services
  setupCorrelationTracking() {
    // Frontend to backend correlation
    this.trackFrontendToBackend();
    
    // Terminal session correlation
    this.trackTerminalSessions();
    
    // Security event correlation
    this.trackSecurityEvents();
  }

  trackFrontendToBackend() {
    // Inject correlation IDs into WebSocket messages
    const originalSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function(data) {
      try {
        const message = JSON.parse(data);
        message.correlationId = this.generateCorrelationId();
        message.timestamp = Date.now();
        
        this.correlationMap.set(message.correlationId, {
          frontend_start: Date.now(),
          message_type: message.type
        });
        
        return originalSend.call(this, JSON.stringify(message));
      } catch (error) {
        return originalSend.call(this, data);
      }
    };
  }

  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Track end-to-end latency
  trackEndToEndLatency(correlationId, stage, timestamp) {
    if (this.correlationMap.has(correlationId)) {
      const trace = this.correlationMap.get(correlationId);
      trace[stage] = timestamp;
      
      // Calculate latencies
      if (trace.frontend_start && trace.backend_received) {
        trace.network_latency = trace.backend_received - trace.frontend_start;
      }
      
      if (trace.backend_processed && trace.backend_received) {
        trace.processing_latency = trace.backend_processed - trace.backend_received;
      }
    }
  }
}
```

## Log Aggregation and Analysis

### 1. Structured Logging

```javascript
// utils/logger.js
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

// Configure structured logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'claude-portfolio',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    // Console logging
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File logging
    new winston.transports.File({
      filename: '/var/log/claude-portfolio/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    new winston.transports.File({
      filename: '/var/log/claude-portfolio/combined.log',
      maxsize: 5242880,
      maxFiles: 10
    }),
    
    // Elasticsearch (for production)
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: { node: 'http://localhost:9200' },
      index: 'claude-portfolio-logs'
    })
  ]
});

// Custom log methods for terminal operations
logger.terminal = {
  sessionCreated: (sessionId, workbranchId, shell) => {
    logger.info('Terminal session created', {
      event: 'session.created',
      session_id: sessionId,
      workbranch_id: workbranchId,
      shell_type: shell,
      timestamp: new Date().toISOString()
    });
  },
  
  commandExecuted: (sessionId, command, duration, success) => {
    logger.info('Command executed', {
      event: 'command.executed',
      session_id: sessionId,
      command_hash: require('crypto').createHash('sha256').update(command).digest('hex').substr(0, 8),
      duration_ms: duration,
      success: success,
      timestamp: new Date().toISOString()
    });
  },
  
  securityEvent: (eventType, severity, details) => {
    logger.warn('Security event detected', {
      event: 'security.event',
      event_type: eventType,
      severity: severity,
      details: details,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = logger;
```

### 2. Log Analysis Queries

```javascript
// monitoring/log-analysis.js
class LogAnalysis {
  constructor(elasticsearchClient) {
    this.es = elasticsearchClient;
  }

  // Analyze terminal session patterns
  async analyzeSessionPatterns(timeRange = '1h') {
    const query = {
      index: 'claude-portfolio-logs',
      body: {
        query: {
          bool: {
            must: [
              { match: { event: 'session.created' } },
              { range: { timestamp: { gte: `now-${timeRange}` } } }
            ]
          }
        },
        aggs: {
          sessions_by_workbranch: {
            terms: { field: 'workbranch_id.keyword' }
          },
          sessions_by_shell: {
            terms: { field: 'shell_type.keyword' }
          },
          sessions_over_time: {
            date_histogram: {
              field: 'timestamp',
              interval: '5m'
            }
          }
        }
      }
    };

    return await this.es.search(query);
  }

  // Detect anomalous command patterns
  async detectAnomalousCommands(timeRange = '24h') {
    const query = {
      index: 'claude-portfolio-logs',
      body: {
        query: {
          bool: {
            must: [
              { match: { event: 'command.executed' } },
              { range: { timestamp: { gte: `now-${timeRange}` } } }
            ]
          }
        },
        aggs: {
          command_frequency: {
            terms: {
              field: 'command_hash.keyword',
              size: 1000
            }
          },
          failed_commands: {
            filter: { term: { success: false } },
            aggs: {
              failure_reasons: {
                terms: { field: 'error_message.keyword' }
              }
            }
          }
        }
      }
    };

    const result = await this.es.search(query);
    return this.analyzeCommandAnomalies(result);
  }

  analyzeCommandAnomalies(searchResult) {
    const buckets = searchResult.body.aggregations.command_frequency.buckets;
    const threshold = this.calculateAnomalyThreshold(buckets);
    
    return buckets.filter(bucket => bucket.doc_count > threshold)
                  .map(bucket => ({
                    command_hash: bucket.key,
                    frequency: bucket.doc_count,
                    anomaly_score: bucket.doc_count / threshold
                  }));
  }
}
```

This comprehensive monitoring and observability strategy provides enterprise-grade visibility into the Claude Development Portfolio's terminal system, enabling proactive issue detection, performance optimization, and security monitoring.