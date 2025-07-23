// Test netstat commands against updated security patterns
const SHARED_SECURITY_CONFIG = {
    ALLOWED_COMMANDS: [
        'npm', 'yarn', 'pnpm', 'node', 'git', 'powershell.exe', 'cmd.exe', 
        'cd', 'claude', 'explorer', 'code', 'taskkill', 'echo', 'dir', 'ls',
        'python', 'py', 'typescript', 'tsc', 'cursor', 'windsurf', 'aider',
        'netstat', 'findstr'
    ],
    
    DANGEROUS_PATTERNS: [
        /\.\.\//,                    // Path traversal (forward slash)
        /\.\.\\/,                    // Path traversal (backslash)
        /['"]\.\.['"]/,              // Path traversal in quotes
        /rm\s+-rf/i,                 // Destructive rm
        /del\s+\/[sq]/i,             // Destructive Windows del
        /format\s+[c-z]:/i,          // Format drive commands
        /shutdown|reboot|halt/i,     // System control
        /;\s*(rm|del|format)/i,      // Chained destructive
        /\|\s*(rm|del|format)/i,     // Piped destructive
        /&&\s*(rm|del|format)/i,     // AND-chained destructive
        />\s*nul.*(?:rm|del|format)/i, // Output redirection with destructive commands
        /`.*(?:rm|del|format).*`/i,  // Backtick command injection with destructive commands
        /\$\(.*(?:rm|del|format).*\)/i // Command substitution with destructive commands
    ],
    
    SAFE_COMMAND_PATTERNS: [
        /^cd\s+"[^\.][^"]*"$/,                               // cd "path" (not starting with .)  
        /^npm\s+(run\s+)?(dev|start|build|test|lint|format)(\s+--.*)?$/,  // npm with args
        /^git\s+(status|add|commit|push|pull|branch|checkout)(\s+.*)?$/,  // git commands
        /^powershell\.exe.*Get-NetTCPConnection/i,                        // Port management
        /^taskkill\s+\/F\s+\/PID/i,                                      // Process management
        /^Get-Process.*\|.*Where-Object/i,                               // Process queries
        /^Stop-Process.*-Id.*-Force$/i,                                  // Process stopping
        /^Set-Location\s+"[^"]*"$/i,                                     // PowerShell cd
        /^explorer\s+"[^"]*"$/i,                                         // File explorer
        /^code\s+"[^"]*"$/i,                                             // VS Code launch
        /^claude$/i,                                                     // Claude Code
        /^node\s+[^\s]+\.js$/i,                                          // Node.js script execution
        /^python\s+[^\s]+\.py$/i,                                        // Python script execution
        // Combined commands for project execution
        /^cd\s+"[^\.][^"]*"\s+&&\s+npm\s+(run\s+)?(dev|start|build|test)(\s+--.*)?$/,  // cd && npm
        /^cd\s+"[^\.][^"]*"\s+&&\s+(npm\s+(run\s+)?(dev|start|build|test)|yarn\s+(dev|start|build)|pnpm\s+(dev|start))(\s+--.*)?$/,  // cd && package manager
        // PowerShell process management (portfolio specific)
        /^\$proc\s*=\s*Get-NetTCPConnection\s+-LocalPort\s+\d+.*;\s*if\s*\(\$proc\)\s*\{\s*Stop-Process\s+-Id\s+\$proc\.OwningProcess\s+-Force\s*\}$/i,
        /^taskkill\s+\/F\s+\/PID\s+\(Get-NetTCPConnection\s+-LocalPort\s+\d+.*\)$/i,
        // AI Assistant commands
        /^claude\s+--project\s+"[^"]*"$/i,                               // Claude with project
        /^cursor\s+"[^"]*"$/i,                                           // Cursor editor
        /^windsurf\s+"[^"]*"$/i,                                         // Windsurf editor
        /^aider\s+--project\s+"[^"]*"$/i,                                // Aider AI assistant
        // Network and port checking commands
        /^netstat\s+-ano(\s+\|\s+(findstr|Select-String)\s+"[^"]*")?$/i, // netstat with optional filtering
        /^netstat\s+-ano\s+\|\s+Select-String\s+":[3-9]\d{3}"$/i,        // netstat with PowerShell port filtering
        /^netstat\s+-ano\s+\|\s+findstr\s+":[3-9]\d{3}"$/i,             // netstat with cmd port filtering
        // VS Code extension commands
        /^claude-portfolio\./,                                           // Extension commands
        /^workbench\.action\./                                           // VS Code workbench commands
    ],

    SAFE_POWERSHELL_PATTERNS: [
        /^Get-Process.*\|.*Where-Object/i,
        /^Stop-Process.*-Id.*-Force$/i,
        /^Get-NetTCPConnection.*-LocalPort/i,
        /^\$\w+\s*=\s*Get-\w+.*;\s*if\s*\(\$\w+\).*Stop-Process/i,
        /^taskkill\s+\/F\s+\/PID.*Get-NetTCPConnection/i,
        /^Get-Process.*\|.*Select-Object/i,
        /^Set-Location\s+"[^"]*"$/i,
        /^explorer\s+"[^"]*"$/i,
        /^code\s+"[^"]*"$/i,
        // Network diagnostic patterns
        /^netstat\s+-ano\s+\|\s+Select-String\s+":[3-9]\d{3}"$/i,
        /^netstat\s+-ano\s+\|\s+Select-String\s+":300[0-9]"$/i
    ]
};

// Simulate the validation logic from securityService.ts
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
        trimmedCommand.includes('Get-') || trimmedCommand.includes('Stop-Process') || 
        trimmedCommand.includes('netstat') || trimmedCommand.includes('Select-String')) {
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

// Test the specific command that was blocked
const NETSTAT_COMMANDS = [
    // The exact command that was blocked
    'netstat -ano | Select-String ":300[0-9]"',
    
    // Variations that should also work
    'netstat -ano | Select-String ":3001"',
    'netstat -ano | Select-String ":3005"',
    'netstat -ano | findstr ":3001"',
    'netstat -ano | findstr ":300[0-9]"',
    'netstat -ano',
    
    // Other portfolio-related network commands
    'netstat -ano | Select-String ":5173"',
    'netstat -ano | findstr ":5173"'
];

console.log('\n🧪 Testing Netstat Commands That Were Previously Blocked');
console.log('======================================================');

let passedCount = 0;
let totalTests = NETSTAT_COMMANDS.length;

NETSTAT_COMMANDS.forEach((cmd, index) => {
    console.log(`\nTest ${index + 1}/${totalTests}: ${cmd}`);
    
    const result = validateCommand(cmd);
    if (result) {
        passedCount++;
    } else {
        console.error(`❌ STILL BLOCKED: This command needs additional patterns`);
    }
});

console.log('\n📊 RESULTS:');
console.log('============');
console.log(`✅ Commands Passed: ${passedCount}/${totalTests} (${Math.round((passedCount/totalTests)*100)}%)`);

if (passedCount === totalTests) {
    console.log('\n🎉 SUCCESS: All netstat commands will now work!');
    console.log('✅ "Check Portfolio Ports" command should work');
    console.log('✅ Port detection functionality restored');
} else {
    console.log(`\n⚠️ ${totalTests - passedCount} commands still blocked - need additional patterns`);
}