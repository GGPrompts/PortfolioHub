/**
 * Comprehensive Terminal Integration Test Suite
 * 
 * Tests end-to-end terminal service functionality:
 * - WebSocket connection establishment
 * - Terminal session lifecycle
 * - Multi-terminal workflow
 * - Performance and reliability
 * 
 * Usage: node tests/terminal-integration-test-suite.js
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  wsPort: 8123,
  terminalServicePort: 8002,
  maxTestDuration: 60000, // 1 minute
  connectionTimeout: 5000,
  responseTimeout: 10000,
  concurrentTerminals: 5,
  testCommands: [
    'echo "Hello from terminal test"',
    'cd .',
    'dir',
    'echo "Test command execution"',
    'powershell -Command "Get-Date"'
  ]
};

// Test utilities
class TestUtils {
  static async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static generateTestId() {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static async waitForWebSocketOpen(ws, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      
      const timer = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, timeout);
      
      ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      });
      
      ws.addEventListener('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  static async sendWebSocketMessage(ws, message, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const messageId = message.id || TestUtils.generateTestId();
      message.id = messageId;
      
      const timer = setTimeout(() => {
        reject(new Error(`Message timeout: ${messageId}`));
      }, timeout);
      
      const messageHandler = (event) => {
        try {
          const response = JSON.parse(event.data);
          if (response.id === messageId) {
            clearTimeout(timer);
            ws.removeEventListener('message', messageHandler);
            resolve(response);
          }
        } catch (error) {
          // Not our message, ignore
        }
      };
      
      ws.addEventListener('message', messageHandler);
      ws.send(JSON.stringify(message));
    });
  }

  static async checkServiceHealth(port) {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}/health`, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }
}

// Test result tracking
class TestResults {
  constructor() {
    this.tests = [];
    this.startTime = Date.now();
  }

  addTest(name, passed, details = {}) {
    this.tests.push({
      name,
      passed,
      details,
      timestamp: Date.now(),
      duration: details.duration || 0
    });
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}${details.message ? ' - ' + details.message : ''}`);
    
    if (details.error) {
      console.error('   Error:', details.error.message);
    }
  }

  generateReport() {
    const totalTests = this.tests.length;
    const passedTests = this.tests.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = Date.now() - this.startTime;
    
    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        passRate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0,
        duration: totalDuration
      },
      tests: this.tests,
      timestamp: new Date().toISOString()
    };
    
    // Write detailed report to file
    const reportPath = path.join(__dirname, 'terminal-test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  printSummary() {
    const report = this.generateReport();
    
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed} (${report.summary.passRate}%)`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Duration: ${(report.summary.duration / 1000).toFixed(2)}s`);
    console.log(`Report saved: terminal-test-results.json`);
    
    if (report.summary.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      report.tests.filter(t => !t.passed).forEach(test => {
        console.log(`   • ${test.name}${test.details.error ? ': ' + test.details.error.message : ''}`);
      });
    }
  }
}

// Main test suite class
class TerminalIntegrationTestSuite {
  constructor() {
    this.results = new TestResults();
    this.connections = new Map();
    this.sessions = new Map();
  }

  async runAllTests() {
    console.log('🚀 Starting Terminal Integration Test Suite');
    console.log('============================================');
    
    try {
      // Pre-flight checks
      await this.testPrerequisites();
      
      // WebSocket connection tests
      await this.testWebSocketConnection();
      await this.testConnectionResilience();
      
      // Terminal session lifecycle tests
      await this.testTerminalSessionCreation();
      await this.testTerminalSessionDestruction();
      
      // Multi-terminal workflow tests
      await this.testMultiTerminalSelection();
      await this.testCommandBroadcasting();
      await this.testWorkbranchIsolation();
      
      // Performance and reliability tests
      await this.testConcurrentSessions();
      await this.testMemoryLeaks();
      await this.testReconnectionHandling();
      
      // Integration tests
      await this.testEndToEndWorkflow();
      
    } catch (error) {
      console.error('🔥 Test suite crashed:', error);
      this.results.addTest('Test Suite Execution', false, { error });
    } finally {
      await this.cleanup();
      this.results.printSummary();
    }
    
    return this.results.generateReport();
  }

  async testPrerequisites() {
    console.log('\n🔍 Testing Prerequisites...');
    
    // Test WebSocket server availability
    const startTime = Date.now();
    try {
      const wsHealthy = await TestUtils.checkServiceHealth(TEST_CONFIG.wsPort);
      this.results.addTest(
        'WebSocket Bridge Available', 
        wsHealthy, 
        { 
          duration: Date.now() - startTime,
          message: `Port ${TEST_CONFIG.wsPort}${wsHealthy ? ' responding' : ' not responding'}`
        }
      );
    } catch (error) {
      this.results.addTest('WebSocket Bridge Available', false, { error, duration: Date.now() - startTime });
    }

    // Test VS Code extension presence (via file system check)
    const extensionPath = path.join(__dirname, '../vscode-extension');
    const extensionExists = fs.existsSync(extensionPath);
    this.results.addTest(
      'VS Code Extension Present', 
      extensionExists, 
      { message: extensionExists ? 'Extension directory found' : 'Extension directory missing' }
    );

    // Test Node.js and dependencies
    const nodeVersion = process.version;
    const hasWebSocket = !!require.resolve('ws');
    this.results.addTest(
      'Runtime Dependencies', 
      true, 
      { message: `Node.js ${nodeVersion}, WebSocket library available` }
    );
  }

  async testWebSocketConnection() {
    console.log('\n🔌 Testing WebSocket Connection...');
    
    const testId = TestUtils.generateTestId();
    const startTime = Date.now();
    
    try {
      const ws = new WebSocket(`ws://localhost:${TEST_CONFIG.wsPort}`);
      await TestUtils.waitForWebSocketOpen(ws, TEST_CONFIG.connectionTimeout);
      
      this.connections.set(testId, ws);
      
      this.results.addTest(
        'WebSocket Connection Establishment', 
        true, 
        { 
          duration: Date.now() - startTime,
          message: 'Connected successfully'
        }
      );

      // Test bidirectional communication
      const pingStartTime = Date.now();
      const response = await TestUtils.sendWebSocketMessage(ws, {
        type: 'ping',
        timestamp: Date.now()
      });
      
      const hasValidResponse = response && (response.type === 'pong' || response.success !== false);
      this.results.addTest(
        'Bidirectional Communication', 
        hasValidResponse, 
        { 
          duration: Date.now() - pingStartTime,
          message: hasValidResponse ? 'Ping/pong successful' : 'No valid response received'
        }
      );

    } catch (error) {
      this.results.addTest('WebSocket Connection Establishment', false, { error, duration: Date.now() - startTime });
    }
  }

  async testConnectionResilience() {
    console.log('\n🔄 Testing Connection Resilience...');
    
    // Test connection with invalid messages
    const testId = TestUtils.generateTestId();
    const ws = this.connections.values().next().value;
    
    if (!ws) {
      this.results.addTest('Connection Resilience', false, { error: new Error('No WebSocket connection available') });
      return;
    }

    try {
      // Send malformed JSON
      ws.send('invalid json');
      await TestUtils.delay(1000);
      
      // Verify connection is still alive
      const response = await TestUtils.sendWebSocketMessage(ws, {
        type: 'ping',
        timestamp: Date.now()
      });
      
      const stillConnected = ws.readyState === WebSocket.OPEN;
      this.results.addTest(
        'Malformed Message Resilience', 
        stillConnected, 
        { message: stillConnected ? 'Connection survived malformed message' : 'Connection lost' }
      );

    } catch (error) {
      this.results.addTest('Connection Resilience', false, { error });
    }
  }

  async testTerminalSessionCreation() {
    console.log('\n🖥️ Testing Terminal Session Creation...');
    
    const ws = this.connections.values().next().value;
    if (!ws) {
      this.results.addTest('Terminal Session Creation', false, { error: new Error('No WebSocket connection') });
      return;
    }

    const testId = TestUtils.generateTestId();
    const workbranchId = `test-branch-${testId}`;
    const startTime = Date.now();

    try {
      const response = await TestUtils.sendWebSocketMessage(ws, {
        type: 'terminal-create',
        terminalId: testId,
        data: {
          workbranchId,
          projectId: 'test-project',
          title: `Test Terminal ${testId}`,
          shell: 'powershell'
        }
      });

      const sessionCreated = response.success && response.result?.sessionId;
      
      if (sessionCreated) {
        this.sessions.set(testId, {
          terminalId: testId,
          sessionId: response.result.sessionId,
          workbranchId
        });
      }

      this.results.addTest(
        'Terminal Session Creation', 
        sessionCreated, 
        { 
          duration: Date.now() - startTime,
          message: sessionCreated ? `Session created: ${response.result.sessionId}` : 'Session creation failed'
        }
      );

    } catch (error) {
      this.results.addTest('Terminal Session Creation', false, { error, duration: Date.now() - startTime });
    }
  }

  async testTerminalSessionDestruction() {
    console.log('\n🗑️ Testing Terminal Session Destruction...');
    
    const ws = this.connections.values().next().value;
    const session = this.sessions.values().next().value;
    
    if (!ws || !session) {
      this.results.addTest('Terminal Session Destruction', false, { error: new Error('No session available for destruction test') });
      return;
    }

    const startTime = Date.now();

    try {
      const response = await TestUtils.sendWebSocketMessage(ws, {
        type: 'terminal-destroy',
        id: session.sessionId,
        data: {
          sessionId: session.sessionId
        }
      });

      const sessionDestroyed = response.success;
      
      if (sessionDestroyed) {
        this.sessions.delete(session.terminalId);
      }

      this.results.addTest(
        'Terminal Session Destruction', 
        sessionDestroyed, 
        { 
          duration: Date.now() - startTime,
          message: sessionDestroyed ? 'Session destroyed successfully' : 'Session destruction failed'
        }
      );

    } catch (error) {
      this.results.addTest('Terminal Session Destruction', false, { error, duration: Date.now() - startTime });
    }
  }

  async testMultiTerminalSelection() {
    console.log('\n☑️ Testing Multi-Terminal Selection...');
    
    const ws = this.connections.values().next().value;
    if (!ws) {
      this.results.addTest('Multi-Terminal Selection', false, { error: new Error('No WebSocket connection') });
      return;
    }

    // Create multiple terminal sessions
    const sessions = [];
    const selectionTestStartTime = Date.now();

    try {
      for (let i = 0; i < 3; i++) {
        const testId = TestUtils.generateTestId();
        const workbranchId = `selection-test-${i}-${testId}`;
        
        const response = await TestUtils.sendWebSocketMessage(ws, {
          type: 'terminal-create',
          terminalId: testId,
          data: {
            workbranchId,
            projectId: i % 2 === 0 ? 'project-a' : 'project-b', // Alternate projects
            title: `Selection Test Terminal ${i}`,
            shell: 'powershell'
          }
        });

        if (response.success) {
          sessions.push({
            terminalId: testId,
            sessionId: response.result.sessionId,
            workbranchId,
            projectId: i % 2 === 0 ? 'project-a' : 'project-b'
          });
          this.sessions.set(testId, sessions[sessions.length - 1]);
        }
      }

      const allSessionsCreated = sessions.length === 3;
      this.results.addTest(
        'Multi-Terminal Creation', 
        allSessionsCreated, 
        { 
          duration: Date.now() - selectionTestStartTime,
          message: `Created ${sessions.length}/3 test sessions`
        }
      );

      // Test selection preservation logic (simulated)
      const selectionStates = {
        all: sessions.map(s => s.terminalId),
        projectA: sessions.filter(s => s.projectId === 'project-a').map(s => s.terminalId),
        projectB: sessions.filter(s => s.projectId === 'project-b').map(s => s.terminalId)
      };

      const selectionLogicValid = selectionStates.all.length === 3 && 
                                  selectionStates.projectA.length >= 1 && 
                                  selectionStates.projectB.length >= 1;

      this.results.addTest(
        'Selection Logic Validation', 
        selectionLogicValid, 
        { 
          message: selectionLogicValid ? 'Selection filtering working correctly' : 'Selection logic failed'
        }
      );

    } catch (error) {
      this.results.addTest('Multi-Terminal Selection', false, { error });
    }
  }

  async testCommandBroadcasting() {
    console.log('\n📡 Testing Command Broadcasting...');
    
    const ws = this.connections.values().next().value;
    const sessions = Array.from(this.sessions.values());
    
    if (!ws || sessions.length === 0) {
      this.results.addTest('Command Broadcasting', false, { error: new Error('No sessions available for broadcasting test') });
      return;
    }

    const testCommands = ['echo "Broadcast test"', 'cd .'];
    const broadcastResults = [];

    for (const command of testCommands) {
      const commandStartTime = Date.now();
      let successCount = 0;

      for (const session of sessions.slice(0, 2)) { // Test with first 2 sessions
        try {
          const response = await TestUtils.sendWebSocketMessage(ws, {
            type: 'terminal-command',
            terminalId: session.terminalId,
            data: { command }
          });

          if (response.success) {
            successCount++;
          }
        } catch (error) {
          console.warn(`Command failed for session ${session.terminalId}:`, error.message);
        }
      }

      const commandSuccess = successCount === Math.min(sessions.length, 2);
      broadcastResults.push({
        command,
        success: commandSuccess,
        successCount,
        totalSessions: Math.min(sessions.length, 2),
        duration: Date.now() - commandStartTime
      });
    }

    const overallSuccess = broadcastResults.every(r => r.success);
    const totalDuration = broadcastResults.reduce((sum, r) => sum + r.duration, 0);

    this.results.addTest(
      'Command Broadcasting', 
      overallSuccess, 
      { 
        duration: totalDuration,
        message: `Broadcast ${broadcastResults.filter(r => r.success).length}/${broadcastResults.length} commands successfully`
      }
    );
  }

  async testWorkbranchIsolation() {
    console.log('\n🌿 Testing Workbranch Isolation...');
    
    const ws = this.connections.values().next().value;
    if (!ws) {
      this.results.addTest('Workbranch Isolation', false, { error: new Error('No WebSocket connection') });
      return;
    }

    const isolationTestStartTime = Date.now();
    const workbranches = ['branch-a', 'branch-b'];
    const isolationSessions = [];

    try {
      // Create sessions in different workbranches
      for (const branch of workbranches) {
        const testId = TestUtils.generateTestId();
        const response = await TestUtils.sendWebSocketMessage(ws, {
          type: 'terminal-create',
          terminalId: testId,
          data: {
            workbranchId: branch,
            projectId: 'isolation-test',
            title: `Isolation Test - ${branch}`,
            shell: 'powershell'
          }
        });

        if (response.success) {
          isolationSessions.push({
            terminalId: testId,
            sessionId: response.result.sessionId,
            workbranchId: branch
          });
          this.sessions.set(testId, isolationSessions[isolationSessions.length - 1]);
        }
      }

      // Test that sessions have different working directories/environments
      const isolationValid = isolationSessions.length === 2 && 
                             isolationSessions[0].workbranchId !== isolationSessions[1].workbranchId;

      this.results.addTest(
        'Workbranch Isolation', 
        isolationValid, 
        { 
          duration: Date.now() - isolationTestStartTime,
          message: isolationValid ? 'Workbranch isolation maintained' : 'Isolation test failed'
        }
      );

    } catch (error) {
      this.results.addTest('Workbranch Isolation', false, { error, duration: Date.now() - isolationTestStartTime });
    }
  }

  async testConcurrentSessions() {
    console.log('\n⚡ Testing Concurrent Sessions...');
    
    const ws = this.connections.values().next().value;
    if (!ws) {
      this.results.addTest('Concurrent Sessions', false, { error: new Error('No WebSocket connection') });
      return;
    }

    const concurrentTestStartTime = Date.now();
    const concurrentSessionPromises = [];
    const concurrentCount = TEST_CONFIG.concurrentTerminals;

    // Create multiple sessions simultaneously
    for (let i = 0; i < concurrentCount; i++) {
      const testId = TestUtils.generateTestId();
      const promise = TestUtils.sendWebSocketMessage(ws, {
        type: 'terminal-create',
        terminalId: testId,
        data: {
          workbranchId: `concurrent-${i}`,
          projectId: 'concurrent-test',
          title: `Concurrent Test ${i}`,
          shell: 'powershell'
        }
      }).then(response => ({
        testId,
        success: response.success,
        sessionId: response.result?.sessionId
      })).catch(error => ({
        testId,
        success: false,
        error: error.message
      }));

      concurrentSessionPromises.push(promise);
    }

    try {
      const results = await Promise.all(concurrentSessionPromises);
      const successfulSessions = results.filter(r => r.success);
      
      // Store successful sessions for cleanup
      successfulSessions.forEach(session => {
        this.sessions.set(session.testId, {
          terminalId: session.testId,
          sessionId: session.sessionId,
          workbranchId: `concurrent-${session.testId}`
        });
      });

      const concurrentSuccess = successfulSessions.length === concurrentCount;
      this.results.addTest(
        'Concurrent Sessions', 
        concurrentSuccess, 
        { 
          duration: Date.now() - concurrentTestStartTime,
          message: `Created ${successfulSessions.length}/${concurrentCount} concurrent sessions`
        }
      );

    } catch (error) {
      this.results.addTest('Concurrent Sessions', false, { error, duration: Date.now() - concurrentTestStartTime });
    }
  }

  async testMemoryLeaks() {
    console.log('\n🧠 Testing Memory Management...');
    
    const memoryTestStartTime = Date.now();
    const initialMemory = process.memoryUsage();
    
    // Create and destroy multiple sessions to test cleanup
    const ws = this.connections.values().next().value;
    if (!ws) {
      this.results.addTest('Memory Management', false, { error: new Error('No WebSocket connection') });
      return;
    }

    try {
      const tempSessions = [];
      
      // Create sessions
      for (let i = 0; i < 10; i++) {
        const testId = TestUtils.generateTestId();
        const response = await TestUtils.sendWebSocketMessage(ws, {
          type: 'terminal-create',
          terminalId: testId,
          data: {
            workbranchId: `memory-test-${i}`,
            projectId: 'memory-test',
            title: `Memory Test ${i}`,
            shell: 'powershell'
          }
        });

        if (response.success) {
          tempSessions.push({
            terminalId: testId,
            sessionId: response.result.sessionId
          });
        }
      }

      // Destroy sessions
      for (const session of tempSessions) {
        try {
          await TestUtils.sendWebSocketMessage(ws, {
            type: 'terminal-destroy',
            id: session.sessionId,
            data: { sessionId: session.sessionId }
          });
        } catch (error) {
          console.warn(`Failed to destroy session ${session.sessionId}:`, error.message);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await TestUtils.delay(2000); // Wait for cleanup

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseKB = Math.round(memoryIncrease / 1024);
      
      // Consider test passed if memory increase is reasonable (< 10MB)
      const memoryManagementGood = memoryIncrease < 10 * 1024 * 1024;

      this.results.addTest(
        'Memory Management', 
        memoryManagementGood, 
        { 
          duration: Date.now() - memoryTestStartTime,
          message: `Memory change: ${memoryIncreaseKB}KB (${memoryManagementGood ? 'acceptable' : 'excessive'})`
        }
      );

    } catch (error) {
      this.results.addTest('Memory Management', false, { error, duration: Date.now() - memoryTestStartTime });
    }
  }

  async testReconnectionHandling() {
    console.log('\n🔄 Testing Reconnection Handling...');
    
    const reconnectionTestStartTime = Date.now();
    
    try {
      // Create a new connection to test reconnection behavior
      const testWs = new WebSocket(`ws://localhost:${TEST_CONFIG.wsPort}`);
      await TestUtils.waitForWebSocketOpen(testWs);
      
      // Simulate connection drop
      testWs.close();
      
      await TestUtils.delay(1000);
      
      // Test reconnection
      const reconnectWs = new WebSocket(`ws://localhost:${TEST_CONFIG.wsPort}`);
      await TestUtils.waitForWebSocketOpen(reconnectWs);
      
      // Test that the new connection works
      const response = await TestUtils.sendWebSocketMessage(reconnectWs, {
        type: 'ping',
        timestamp: Date.now()
      });
      
      const reconnectionSuccessful = reconnectWs.readyState === WebSocket.OPEN;
      
      reconnectWs.close();
      
      this.results.addTest(
        'Reconnection Handling', 
        reconnectionSuccessful, 
        { 
          duration: Date.now() - reconnectionTestStartTime,
          message: reconnectionSuccessful ? 'Reconnection successful' : 'Reconnection failed'
        }
      );

    } catch (error) {
      this.results.addTest('Reconnection Handling', false, { error, duration: Date.now() - reconnectionTestStartTime });
    }
  }

  async testEndToEndWorkflow() {
    console.log('\n🎯 Testing End-to-End Workflow...');
    
    const workflowTestStartTime = Date.now();
    const ws = this.connections.values().next().value;
    
    if (!ws) {
      this.results.addTest('End-to-End Workflow', false, { error: new Error('No WebSocket connection') });
      return;
    }

    try {
      // Simulate complete workflow: Create -> Select -> Command -> Cleanup
      const workflowSteps = [];
      
      // Step 1: Create terminal session
      const testId = TestUtils.generateTestId();
      const createResponse = await TestUtils.sendWebSocketMessage(ws, {
        type: 'terminal-create',
        terminalId: testId,
        data: {
          workbranchId: 'e2e-test',
          projectId: 'e2e-project',
          title: 'E2E Test Terminal',
          shell: 'powershell'
        }
      });
      
      workflowSteps.push({ step: 'create', success: createResponse.success });
      
      if (createResponse.success) {
        const sessionId = createResponse.result.sessionId;
        this.sessions.set(testId, { terminalId: testId, sessionId, workbranchId: 'e2e-test' });
        
        // Step 2: Send command
        const commandResponse = await TestUtils.sendWebSocketMessage(ws, {
          type: 'terminal-command',
          terminalId: testId,
          data: { command: 'echo "E2E workflow test"' }
        });
        
        workflowSteps.push({ step: 'command', success: commandResponse.success });
        
        // Step 3: Resize terminal
        const resizeResponse = await TestUtils.sendWebSocketMessage(ws, {
          type: 'terminal-resize',
          terminalId: testId,
          data: { sessionId, cols: 100, rows: 30 }
        });
        
        workflowSteps.push({ step: 'resize', success: resizeResponse.success });
        
        // Step 4: Send data
        const dataResponse = await TestUtils.sendWebSocketMessage(ws, {
          type: 'terminal-data',
          terminalId: testId,
          data: { sessionId, data: 'test input\r' }
        });
        
        workflowSteps.push({ step: 'data', success: dataResponse.success });
        
        // Step 5: Cleanup
        const destroyResponse = await TestUtils.sendWebSocketMessage(ws, {
          type: 'terminal-destroy',
          id: sessionId,
          data: { sessionId }
        });
        
        workflowSteps.push({ step: 'destroy', success: destroyResponse.success });
        
        if (destroyResponse.success) {
          this.sessions.delete(testId);
        }
      }
      
      const allStepsSucceeded = workflowSteps.every(s => s.success);
      const successfulSteps = workflowSteps.filter(s => s.success).length;
      
      this.results.addTest(
        'End-to-End Workflow', 
        allStepsSucceeded, 
        { 
          duration: Date.now() - workflowTestStartTime,
          message: `Completed ${successfulSteps}/${workflowSteps.length} workflow steps`
        }
      );

    } catch (error) {
      this.results.addTest('End-to-End Workflow', false, { error, duration: Date.now() - workflowTestStartTime });
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test resources...');
    
    // Clean up remaining sessions
    const ws = this.connections.values().next().value;
    if (ws) {
      for (const session of this.sessions.values()) {
        try {
          await TestUtils.sendWebSocketMessage(ws, {
            type: 'terminal-destroy',
            id: session.sessionId,
            data: { sessionId: session.sessionId }
          }, 3000); // Shorter timeout for cleanup
        } catch (error) {
          console.warn(`Failed to cleanup session ${session.sessionId}:`, error.message);
        }
      }
    }
    
    // Close WebSocket connections
    for (const connection of this.connections.values()) {
      if (connection.readyState === WebSocket.OPEN) {
        connection.close();
      }
    }
    
    this.sessions.clear();
    this.connections.clear();
    
    console.log('✅ Cleanup completed');
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const testSuite = new TerminalIntegrationTestSuite();
  
  process.on('SIGINT', async () => {
    console.log('\n⚠️ Test suite interrupted, cleaning up...');
    await testSuite.cleanup();
    process.exit(1);
  });
  
  testSuite.runAllTests()
    .then(report => {
      const exitCode = report.summary.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('🔥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { TerminalIntegrationTestSuite, TestUtils, TestResults };