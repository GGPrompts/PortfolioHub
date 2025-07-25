/**
 * Test Verification Script
 * 
 * Quick verification that all test components are properly set up
 * and can be executed. This is a dry-run test to validate the 
 * testing infrastructure without requiring active WebSocket services.
 * 
 * Usage: node tests/test-verification.js
 */

const fs = require('fs');
const path = require('path');

// Test file verification
const TEST_FILES = {
  'terminal-integration-test-suite.js': 'Integration testing framework',
  'terminal-performance-tests.js': 'Performance and load testing',
  'terminal-workflow-tests.js': 'Multi-terminal workflow validation',
  'run-all-terminal-tests.js': 'Test suite orchestrator',
  'README.md': 'Testing documentation'
};

// Package.json script verification
const REQUIRED_SCRIPTS = [
  'test',
  'test:quick', 
  'test:integration',
  'test:performance',
  'test:workflow'
];

class TestVerification {
  constructor() {
    this.results = {
      fileChecks: [],
      scriptChecks: [],
      dependencyChecks: [],
      passed: 0,
      failed: 0
    };
  }

  async runVerification() {
    console.log('🔍 Terminal Test Suite Verification');
    console.log('===================================');

    try {
      await this.verifyTestFiles();
      await this.verifyPackageScripts();
      await this.verifyDependencies(); 
      await this.verifyTestStructure();
      await this.performDryRunTests();

      this.printResults();
      return this.results.failed === 0;

    } catch (error) {
      console.error('🔥 Verification failed:', error);
      return false;
    }
  }

  async verifyTestFiles() {
    console.log('\n📁 Verifying test files...');

    for (const [filename, description] of Object.entries(TEST_FILES)) {
      const filepath = path.join(__dirname, filename);
      const exists = fs.existsSync(filepath);
      
      if (exists) {
        const stats = fs.statSync(filepath);
        const sizeKB = Math.round(stats.size / 1024);
        
        this.addResult('fileChecks', `${filename}`, true, 
          `${description} (${sizeKB}KB)`);
      } else {
        this.addResult('fileChecks', `${filename}`, false, 'File not found');
      }
    }
  }

  async verifyPackageScripts() {
    console.log('\n📦 Verifying package.json scripts...');

    try {
      const packagePath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const scripts = packageJson.scripts || {};

      for (const scriptName of REQUIRED_SCRIPTS) {
        const exists = scripts[scriptName] !== undefined;
        const command = scripts[scriptName] || 'Not found';
        
        this.addResult('scriptChecks', `npm run ${scriptName}`, exists, command);
      }

      // Check for testing dependencies
      const devDeps = packageJson.devDependencies || {};
      const deps = packageJson.dependencies || {};
      
      const wsInstalled = deps.ws || devDeps.ws;
      this.addResult('dependencyChecks', 'WebSocket library (ws)', !!wsInstalled, 
        wsInstalled || 'Not installed');

    } catch (error) {
      this.addResult('scriptChecks', 'package.json', false, `Error: ${error.message}`);
    }
  }

  async verifyDependencies() {
    console.log('\n🔗 Verifying dependencies...');

    const requiredModules = ['ws', 'path', 'fs', 'http'];
    
    for (const moduleName of requiredModules) {
      try {
        require.resolve(moduleName);
        this.addResult('dependencyChecks', `Node.js module: ${moduleName}`, true, 'Available');
      } catch (error) {
        this.addResult('dependencyChecks', `Node.js module: ${moduleName}`, false, 'Not available');
      }
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const versionValid = parseInt(nodeVersion.substring(1)) >= 16;
    this.addResult('dependencyChecks', 'Node.js version', versionValid, 
      `${nodeVersion} (requires >=16.0.0)`);
  }

  async verifyTestStructure() {
    console.log('\n🏗️ Verifying test structure...');

    // Check for results directory structure
    const resultsDir = path.join(__dirname, 'results');
    const resultsDirExists = fs.existsSync(resultsDir);
    
    if (!resultsDirExists) {
      try {
        fs.mkdirSync(resultsDir, { recursive: true });
        this.addResult('fileChecks', 'results directory', true, 'Created successfully');
      } catch (error) {
        this.addResult('fileChecks', 'results directory', false, `Failed to create: ${error.message}`);
      }
    } else {
      this.addResult('fileChecks', 'results directory', true, 'Already exists');
    }

    // Verify test file syntax (basic check)
    const testFiles = [
      'terminal-integration-test-suite.js',
      'terminal-performance-tests.js', 
      'terminal-workflow-tests.js',
      'run-all-terminal-tests.js'
    ];

    for (const filename of testFiles) {
      try {
        const filepath = path.join(__dirname, filename);
        const content = fs.readFileSync(filepath, 'utf8');
        
        // Basic syntax checks
        const hasRequiredExports = content.includes('module.exports') || content.includes('if (require.main === module)');
        const hasProperStructure = content.includes('class') && content.includes('async');
        
        if (hasRequiredExports && hasProperStructure) {
          this.addResult('fileChecks', `${filename} structure`, true, 'Valid test structure');
        } else {
          this.addResult('fileChecks', `${filename} structure`, false, 'Invalid structure');
        }
        
      } catch (error) {
        this.addResult('fileChecks', `${filename} syntax`, false, error.message);
      }
    }
  }

  async performDryRunTests() {
    console.log('\n🧪 Performing dry-run tests...');

    try {
      // Test utility classes can be imported
      const { TestUtils } = require('./terminal-integration-test-suite.js');
      this.addResult('fileChecks', 'Integration test imports', true, 'TestUtils class available');
    } catch (error) {
      this.addResult('fileChecks', 'Integration test imports', false, error.message);
    }

    try {
      const { PerformanceTestUtils } = require('./terminal-performance-tests.js');
      this.addResult('fileChecks', 'Performance test imports', true, 'PerformanceTestUtils available');
    } catch (error) {
      this.addResult('fileChecks', 'Performance test imports', false, error.message);
    }

    try {
      const { WorkflowTestUtils } = require('./terminal-workflow-tests.js');
      this.addResult('fileChecks', 'Workflow test imports', true, 'WorkflowTestUtils available');
    } catch (error) {
      this.addResult('fileChecks', 'Workflow test imports', false, error.message);
    }

    try {
      const { TerminalTestRunner } = require('./run-all-terminal-tests.js');
      this.addResult('fileChecks', 'Test runner imports', true, 'TerminalTestRunner available');
    } catch (error) {
      this.addResult('fileChecks', 'Test runner imports', false, error.message);
    }

    // Test basic utility functions
    try {
      const { TestUtils } = require('./terminal-integration-test-suite.js');
      const testId = TestUtils.generateTestId();
      const validId = typeof testId === 'string' && testId.startsWith('test-');
      this.addResult('fileChecks', 'Utility functions', validId, 
        validId ? `Generated ID: ${testId}` : 'Invalid ID generation');
    } catch (error) {
      this.addResult('fileChecks', 'Utility functions', false, error.message);
    }
  }

  addResult(category, name, passed, details) {
    this.results[category].push({ name, passed, details });
    
    if (passed) {
      this.results.passed++;
      console.log(`✅ ${name} - ${details}`);
    } else {
      this.results.failed++;  
      console.log(`❌ ${name} - ${details}`);
    }
  }

  printResults() {
    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('======================');
    console.log(`Total Checks: ${this.results.passed + this.results.failed}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

    if (this.results.failed === 0) {
      console.log('\n🎉 All verification checks passed!');
      console.log('The terminal testing suite is properly configured and ready to use.');
      console.log('\nNext steps:');
      console.log('1. Ensure VS Code extension is active');
      console.log('2. Run: npm run test:quick');
      console.log('3. For full testing: npm run test');
    } else {
      console.log('\n⚠️ Some verification checks failed.');
      console.log('Please resolve the issues above before running the test suite.');
      
      if (this.results.failed > 0) {
        console.log('\nFailed checks:');
        ['fileChecks', 'scriptChecks', 'dependencyChecks'].forEach(category => {
          this.results[category]
            .filter(result => !result.passed)
            .forEach(result => {
              console.log(`  • ${result.name}: ${result.details}`);
            });
        });
      }
    }

    // Generate verification report
    const reportPath = path.join(__dirname, 'verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      results: this.results,
      summary: {
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)
      }
    }, null, 2));

    console.log(`\n💾 Verification report saved: ${reportPath}`);
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  const verification = new TestVerification();
  
  verification.runVerification()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('🔥 Verification crashed:', error);
      process.exit(1);
    });
}

module.exports = { TestVerification };