/**
 * Terminal Test Helper - Verify real terminal streaming functionality
 * 
 * This helper provides methods to test the complete terminal integration:
 * React SimpleTerminal → VS Code Extension → node-pty → Real Output Stream
 */

export interface TerminalTestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: Date;
}

export class TerminalTestHelper {
  private static testResults: TerminalTestResult[] = [];

  /**
   * Test if VS Code webview environment is available
   */
  static testVSCodeEnvironment(): TerminalTestResult {
    const result: TerminalTestResult = {
      success: false,
      message: '',
      timestamp: new Date()
    };

    try {
      const hasVSCode = !!(window as any).vsCodePortfolio;
      const isWebview = !!(window as any).vsCodePortfolio?.isVSCodeWebview;
      const hasCreateTerminal = typeof (window as any).vsCodePortfolio?.createTerminal === 'function';
      const hasExecuteCommand = typeof (window as any).vsCodePortfolio?.executeTerminalCommand === 'function';

      result.success = hasVSCode && isWebview && hasCreateTerminal && hasExecuteCommand;
      result.message = result.success 
        ? 'VS Code webview environment detected with terminal functions'
        : 'VS Code webview environment not available or missing terminal functions';
      
      result.details = {
        hasVSCode,
        isWebview,
        hasCreateTerminal,
        hasExecuteCommand,
        availableFunctions: Object.keys((window as any).vsCodePortfolio || {})
      };

    } catch (error) {
      result.message = `Error testing VS Code environment: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.details = { error };
    }

    this.testResults.push(result);
    return result;
  }

  /**
   * Test terminal creation
   */
  static async testTerminalCreation(workbranchId: string = 'test-branch', projectId?: string): Promise<TerminalTestResult> {
    const result: TerminalTestResult = {
      success: false,
      message: '',
      timestamp: new Date()
    };

    try {
      if (!(window as any).vsCodePortfolio?.isVSCodeWebview) {
        result.message = 'VS Code webview not available for terminal creation test';
        this.testResults.push(result);
        return result;
      }

      // Set up message listener for terminal creation response
      let messageReceived = false;
      const messageHandler = (event: any) => {
        const message = event.detail;
        if (message.type === 'terminal:created' && message.workbranchId === workbranchId) {
          messageReceived = true;
          result.success = true;
          result.message = `Terminal created successfully: ${message.terminalId}`;
          result.details = {
            terminalId: message.terminalId,
            workbranchId: message.workbranchId,
            shell: message.shell
          };
        } else if (message.type === 'terminal:error') {
          result.message = `Terminal creation failed: ${message.error}`;
          result.details = { error: message.error };
        }
      };

      window.addEventListener('terminal-message', messageHandler);

      // Create terminal
      (window as any).vsCodePortfolio.createTerminal(workbranchId, projectId, 'powershell');

      // Wait for response (with timeout)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (!messageReceived) {
            result.message = 'Terminal creation test timed out - no response received';
          }
          resolve();
        }, 5000);

        const checkInterval = setInterval(() => {
          if (messageReceived) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      window.removeEventListener('terminal-message', messageHandler);

    } catch (error) {
      result.message = `Error testing terminal creation: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.details = { error };
    }

    this.testResults.push(result);
    return result;
  }

  /**
   * Test command execution and output streaming
   */
  static async testCommandExecution(terminalId: string, testCommand: string = 'echo "Hello from real terminal!"'): Promise<TerminalTestResult> {
    const result: TerminalTestResult = {
      success: false,
      message: '',
      timestamp: new Date()
    };

    try {
      if (!(window as any).vsCodePortfolio?.isVSCodeWebview) {
        result.message = 'VS Code webview not available for command execution test';
        this.testResults.push(result);
        return result;
      }

      // Set up message listener for terminal output
      let outputReceived = false;
      const outputLines: string[] = [];
      
      const messageHandler = (event: any) => {
        const message = event.detail;
        if (message.type === 'terminal:output' && message.terminalId === terminalId) {
          outputReceived = true;
          outputLines.push(message.data);
          
          // Check if we got the expected output
          if (message.data.includes('Hello from real terminal!')) {
            result.success = true;
            result.message = 'Command executed successfully with real terminal output';
            result.details = {
              command: testCommand,
              output: outputLines.join('\n'),
              outputLineCount: outputLines.length
            };
          }
        }
      };

      window.addEventListener('terminal-message', messageHandler);

      // Execute command
      (window as any).vsCodePortfolio.executeTerminalCommand(terminalId, testCommand);

      // Wait for output (with timeout)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (!outputReceived) {
            result.message = 'Command execution test timed out - no output received';
          } else if (!result.success) {
            result.message = 'Command executed but expected output not found';
            result.details = {
              command: testCommand,
              receivedOutput: outputLines.join('\n'),
              outputLineCount: outputLines.length
            };
          }
          resolve();
        }, 10000);

        const checkInterval = setInterval(() => {
          if (result.success) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      window.removeEventListener('terminal-message', messageHandler);

    } catch (error) {
      result.message = `Error testing command execution: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.details = { error };
    }

    this.testResults.push(result);
    return result;
  }

  /**
   * Run complete terminal integration test suite
   */
  static async runCompleteTest(): Promise<{
    success: boolean;
    results: TerminalTestResult[];
    summary: string;
  }> {
    console.log('🧪 Starting Terminal Integration Test Suite...');
    
    const results: TerminalTestResult[] = [];
    
    // Test 1: VS Code Environment
    console.log('🔍 Testing VS Code environment...');
    const envTest = this.testVSCodeEnvironment();
    results.push(envTest);
    console.log(envTest.success ? '✅' : '❌', envTest.message);

    if (!envTest.success) {
      return {
        success: false,
        results,
        summary: 'VS Code environment test failed - cannot proceed with terminal tests'
      };
    }

    // Test 2: Terminal Creation
    console.log('🎯 Testing terminal creation...');
    const createTest = await this.testTerminalCreation('test-integration', 'test-project');
    results.push(createTest);
    console.log(createTest.success ? '✅' : '❌', createTest.message);

    if (!createTest.success) {
      return {
        success: false,
        results,
        summary: 'Terminal creation test failed - cannot test command execution'
      };
    }

    // Test 3: Command Execution and Output Streaming
    if (createTest.details?.terminalId) {
      console.log('⚡ Testing command execution and output streaming...');
      const commandTest = await this.testCommandExecution(
        createTest.details.terminalId, 
        'echo "Real terminal streaming test successful!"'
      );
      results.push(commandTest);
      console.log(commandTest.success ? '✅' : '❌', commandTest.message);
    }

    const allSuccessful = results.every(r => r.success);
    const successCount = results.filter(r => r.success).length;
    
    const summary = allSuccessful 
      ? `🎉 All tests passed! (${successCount}/${results.length}) - Real terminal streaming is working correctly`
      : `⚠️ Some tests failed (${successCount}/${results.length}) - Check individual test results`;

    console.log(summary);
    
    return {
      success: allSuccessful,
      results,
      summary
    };
  }

  /**
   * Get all test results
   */
  static getTestResults(): TerminalTestResult[] {
    return [...this.testResults];
  }

  /**
   * Clear test results
   */
  static clearTestResults(): void {
    this.testResults = [];
  }

  /**
   * Export test results as JSON
   */
  static exportTestResults(): string {
    return JSON.stringify({
      testSuite: 'Terminal Integration Tests',
      timestamp: new Date().toISOString(),
      results: this.testResults,
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.success).length,
        failed: this.testResults.filter(r => !r.success).length
      }
    }, null, 2);
  }
}

// Global helper for browser console testing
declare global {
  interface Window {
    TerminalTestHelper: typeof TerminalTestHelper;
  }
}

// Export to window for console access
if (typeof window !== 'undefined') {
  window.TerminalTestHelper = TerminalTestHelper;
}
