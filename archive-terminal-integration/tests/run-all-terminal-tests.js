/**
 * Terminal Test Suite Runner
 * 
 * Orchestrates all terminal testing components:
 * - Integration tests
 * - Performance tests  
 * - Workflow tests
 * - Generates consolidated reports
 * 
 * Usage: node tests/run-all-terminal-tests.js [--quick] [--integration] [--performance] [--workflow]
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test suite configuration
const TEST_SUITE_CONFIG = {
  testTimeout: 300000, // 5 minutes per test suite
  retryAttempts: 1,
  parallel: false, // Run tests sequentially to avoid port conflicts
  outputDir: path.join(__dirname, 'results'),
  reportFormats: ['json', 'html', 'console']
};

// Available test suites
const TEST_SUITES = {
  integration: {
    name: 'Terminal Integration Tests',
    script: path.join(__dirname, 'terminal-integration-test-suite.js'),
    description: 'End-to-end terminal service functionality',
    priority: 1,
    estimatedDuration: 60000, // 1 minute
    dependencies: ['websocket-bridge']
  },
  workflow: {
    name: 'Terminal Workflow Tests', 
    script: path.join(__dirname, 'terminal-workflow-tests.js'),
    description: 'Multi-terminal workflow scenarios',
    priority: 2,
    estimatedDuration: 90000, // 1.5 minutes
    dependencies: ['websocket-bridge', 'terminal-sessions']
  },
  performance: {
    name: 'Terminal Performance Tests',
    script: path.join(__dirname, 'terminal-performance-tests.js'),
    description: 'Load testing and performance validation',
    priority: 3,
    estimatedDuration: 120000, // 2 minutes
    dependencies: ['websocket-bridge', 'terminal-sessions']
  }
};

// Test result aggregator
class TestSuiteAggregator {
  constructor() {
    this.results = {
      summary: {
        totalSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        skippedSuites: 0,
        totalDuration: 0,
        startTime: Date.now(),
        endTime: null
      },
      suites: [],
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        testRunner: 'Terminal Test Suite Runner v1.0',
        timestamp: new Date().toISOString()
      },
      artifacts: []
    };
    
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(TEST_SUITE_CONFIG.outputDir)) {
      fs.mkdirSync(TEST_SUITE_CONFIG.outputDir, { recursive: true });
    }
  }

  addSuiteResult(suiteName, result) {
    this.results.summary.totalSuites++;
    
    if (result.status === 'passed') {
      this.results.summary.passedSuites++;
    } else if (result.status === 'failed') {
      this.results.summary.failedSuites++;
    } else if (result.status === 'skipped') {
      this.results.summary.skippedSuites++;
    }
    
    this.results.summary.totalDuration += result.duration || 0;
    this.results.suites.push({
      name: suiteName,
      ...result,
      timestamp: Date.now()
    });

    this.logSuiteResult(suiteName, result);
  }

  addArtifact(name, path, type = 'json') {
    this.results.artifacts.push({
      name,
      path,
      type,
      timestamp: Date.now(),
      size: fs.existsSync(path) ? fs.statSync(path).size : 0
    });
  }

  logSuiteResult(suiteName, result) {
    const status = result.status === 'passed' ? '✅ PASS' : 
                  result.status === 'failed' ? '❌ FAIL' :
                  result.status === 'skipped' ? '⏭️ SKIP' : '❓ UNKNOWN';
    
    const duration = result.duration ? ` (${(result.duration / 1000).toFixed(2)}s)` : '';
    console.log(`${status} ${suiteName}${duration}`);
    
    if (result.summary) {
      console.log(`     Tests: ${result.summary.passed || 0}/${result.summary.total || 0} passed`);
      if (result.summary.workflows) {
        console.log(`     Workflows: ${result.summary.successfulWorkflows || 0}/${result.summary.totalWorkflows || 0} passed`);
      }
    }
    
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  }

  generateConsolidatedReport() {
    this.results.summary.endTime = Date.now();
    
    const report = {
      ...this.results,
      analysis: this.generateAnalysis()
    };

    // Save consolidated report
    const reportPath = path.join(TEST_SUITE_CONFIG.outputDir, 'consolidated-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.addArtifact('Consolidated Report', reportPath, 'json');

    return report;
  }

  generateAnalysis() {
    const analysis = {
      overallStatus: this.results.summary.failedSuites === 0 ? 'PASS' : 'FAIL',
      passRate: this.results.summary.totalSuites > 0 ? 
        (this.results.summary.passedSuites / this.results.summary.totalSuites * 100).toFixed(1) : 0,
      recommendations: [],
      criticalIssues: [],
      performanceMetrics: {}
    };

    // Extract performance metrics
    const perfSuite = this.results.suites.find(s => s.name.includes('Performance'));
    if (perfSuite && perfSuite.report) {
      analysis.performanceMetrics = {
        throughput: perfSuite.report.summary?.throughput || 0,
        averageResponseTime: perfSuite.report.summary?.averageResponseTime || 0,
        peakMemoryMB: perfSuite.report.summary?.peakMemoryMB || 0,
        connectionSuccessRate: perfSuite.report.summary?.connectionSuccessRate || 0
      };
    }

    // Generate recommendations based on results
    if (this.results.summary.failedSuites > 0) {
      analysis.recommendations.push('Investigate failed test suites before deployment');
    }

    if (analysis.performanceMetrics.averageResponseTime > 500) {
      analysis.recommendations.push('Response times exceed 500ms - investigate performance bottlenecks');
    }

    if (analysis.performanceMetrics.connectionSuccessRate < 95) {
      analysis.recommendations.push('Connection success rate below 95% - check network stability');
    }

    // Identify critical issues
    const criticalSuites = this.results.suites.filter(s => 
      s.status === 'failed' && (s.name.includes('Integration') || s.name.includes('Workflow'))
    );

    criticalSuites.forEach(suite => {
      analysis.criticalIssues.push({
        suite: suite.name,
        issue: suite.error || 'Test suite failed',
        impact: 'High - Core functionality affected'
      });
    });

    return analysis;
  }

  printConsolidatedSummary() {
    const report = this.generateConsolidatedReport();
    
    console.log('\n📊 CONSOLIDATED TEST REPORT');
    console.log('============================');
    console.log(`Overall Status: ${report.analysis.overallStatus}`);
    console.log(`Pass Rate: ${report.analysis.passRate}%`);
    console.log(`Total Duration: ${(this.results.summary.totalDuration / 1000).toFixed(2)}s`);
    console.log('\n📈 SUITE BREAKDOWN:');
    console.log(`  Passed: ${this.results.summary.passedSuites}`);
    console.log(`  Failed: ${this.results.summary.failedSuites}`);  
    console.log(`  Skipped: ${this.results.summary.skippedSuites}`);
    
    if (report.analysis.performanceMetrics.throughput) {
      console.log('\n⚡ PERFORMANCE METRICS:');
      console.log(`  Throughput: ${report.analysis.performanceMetrics.throughput} msg/s`);
      console.log(`  Avg Response: ${report.analysis.performanceMetrics.averageResponseTime}ms`);
      console.log(`  Peak Memory: ${report.analysis.performanceMetrics.peakMemoryMB}MB`);
      console.log(`  Connection Success: ${report.analysis.performanceMetrics.connectionSuccessRate}%`);
    }
    
    if (report.analysis.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.analysis.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
    
    if (report.analysis.criticalIssues.length > 0) {
      console.log('\n🔥 CRITICAL ISSUES:');
      report.analysis.criticalIssues.forEach(issue => {
        console.log(`  • ${issue.suite}: ${issue.issue}`);
      });
    }

    console.log('\n📁 ARTIFACTS:');
    this.results.artifacts.forEach(artifact => {
      console.log(`  • ${artifact.name}: ${artifact.path}`);
    });

    return report;
  }
}

// Test suite runner
class TerminalTestRunner {
  constructor(options = {}) {
    this.options = {
      quick: options.quick || false,
      suites: options.suites || Object.keys(TEST_SUITES),
      parallel: options.parallel || TEST_SUITE_CONFIG.parallel,
      retryAttempts: options.retryAttempts || TEST_SUITE_CONFIG.retryAttempts
    };
    
    this.aggregator = new TestSuiteAggregator();
  }

  async runAllTests() {
    console.log('🚀 Starting Terminal Test Suite Runner');
    console.log('======================================');
    console.log(`Mode: ${this.options.quick ? 'Quick' : 'Full'}`);
    console.log(`Suites: ${this.options.suites.join(', ')}`);
    console.log(`Parallel: ${this.options.parallel}`);
    console.log('');

    try {
      // Check prerequisites
      await this.checkPrerequisites();

      // Run test suites
      if (this.options.parallel) {
        await this.runSuitesParallel();
      } else {
        await this.runSuitesSequential();
      }

      // Generate consolidated report
      const report = this.aggregator.printConsolidatedSummary();
      
      // Exit with appropriate code
      const exitCode = report.analysis.overallStatus === 'PASS' ? 0 : 1;
      return { report, exitCode };

    } catch (error) {
      console.error('🔥 Test runner failed:', error);
      this.aggregator.addSuiteResult('Test Runner', {
        status: 'failed',
        error: error.message,
        duration: 0
      });
      
      return { 
        report: this.aggregator.generateConsolidatedReport(), 
        exitCode: 1 
      };
    }
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
    
    // Check if test files exist
    for (const suiteName of this.options.suites) {
      const suite = TEST_SUITES[suiteName];
      if (!suite) {
        throw new Error(`Unknown test suite: ${suiteName}`);
      }
      
      if (!fs.existsSync(suite.script)) {
        throw new Error(`Test script not found: ${suite.script}`);
      }
    }

    // Check WebSocket bridge availability (basic check)
    try {
      const http = require('http');
      await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:8123/health', (res) => {
          resolve();
        });
        req.on('error', () => {
          // WebSocket bridge might not be running, that's okay for now
          resolve();
        });
        req.setTimeout(2000, () => {
          req.destroy();
          resolve();
        });
      });
    } catch (error) {
      console.warn('⚠️ WebSocket bridge health check failed - tests may fail');
    }

    console.log('✅ Prerequisites checked');
  }

  async runSuitesSequential() {
    console.log('🔄 Running test suites sequentially...');
    
    // Sort suites by priority
    const sortedSuites = this.options.suites
      .map(name => ({ name, ...TEST_SUITES[name] }))
      .sort((a, b) => a.priority - b.priority);

    for (const suite of sortedSuites) {
      await this.runSingleSuite(suite.name, suite);
      
      // Small delay between suites to allow cleanup
      await this.delay(2000);
    }
  }

  async runSuitesParallel() {
    console.log('⚡ Running test suites in parallel...');
    
    const suitePromises = this.options.suites.map(suiteName => 
      this.runSingleSuite(suiteName, TEST_SUITES[suiteName])
    );

    await Promise.all(suitePromises);
  }

  async runSingleSuite(suiteName, suiteConfig) {
    console.log(`\n🎯 Running ${suiteConfig.name}...`);
    console.log(`   ${suiteConfig.description}`);
    console.log(`   Estimated duration: ${(suiteConfig.estimatedDuration / 1000).toFixed(0)}s`);

    const startTime = Date.now();
    let attempt = 0;
    let lastError;

    while (attempt <= this.options.retryAttempts) {
      if (attempt > 0) {
        console.log(`   Retry attempt ${attempt}/${this.options.retryAttempts}`);
      }

      try {
        const result = await this.executeSuite(suiteConfig.script);
        const duration = Date.now() - startTime;

        // Parse result if it's a string (JSON)
        let parsedResult;
        try {
          parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
        } catch (e) {
          parsedResult = { summary: { total: 1, passed: result.success ? 1 : 0 } };
        }

        this.aggregator.addSuiteResult(suiteName, {
          status: 'passed',
          duration,
          summary: parsedResult.summary,
          report: parsedResult,
          attempt: attempt + 1
        });

        // Look for generated report files
        this.collectSuiteArtifacts(suiteName);
        
        return;

      } catch (error) {
        lastError = error;
        attempt++;
        
        if (attempt <= this.options.retryAttempts) {
          console.log(`   ❌ Attempt ${attempt} failed: ${error.message}`);
          await this.delay(5000); // Wait before retry
        }
      }
    }

    // All attempts failed
    const duration = Date.now() - startTime;
    this.aggregator.addSuiteResult(suiteName, {
      status: 'failed',
      duration,
      error: lastError?.message || 'Unknown error',
      attempts: attempt
    });
  }

  async executeSuite(scriptPath) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Test suite timeout after ${TEST_SUITE_CONFIG.testTimeout}ms`));
      }, TEST_SUITE_CONFIG.testTimeout);

      const child = spawn('node', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        // Forward output to console with prefix
        process.stdout.write(output.split('\n').map(line => 
          line ? `   │ ${line}` : ''
        ).join('\n'));
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output.split('\n').map(line => 
          line ? `   │ ${line}` : ''
        ).join('\n'));
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          resolve({ success: true, stdout, stderr });
        } else {
          reject(new Error(`Test suite exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  collectSuiteArtifacts(suiteName) {
    const possibleArtifacts = [
      `terminal-test-results.json`,
      `terminal-performance-report.json`, 
      `terminal-workflow-results.json`,
      `${suiteName}-results.json`
    ];

    for (const artifactName of possibleArtifacts) {
      const artifactPath = path.join(__dirname, artifactName);
      if (fs.existsSync(artifactPath)) {
        // Move to results directory
        const newPath = path.join(TEST_SUITE_CONFIG.outputDir, `${suiteName}-${artifactName}`);
        fs.copyFileSync(artifactPath, newPath);
        this.aggregator.addArtifact(`${suiteName} Results`, newPath, 'json');
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI argument parsing
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    quick: args.includes('--quick'),
    parallel: args.includes('--parallel'),
    suites: []
  };

  // Parse specific suite selections
  if (args.includes('--integration')) options.suites.push('integration');
  if (args.includes('--performance')) options.suites.push('performance');
  if (args.includes('--workflow')) options.suites.push('workflow');

  // If no specific suites selected, run all
  if (options.suites.length === 0) {
    options.suites = Object.keys(TEST_SUITES);
  }

  // Quick mode - only integration tests
  if (options.quick) {
    options.suites = ['integration'];
  }

  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArguments();
  const runner = new TerminalTestRunner(options);

  process.on('SIGINT', () => {
    console.log('\n⚠️ Test runner interrupted');
    process.exit(1);
  });

  runner.runAllTests()
    .then(({ report, exitCode }) => {
      console.log(`\n🎉 Test runner completed with exit code ${exitCode}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('🔥 Test runner crashed:', error);
      process.exit(1);
    });
}

module.exports = { TerminalTestRunner, TestSuiteAggregator, TEST_SUITES };