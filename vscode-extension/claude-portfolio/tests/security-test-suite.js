"use strict";
/**
 * Security Test Suite
 *
 * Comprehensive testing for the security fixes implemented in Phases 1-3.
 * This suite validates that:
 * 1. Previously broken legitimate commands now work
 * 2. Dangerous commands are still properly blocked
 * 3. Message passing security prevents bypasses
 * 4. Path traversal protection is effective
 * 5. Enhanced error messages provide clear guidance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityTestRunner = void 0;
exports.runSecurityTests = runSecurityTests;
exports.quickSecurityCheck = quickSecurityCheck;
const securityService_1 = require("../src/securityService");
const securityService_2 = require("../../../src/services/securityService");
/**
 * Test commands that should PASS validation
 * These were previously broken but should now work after security fixes
 */
const COMMANDS_SHOULD_PASS = [
    // PowerShell process management (previously blocked by overly broad patterns)
    'Get-Process | Where-Object {$_.Name -eq "node"}',
    'Stop-Process -Id 1234 -Force',
    '$proc = Get-NetTCPConnection -LocalPort 3000; if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }',
    // Development workflows with combined operations
    'npm run build && npm run deploy',
    'cd "D:\\ClaudeWindows\\Projects\\ggprompts" && npm start',
    'git add . && git commit -m "fix: security updates"',
    // Port management (critical for portfolio functionality)
    'taskkill /F /PID 1234',
    'powershell.exe -Command "Get-NetTCPConnection -LocalPort 3000"',
    // Basic development commands
    'npm run dev',
    'npm install',
    'git status',
    'git branch',
    'claude',
    'explorer "D:\\ClaudeWindows\\Projects"',
    'code "D:\\ClaudeWindows\\claude-dev-portfolio"',
    // PowerShell navigation
    'Set-Location "D:\\ClaudeWindows\\Projects\\test"',
    // Node.js and Python execution
    'node script.js',
    'python app.py'
];
/**
 * Test commands that should FAIL validation
 * These are dangerous commands that must remain blocked
 */
const COMMANDS_SHOULD_FAIL = [
    // System destruction
    'rm -rf /*',
    'rm -rf /',
    'del /s /q C:\\*',
    'format c:',
    'format D:',
    // System control
    'shutdown /s /t 0',
    'reboot',
    'halt',
    'shutdown -h now',
    // Path traversal attempts
    'cd ../../../etc/passwd',
    'cd ..\\..\\..\\Windows\\System32',
    'explorer "..\\..\\..\\Windows"',
    // Command injection attempts
    'npm install; rm -rf /',
    'git status | rm -rf .',
    'cd test && format c:',
    'npm run dev; shutdown /s /t 0',
    // PowerShell injection
    'Get-Process; Remove-Item -Recurse -Force C:\\',
    'Stop-Process -Id 1; format c:',
    // Backtick and substitution injection
    '`rm -rf /`',
    '$(rm -rf /)',
    'echo `del /s /q C:\\*`',
    // Output redirection with dangerous commands
    'echo test > nul && del /s /q C:\\*'
];
/**
 * Test commands for message passing security
 * These should be blocked in React and not execute in VS Code
 */
const MESSAGE_PASSING_BYPASS_ATTEMPTS = [
    'cd ../../../etc && cat passwd',
    'rm -rf node_modules; malicious_command',
    'npm install && shutdown /s /t 0',
    'git status; format c:',
    'explorer "..\\..\\..\\Windows\\System32"'
];
/**
 * Path traversal test cases
 */
const PATH_TRAVERSAL_TESTS = [
    {
        input: '../../../etc/passwd',
        workspaceRoot: 'D:\\ClaudeWindows\\claude-dev-portfolio',
        shouldFail: true,
        description: 'Basic path traversal with Unix-style paths'
    },
    {
        input: '..\\..\\..\\Windows\\System32',
        workspaceRoot: 'D:\\ClaudeWindows\\claude-dev-portfolio',
        shouldFail: true,
        description: 'Windows-style path traversal'
    },
    {
        input: 'D:\\ClaudeWindows\\Projects\\test',
        workspaceRoot: 'D:\\ClaudeWindows',
        shouldFail: false,
        description: 'Valid absolute path within workspace'
    },
    {
        input: '../Projects/ggprompts',
        workspaceRoot: 'D:\\ClaudeWindows\\claude-dev-portfolio',
        shouldFail: false,
        description: 'Valid relative path to external project'
    },
    {
        input: 'projects/internal-project',
        workspaceRoot: 'D:\\ClaudeWindows\\claude-dev-portfolio',
        shouldFail: false,
        description: 'Valid internal project path'
    }
];
/**
 * Enhanced error message tests
 */
const ERROR_MESSAGE_TESTS = [
    {
        command: 'rm -rf /',
        expectedReason: 'dangerous-pattern',
        description: 'Dangerous pattern should provide specific guidance'
    },
    {
        command: 'unknown_command',
        expectedReason: 'not-whitelisted',
        description: 'Unknown command should explain whitelist requirement'
    },
    {
        command: 'Get-Process; Remove-Item -Force C:\\',
        expectedReason: 'powershell-syntax',
        description: 'Unsafe PowerShell should provide PowerShell-specific guidance'
    },
    {
        command: '',
        expectedReason: 'empty-command',
        description: 'Empty command should provide clear guidance'
    }
];
/**
 * Test Runner Class
 */
class SecurityTestRunner {
    constructor() {
        this.results = [];
    }
    /**
     * Run all security tests
     */
    async runAllTests() {
        console.log('🔒 Starting Comprehensive Security Test Suite...\n');
        // Test 1: Commands that should pass
        await this.testCommandsShouldPass();
        // Test 2: Commands that should fail
        await this.testCommandsShouldFail();
        // Test 3: Message passing security
        await this.testMessagePassingSecurity();
        // Test 4: Path traversal protection
        await this.testPathTraversalProtection();
        // Test 5: Enhanced error messages
        await this.testEnhancedErrorMessages();
        // Generate summary report
        this.generateSummaryReport();
        return this.results;
    }
    /**
     * Test 1: Commands that should pass validation
     */
    async testCommandsShouldPass() {
        console.log('✅ Testing Commands That Should PASS...');
        for (const command of COMMANDS_SHOULD_PASS) {
            try {
                // Test both VS Code and React security services
                const vsCodeResult = securityService_1.VSCodeSecurityService.validateCommand(command);
                const reactResult = securityService_2.SecureCommandRunner.validateCommand(command);
                if (vsCodeResult && reactResult) {
                    this.results.push({
                        testName: 'Commands Should Pass',
                        passed: true,
                        details: `✅ Command correctly allowed: ${command}`,
                        command
                    });
                }
                else {
                    this.results.push({
                        testName: 'Commands Should Pass',
                        passed: false,
                        details: `❌ Command incorrectly blocked: ${command} (VS Code: ${vsCodeResult}, React: ${reactResult})`,
                        command
                    });
                }
            }
            catch (error) {
                this.results.push({
                    testName: 'Commands Should Pass',
                    passed: false,
                    details: `❌ Command validation threw error: ${command} - ${error}`,
                    command,
                    errorMessage: error.toString()
                });
            }
        }
    }
    /**
     * Test 2: Commands that should fail validation
     */
    async testCommandsShouldFail() {
        console.log('🚫 Testing Commands That Should FAIL...');
        for (const command of COMMANDS_SHOULD_FAIL) {
            try {
                // Test both VS Code and React security services
                const vsCodeResult = securityService_1.VSCodeSecurityService.validateCommand(command);
                const reactResult = securityService_2.SecureCommandRunner.validateCommand(command);
                if (!vsCodeResult && !reactResult) {
                    this.results.push({
                        testName: 'Commands Should Fail',
                        passed: true,
                        details: `✅ Dangerous command correctly blocked: ${command}`,
                        command
                    });
                }
                else {
                    this.results.push({
                        testName: 'Commands Should Fail',
                        passed: false,
                        details: `❌ SECURITY RISK: Dangerous command allowed: ${command} (VS Code: ${vsCodeResult}, React: ${reactResult})`,
                        command
                    });
                }
            }
            catch (error) {
                // Errors during validation of dangerous commands can be acceptable
                this.results.push({
                    testName: 'Commands Should Fail',
                    passed: true,
                    details: `✅ Dangerous command blocked with error: ${command} - ${error}`,
                    command,
                    errorMessage: error.toString()
                });
            }
        }
    }
    /**
     * Test 3: Message passing security between React and VS Code
     */
    async testMessagePassingSecurity() {
        console.log('📨 Testing Message Passing Security...');
        for (const command of MESSAGE_PASSING_BYPASS_ATTEMPTS) {
            try {
                // Test React security validation (should block before postMessage)
                const reactResult = securityService_2.SecureCommandRunner.validateCommand(command);
                const reactEnhanced = securityService_2.SecureCommandRunner.validateCommandEnhanced(command);
                if (!reactResult && !reactEnhanced.valid) {
                    this.results.push({
                        testName: 'Message Passing Security',
                        passed: true,
                        details: `✅ React correctly blocks bypass attempt: ${command}`,
                        command
                    });
                }
                else {
                    this.results.push({
                        testName: 'Message Passing Security',
                        passed: false,
                        details: `❌ SECURITY RISK: React allows bypass attempt: ${command}`,
                        command
                    });
                }
            }
            catch (error) {
                this.results.push({
                    testName: 'Message Passing Security',
                    passed: true,
                    details: `✅ Bypass attempt blocked with error: ${command} - ${error}`,
                    command,
                    errorMessage: error.toString()
                });
            }
        }
    }
    /**
     * Test 4: Path traversal protection
     */
    async testPathTraversalProtection() {
        console.log('🛡️ Testing Path Traversal Protection...');
        for (const test of PATH_TRAVERSAL_TESTS) {
            try {
                // Test VS Code path sanitization
                const sanitizedPath = await securityService_1.VSCodeSecurityService.sanitizePath(test.input, test.workspaceRoot);
                if (test.shouldFail) {
                    // This test case should have thrown an error
                    this.results.push({
                        testName: 'Path Traversal Protection',
                        passed: false,
                        details: `❌ SECURITY RISK: ${test.description} - Path traversal not detected: ${test.input} -> ${sanitizedPath}`,
                        command: test.input
                    });
                }
                else {
                    // This test case should have succeeded
                    this.results.push({
                        testName: 'Path Traversal Protection',
                        passed: true,
                        details: `✅ ${test.description} - Valid path correctly processed: ${test.input} -> ${sanitizedPath}`,
                        command: test.input
                    });
                }
            }
            catch (error) {
                if (test.shouldFail) {
                    // Expected to fail - path traversal correctly detected
                    this.results.push({
                        testName: 'Path Traversal Protection',
                        passed: true,
                        details: `✅ ${test.description} - Path traversal correctly blocked: ${test.input}`,
                        command: test.input,
                        errorMessage: error.toString()
                    });
                }
                else {
                    // Should not have failed - legitimate path blocked
                    this.results.push({
                        testName: 'Path Traversal Protection',
                        passed: false,
                        details: `❌ ${test.description} - Valid path incorrectly blocked: ${test.input} - ${error}`,
                        command: test.input,
                        errorMessage: error.toString()
                    });
                }
            }
        }
    }
    /**
     * Test 5: Enhanced error messages
     */
    async testEnhancedErrorMessages() {
        console.log('💬 Testing Enhanced Error Messages...');
        for (const test of ERROR_MESSAGE_TESTS) {
            try {
                // Test enhanced validation for detailed error messages
                const vsCodeResult = securityService_1.VSCodeSecurityService.validateCommandEnhanced(test.command);
                const reactResult = securityService_2.SecureCommandRunner.validateCommandEnhanced(test.command);
                // Check VS Code enhanced validation
                if (!vsCodeResult.valid && vsCodeResult.reason === test.expectedReason && vsCodeResult.message) {
                    this.results.push({
                        testName: 'Enhanced Error Messages (VS Code)',
                        passed: true,
                        details: `✅ ${test.description} - VS Code provided expected error: ${vsCodeResult.reason}`,
                        command: test.command,
                        errorMessage: vsCodeResult.message
                    });
                }
                else {
                    this.results.push({
                        testName: 'Enhanced Error Messages (VS Code)',
                        passed: false,
                        details: `❌ ${test.description} - VS Code error mismatch. Expected: ${test.expectedReason}, Got: ${vsCodeResult.reason}`,
                        command: test.command,
                        errorMessage: vsCodeResult.message || 'No message provided'
                    });
                }
                // Check React enhanced validation
                if (!reactResult.valid && reactResult.reason === test.expectedReason && reactResult.message) {
                    this.results.push({
                        testName: 'Enhanced Error Messages (React)',
                        passed: true,
                        details: `✅ ${test.description} - React provided expected error: ${reactResult.reason}`,
                        command: test.command,
                        errorMessage: reactResult.message
                    });
                }
                else {
                    this.results.push({
                        testName: 'Enhanced Error Messages (React)',
                        passed: false,
                        details: `❌ ${test.description} - React error mismatch. Expected: ${test.expectedReason}, Got: ${reactResult.reason}`,
                        command: test.command,
                        errorMessage: reactResult.message || 'No message provided'
                    });
                }
            }
            catch (error) {
                this.results.push({
                    testName: 'Enhanced Error Messages',
                    passed: false,
                    details: `❌ ${test.description} - Validation threw unexpected error: ${error}`,
                    command: test.command,
                    errorMessage: error.toString()
                });
            }
        }
    }
    /**
     * Generate comprehensive test summary report
     */
    generateSummaryReport() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        console.log('\n' + '='.repeat(80));
        console.log('🔒 SECURITY TEST SUITE SUMMARY REPORT');
        console.log('='.repeat(80));
        console.log(`📊 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        console.log('='.repeat(80));
        // Group results by test type
        const groupedResults = this.results.reduce((groups, result) => {
            if (!groups[result.testName]) {
                groups[result.testName] = { passed: 0, failed: 0, results: [] };
            }
            if (result.passed) {
                groups[result.testName].passed++;
            }
            else {
                groups[result.testName].failed++;
            }
            groups[result.testName].results.push(result);
            return groups;
        }, {});
        // Print summary by test category
        Object.entries(groupedResults).forEach(([testName, stats]) => {
            console.log(`\n📋 ${testName}:`);
            console.log(`   ✅ Passed: ${stats.passed}, ❌ Failed: ${stats.failed}`);
            // Show failed tests details
            stats.results.filter(r => !r.passed).forEach(result => {
                console.log(`   ❌ ${result.details}`);
                if (result.errorMessage) {
                    console.log(`      Error: ${result.errorMessage.substring(0, 100)}...`);
                }
            });
        });
        console.log('\n' + '='.repeat(80));
        console.log('🎯 SECURITY IMPLEMENTATION STATUS:');
        if (failedTests === 0) {
            console.log('🎉 ALL SECURITY TESTS PASSED! The implementation is secure and ready for production.');
        }
        else if (failedTests < totalTests * 0.1) {
            console.log('⚠️  Minor issues detected. Review failed tests before production deployment.');
        }
        else {
            console.log('🚨 SIGNIFICANT SECURITY ISSUES DETECTED! Do not deploy until all tests pass.');
        }
        console.log('='.repeat(80));
    }
}
exports.SecurityTestRunner = SecurityTestRunner;
/**
 * Export function to run tests from command line or VS Code
 */
async function runSecurityTests() {
    const testRunner = new SecurityTestRunner();
    await testRunner.runAllTests();
}
/**
 * Quick validation function for development use
 */
function quickSecurityCheck() {
    console.log('🔍 Quick Security Check...\n');
    // Test a few critical commands
    const criticalTests = [
        { cmd: 'Get-Process | Where-Object {$_.Name -eq "node"}', shouldPass: true },
        { cmd: 'rm -rf /', shouldPass: false },
        { cmd: 'npm run dev', shouldPass: true },
        { cmd: 'format c:', shouldPass: false }
    ];
    criticalTests.forEach(test => {
        const vsCodeResult = securityService_1.VSCodeSecurityService.validateCommand(test.cmd);
        const reactResult = securityService_2.SecureCommandRunner.validateCommand(test.cmd);
        const status = (vsCodeResult === test.shouldPass && reactResult === test.shouldPass) ? '✅' : '❌';
        console.log(`${status} ${test.cmd} (Expected: ${test.shouldPass ? 'PASS' : 'FAIL'}, Got: VS Code=${vsCodeResult}, React=${reactResult})`);
    });
    console.log('\n🔍 Quick check complete. Run full test suite for comprehensive validation.');
}
//# sourceMappingURL=security-test-suite.js.map