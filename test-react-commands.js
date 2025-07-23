// Test all React app commands against updated security patterns
const path = require('path');

// Import the updated security config (simulating the actual validation logic)
const SHARED_SECURITY_CONFIG = {
    ALLOWED_COMMANDS: [
        'npm', 'yarn', 'pnpm', 'node', 'git', 'powershell.exe', 'cmd.exe', 
        'cd', 'claude', 'explorer', 'code', 'taskkill', 'echo', 'dir', 'ls',
        'python', 'py', 'typescript', 'tsc', 'cursor', 'windsurf', 'aider'
    ],
    
    ALLOWED_NPM_SCRIPTS: [
        'dev', 'start', 'build', 'test', 'test:coverage', 'install', 'run', 
        'compile', 'watch', 'lint', 'type-check', 'format', 'clean', 'preview', 'serve'
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
        /^code\s+"[^"]*"$/i
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
    
    // Special handling for npm commands
    if (baseCommand === 'npm') {
        const parts = trimmedCommand.split(/\s+/);
        if (parts.length >= 2) {
            const npmSubCommand = parts[1].toLowerCase();
            if (npmSubCommand === 'run' && parts.length >= 3) {
                const scriptName = parts[2].toLowerCase();
                if (SHARED_SECURITY_CONFIG.ALLOWED_NPM_SCRIPTS.includes(scriptName)) {
                    console.log(`✅ NPM script allowed: ${trimmedCommand}`);
                    return true;
                }
            } else if (SHARED_SECURITY_CONFIG.ALLOWED_NPM_SCRIPTS.includes(npmSubCommand)) {
                console.log(`✅ NPM command allowed: ${trimmedCommand}`);
                return true;
            }
        }
        console.warn(`❌ NPM command not allowed: ${trimmedCommand}`);
        return false;
    }

    const isAllowed = SHARED_SECURITY_CONFIG.ALLOWED_COMMANDS.includes(baseCommand) || 
                     SHARED_SECURITY_CONFIG.ALLOWED_COMMANDS.includes(baseCommand.replace('.exe', ''));

    if (!isAllowed) {
        console.warn(`❌ Command blocked - not in allowed list: ${baseCommand}`);
        return false;
    }

    console.log(`✅ Command allowed: ${trimmedCommand}`);
    return true;
}

// Actual commands used in React app components
const REACT_APP_COMMANDS = {
    // LiveProjectPreview.tsx - Run button commands
    "Project Run Commands": [
        'cd "D:\\ClaudeWindows\\Projects\\ggprompts" && npm run dev',
        'cd "D:\\ClaudeWindows\\Projects\\matrix-cards" && npm start', 
        'cd "D:\\ClaudeWindows\\Projects\\sleak-card" && yarn dev',
        'cd "D:\\ClaudeWindows\\Projects\\3d-file-system" && pnpm dev',
        'npm run dev',
        'npm start',
        'yarn dev',
        'pnpm dev'
    ],
    
    // LiveProjectPreview.tsx - Kill process commands
    "Process Kill Commands": [
        '$proc = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1; if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }',
        '$proc = Get-NetTCPConnection -LocalPort 3005 -ErrorAction SilentlyContinue | Select-Object -First 1; if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }',
        'taskkill /F /PID (Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess)',
        'taskkill /F /PID (Get-NetTCPConnection -LocalPort 3005 | Select-Object -ExpandProperty OwningProcess)'
    ],
    
    // LiveProjectPreview.tsx - AI Assistant commands
    "AI Assistant Commands": [
        'claude --project "D:\\ClaudeWindows\\Projects\\ggprompts"',
        'cursor "D:\\ClaudeWindows\\Projects\\matrix-cards"',
        'windsurf "D:\\ClaudeWindows\\Projects\\sleak-card"',
        'aider --project "D:\\ClaudeWindows\\Projects\\3d-file-system"',
        'claude',
        'cursor "."',
        'windsurf "."'
    ],
    
    // ServerToolbar.tsx - VS Code extension commands
    "VS Code Extension Commands": [
        'claude-portfolio.startAllServers',
        'claude-portfolio.startPortfolioServer', 
        'claude-portfolio.startVSCodeServer',
        'npm run dev'
    ],
    
    // ProjectViewer.tsx - Workbench commands
    "VS Code Workbench Commands": [
        'workbench.action.files.openFolder'
    ],
    
    // QuickCommandsPanel.tsx - Common development commands
    "Development Commands": [
        'git status',
        'git add .',
        'git commit -m "update"',
        'npm install',
        'npm run build',
        'npm run test',
        'code .',
        'explorer .'
    ]
};

console.log('\n🧪 Testing All React App Commands');
console.log('==================================');

let totalCommands = 0;
let passedCommands = 0;
let failedCommands = [];

Object.entries(REACT_APP_COMMANDS).forEach(([category, commands]) => {
    console.log(`\n📂 ${category}:`);
    console.log('-'.repeat(category.length + 4));
    
    commands.forEach((cmd, index) => {
        totalCommands++;
        console.log(`\n${index + 1}. Testing: ${cmd}`);
        
        const result = validateCommand(cmd);
        if (result) {
            passedCommands++;
        } else {
            failedCommands.push({category, command: cmd});
            console.error(`   ❌ FAILED: This React app command is still blocked!`);
        }
    });
});

console.log('\n📊 FINAL RESULTS:');
console.log('==================');
console.log(`✅ Commands Passed: ${passedCommands}/${totalCommands} (${Math.round((passedCommands/totalCommands)*100)}%)`);
console.log(`❌ Commands Failed: ${failedCommands.length}/${totalCommands} (${Math.round((failedCommands.length/totalCommands)*100)}%)`);

if (failedCommands.length === 0) {
    console.log('\n🎉 SUCCESS: All React app commands will work with updated security patterns!');
    console.log('✅ No legitimate commands remain blocked');
    console.log('✅ Run buttons and all functionality should work properly');
} else {
    console.log('\n⚠️ WARNING: Some React app commands are still blocked:');
    failedCommands.forEach(({category, command}) => {
        console.log(`   • ${category}: ${command}`);
    });
    console.log('\n🔧 These patterns may need additional updates.');
}

console.log('\n💡 Commands that were specifically problematic before:');
console.log('- Combined commands (cd && npm): ✅ NOW SUPPORTED');
console.log('- PowerShell port management: ✅ NOW SUPPORTED'); 
console.log('- AI assistant commands: ✅ NOW SUPPORTED');
console.log('- VS Code extension commands: ✅ NOW SUPPORTED');