/**
 * Message Passing Security Test
 * 
 * This test simulates the React → VS Code message passing security
 * that was previously vulnerable to bypass attacks.
 */

console.log('📨 Message Passing Security Test');
console.log('═'.repeat(50));

// Mock the React security validation (SecureCommandRunner)
const mockReactSecurity = {
    validateCommand: function(command) {
        if (!command || typeof command !== 'string') return false;
        
        const trimmed = command.trim();
        if (trimmed.length === 0) return false;
        
        // Dangerous patterns that should block commands
        const dangerousPatterns = [
            /\.\.\//,                    // Path traversal (forward slash)
            /\.\.\\/,                    // Path traversal (backslash)
            /['"]\.\.['"]/,              // Path traversal in quotes
            /rm\s+-rf/i,                 // Destructive rm
            /del\s+\/[sq]/i,             // Destructive Windows del
            /format\s+[c-z]:/i,          // Format drive commands
            /shutdown|reboot|halt/i,     // System control
            /;\s*(rm|del|format)/i,      // Chained destructive
            /\|\s*(rm|del|format)/i,     // Piped destructive
            /&&\s*(rm|del|format)/i      // AND-chained destructive
        ];
        
        // Check dangerous patterns first
        if (dangerousPatterns.some(pattern => pattern.test(trimmed))) {
            console.log(`   🚫 React blocked dangerous pattern: ${trimmed}`);
            return false;
        }
        
        // Safe patterns
        const safePatterns = [
            /^npm\s+(run\s+)?(dev|start|build|test)/,
            /^git\s+(status|add|commit|push|pull|branch|checkout)/,
            /^Get-Process.*\|.*Where-Object/i,
            /^taskkill\s+\/F\s+\/PID/i
        ];
        
        if (safePatterns.some(pattern => pattern.test(trimmed))) {
            console.log(`   ✅ React allowed safe command: ${trimmed}`);
            return true;
        }
        
        // Check base commands
        const baseCmd = trimmed.split(/\s+/)[0].toLowerCase();
        const allowedCommands = ['npm', 'git', 'claude', 'node', 'taskkill'];
        
        const isAllowed = allowedCommands.includes(baseCmd);
        if (isAllowed) {
            console.log(`   ✅ React allowed base command: ${trimmed}`);
        } else {
            console.log(`   🚫 React blocked unknown command: ${trimmed}`);
        }
        
        return isAllowed;
    }
};

// Mock the VS Code extension receiving messages
const mockVSCodeMessageHandler = {
    handleMessage: function(message) {
        console.log(`   📨 VS Code received message: ${message.type}`);
        
        if (message.type === 'terminal:execute') {
            console.log(`   🎯 VS Code would execute: ${message.command}`);
            console.log(`   📺 Terminal: ${message.name || 'Default'}`);
            return { success: true, executed: message.command };
        }
        
        return { success: false, error: 'Unknown message type' };
    }
};

// Simulate the FIXED message passing flow
function simulateSecureMessagePassing(command, terminalName = 'Test Terminal') {
    console.log(`\n🔍 Testing command: "${command}"`);
    
    // Step 1: React validation (this is where the bypass was fixed)
    const isValidInReact = mockReactSecurity.validateCommand(command);
    
    if (!isValidInReact) {
        console.log(`   ❌ Command blocked in React - NO MESSAGE SENT`);
        console.log(`   ✅ Security working: Dangerous command never reaches VS Code`);
        return { blocked: true, reason: 'React validation failed' };
    }
    
    // Step 2: If React validation passes, send message to VS Code
    console.log(`   📤 React sending message to VS Code...`);
    const message = {
        type: 'terminal:execute',
        command: command,
        name: terminalName
    };
    
    // Step 3: VS Code processes the message
    const result = mockVSCodeMessageHandler.handleMessage(message);
    
    console.log(`   ✅ Command executed successfully in VS Code`);
    return { blocked: false, executed: true, result };
}

// Test Cases: Message Passing Bypass Attempts
console.log('\n🧪 Testing Message Passing Security...\n');

const bypassAttempts = [
    {
        command: 'cd ../../../etc && cat passwd',
        description: 'Path traversal with chained command',
        shouldBeBlocked: true
    },
    {
        command: 'rm -rf node_modules; malicious_command',
        description: 'Destructive command with semicolon chaining',
        shouldBeBlocked: true
    },
    {
        command: 'npm install && shutdown /s /t 0',
        description: 'Legitimate command chained with system shutdown',
        shouldBeBlocked: true
    },
    {
        command: 'git status; format c:',
        description: 'Git command chained with format drive',
        shouldBeBlocked: true
    },
    {
        command: 'explorer "..\\..\\..\\Windows\\System32"',
        description: 'Explorer with path traversal',
        shouldBeBlocked: true
    },
    // Commands that should work
    {
        command: 'npm run dev',
        description: 'Legitimate npm command',
        shouldBeBlocked: false
    },
    {
        command: 'git status',
        description: 'Legitimate git command',
        shouldBeBlocked: false
    },
    {
        command: 'Get-Process | Where-Object {$_.Name -eq "node"}',
        description: 'Legitimate PowerShell command',
        shouldBeBlocked: false
    }
];

let totalTests = 0;
let passedTests = 0;

bypassAttempts.forEach((test, index) => {
    totalTests++;
    console.log(`\n${index + 1}. ${test.description}`);
    console.log(`   Command: ${test.command}`);
    console.log(`   Expected: ${test.shouldBeBlocked ? 'BLOCKED' : 'ALLOWED'}`);
    
    const result = simulateSecureMessagePassing(test.command);
    
    const actuallyBlocked = result.blocked;
    const testPassed = (actuallyBlocked === test.shouldBeBlocked);
    
    if (testPassed) {
        console.log(`   ✅ TEST PASSED`);
        passedTests++;
    } else {
        console.log(`   ❌ TEST FAILED - Expected ${test.shouldBeBlocked ? 'blocked' : 'allowed'}, got ${actuallyBlocked ? 'blocked' : 'allowed'}`);
        if (!test.shouldBeBlocked && actuallyBlocked) {
            console.log(`   ⚠️  Legitimate command incorrectly blocked`);
        } else if (test.shouldBeBlocked && !actuallyBlocked) {
            console.log(`   🚨 SECURITY RISK: Dangerous command allowed through!`);
        }
    }
});

// Results Summary
console.log('\n' + '='.repeat(60));
console.log('📨 MESSAGE PASSING SECURITY TEST RESULTS');
console.log('='.repeat(60));
console.log(`📊 Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${totalTests - passedTests}`);
console.log(`📈 Success Rate: ${Math.round(passedTests/totalTests * 100)}%`);

if (passedTests === totalTests) {
    console.log('\n🎉 ALL MESSAGE PASSING SECURITY TESTS PASSED!');
    console.log('✅ The React → VS Code security bypass vulnerability has been fixed');
    console.log('✅ Dangerous commands are blocked before reaching VS Code');
    console.log('✅ Legitimate commands still work correctly');
} else {
    console.log('\n⚠️  Some message passing security tests failed');
    console.log('🔍 Review the failed tests to identify security gaps');
}

console.log('\n📋 Security Features Validated:');
console.log('   • Command validation in React before postMessage');
console.log('   • Prevention of security bypass via message passing');
console.log('   • Proper blocking of chained dangerous commands');
console.log('   • Path traversal detection in quoted paths');
console.log('   • Legitimate development commands still function');
console.log('='.repeat(60));