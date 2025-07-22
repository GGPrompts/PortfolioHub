"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VSCodeSecurityService = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * VS Code Security Service - Provides secure command execution with workspace trust
 *
 * This service ensures commands are only executed in trusted workspaces and validates
 * all inputs to prevent command injection and path traversal attacks.
 */
class VSCodeSecurityService {
    /**
     * Checks if the current workspace is trusted and prompts user if not
     * @param operation Description of the operation requiring trust
     * @returns Promise<boolean> - true if workspace is trusted
     */
    static async requireWorkspaceTrust(operation) {
        if (!vscode.workspace.isTrusted) {
            const choice = await vscode.window.showWarningMessage(`${operation} requires workspace trust to execute safely.`, {
                modal: true,
                detail: 'Workspace trust is required to prevent malicious code execution. Please trust this workspace to continue.'
            }, 'Trust Workspace', 'Cancel');
            if (choice === 'Trust Workspace') {
                // Note: VS Code will handle the trust dialog automatically
                // We can't programmatically trust a workspace for security reasons
                await vscode.window.showInformationMessage('Please use the workspace trust dialog to trust this workspace, then try again.');
            }
            return false;
        }
        return true;
    }
    /**
     * Validates a command for safe execution
     * @param command The command to validate
     * @returns boolean - true if the command is safe to execute
     */
    static validateCommand(command) {
        if (!command || typeof command !== 'string') {
            return false;
        }
        const trimmedCommand = command.trim();
        if (trimmedCommand.length === 0) {
            return false;
        }
        // Check for dangerous patterns
        if (this.DANGEROUS_PATTERNS.some(pattern => pattern.test(trimmedCommand))) {
            console.warn(`Command blocked due to dangerous pattern: ${trimmedCommand}`);
            return false;
        }
        // Extract the base command (first word)
        const baseCommand = trimmedCommand.split(/\s+/)[0].toLowerCase();
        // Special handling for npm commands
        if (baseCommand === 'npm') {
            return this.validateNpmCommand(trimmedCommand);
        }
        // Special handling for PowerShell scripts
        if (baseCommand === 'powershell.exe' || trimmedCommand.startsWith('.\\\\scripts\\\\')) {
            return this.validatePowerShellCommand(trimmedCommand);
        }
        // Check if base command is in allowed list
        const isAllowed = this.ALLOWED_COMMANDS.has(baseCommand) ||
            this.ALLOWED_COMMANDS.has(baseCommand.replace('.exe', ''));
        if (!isAllowed) {
            console.warn(`Command blocked - not in allowed list: ${baseCommand}`);
            return false;
        }
        return true;
    }
    /**
     * Validates npm-specific commands
     */
    static validateNpmCommand(command) {
        const parts = command.split(/\s+/);
        if (parts.length < 2)
            return false;
        const npmSubCommand = parts[1].toLowerCase();
        // Handle "npm run script-name"
        if (npmSubCommand === 'run' && parts.length >= 3) {
            const scriptName = parts[2].toLowerCase();
            return this.ALLOWED_NPM_SCRIPTS.has(scriptName);
        }
        return this.ALLOWED_NPM_SCRIPTS.has(npmSubCommand);
    }
    /**
     * Validates PowerShell commands and scripts
     */
    static validatePowerShellCommand(command) {
        // Allow only scripts in the scripts directory
        if (command.startsWith('.\\\\scripts\\\\')) {
            const scriptPath = command.split(/\\s+/)[0];
            return scriptPath.endsWith('.ps1');
        }
        // For powershell.exe commands, only allow specific safe patterns
        if (command.toLowerCase().includes('powershell.exe')) {
            // Allow only execution of .ps1 files with specific flags
            const allowedFlags = ['-ExecutionPolicy', 'Bypass', '-File'];
            const hasOnlyAllowedFlags = allowedFlags.some(flag => command.includes(flag));
            return hasOnlyAllowedFlags && command.includes('.ps1');
        }
        return false;
    }
    /**
     * Sanitizes and validates file paths to prevent path traversal
     * @param filePath The file path to sanitize
     * @param workspaceRoot The workspace root directory
     * @returns Promise<string> - Sanitized absolute path
     * @throws Error if path traversal is detected
     */
    static async sanitizePath(filePath, workspaceRoot) {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('Invalid file path provided');
        }
        if (!workspaceRoot || typeof workspaceRoot !== 'string') {
            throw new Error('Invalid workspace root provided');
        }
        // Normalize the path to resolve any .. or . components
        const normalized = path.normalize(filePath);
        // Resolve to absolute path
        const resolved = path.resolve(workspaceRoot, normalized);
        // Ensure the resolved path is within the workspace
        const workspaceAbsolute = path.resolve(workspaceRoot);
        if (!resolved.startsWith(workspaceAbsolute)) {
            throw new Error(`Path traversal detected: ${filePath} resolves outside workspace`);
        }
        return resolved;
    }
    /**
     * Safely executes a command in a VS Code terminal with full security checks
     * @param command The command to execute
     * @param terminalName Name for the terminal
     * @param workspaceRoot The workspace root for path validation
     * @returns Promise<boolean> - true if command was executed successfully
     */
    static async executeSecureCommand(command, terminalName = 'Secure Terminal', workspaceRoot) {
        try {
            // Check workspace trust first
            if (!await this.requireWorkspaceTrust(`Command execution (${terminalName})`)) {
                return false;
            }
            // Validate the command
            if (!this.validateCommand(command)) {
                await vscode.window.showErrorMessage(`Command blocked for security reasons: ${command.substring(0, 50)}...`);
                return false;
            }
            // Create or get terminal
            let terminal = vscode.window.terminals.find(t => t.name === terminalName);
            if (!terminal) {
                terminal = vscode.window.createTerminal({
                    name: terminalName,
                    cwd: workspaceRoot
                });
            }
            // Execute the command
            terminal.sendText(command);
            terminal.show();
            console.log(`Secure command executed in ${terminalName}: ${command}`);
            return true;
        }
        catch (error) {
            console.error('Failed to execute secure command:', error);
            await vscode.window.showErrorMessage(`Failed to execute command: ${error}`);
            return false;
        }
    }
    /**
     * Safely executes a project-specific command with path validation
     * @param projectPath Path to the project directory
     * @param command Command to execute in the project directory
     * @param terminalName Name for the terminal
     * @param workspaceRoot Workspace root directory
     * @returns Promise<boolean> - true if successful
     */
    static async executeProjectCommand(projectPath, command, terminalName, workspaceRoot) {
        try {
            // Check workspace trust
            if (!await this.requireWorkspaceTrust(`Project command execution (${terminalName})`)) {
                return false;
            }
            // Validate and sanitize the project path
            const sanitizedPath = await this.sanitizePath(projectPath, workspaceRoot);
            // Validate the command
            if (!this.validateCommand(command)) {
                await vscode.window.showErrorMessage(`Project command blocked for security reasons: ${command}`);
                return false;
            }
            // Create the full command with cd
            const fullCommand = `cd "${sanitizedPath}" && ${command}`;
            // Final validation of the complete command
            if (!this.validateCommand(fullCommand)) {
                await vscode.window.showErrorMessage(`Complete command failed validation: ${fullCommand}`);
                return false;
            }
            // Create or get terminal
            let terminal = vscode.window.terminals.find(t => t.name === terminalName);
            if (!terminal) {
                terminal = vscode.window.createTerminal({
                    name: terminalName,
                    cwd: sanitizedPath
                });
            }
            // Execute the command
            terminal.sendText(command); // Don't include cd since terminal cwd is already set
            terminal.show();
            console.log(`Secure project command executed: ${command} in ${sanitizedPath}`);
            return true;
        }
        catch (error) {
            console.error('Failed to execute secure project command:', error);
            await vscode.window.showErrorMessage(`Failed to execute project command: ${error}`);
            return false;
        }
    }
    /**
     * Creates a secure command with validated inputs
     * @param baseCommand The base command to execute
     * @param args Array of arguments
     * @param options Optional configuration
     * @returns string | null - Validated command string or null if invalid
     */
    static createSecureCommand(baseCommand, args = [], options = {}) {
        if (!this.validateCommand(baseCommand)) {
            return null;
        }
        let command = baseCommand;
        // Add arguments if provided
        if (args.length > 0) {
            const sanitizedArgs = args.map(arg => {
                // Basic argument sanitization
                if (typeof arg !== 'string')
                    return '';
                return arg.replace(/[;&|`$(){}[\\]\\\\]/g, ''); // Remove dangerous characters
            }).filter(arg => arg.length > 0);
            command += ' ' + sanitizedArgs.join(' ');
        }
        // Final validation of the complete command
        if (!this.validateCommand(command)) {
            return null;
        }
        return command;
    }
    /**
     * Validates environment variable names to prevent injection
     * @param envVarName The environment variable name to validate
     * @returns boolean - true if the environment variable name is safe
     */
    static validateEnvironmentVariable(envVarName) {
        if (!envVarName || typeof envVarName !== 'string') {
            return false;
        }
        // Environment variable names should only contain alphanumeric characters and underscores
        const validPattern = /^[A-Z_][A-Z0-9_]*$/i;
        return validPattern.test(envVarName);
    }
}
exports.VSCodeSecurityService = VSCodeSecurityService;
VSCodeSecurityService.ALLOWED_COMMANDS = new Set([
    'npm', 'yarn', 'pnpm', 'node', 'git', 'echo', 'cd', 'ls', 'dir',
    'powershell.exe', 'cmd.exe', 'Write-Host', 'explorer', 'code'
]);
VSCodeSecurityService.ALLOWED_NPM_SCRIPTS = new Set([
    'dev', 'start', 'build', 'test', 'install', 'run', 'compile', 'watch'
]);
VSCodeSecurityService.DANGEROUS_PATTERNS = [
    /[;&|`$(){}[\]\\]/, // Shell injection characters
    /\.\.\//, // Path traversal  
    /rm\s+-rf/i, // Destructive commands
    /del\s+\/[sq]/i, // Windows destructive commands
    /format\s+[c-z]:/i, // Format drive commands
    /shutdown/i, // System shutdown
    /reboot/i, // System reboot
    /halt/i, // System halt
    /\>\s*nul/i, // Output redirection that might hide malicious output
    /\&\&\s*(rm|del|format)/i, // Chained destructive commands
];
//# sourceMappingURL=securityService.js.map