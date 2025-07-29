# Terminal Testing Suite

Comprehensive testing framework for the multi-terminal workflow system, validating end-to-end functionality from ChatInterface → WebSocket → node-pty → Terminal output.

## 🚀 Quick Start

```bash
# Run all tests
node tests/run-all-terminal-tests.js

# Quick integration test only
node tests/run-all-terminal-tests.js --quick

# Run specific test suites
node tests/run-all-terminal-tests.js --integration --workflow
node tests/run-all-terminal-tests.js --performance

# Individual test suites
node tests/terminal-integration-test-suite.js
node tests/terminal-performance-tests.js
node tests/terminal-workflow-tests.js
```

## 📋 Test Suite Overview

### 🔌 Integration Tests (`terminal-integration-test-suite.js`)
**Purpose**: Validate core terminal service functionality  
**Duration**: ~60 seconds  
**Coverage**:
- WebSocket connection establishment
- Bidirectional streaming (input/output)  
- Terminal session creation/destruction
- Message handling and error recovery
- Connection resilience and reconnection

**Key Test Scenarios**:
```javascript
✅ WebSocket Bridge Available
✅ WebSocket Connection Establishment  
✅ Bidirectional Communication (ping/pong)
✅ Terminal Session Creation
✅ Terminal Session Destruction
✅ Malformed Message Resilience
✅ End-to-End Workflow (create → command → cleanup)
```

### ⚡ Performance Tests (`terminal-performance-tests.js`)
**Purpose**: Load testing and performance validation  
**Duration**: ~120 seconds  
**Coverage**:
- Concurrent session handling (up to 20 sessions)
- Message throughput testing (100+ msg/s)
- Memory usage patterns and leak detection
- Connection stability under load
- Stress testing with mixed operations

**Performance Metrics**:
```javascript
📊 CONNECTION PERFORMANCE:
  Total Connections: 10
  Success Rate: 100%
  Average Connection Time: 45ms

📊 SESSION PERFORMANCE:  
  Total Sessions Created: 15
  Max Concurrent Sessions: 15
  Average Creation Time: 120ms

📊 MESSAGE PERFORMANCE:
  Total Messages: 300
  Success Rate: 98.7%
  Average Response Time: 85ms
  Throughput: 22.5 msg/s

📊 MEMORY PERFORMANCE:
  Peak Memory Usage: 45.2MB
  Average Memory Usage: 38.7MB
```

### 🎯 Workflow Tests (`terminal-workflow-tests.js`)
**Purpose**: Multi-terminal workflow validation  
**Duration**: ~90 seconds  
**Coverage**:
- Checkbox selection system preservation
- Command broadcasting to multiple terminals
- Workbranch isolation between sessions
- Chat interface simulation scenarios
- Error recovery and reconnection handling

**Workflow Scenarios**:
```javascript
🎯 Simple Command
   Message: 'Run "echo hello" in all selected terminals'
   Expected: Broadcast to all terminals
   
🎯 Project-Specific Command  
   Message: 'Start dev server with "npm run dev" in project terminals'
   Expected: Execute only in project terminals
   
🎯 Multi-Step Workflow
   Message: 'First run "git status" then "git pull" in all terminals'
   Expected: Sequential execution across terminals
   
🎯 Conditional Execution
   Message: 'Run "echo test" only in terminals with project-a'
   Expected: Filtered execution by project
```

## 🏗️ Architecture Validation

The test suite validates the complete multi-terminal architecture:

```
ChatInterface → TerminalGrid → WebSocketService → VS Code Extension → Terminal
     ↓              ↓              ↓                    ↓              ↓
  User Input → Selection Logic → WebSocket Msg → Terminal Service → Command Exec
     ↑              ↑              ↑                    ↑              ↑
 Test Scripts → Mock Selections → Test Messages → Mocked Sessions → Validation
```

### Key Components Tested:

1. **React Terminal Grid (`useTerminalGrid.ts`)**
   - Terminal instance management
   - Selection state preservation
   - Command broadcasting logic
   - Layout and dimension calculations

2. **WebSocket Service (`terminalWebSocketService.ts`)**
   - Connection establishment and management
   - Message serialization/deserialization
   - Session lifecycle management
   - Error handling and reconnection

3. **VS Code Terminal Service (`terminalService.ts`)**
   - VS Code terminal integration
   - Workbranch isolation
   - Command execution security
   - Session cleanup and resource management

4. **xterm.js Integration (`useXtermIntegration.ts`)**
   - Terminal DOM rendering
   - Dimension handling and fitting
   - Input/output streaming
   - Connection status management

## 📊 Test Results and Reports

### Generated Artifacts:
```
tests/results/
├── consolidated-test-report.json      # Complete test suite results
├── integration-terminal-test-results.json
├── performance-terminal-performance-report.json  
├── workflow-terminal-workflow-results.json
└── test-artifacts/                    # Additional test data
```

### Sample Consolidated Report:
```json
{
  "summary": {
    "totalSuites": 3,
    "passedSuites": 3, 
    "failedSuites": 0,
    "totalDuration": 270000,
    "passRate": "100.0"
  },
  "analysis": {
    "overallStatus": "PASS",
    "performanceMetrics": {
      "throughput": 22.5,
      "averageResponseTime": 85,
      "peakMemoryMB": 45.2,
      "connectionSuccessRate": 100
    },
    "recommendations": [],
    "criticalIssues": []
  }
}
```

## 🔧 Configuration and Customization

### Test Configuration:
```javascript
// Integration Test Config
const TEST_CONFIG = {
  wsPort: 8123,
  terminalServicePort: 8002,
  maxTestDuration: 60000,
  connectionTimeout: 5000,
  responseTimeout: 10000,
  concurrentTerminals: 5
};

// Performance Test Config  
const PERF_CONFIG = {
  maxConcurrentSessions: 20,
  messageLoadTest: {
    messagesPerSecond: 100,
    testDurationMs: 30000
  },
  stressTest: {
    sessionCreationRate: 5,
    commandExecutionRate: 10,
    testDurationMs: 60000
  }
};

// Workflow Test Config
const WORKFLOW_CONFIG = {
  testTimeout: 30000,
  workbranches: ['main', 'feature-branch', 'hotfix', 'development'],
  testProjects: ['project-a', 'project-b', 'utilities', 'tools'],
  testCommands: [
    'echo "Hello from workflow test"',
    'dir', 'cd .', 'echo "Testing multi-terminal broadcast"'
  ]
};
```

### Custom Test Scenarios:
```javascript
// Add new workflow scenarios
const CUSTOM_SCENARIOS = [
  {
    name: 'Custom Development Workflow',
    steps: [
      { action: 'select', target: 'project-a' },
      { action: 'command', command: 'npm run build' },
      { action: 'select', target: 'all' },
      { action: 'command', command: 'echo "Build complete"' }
    ]
  }
];
```

## 🚨 Prerequisites and Dependencies

### Required Services:
- **VS Code Extension**: Must be active with WebSocket bridge at `ws://localhost:8123`
- **Node.js**: Version 16+ with WebSocket support
- **VS Code**: With trusted workspace for terminal operations

### Environment Setup:
```bash
# Install dependencies
npm install ws

# Ensure VS Code extension is active
# Check WebSocket bridge is running:
curl http://localhost:8123/health

# Run tests with proper permissions
# (VS Code workspace must be trusted)
```

### Port Requirements:
- `8123`: Main WebSocket bridge (VS Code extension)
- `8002`: Terminal service port (fallback/testing)
- `3000-3099`: Project ports (for integration testing)

## 🐛 Troubleshooting

### Common Issues:

1. **WebSocket Connection Failed**
   ```
   ❌ WebSocket Connection Establishment - Connection timeout
   ```
   **Solution**: Ensure VS Code extension is active and WebSocket bridge is running

2. **Terminal Session Creation Failed**  
   ```
   ❌ Terminal Session Creation - Session creation failed
   ```
   **Solution**: Check VS Code workspace trust and terminal permissions

3. **Performance Test Timeouts**
   ```
   ❌ Message timeout: perf-12345
   ```  
   **Solution**: Reduce concurrent load or increase timeout values

4. **Memory Leak Detection**
   ```
   ⚠️ Potential memory leak detected: 75MB increase
   ```
   **Solution**: Check session cleanup and garbage collection

### Debug Mode:
```bash
# Enable verbose logging
DEBUG=terminal:* node tests/run-all-terminal-tests.js

# Run individual tests with detailed output
node tests/terminal-integration-test-suite.js --verbose

# Memory profiling
node --expose-gc tests/terminal-performance-tests.js
```

## 📈 Performance Benchmarks

### Expected Performance Ranges:

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| Connection Time | < 100ms | < 500ms | > 500ms |
| Session Creation | < 200ms | < 1000ms | > 1000ms |
| Message Response | < 100ms | < 500ms | > 500ms |
| Throughput | > 20 msg/s | > 10 msg/s | < 10 msg/s |
| Memory Usage | < 50MB | < 100MB | > 100MB |
| Connection Success | > 99% | > 95% | < 95% |

### Optimization Targets:
- **Sub-100ms response times** for normal operations
- **20+ msg/s throughput** for command broadcasting  
- **50MB peak memory** for full test suite
- **99%+ connection reliability** under normal load

## 🔄 Continuous Integration

### GitHub Actions Integration:
```yaml
name: Terminal Integration Tests
on: [push, pull_request]
jobs:
  terminal-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: node tests/run-all-terminal-tests.js --quick
      - uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: tests/results/
```

### Pre-commit Hooks:
```bash
# .husky/pre-commit
#!/bin/sh
node tests/run-all-terminal-tests.js --quick
```

This comprehensive testing suite ensures the multi-terminal workflow system operates reliably across all scenarios, from basic terminal operations to complex multi-project workflows.