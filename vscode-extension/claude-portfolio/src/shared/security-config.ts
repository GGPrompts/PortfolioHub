/**
 * Shared Security Configuration
 * 
 * This file provides a single source of truth for security validation rules
 * used by both the React app and VS Code extension.
 */

export const SHARED_SECURITY_CONFIG = {
    ALLOWED_COMMANDS: [
        'npm', 'yarn', 'pnpm', 'node', 'git', 'powershell.exe', 'cmd.exe', 
        'cd', 'claude', 'explorer', 'code', 'taskkill', 'echo', 'dir', 'ls',
        'python', 'py', 'typescript', 'tsc', 'cursor', 'windsurf', 'aider',
        'netstat', 'findstr'
    ],
    
    ALLOWED_NPM_SCRIPTS: [
        'dev', 'start', 'build', 'test', 'test:coverage', 'install', 'run', 
        'compile', 'watch', 'lint', 'type-check', 'format', 'clean', 'preview', 'serve'
    ],
    
    SAFE_POWERSHELL_OPERATIONS: [
        'Get-Process', 'Stop-Process', 'Get-NetTCPConnection', 'Set-Location', 
        'Get-ChildItem', 'Test-Path', 'Where-Object', 'Select-Object'
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
        /\$\(.*(?:rm|del|format).*\)/i, // Command substitution with destructive commands
        // Enhanced pipe operation detection
        /\|\s*(shutdown|reboot|halt)/i, // Pipe to system control
        /\|\s*(>|>>).*\.(bat|cmd|exe)/i, // Pipe to executable creation
        /git\s+\w+.*\|.*rm/i,          // Git commands piped to destructive operations
        /npm\s+\w+.*\|.*del/i          // NPM commands piped to destructive operations
    ],
    
    SAFE_COMMAND_PATTERNS: [
        /^cd\s+"[^\.][^"]*"$/,                               // cd "path" (not starting with .)  
        /^npm\s+(run\s+)?(dev|start|build|test|lint|format)(?:\s+(?:[^|;&`$()"']|"[^"]*"|'[^']*')+)?$/,  // npm with args (supports quoted args, no pipe operations)
        /^git\s+(status|add|commit|push|pull|branch|checkout)(?:\s+(?:[^|;&`$()"']|"[^"]*"|'[^']*')+)?$/,  // git commands (supports quoted args, no pipe operations)
        /^powershell\.exe.*Get-NetTCPConnection/i,                        // Port management
        /^taskkill\s+(\/F\s+\/PID|\/PID\s+[0-9]+\s+\/F)/i,               // Process management (flexible flag order)
        /^Get-Process.*\|.*Where-Object/i,                               // Process queries
        /^Stop-Process.*-Id.*-Force$/i,                                  // Process stopping
        /^Set-Location\s+"[^"]*"$/i,                                     // PowerShell cd
        /^explorer\s+"[^"]*"$/i,                                         // File explorer
        /^code\s+"[^"]*"$/i,                                             // VS Code launch
        /^claude$/i,                                                     // Claude Code
        /^node\s+[^\s]+\.js$/i,                                          // Node.js script execution
        /^python\s+[^\s]+\.py$/i,                                        // Python script execution
        /^code\s+serve-web\s+--port\s+\d+\s+--host\s+[\d\.]+\s+--without-connection-token\s+--accept-server-license-terms$/i, // VS Code server
        // Combined commands for project execution
        /^cd\s+"[^\.][^"]*"\s+&&\s+npm\s+(run\s+)?(dev|start|build|test)(\s+--.*)?$/,  // cd && npm
        /^cd\s+"[^\.][^"]*"\s+&&\s+(npm\s+(run\s+)?(dev|start|build|test)|yarn\s+(dev|start|build)|pnpm\s+(dev|start))(\s+--.*)?$/,  // cd && package manager
        /^cd\s+"[^\.][^"]*"\s+&&\s+code\s+serve-web\s+--port\s+\d+\s+--host\s+[\d\.]+\s+--without-connection-token\s+--accept-server-license-terms$/i, // cd && VS Code server
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
        /^netstat\s+-ano\s+\|\s+findstr\s+":[3-9]\d{3}"$/i              // netstat with cmd port filtering
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
    ],

    ALLOWED_EXTENSIONS: [
        '.ps1', '.js', '.ts', '.json', '.md', '.txt', '.yml', '.yaml'
    ]
};

/**
 * Security error message templates with guidance
 */
export const SECURITY_ERROR_MESSAGES = {
    'path-traversal': {
        message: 'Command blocked: Path traversal detected',
        guidance: 'Use absolute paths within the workspace or relative paths from project root'
    },
    'dangerous-pattern': {
        message: 'Command blocked: Contains potentially dangerous operation',
        guidance: 'Review the command for destructive operations like rm, del, or format'
    },
    'not-whitelisted': {
        message: 'Command blocked: Not in approved command list',
        guidance: 'Only approved development commands are allowed for security'
    },
    'powershell-syntax': {
        message: 'PowerShell command blocked: Unsafe syntax detected',
        guidance: 'Use approved PowerShell operations: Get-Process, Stop-Process, Get-NetTCPConnection'
    },
    'workspace-trust': {
        message: 'Command blocked: Workspace trust required',
        guidance: 'Trust this workspace in VS Code to execute commands safely'
    },
    'invalid-input': {
        message: 'Command blocked: Invalid input',
        guidance: 'Ensure the command is a valid string'
    },
    'empty-command': {
        message: 'Command blocked: Empty command',
        guidance: 'Provide a valid command to execute'
    }
};

/**
 * Get detailed security error message with guidance
 */
export function getSecurityErrorMessage(command: string, reason: string): string {
    const errorInfo = (SECURITY_ERROR_MESSAGES as any)[reason] || {
        message: 'Command blocked for security reasons',
        guidance: 'Contact support if you believe this command should be allowed'
    };
    
    return `${errorInfo.message}\n\nGuidance: ${errorInfo.guidance}\n\nBlocked command: ${command.substring(0, 100)}...`;
}

/**
 * Enhanced validation result with detailed information
 */
export interface ValidationResult {
    valid: boolean;
    reason?: string;
    message?: string;
}