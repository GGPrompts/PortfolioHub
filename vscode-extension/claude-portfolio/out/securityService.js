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
const fs = __importStar(require("fs"));
const security_config_1 = require("./shared/security-config");
/**
 * VS Code Security Service - Provides secure command execution with workspace trust
 *
 * This service ensures commands are only executed in trusted workspaces and validates
 * all inputs to prevent command injection and path traversal attacks.
 */
class VSCodeSecurityService {
    /**
     * Validate PowerShell-specific syntax for safe operations
     */
    static validatePowerShellSyntax(command) {
        return security_config_1.SHARED_SECURITY_CONFIG.SAFE_POWERSHELL_PATTERNS.some(pattern => pattern.test(command));
    }
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
            console.warn('Command validation failed: command is null or not a string');
            return false;
        }
        const trimmedCommand = command.trim();
        if (trimmedCommand.length === 0) {
            console.warn('Command validation failed: command is empty');
            return false;
        }
        // 1. Check whitelist first (most permissive)
        if (this.SAFE_COMMAND_PATTERNS.some(pattern => pattern.test(trimmedCommand))) {
            console.log(`Command whitelisted: ${trimmedCommand}`);
            return true;
        }
        // 2. Check PowerShell syntax
        if (trimmedCommand.toLowerCase().includes('powershell') || trimmedCommand.includes('$') ||
            trimmedCommand.includes('Get-') || trimmedCommand.includes('Stop-Process')) {
            if (this.validatePowerShellSyntax(trimmedCommand)) {
                console.log(`PowerShell command validated: ${trimmedCommand}`);
                return true;
            }
        }
        // 3. Check dangerous patterns (most restrictive)
        if (this.DANGEROUS_PATTERNS.some(pattern => pattern.test(trimmedCommand))) {
            console.warn(`Dangerous pattern detected: ${trimmedCommand}`);
            return false;
        }
        // 4. Check base command allowlist
        const baseCommand = trimmedCommand.split(/\s+/)[0].toLowerCase();
        // Special handling for npm commands
        if (baseCommand === 'npm') {
            return this.validateNpmCommand(trimmedCommand);
        }
        // Special handling for PowerShell scripts
        if (baseCommand === 'powershell.exe' || trimmedCommand.startsWith('.\\scripts\\')) {
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
     * Enhanced validation with detailed error information
     * @param command The command to validate
     * @returns ValidationResult with detailed information
     */
    static validateCommandEnhanced(command) {
        if (!command || typeof command !== 'string') {
            return {
                valid: false,
                reason: 'invalid-input',
                message: (0, security_config_1.getSecurityErrorMessage)(command || '', 'invalid-input')
            };
        }
        const trimmedCommand = command.trim();
        if (trimmedCommand.length === 0) {
            return {
                valid: false,
                reason: 'empty-command',
                message: (0, security_config_1.getSecurityErrorMessage)(trimmedCommand, 'empty-command')
            };
        }
        // 1. Check whitelist first (most permissive)
        if (this.SAFE_COMMAND_PATTERNS.some(pattern => pattern.test(trimmedCommand))) {
            console.log(`Command whitelisted: ${trimmedCommand}`);
            return { valid: true };
        }
        // 2. Check PowerShell syntax
        if (trimmedCommand.toLowerCase().includes('powershell') || trimmedCommand.includes('$') ||
            trimmedCommand.includes('Get-') || trimmedCommand.includes('Stop-Process')) {
            if (this.validatePowerShellSyntax(trimmedCommand)) {
                console.log(`PowerShell command validated: ${trimmedCommand}`);
                return { valid: true };
            }
            else {
                return {
                    valid: false,
                    reason: 'powershell-syntax',
                    message: (0, security_config_1.getSecurityErrorMessage)(trimmedCommand, 'powershell-syntax')
                };
            }
        }
        // 3. Check dangerous patterns (most restrictive)
        if (this.DANGEROUS_PATTERNS.some(pattern => pattern.test(trimmedCommand))) {
            console.warn(`Dangerous pattern detected: ${trimmedCommand}`);
            return {
                valid: false,
                reason: 'dangerous-pattern',
                message: (0, security_config_1.getSecurityErrorMessage)(trimmedCommand, 'dangerous-pattern')
            };
        }
        // 4. Check base command allowlist
        const baseCommand = trimmedCommand.split(/\s+/)[0].toLowerCase();
        // Special handling for npm commands
        if (baseCommand === 'npm') {
            const isValid = this.validateNpmCommand(trimmedCommand);
            if (!isValid) {
                return {
                    valid: false,
                    reason: 'not-whitelisted',
                    message: (0, security_config_1.getSecurityErrorMessage)(trimmedCommand, 'not-whitelisted')
                };
            }
            return { valid: true };
        }
        // Special handling for PowerShell scripts
        if (baseCommand === 'powershell.exe' || trimmedCommand.startsWith('.\\scripts\\')) {
            const isValid = this.validatePowerShellCommand(trimmedCommand);
            if (!isValid) {
                return {
                    valid: false,
                    reason: 'powershell-syntax',
                    message: (0, security_config_1.getSecurityErrorMessage)(trimmedCommand, 'powershell-syntax')
                };
            }
            return { valid: true };
        }
        // Check if base command is in allowed list
        const isAllowed = this.ALLOWED_COMMANDS.has(baseCommand) ||
            this.ALLOWED_COMMANDS.has(baseCommand.replace('.exe', ''));
        if (!isAllowed) {
            console.warn(`Command blocked - not in allowed list: ${baseCommand}`);
            return {
                valid: false,
                reason: 'not-whitelisted',
                message: (0, security_config_1.getSecurityErrorMessage)(trimmedCommand, 'not-whitelisted')
            };
        }
        return { valid: true };
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
     * Validates portfolio-specific commands for enhanced project management
     * @param command The command to validate
     * @returns boolean - true if the command is a valid portfolio script
     */
    static validatePortfolioCommand(command) {
        return this.ALLOWED_PORTFOLIO_SCRIPTS.some(script => command.includes(script)) || this.validateCommand(command);
    }
    /**
     * Validates PowerShell commands and scripts
     */
    static validatePowerShellCommand(command) {
        // Check portfolio scripts first
        if (this.ALLOWED_PORTFOLIO_SCRIPTS.some(script => command.includes(script))) {
            return true;
        }
        // Allow only scripts in the scripts directory
        if (command.startsWith('.\\scripts\\')) {
            const scriptPath = command.split(/\s+/)[0];
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
            // SECURITY: Validate only the actual command (not cd part since terminal cwd handles directory)
            if (!this.validateCommand(command)) {
                await vscode.window.showErrorMessage(`Project command blocked for security reasons: ${command}`);
                return false;
            }
            // Check if dependencies need to be installed
            const needsInstall = await this.checkAndInstallDependencies(sanitizedPath, command);
            // Create or get terminal with sanitized path as working directory
            let terminal = vscode.window.terminals.find(t => t.name === terminalName);
            if (!terminal) {
                terminal = vscode.window.createTerminal({
                    name: terminalName,
                    cwd: sanitizedPath
                });
            }
            // Install dependencies first if needed
            if (needsInstall) {
                terminal.sendText('npm install');
                // Wait a moment before running the main command
                setTimeout(() => {
                    terminal.sendText(command);
                }, 2000);
            }
            else {
                // Execute the command immediately
                terminal.sendText(command);
            }
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
    /**
     * Checks if a Node.js project needs dependencies installed
     * @param projectPath The path to the project directory
     * @param command The command being executed
     * @returns Promise<boolean> - true if npm install should be run first
     */
    static async checkAndInstallDependencies(projectPath, command) {
        // Only check for npm projects
        if (!command.startsWith('npm ')) {
            return false;
        }
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const nodeModulesPath = path.join(projectPath, 'node_modules');
            // Check if package.json exists
            if (!fs.existsSync(packageJsonPath)) {
                return false;
            }
            // Check if node_modules exists
            if (!fs.existsSync(nodeModulesPath)) {
                console.log(`📦 Dependencies need to be installed for project: ${projectPath}`);
                // Show user notification
                vscode.window.showInformationMessage(`Installing dependencies for ${path.basename(projectPath)}...`);
                return true;
            }
            // Check if node_modules is empty or outdated
            const nodeModulesFiles = fs.readdirSync(nodeModulesPath);
            if (nodeModulesFiles.length === 0) {
                console.log(`📦 Empty node_modules detected, installing dependencies: ${projectPath}`);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Error checking dependencies:', error);
            return false;
        }
    }
}
exports.VSCodeSecurityService = VSCodeSecurityService;
VSCodeSecurityService.ALLOWED_COMMANDS = new Set(security_config_1.SHARED_SECURITY_CONFIG.ALLOWED_COMMANDS);
VSCodeSecurityService.ALLOWED_NPM_SCRIPTS = new Set(security_config_1.SHARED_SECURITY_CONFIG.ALLOWED_NPM_SCRIPTS);
VSCodeSecurityService.DANGEROUS_PATTERNS = security_config_1.SHARED_SECURITY_CONFIG.DANGEROUS_PATTERNS;
VSCodeSecurityService.SAFE_COMMAND_PATTERNS = security_config_1.SHARED_SECURITY_CONFIG.SAFE_COMMAND_PATTERNS;
// Portfolio-specific allowed scripts for enhanced project management
VSCodeSecurityService.ALLOWED_PORTFOLIO_SCRIPTS = [
    '.\\scripts\\start-all-tabbed.ps1',
    '.\\scripts\\kill-all-servers.ps1',
    '.\\scripts\\launch-projects-enhanced.ps1',
    '.\\scripts\\create-project-enhanced.ps1',
    '.\\scripts\\start-all-enhanced.ps1',
    '.\\scripts\\fix-vscode-performance.ps1'
];
//# sourceMappingURL=securityService.js.map