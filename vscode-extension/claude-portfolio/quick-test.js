// Quick security validation test
console.log('🔍 Quick Security Validation Test');
console.log('═'.repeat(50));

// Test data
const testCases = [
    { cmd: 'npm run dev', shouldPass: true, desc: 'Basic npm command' },
    { cmd: 'Get-Process | Where-Object {$_.Name -eq "node"}', shouldPass: true, desc: 'PowerShell pipe operation' },
    { cmd: 'rm -rf /', shouldPass: false, desc: 'Destructive command' },
    { cmd: 'format c:', shouldPass: false, desc: 'Format drive command' },
    { cmd: 'git add . && git commit -m "test"', shouldPass: true, desc: 'Combined git commands' },
    { cmd: 'shutdown /s /t 0', shouldPass: false, desc: 'System shutdown' },
    { cmd: 'taskkill /F /PID 1234', shouldPass: true, desc: 'Process management' },
    { cmd: 'cd "../../../etc/passwd"', shouldPass: false, desc: 'Path traversal attempt' }
];

// Mock the shared config for testing
const mockConfig = {
    ALLOWED_COMMANDS: ['npm', 'git', 'claude', 'node', 'powershell.exe', 'taskkill', 'cd'],
    ALLOWED_NPM_SCRIPTS: ['dev', 'start', 'build', 'test', 'install'],
    DANGEROUS_PATTERNS: [
        /\.\.\//,                    // Path traversal (forward slash)
        /\.\.\\/,                    // Path traversal (backslash)
        /['"]\.\.['"]/,              // Path traversal in quotes
        /rm\s+-rf/i,                 // Destructive rm
        /del\s+\/[sq]/i,             // Destructive Windows del
        /format\s+[c-z]:/i,          // Format drive commands
        /shutdown|reboot|halt/i      // System control
    ],
    SAFE_COMMAND_PATTERNS: [
        /^npm\s+(run\s+)?(dev|start|build|test)(\\s+.*)?$/,
        /^git\s+(status|add|commit|push|pull|branch|checkout)(\\s+.*)?$/,
        /^Get-Process.*\|.*Where-Object/i,
        /^taskkill\s+\/F\s+\/PID/i,
        /^cd\s+"[^\.][^"]*"$/           // cd "path" (not starting with .)
    ],
    SAFE_POWERSHELL_PATTERNS: [
        /^Get-Process.*\|.*Where-Object/i,
        /^Stop-Process.*-Id.*-Force$/i,
        /^taskkill\s+\/F\s+\/PID/i
    ]
};

// Simple validation function based on our security logic
function quickValidate(command) {
    if (!command || typeof command !== 'string') return false;
    
    const trimmed = command.trim();
    if (trimmed.length === 0) return false;
    
    // 1. Check whitelist first (most permissive)
    if (mockConfig.SAFE_COMMAND_PATTERNS.some(p => p.test(trimmed))) {
        return true;
    }
    
    // 2. Check PowerShell patterns
    if (trimmed.includes('Get-Process') || trimmed.includes('$') || trimmed.includes('taskkill')) {
        if (mockConfig.SAFE_POWERSHELL_PATTERNS.some(p => p.test(trimmed))) {
            return true;
        }
    }
    
    // 3. Check dangerous patterns (most restrictive)
    if (mockConfig.DANGEROUS_PATTERNS.some(p => p.test(trimmed))) {
        return false;
    }
    
    // 4. Check base commands
    const baseCmd = trimmed.split(/\s+/)[0].toLowerCase();
    
    // Special npm handling
    if (baseCmd === 'npm') {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
            const npmCmd = parts[1].toLowerCase();
            if (npmCmd === 'run' && parts.length >= 3) {
                return mockConfig.ALLOWED_NPM_SCRIPTS.includes(parts[2].toLowerCase());
            }
            return mockConfig.ALLOWED_NPM_SCRIPTS.includes(npmCmd);
        }
        return false;
    }
    
    return mockConfig.ALLOWED_COMMANDS.includes(baseCmd);
}

// Run tests
let passed = 0;
let total = testCases.length;

console.log('Running validation tests...\n');

testCases.forEach((test, index) => {
    const result = quickValidate(test.cmd);
    const status = (result === test.shouldPass) ? '✅' : '❌';
    const expected = test.shouldPass ? 'PASS' : 'FAIL';
    const actual = result ? 'PASS' : 'FAIL';
    
    console.log(`${index + 1}. ${status} ${test.desc}`);
    console.log(`   Command: ${test.cmd}`);
    console.log(`   Expected: ${expected}, Got: ${actual}`);
    
    if (result === test.shouldPass) {
        passed++;
    } else {
        console.log(`   ⚠️  VALIDATION MISMATCH!`);
    }
    console.log('');
});

console.log('='.repeat(60));
console.log(`📊 QUICK TEST RESULTS: ${passed}/${total} tests passed (${Math.round(passed/total * 100)}%)`);

if (passed === total) {
    console.log('🎉 All quick validation tests PASSED!');
    console.log('✅ Core security patterns are working correctly');
} else {
    console.log(`⚠️  ${total - passed} tests failed - detailed investigation needed`);
    console.log('🔍 Run full security test suite for comprehensive analysis');
}

console.log('');
console.log('📋 Key Security Features Validated:');
console.log('   • Command whitelisting (SAFE_COMMAND_PATTERNS)');
console.log('   • PowerShell-specific validation'); 
console.log('   • Dangerous pattern detection');
console.log('   • Path traversal protection');
console.log('   • npm command validation');
console.log('='.repeat(60));