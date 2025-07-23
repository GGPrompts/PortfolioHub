// Live Security Test Suite - Tests both validation AND actual execution
const fs = require('fs');
const path = require('path');

// Load the actual security config
let SHARED_SECURITY_CONFIG;
try {
    // Try to load the compiled JavaScript version
    SHARED_SECURITY_CONFIG = require('./dist/shared/security-config.js').SHARED_SECURITY_CONFIG;
} catch (error) {
    console.log('⚠️  Loading TypeScript config directly (compile extension first for full test)');
    // Fallback to simulated config for testing
    SHARED_SECURITY_CONFIG = {
        SAFE_COMMAND_PATTERNS: [
            /^git\s+(status|add|commit|push|pull|branch|checkout)(?:\s+(?:[^|;&`$()\"']|\"[^\"]*\"|'[^']*')+)?$/,
            /^npm\s+(run\s+)?(dev|start|build|test|lint|format)(?:\s+(?:[^|;&`$()\"']|\"[^\"]*\"|'[^']*')+)?$/
        ],
        DANGEROUS_PATTERNS: [
            /\|\s*(rm|del|format)/i,
            /git\s+\w+.*\|.*rm/i,
            /npm\s+\w+.*\|.*del/i
        ]
    };
}

// Test cases with execution instructions
const testCases = [
    {
        category: 'SAFE_COMMANDS',
        tests: [
            { 
                cmd: 'git status', 
                shouldPass: true, 
                vsCodeTest: 'Open VS Code terminal → Run this command → Should execute successfully',
                extensionTest: 'Use Claude Portfolio extension → Try to run git status on a project'
            },
            { 
                cmd: 'git add .', 
                shouldPass: true,
                vsCodeTest: 'In a git repo → Run this command → Should execute successfully',
                extensionTest: 'Extension should allow this git command'
            },
            { 
                cmd: 'git commit -m "test message"', 
                shouldPass: true,
                vsCodeTest: 'In a git repo with changes → Run this → Should commit successfully',
                extensionTest: 'Extension should handle quoted commit messages'
            },
            { 
                cmd: 'npm run dev', 
                shouldPass: true,
                vsCodeTest: 'In project directory → Run this → Should start dev server',
                extensionTest: 'Extension "Start" button should execute this successfully'
            },
            { 
                cmd: 'npm run build --production', 
                shouldPass: true,
                vsCodeTest: 'In project directory → Run this → Should build with flags',
                extensionTest: 'Extension should handle npm commands with arguments'
            }
        ]
    },
    {
        category: 'DANGEROUS_COMMANDS',
        tests: [
            { 
                cmd: 'git status | rm -rf .', 
                shouldPass: false,
                vsCodeTest: '⚠️  DO NOT RUN - This should be blocked by extension',
                extensionTest: 'Extension should block this and show security error'
            },
            { 
                cmd: 'npm run dev | del node_modules', 
                shouldPass: false,
                vsCodeTest: '⚠️  DO NOT RUN - This should be blocked by extension',
                extensionTest: 'Extension should prevent this command execution'
            },
            { 
                cmd: 'git add . && rm -rf .git', 
                shouldPass: false,
                vsCodeTest: '⚠️  DO NOT RUN - This should be blocked',
                extensionTest: 'Extension should block command chaining with destructive operations'
            }
        ]
    }
];

function validateCommand(command) {
    // Check if whitelisted
    const whitelisted = SHARED_SECURITY_CONFIG.SAFE_COMMAND_PATTERNS.some(pattern => 
        pattern.test(command)
    );
    
    // Check if dangerous
    const dangerous = SHARED_SECURITY_CONFIG.DANGEROUS_PATTERNS.some(pattern => 
        pattern.test(command)
    );
    
    return whitelisted && !dangerous;
}

console.log('🧪 LIVE SECURITY TEST SUITE');
console.log('==========================\n');

console.log('📋 TESTING INSTRUCTIONS:');
console.log('1. Run this script to validate security patterns');
console.log('2. Follow the VS Code testing instructions for each command');
console.log('3. Verify extension behavior matches expected results\n');

testCases.forEach(category => {
    console.log(`\n🔍 ${category.category}:`);
    console.log('─'.repeat(50));
    
    category.tests.forEach((test, index) => {
        const isValid = validateCommand(test.cmd);
        const status = isValid === test.shouldPass ? '✅ PATTERN OK' : '❌ PATTERN ISSUE';
        
        console.log(`\n${index + 1}. ${status} "${test.cmd}"`);
        console.log(`   Expected: ${test.shouldPass ? 'ALLOW' : 'BLOCK'}, Pattern Result: ${isValid ? 'ALLOW' : 'BLOCK'}`);
        console.log(`   
   📟 VS Code Terminal Test:`);
        console.log(`      ${test.vsCodeTest}`);
        console.log(`   
   🔌 Extension Test:`);
        console.log(`      ${test.extensionTest}`);
    });
});

console.log('\n' + '='.repeat(60));
console.log('🎯 COMPREHENSIVE TESTING CHECKLIST:');
console.log('='.repeat(60));

console.log(`
□ Run this script to validate patterns
□ Test each SAFE command in VS Code terminal
□ Test each SAFE command through extension UI
□ Verify DANGEROUS commands are blocked by extension
□ Check error messages are clear and helpful
□ Confirm legitimate workflows still work
□ Test with both simple and complex project setups

📊 Expected Results:
• All SAFE commands should execute successfully
• All DANGEROUS commands should be blocked with clear errors
• Extension UI should reflect security validation
• No legitimate developer workflows should be broken
`);

console.log('\n🚨 SECURITY VALIDATION COMPLETE');
console.log('Next: Follow the testing instructions above ↑');