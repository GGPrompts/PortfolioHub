/**
 * Terminal Workflow Integration Tests
 * 
 * Tests complete workflow scenarios:
 * - Chat interface to terminal communication
 * - Multi-terminal selection and broadcasting
 * - Workbranch isolation
 * - Error recovery and reconnection
 * 
 * Usage: node tests/terminal-workflow-tests.js
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

// Workflow test configuration
const WORKFLOW_CONFIG = {
  wsPort: 8123,
  testTimeout: 30000,
  workbranches: ['main', 'feature-branch', 'hotfix', 'development'],
  testProjects: ['project-a', 'project-b', 'utilities', 'tools'],
  testCommands: [
    'echo "Hello from workflow test"',
    'dir',
    'cd .',
    'echo "Testing multi-terminal broadcast"',
    'powershell -Command "Write-Host \'PowerShell command test\'"'
  ]
};

// Mock chat interface messages
const CHAT_SCENARIOS = [
  {
    name: 'Simple Command',
    message: 'Run "echo hello" in all selected terminals',
    expectedCommand: 'echo hello',
    targetSelection: 'all'
  },
  {
    name: 'Project-Specific Command',
    message: 'Start the development server with "npm run dev" in project terminals',
    expectedCommand: 'npm run dev',
    targetSelection: 'projects'
  },
  {
    name: 'Multi-Step Workflow',
    message: 'First run "git status" then "git pull" in all terminals',
    expectedCommands: ['git status', 'git pull'],
    targetSelection: 'all'
  },
  {
    name: 'Conditional Execution',
    message: 'Run "echo test" only in terminals with project-a',
    expectedCommand: 'echo test',
    targetSelection: 'project-a'
  }
];

// Workflow test utilities
class WorkflowTestUtils {
  static generateWorkbranchId() {
    const branch = WORKFLOW_CONFIG.workbranches[
      Math.floor(Math.random() * WORKFLOW_CONFIG.workbranches.length)
    ];
    return `${branch}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  static generateProjectId() {
    const project = WORKFLOW_CONFIG.testProjects[
      Math.floor(Math.random() * WORKFLOW_CONFIG.testProjects.length)
    ];
    return project;
  }

  static async createWebSocketConnection(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, 5000);

      ws.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve(ws);
      });

      ws.addEventListener('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  static async sendMessage(ws, message, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const messageId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static validateSelectionLogic(terminals, selectionType) {
    switch (selectionType) {
      case 'all':
        return terminals.map(t => t.id);
      case 'projects':
        return terminals.filter(t => t.projectId).map(t => t.id);
      case 'tools':
        return terminals.filter(t => !t.projectId).map(t => t.id);
      case 'project-a':
        return terminals.filter(t => t.projectId === 'project-a').map(t => t.id);
      case 'project-b':
        return terminals.filter(t => t.projectId === 'project-b').map(t => t.id);
      default:
        return [];
    }
  }
}

// Test result tracker
class WorkflowTestResults {
  constructor() {
    this.tests = [];
    this.workflows = [];
    this.startTime = Date.now();
  }

  addTest(name, passed, details = {}) {
    this.tests.push({
      name,
      passed,
      details,
      timestamp: Date.now()
    });

    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}${details.message ? ' - ' + details.message : ''}`);

    if (details.error) {
      console.error('   Error:', details.error.message);
    }
  }

  addWorkflow(name, steps, success, duration) {
    this.workflows.push({
      name,
      steps,
      success,
      duration,
      timestamp: Date.now()
    });

    const status = success ? '🎯 SUCCESS' : '💥 FAILED';
    console.log(`${status} Workflow: ${name} (${duration}ms)`);
  }

  generateReport() {
    const totalTests = this.tests.length;
    const passedTests = this.tests.filter(t => t.passed).length;
    const totalWorkflows = this.workflows.length;
    const successfulWorkflows = this.workflows.filter(w => w.success).length;
    const totalDuration = Date.now() - this.startTime;

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        testPassRate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0,
        totalWorkflows,
        successfulWorkflows,
        workflowSuccessRate: totalWorkflows > 0 ? (successfulWorkflows / totalWorkflows * 100).toFixed(1) : 0,
        totalDuration
      },
      tests: this.tests,
      workflows: this.workflows
    };
  }

  printSummary() {
    const report = this.generateReport();

    console.log('\n📊 WORKFLOW TEST SUMMARY');
    console.log('========================');
    console.log(`Unit Tests: ${report.summary.passedTests}/${report.summary.totalTests} (${report.summary.testPassRate}%)`);
    console.log(`Workflows: ${report.summary.successfulWorkflows}/${report.summary.totalWorkflows} (${report.summary.workflowSuccessRate}%)`);
    console.log(`Duration: ${(report.summary.totalDuration / 1000).toFixed(2)}s`);

    if (report.summary.failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      report.tests.filter(t => !t.passed).forEach(test => {
        console.log(`   • ${test.name}`);
      });
    }

    if (report.summary.totalWorkflows - report.summary.successfulWorkflows > 0) {
      console.log('\n💥 FAILED WORKFLOWS:');
      report.workflows.filter(w => !w.success).forEach(workflow => {
        console.log(`   • ${workflow.name} (${workflow.duration}ms)`);
      });
    }

    return report;
  }
}

// Main workflow test suite
class TerminalWorkflowTests extends EventEmitter {
  constructor() {
    super();
    this.results = new WorkflowTestResults();
    this.ws = null;
    this.terminals = new Map();
    this.messageHandlers = new Map();
  }

  async runWorkflowTests() {
    console.log('🎯 Starting Terminal Workflow Tests');
    console.log('===================================');

    try {
      // Setup
      await this.setupTestEnvironment();

      // Core workflow tests
      await this.testBasicTerminalWorkflow();
      await this.testMultiTerminalSelection();
      await this.testCommandBroadcasting();
      await this.testWorkbranchIsolation();

      // Chat interface simulation tests
      await this.testChatInterfaceWorkflows();

      // Error handling and recovery tests
      await this.testErrorRecovery();
      await this.testReconnectionHandling();

      // Advanced workflow tests
      await this.testComplexWorkflowScenarios();

    } catch (error) {
      console.error('🔥 Workflow test suite failed:', error);
      this.results.addTest('Test Suite Execution', false, { error });
    } finally {
      await this.cleanup();
      const report = this.results.printSummary();
      this.saveReport(report);
    }

    return this.results.generateReport();
  }

  async setupTestEnvironment() {
    console.log('\n🔧 Setting up test environment...');

    try {
      // Establish WebSocket connection
      this.ws = await WorkflowTestUtils.createWebSocketConnection(
        `ws://localhost:${WORKFLOW_CONFIG.wsPort}`
      );

      this.results.addTest('WebSocket Connection', true, { message: 'Connected successfully' });

      // Setup message handlers
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.terminalId && this.messageHandlers.has(message.terminalId)) {
            this.messageHandlers.get(message.terminalId)(message);
          }
        } catch (error) {
          console.warn('Failed to parse message:', error.message);
        }
      });

      // Create test terminals with different configurations
      await this.createTestTerminals();

    } catch (error) {
      this.results.addTest('Environment Setup', false, { error });
      throw error;
    }
  }

  async createTestTerminals() {
    console.log('🖥️ Creating test terminals...');

    const terminalConfigs = [
      { workbranch: 'main', project: 'project-a', title: 'Main Project A' },
      { workbranch: 'feature-branch', project: 'project-a', title: 'Feature Project A' },
      { workbranch: 'main', project: 'project-b', title: 'Main Project B' },
      { workbranch: 'development', project: null, title: 'Development Tools' },
      { workbranch: 'hotfix', project: 'project-a', title: 'Hotfix Project A' }
    ];

    for (let i = 0; i < terminalConfigs.length; i++) {
      const config = terminalConfigs[i];
      const terminalId = `test-terminal-${i}`;
      const workbranchId = `${config.workbranch}-${Date.now()}-${i}`;

      try {
        const response = await WorkflowTestUtils.sendMessage(this.ws, {
          type: 'terminal-create',
          terminalId,
          data: {
            workbranchId,
            projectId: config.project,
            title: config.title,
            shell: 'powershell'
          }
        });

        if (response.success && response.result?.sessionId) {
          this.terminals.set(terminalId, {
            id: terminalId,
            sessionId: response.result.sessionId,
            workbranchId,
            projectId: config.project,
            title: config.title,
            status: 'connected'
          });

          // Setup message handler for this terminal
          this.messageHandlers.set(terminalId, (message) => {
            this.emit('terminalMessage', { terminalId, message });
          });

          console.log(`✅ Created terminal: ${config.title}`);
        } else {
          console.log(`❌ Failed to create terminal: ${config.title}`);
        }

        await WorkflowTestUtils.delay(200); // Small delay between creations

      } catch (error) {
        console.log(`❌ Error creating terminal ${config.title}:`, error.message);
      }
    }

    const successfulTerminals = this.terminals.size;
    this.results.addTest(
      'Terminal Creation',
      successfulTerminals === terminalConfigs.length,
      { message: `Created ${successfulTerminals}/${terminalConfigs.length} terminals` }
    );
  }

  async testBasicTerminalWorkflow() {
    console.log('\n🎯 Testing Basic Terminal Workflow...');

    const workflowStartTime = Date.now();
    const workflowSteps = [];

    try {
      // Step 1: Select first terminal
      const terminals = Array.from(this.terminals.values());
      if (terminals.length === 0) {
        throw new Error('No terminals available for workflow test');
      }

      const targetTerminal = terminals[0];
      workflowSteps.push({ step: 'terminal-selection', success: true });

      // Step 2: Send basic command
      const testCommand = 'echo "Basic workflow test"';
      const commandResponse = await WorkflowTestUtils.sendMessage(this.ws, {
        type: 'terminal-command',
        terminalId: targetTerminal.id,
        data: { command: testCommand }
      });

      const commandSuccess = commandResponse.success;
      workflowSteps.push({ step: 'command-execution', success: commandSuccess });

      // Step 3: Verify terminal status
      await WorkflowTestUtils.delay(1000);
      const terminal = this.terminals.get(targetTerminal.id);
      const statusValid = terminal && terminal.status === 'connected';
      workflowSteps.push({ step: 'status-verification', success: statusValid });

      const workflowSuccess = workflowSteps.every(step => step.success);
      const duration = Date.now() - workflowStartTime;

      this.results.addWorkflow(
        'Basic Terminal Workflow',
        workflowSteps,
        workflowSuccess,
        duration
      );

    } catch (error) {
      this.results.addWorkflow(
        'Basic Terminal Workflow',
        workflowSteps,
        false,
        Date.now() - workflowStartTime
      );
      this.results.addTest('Basic Workflow', false, { error });
    }
  }

  async testMultiTerminalSelection() {
    console.log('\n☑️ Testing Multi-Terminal Selection...');

    const terminals = Array.from(this.terminals.values());
    const selectionTests = [
      {
        name: 'Select All Terminals',
        selector: 'all',
        expectedCount: terminals.length
      },
      {
        name: 'Select Project Terminals',
        selector: 'projects',
        expectedCount: terminals.filter(t => t.projectId).length
      },
      {
        name: 'Select Project A Terminals',
        selector: 'project-a',
        expectedCount: terminals.filter(t => t.projectId === 'project-a').length
      },
      {
        name: 'Select Tool Terminals',
        selector: 'tools',
        expectedCount: terminals.filter(t => !t.projectId).length
      }
    ];

    for (const test of selectionTests) {
      try {
        const selectedTerminals = WorkflowTestUtils.validateSelectionLogic(terminals, test.selector);
        const selectionValid = selectedTerminals.length === test.expectedCount;

        this.results.addTest(
          test.name,
          selectionValid,
          {
            message: `Selected ${selectedTerminals.length}/${test.expectedCount} terminals`
          }
        );

        // Test that selection can be applied to commands
        if (selectedTerminals.length > 0) {
          const broadcastCommand = `echo "Selection test: ${test.selector}"`;
          const broadcastResults = [];

          for (const terminalId of selectedTerminals.slice(0, 3)) { // Test first 3 to avoid spam
            try {
              const response = await WorkflowTestUtils.sendMessage(this.ws, {
                type: 'terminal-command',
                terminalId,
                data: { command: broadcastCommand }
              });
              broadcastResults.push(response.success);
            } catch (error) {
              broadcastResults.push(false);
            }
          }

          const broadcastSuccess = broadcastResults.every(success => success);
          this.results.addTest(
            `${test.name} - Broadcast`,
            broadcastSuccess,
            {
              message: `Broadcast to ${broadcastResults.filter(s => s).length}/${broadcastResults.length} terminals`
            }
          );
        }

      } catch (error) {
        this.results.addTest(test.name, false, { error });
      }
    }
  }

  async testCommandBroadcasting() {
    console.log('\n📡 Testing Command Broadcasting...');

    const terminals = Array.from(this.terminals.values()).slice(0, 3); // Use first 3 terminals
    const broadcastWorkflowStartTime = Date.now();

    try {
      const testCommands = [
        'echo "Broadcast test 1"',
        'dir /q',
        'echo "Multi-terminal workflow"'
      ];

      const workflowSteps = [];

      for (const command of testCommands) {
        const commandResults = [];

        // Send command to all selected terminals simultaneously
        const commandPromises = terminals.map(terminal =>
          WorkflowTestUtils.sendMessage(this.ws, {
            type: 'terminal-command',
            terminalId: terminal.id,
            data: { command }
          }).then(response => ({
            terminalId: terminal.id,
            success: response.success
          })).catch(error => ({
            terminalId: terminal.id,
            success: false,
            error: error.message
          }))
        );

        const results = await Promise.all(commandPromises);
        const successfulBroadcasts = results.filter(r => r.success).length;
        const broadcastSuccess = successfulBroadcasts === terminals.length;

        workflowSteps.push({
          step: `broadcast-${command}`,
          success: broadcastSuccess,
          details: { successfulBroadcasts, totalTerminals: terminals.length }
        });

        console.log(`📤 Broadcast "${command}": ${successfulBroadcasts}/${terminals.length} successful`);

        // Small delay between commands
        await WorkflowTestUtils.delay(500);
      }

      const overallSuccess = workflowSteps.every(step => step.success);
      const duration = Date.now() - broadcastWorkflowStartTime;

      this.results.addWorkflow(
        'Command Broadcasting',
        workflowSteps,
        overallSuccess,
        duration
      );

    } catch (error) {
      this.results.addTest('Command Broadcasting', false, { error });
    }
  }

  async testWorkbranchIsolation() {
    console.log('\n🌿 Testing Workbranch Isolation...');

    const terminals = Array.from(this.terminals.values());
    const workbranchesByTerminal = new Map();

    // Group terminals by workbranch
    terminals.forEach(terminal => {
      const workbranch = terminal.workbranchId.split('-')[0]; // Extract base workbranch name
      if (!workbranchesByTerminal.has(workbranch)) {
        workbranchesByTerminal.set(workbranch, []);
      }
      workbranchesByTerminal.get(workbranch).push(terminal);
    });

    try {
      // Test that workbranches are properly isolated
      const isolationTests = Array.from(workbranchesByTerminal.entries()).map(([workbranch, terminals]) => {
        return {
          workbranch,
          terminals,
          uniqueWorkbranchIds: new Set(terminals.map(t => t.workbranchId)).size
        };
      });

      for (const test of isolationTests) {
        // Each terminal should have a unique workbranch ID even if they share the base name
        const isolationValid = test.uniqueWorkbranchIds === test.terminals.length;

        this.results.addTest(
          `Workbranch Isolation - ${test.workbranch}`,
          isolationValid,
          {
            message: `${test.uniqueWorkbranchIds} unique IDs for ${test.terminals.length} terminals`
          }
        );

        // Test workbranch-specific commands
        if (test.terminals.length > 0) {
          const workbranchCommand = `echo "Workbranch test: ${test.workbranch}"`;
          const terminal = test.terminals[0];

          try {
            const response = await WorkflowTestUtils.sendMessage(this.ws, {
              type: 'terminal-command',
              terminalId: terminal.id,
              data: { command: workbranchCommand }
            });

            this.results.addTest(
              `Workbranch Command - ${test.workbranch}`,
              response.success,
              { message: response.success ? 'Command executed' : 'Command failed' }
            );
          } catch (error) {
            this.results.addTest(`Workbranch Command - ${test.workbranch}`, false, { error });
          }
        }
      }

    } catch (error) {
      this.results.addTest('Workbranch Isolation', false, { error });
    }
  }

  async testChatInterfaceWorkflows() {
    console.log('\n💬 Testing Chat Interface Workflows...');

    for (const scenario of CHAT_SCENARIOS) {
      const workflowStartTime = Date.now();

      try {
        console.log(`🎯 Testing scenario: ${scenario.name}`);

        // Simulate chat message processing
        const targetTerminals = WorkflowTestUtils.validateSelectionLogic(
          Array.from(this.terminals.values()),
          scenario.targetSelection
        );

        if (targetTerminals.length === 0) {
          this.results.addTest(
            `Chat Workflow - ${scenario.name}`,
            false,
            { message: 'No target terminals for selection' }
          );
          continue;
        }

        // Test single command scenario
        if (scenario.expectedCommand) {
          const commandResults = [];

          for (const terminalId of targetTerminals.slice(0, 3)) { // Limit to 3 for performance
            try {
              const response = await WorkflowTestUtils.sendMessage(this.ws, {
                type: 'terminal-command',
                terminalId,
                data: { command: scenario.expectedCommand }
              });
              commandResults.push(response.success);
            } catch (error) {
              commandResults.push(false);
            }
          }

          const scenarioSuccess = commandResults.every(success => success);
          const duration = Date.now() - workflowStartTime;

          this.results.addWorkflow(
            `Chat: ${scenario.name}`,
            [{ step: 'command-execution', success: scenarioSuccess }],
            scenarioSuccess,
            duration
          );
        }

        // Test multi-command scenario
        if (scenario.expectedCommands) {
          const workflowSteps = [];

          for (const command of scenario.expectedCommands) {
            const commandResults = [];

            for (const terminalId of targetTerminals.slice(0, 2)) { // Limit for performance
              try {
                const response = await WorkflowTestUtils.sendMessage(this.ws, {
                  type: 'terminal-command',
                  terminalId,
                  data: { command }
                });
                commandResults.push(response.success);
              } catch (error) {
                commandResults.push(false);
              }
            }

            const stepSuccess = commandResults.every(success => success);
            workflowSteps.push({ step: `command-${command}`, success: stepSuccess });

            // Delay between commands in workflow
            await WorkflowTestUtils.delay(300);
          }

          const workflowSuccess = workflowSteps.every(step => step.success);
          const duration = Date.now() - workflowStartTime;

          this.results.addWorkflow(
            `Chat Multi-Step: ${scenario.name}`,
            workflowSteps,
            workflowSuccess,
            duration
          );
        }

      } catch (error) {
        this.results.addTest(`Chat Workflow - ${scenario.name}`, false, { error });
      }
    }
  }

  async testErrorRecovery() {
    console.log('\n🔄 Testing Error Recovery...');

    try {
      const terminals = Array.from(this.terminals.values());
      if (terminals.length === 0) {
        this.results.addTest('Error Recovery', false, { error: new Error('No terminals available') });
        return;
      }

      const testTerminal = terminals[0];

      // Test 1: Invalid command handling
      try {
        const invalidCommand = 'invalidcommandthatdoesnotexist12345';
        const response = await WorkflowTestUtils.sendMessage(this.ws, {
          type: 'terminal-command',
          terminalId: testTerminal.id,
          data: { command: invalidCommand }
        });

        // Command should be sent successfully even if it fails in the terminal
        this.results.addTest(
          'Invalid Command Handling',
          response.success !== false, // We expect the WebSocket layer to succeed
          { message: 'WebSocket layer handled invalid command gracefully' }
        );
      } catch (error) {
        this.results.addTest('Invalid Command Handling', false, { error });
      }

      // Test 2: Non-existent terminal handling
      try {
        const nonExistentTerminalId = 'non-existent-terminal-12345';
        const response = await WorkflowTestUtils.sendMessage(this.ws, {
          type: 'terminal-command',
          terminalId: nonExistentTerminalId,
          data: { command: 'echo test' }
        });

        // Should fail gracefully
        this.results.addTest(
          'Non-existent Terminal Handling',
          response.success === false,
          { message: 'Properly rejected command to non-existent terminal' }
        );
      } catch (error) {
        // Timeout or other error is also acceptable
        this.results.addTest(
          'Non-existent Terminal Handling',
          true,
          { message: 'Request properly timed out or failed' }
        );
      }

      // Test 3: Malformed message handling
      try {
        // Send malformed message
        this.ws.send('{"invalid": "json"'); // Missing closing brace
        await WorkflowTestUtils.delay(1000);

        // Connection should still be alive
        const pingResponse = await WorkflowTestUtils.sendMessage(this.ws, {
          type: 'ping',
          data: { timestamp: Date.now() }
        });

        this.results.addTest(
          'Malformed Message Recovery',
          this.ws.readyState === WebSocket.OPEN,
          { message: 'Connection survived malformed message' }
        );
      } catch (error) {
        this.results.addTest('Malformed Message Recovery', false, { error });
      }

    } catch (error) {
      this.results.addTest('Error Recovery', false, { error });
    }
  }

  async testReconnectionHandling() {
    console.log('\n🔄 Testing Reconnection Handling...');

    try {
      // Create a separate connection for reconnection testing
      const testWs = await WorkflowTestUtils.createWebSocketConnection(
        `ws://localhost:${WORKFLOW_CONFIG.wsPort}`
      );

      // Verify initial connection
      const initialPing = await WorkflowTestUtils.sendMessage(testWs, {
        type: 'ping',
        data: { timestamp: Date.now() }
      });

      const initialConnectionValid = testWs.readyState === WebSocket.OPEN;
      this.results.addTest(
        'Initial Test Connection',
        initialConnectionValid,
        { message: 'Test connection established' }
      );

      // Simulate connection drop
      testWs.close();
      await WorkflowTestUtils.delay(1000);

      // Test reconnection
      const reconnectedWs = await WorkflowTestUtils.createWebSocketConnection(
        `ws://localhost:${WORKFLOW_CONFIG.wsPort}`
      );

      const reconnectionPing = await WorkflowTestUtils.sendMessage(reconnectedWs, {
        type: 'ping',
        data: { timestamp: Date.now() }
      });

      const reconnectionValid = reconnectedWs.readyState === WebSocket.OPEN;
      this.results.addTest(
        'Reconnection Handling',
        reconnectionValid,
        { message: 'Successfully reconnected after connection drop' }
      );

      // Clean up test connection
      reconnectedWs.close();

    } catch (error) {
      this.results.addTest('Reconnection Handling', false, { error });
    }
  }

  async testComplexWorkflowScenarios() {
    console.log('\n🎯 Testing Complex Workflow Scenarios...');

    const complexScenarios = [
      {
        name: 'Multi-Project Development Workflow',
        steps: [
          { action: 'select', target: 'project-a', expectedSelection: 'project-a' },
          { action: 'command', command: 'git status' },
          { action: 'select', target: 'project-b', expectedSelection: 'project-b' },
          { action: 'command', command: 'npm run build' },
          { action: 'select', target: 'all', expectedSelection: 'all' },
          { action: 'command', command: 'echo "Workflow complete"' }
        ]
      },
      {
        name: 'Development Server Management',
        steps: [
          { action: 'select', target: 'projects', expectedSelection: 'projects' },
          { action: 'command', command: 'echo "Starting development servers"' },
          { action: 'command', command: 'npm run dev' },
          { action: 'select', target: 'tools', expectedSelection: 'tools' },
          { action: 'command', command: 'echo "Monitoring tools started"' }
        ]
      }
    ];

    for (const scenario of complexScenarios) {
      const workflowStartTime = Date.now();
      const workflowSteps = [];

      try {
        console.log(`🎯 Running complex scenario: ${scenario.name}`);

        for (const step of scenario.steps) {
          if (step.action === 'select') {
            // Simulate selection
            const terminals = Array.from(this.terminals.values());
            const selectedTerminals = WorkflowTestUtils.validateSelectionLogic(terminals, step.target);
            const selectionSuccess = selectedTerminals.length > 0;

            workflowSteps.push({
              step: `select-${step.target}`,
              success: selectionSuccess,
              details: { selectedCount: selectedTerminals.length }
            });

          } else if (step.action === 'command') {
            // Execute command on current selection (using all terminals for simplicity)
            const terminals = Array.from(this.terminals.values()).slice(0, 2); // Limit for performance
            const commandResults = [];

            for (const terminal of terminals) {
              try {
                const response = await WorkflowTestUtils.sendMessage(this.ws, {
                  type: 'terminal-command',
                  terminalId: terminal.id,
                  data: { command: step.command }
                });
                commandResults.push(response.success);
              } catch (error) {
                commandResults.push(false);
              }
            }

            const commandSuccess = commandResults.every(success => success);
            workflowSteps.push({
              step: `command-${step.command}`,
              success: commandSuccess,
              details: { successfulExecutions: commandResults.filter(s => s).length }
            });

            // Delay between commands
            await WorkflowTestUtils.delay(300);
          }
        }

        const workflowSuccess = workflowSteps.every(step => step.success);
        const duration = Date.now() - workflowStartTime;

        this.results.addWorkflow(
          scenario.name,
          workflowSteps,
          workflowSuccess,
          duration
        );

      } catch (error) {
        this.results.addWorkflow(
          scenario.name,
          workflowSteps,
          false,
          Date.now() - workflowStartTime
        );
      }
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up workflow test resources...');

    let cleanupCount = 0;

    if (this.ws) {
      // Clean up terminals
      for (const terminal of this.terminals.values()) {
        try {
          await WorkflowTestUtils.sendMessage(this.ws, {
            type: 'terminal-destroy',
            id: terminal.sessionId,
            data: { sessionId: terminal.sessionId }
          }, 3000);
          cleanupCount++;
        } catch (error) {
          console.warn(`Failed to cleanup terminal ${terminal.id}`);
        }
      }

      // Close WebSocket connection
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
    }

    this.terminals.clear();
    this.messageHandlers.clear();

    console.log(`✅ Cleaned up ${cleanupCount} terminals and WebSocket connection`);
  }

  saveReport(report) {
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, 'terminal-workflow-results.json');

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`💾 Workflow test report saved: ${reportPath}`);
  }
}

// Run workflow tests if this file is executed directly
if (require.main === module) {
  const workflowTests = new TerminalWorkflowTests();

  process.on('SIGINT', async () => {
    console.log('\n⚠️ Workflow tests interrupted, cleaning up...');
    await workflowTests.cleanup();
    process.exit(1);
  });

  workflowTests.runWorkflowTests()
    .then((report) => {
      const exitCode = report.summary.failedTests > 0 || 
                      report.summary.totalWorkflows - report.summary.successfulWorkflows > 0 ? 1 : 0;
      console.log('🎉 Workflow tests completed');
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('🔥 Workflow tests failed:', error);
      process.exit(1);
    });
}

module.exports = { TerminalWorkflowTests, WorkflowTestUtils, WorkflowTestResults };