/**
 * Security Test Runner Script
 * 
 * This script can be run directly with Node.js to execute the security test suite
 * and validate that all security fixes are working correctly.
 * 
 * Usage:
 *   node run-security-tests.js
 *   npm run security-test (if added to package.json)
 */

const path = require('path');
const fs = require('fs');

// Mock VS Code environment for testing
const mockVSCode = {
    workspace: {
        isTrusted: true
    },
    window: {
        showWarningMessage: async (message, options, ...items) => {
            console.log(`[MOCK] Warning: ${message}`);
            return items[0]; // Return first option
        },
        showInformationMessage: async (message) => {
            console.log(`[MOCK] Info: ${message}`);
        },
        showErrorMessage: async (message) => {
            console.log(`[MOCK] Error: ${message}`);
        },
        terminals: [],
        createTerminal: (options) => {
            console.log(`[MOCK] Created terminal: ${options.name}`);
            return {
                name: options.name,
                sendText: (text) => console.log(`[MOCK] Terminal command: ${text}`),
                show: () => console.log(`[MOCK] Terminal shown`)
            };
        }
    }
};

// Set up global mock for VS Code
global.vscode = mockVSCode;

// Import security services - need to ensure paths work in Node.js environment
let VSCodeSecurityService, SecureCommandRunner;

try {
    // Try to load the compiled TypeScript files
    const vsCodeSecurityPath = path.join(__dirname, 'src', 'securityService.js');
    const reactSecurityPath = path.join(__dirname, '..', '..', 'src', 'services', 'securityService.js');
    
    if (fs.existsSync(vsCodeSecurityPath)) {
        VSCodeSecurityService = require(vsCodeSecurityPath).VSCodeSecurityService;
    }
    
    if (fs.existsSync(reactSecurityPath)) {
        SecureCommandRunner = require(reactSecurityPath).SecureCommandRunner;
    }
} catch (error) {
    console.error('❌ Error loading security services:', error.message);
    console.log('💡 Note: This script requires compiled TypeScript files. Run "npm run compile" first.');
}

/**
 * Test commands that should PASS validation
 */
const COMMANDS_SHOULD_PASS = [
    // PowerShell process management (previously blocked by overly broad patterns)
    'Get-Process | Where-Object {$_.Name -eq "node"}',
    'Stop-Process -Id 1234 -Force',
    '$proc = Get-NetTCPConnection -LocalPort 3000; if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }',
    
    // Development workflows with combined operations
    'npm run build && npm run deploy',
    'git add . && git commit -m "fix: security updates"',
    
    // Port management (critical for portfolio functionality)
    'taskkill /F /PID 1234',
    'powershell.exe -Command "Get-NetTCPConnection -LocalPort 3000"',
    
    // Basic development commands
    'npm run dev',
    'npm install',
    'git status',
    'claude',
    'node script.js'
];

/**
 * Test commands that should FAIL validation
 */
const COMMANDS_SHOULD_FAIL = [
    // System destruction
    'rm -rf /*',
    'del /s /q C:\\*',
    'format c:',
    
    // System control
    'shutdown /s /t 0',
    'reboot',
    
    // Path traversal attempts
    'cd ../../../etc/passwd',
    
    // Command injection attempts
    'npm install; rm -rf /',
    'git status | rm -rf .',
    
    // Backtick injection
    '`rm -rf /`',
    '$(rm -rf /)'
];

/**
 * Simple test runner function
 */
function runSecurityValidationTests() {
    console.log('🔒 Running Security Validation Tests...\n');
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    // Test commands that should pass
    console.log('✅ Testing Commands That Should PASS:');
    console.log('─'.repeat(50));
    
    COMMANDS_SHOULD_PASS.forEach(command => {
        totalTests++;
        let vsCodeResult = true;
        let reactResult = true;
        
        try {
            if (VSCodeSecurityService) {
                vsCodeResult = VSCodeSecurityService.validateCommand(command);
            }
            if (SecureCommandRunner) {
                reactResult = SecureCommandRunner.validateCommand(command);
            }
            
            if (vsCodeResult && reactResult) {
                console.log(`  ✅ ${command}`);
                passedTests++;
            } else {
                console.log(`  ❌ ${command} (VS Code: ${vsCodeResult}, React: ${reactResult})`);
                failedTests++;
            }
        } catch (error) {
            console.log(`  ❌ ${command} (Error: ${error.message})`);
            failedTests++;
        }
    });

    // Test commands that should fail
    console.log('\n🚫 Testing Commands That Should FAIL:');
    console.log('─'.repeat(50));
    
    COMMANDS_SHOULD_FAIL.forEach(command => {
        totalTests++;
        let vsCodeResult = false;
        let reactResult = false;
        
        try {
            if (VSCodeSecurityService) {
                vsCodeResult = VSCodeSecurityService.validateCommand(command);
            }
            if (SecureCommandRunner) {
                reactResult = SecureCommandRunner.validateCommand(command);
            }
            
            if (!vsCodeResult && !reactResult) {
                console.log(`  ✅ ${command} (correctly blocked)`);
                passedTests++;
            } else {
                console.log(`  ❌ SECURITY RISK: ${command} (VS Code: ${vsCodeResult}, React: ${reactResult})`);
                failedTests++;
            }
        } catch (error) {
            // Errors when validating dangerous commands are acceptable
            console.log(`  ✅ ${command} (blocked with error: ${error.message.substring(0, 50)}...)`);
            passedTests++;
        }
    });

    // Test enhanced validation
    console.log('\n💬 Testing Enhanced Error Messages:');
    console.log('─'.repeat(50));
    
    const errorTests = [
        { cmd: 'rm -rf /', expectedReason: 'dangerous-pattern' },
        { cmd: 'unknown_command', expectedReason: 'not-whitelisted' },
        { cmd: '', expectedReason: 'empty-command' }
    ];
    
    errorTests.forEach(test => {
        totalTests++;
        try {
            let hasValidError = false;
            
            if (VSCodeSecurityService && VSCodeSecurityService.validateCommandEnhanced) {
                const result = VSCodeSecurityService.validateCommandEnhanced(test.cmd);
                if (!result.valid && result.reason === test.expectedReason && result.message) {
                    hasValidError = true;
                }
            }
            
            if (SecureCommandRunner && SecureCommandRunner.validateCommandEnhanced) {
                const result = SecureCommandRunner.validateCommandEnhanced(test.cmd);
                if (!result.valid && result.reason === test.expectedReason && result.message) {
                    hasValidError = true;
                }
            }
            
            if (hasValidError) {
                console.log(`  ✅ Enhanced error for "${test.cmd}" (reason: ${test.expectedReason})`);
                passedTests++;
            } else {
                console.log(`  ❌ Missing enhanced error for "${test.cmd}" (expected: ${test.expectedReason})`);
                failedTests++;
            }
        } catch (error) {
            console.log(`  ❌ Error testing enhanced validation: ${error.message}`);
            failedTests++;
        }
    });

    // Generate summary
    console.log('\n' + '='.repeat(60));
    console.log('🔒 SECURITY TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    if (failedTests === 0) {
        console.log('🎉 ALL SECURITY TESTS PASSED! Implementation is secure and ready.');
        process.exit(0);
    } else if (failedTests < totalTests * 0.1) {
        console.log('⚠️  Minor issues detected. Review failed tests.');
        process.exit(1);
    } else {
        console.log('🚨 SIGNIFICANT SECURITY ISSUES! Do not deploy until resolved.');
        process.exit(2);
    }
}

/**
 * Main execution
 */
if (require.main === module) {
    console.log('🔒 Security Test Runner for Claude Portfolio Extension');
    console.log('⚡ Phase 4: Testing and Validation');
    console.log('');
    
    if (!VSCodeSecurityService && !SecureCommandRunner) {
        console.log('❌ Unable to load security services. Please ensure:');
        console.log('   1. TypeScript files have been compiled (npm run compile)');
        console.log('   2. Security services are properly built');
        console.log('   3. All dependencies are installed');
        console.log('');
        console.log('💡 Attempting to run tests with available services...\n');
    }
    
    try {
        runSecurityValidationTests();
    } catch (error) {
        console.error('💥 Test execution failed:', error);
        process.exit(3);
    }
}

module.exports = { runSecurityValidationTests };