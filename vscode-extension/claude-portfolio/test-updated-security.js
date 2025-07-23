const { SHARED_SECURITY_CONFIG } = require('./shared/security-config.ts');

// Mock the validation logic from securityService.ts
function validateCommand(command) {
    if (!command || typeof command !== 'string') {
        return false;
    }

    const trimmedCommand = command.trim();
    if (trimmedCommand.length === 0) {
        return false;
    }

    // 1. Check whitelist first (most permissive)
    if (SHARED_SECURITY_CONFIG.SAFE_COMMAND_PATTERNS.some(pattern => pattern.test(trimmedCommand))) {
        console.log(`✅ Command whitelisted: ${trimmedCommand}`);
        return true;
    }
    
    // 2. Check PowerShell syntax
    if (trimmedCommand.toLowerCase().includes('powershell') || trimmedCommand.includes('$') || 
        trimmedCommand.includes('Get-') || trimmedCommand.includes('Stop-Process')) {
        if (SHARED_SECURITY_CONFIG.SAFE_POWERSHELL_PATTERNS.some(pattern => pattern.test(trimmedCommand))) {
            console.log(`✅ PowerShell command validated: ${trimmedCommand}`);
            return true;
        }
    }
    
    // 3. Check dangerous patterns (most restrictive)
    if (SHARED_SECURITY_CONFIG.DANGEROUS_PATTERNS.some(pattern => pattern.test(trimmedCommand))) {
        console.warn(`❌ Dangerous pattern detected: ${trimmedCommand}`);
        return false;
    }
    
    // 4. Check base command allowlist
    const baseCommand = trimmedCommand.split(/\s+/)[0].toLowerCase();
    
    const isAllowed = SHARED_SECURITY_CONFIG.ALLOWED_COMMANDS.includes(baseCommand) || 
                     SHARED_SECURITY_CONFIG.ALLOWED_COMMANDS.includes(baseCommand.replace('.exe', ''));

    if (!isAllowed) {
        console.warn(`❌ Command blocked - not in allowed list: ${baseCommand}`);
        return false;
    }

    console.log(`✅ Command allowed: ${trimmedCommand}`);
    return true;
}

// Test commands that should now work
const PORTFOLIO_COMMANDS_SHOULD_PASS = [
    // Project run commands
    'cd "D:\\ClaudeWindows\\Projects\\ggprompts" && npm run dev',
    'cd "D:\\ClaudeWindows\\Projects\\matrix-cards" && npm start',
    'cd "D:\\ClaudeWindows\\Projects\\sleak-card" && yarn dev',
    'cd "D:\\ClaudeWindows\\Projects\\3d-file-system" && pnpm dev',
    
    // PowerShell port management
    '$proc = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1; if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }',
    'taskkill /F /PID (Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess)',
    
    // AI Assistant commands
    'claude --project "D:\\ClaudeWindows\\Projects\\ggprompts"',
    'cursor "D:\\ClaudeWindows\\Projects\\matrix-cards"',
    'windsurf "D:\\ClaudeWindows\\Projects\\sleak-card"',
    'aider --project "D:\\ClaudeWindows\\Projects\\3d-file-system"',
    
    // Basic commands
    'claude',
    'npm run dev',
    'git status'
];

const DANGEROUS_COMMANDS_SHOULD_FAIL = [
    'rm -rf /',
    'del /s /q C:\\*',
    'format c:',
    'shutdown /s /t 0',
    'cd "../../../etc/passwd"',
    'npm install; rm -rf /'
];

console.log('\n🧪 Testing Portfolio Commands That Should PASS:');
console.log('================================================');

let passedCount = 0;
let totalTests = PORTFOLIO_COMMANDS_SHOULD_PASS.length;

PORTFOLIO_COMMANDS_SHOULD_PASS.forEach((cmd, index) => {
    console.log(`\nTest ${index + 1}/${totalTests}: ${cmd}`);
    const result = validateCommand(cmd);
    if (result) {
        passedCount++;
    } else {
        console.error(`❌ FAILED: Command should have passed but was blocked`);
    }
});

console.log('\n🛡️ Testing Dangerous Commands That Should FAIL:');
console.log('================================================');

let blockedCount = 0;
let dangerousTests = DANGEROUS_COMMANDS_SHOULD_FAIL.length;

DANGEROUS_COMMANDS_SHOULD_FAIL.forEach((cmd, index) => {
    console.log(`\nDangerous Test ${index + 1}/${dangerousTests}: ${cmd}`);
    const result = validateCommand(cmd);
    if (!result) {
        blockedCount++;
        console.log(`✅ GOOD: Dangerous command properly blocked`);
    } else {
        console.error(`❌ SECURITY ISSUE: Dangerous command was allowed!`);
    }
});

console.log('\n📊 SUMMARY:');
console.log('===========');
console.log(`Portfolio Commands: ${passedCount}/${totalTests} passed (${Math.round((passedCount/totalTests)*100)}%)`);
console.log(`Dangerous Commands: ${blockedCount}/${dangerousTests} blocked (${Math.round((blockedCount/dangerousTests)*100)}%)`);

if (passedCount === totalTests && blockedCount === dangerousTests) {
    console.log('\n🎉 ALL TESTS PASSED! Security fix successful.');
} else {
    console.log('\n⚠️ Some tests failed. Security patterns need adjustment.');
}