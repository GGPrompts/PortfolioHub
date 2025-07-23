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
exports.SecureTerminalUtils = exports.SecureCommandRunner = void 0;
const path = __importStar(require("path"));
const security_config_1 = require("../shared/security-config");
/**
 * SecureCommandRunner - Prevents command injection vulnerabilities
 *
 * This service validates and sanitizes commands before execution to prevent:
 * - Command injection attacks
 * - Path traversal attacks
 * - Execution of dangerous system commands
 */
class SecureCommandRunner {
    /**
     * Validate PowerShell-specific syntax for safe operations
     */
    static validatePowerShellSyntax(command) {
        return security_config_1.SHARED_SECURITY_CONFIG.SAFE_POWERSHELL_PATTERNS.some(pattern => pattern.test(command));
    }
    /**
     * Validates a command for safe execution
     * @param command The command to validate
     * @returns true if the command is safe to execute
     */
    static validateCommand(command) {
        if (!command || typeof command !== 'string') {
            return false;
        }
        const trimmedCommand = command.trim();
        if (trimmedCommand.length === 0) {
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
     * Validates PowerShell commands and scripts
     */
    static validatePowerShellCommand(command) {
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
     * @returns Sanitized absolute path
     * @throws Error if path traversal is detected
     */
    static sanitizePath(filePath, workspaceRoot) {
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
     * Validates file extensions for security
     * @param filePath The file path to check
     * @returns true if the file extension is allowed
     */
    static validateFileExtension(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return false;
        }
        const ext = path.extname(filePath).toLowerCase();
        return this.ALLOWED_EXTENSIONS.has(ext);
    }
    /**
     * Escapes special characters in file paths for safe shell usage
     * @param filePath The file path to escape
     * @returns Escaped file path
     */
    static escapeFilePath(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return '';
        }
        // For Windows, wrap in quotes if path contains spaces
        if (process.platform === 'win32') {
            return filePath.includes(' ') ? `"${filePath}"` : filePath;
        }
        // For Unix-like systems, escape special characters
        return filePath.replace(/(["\s'$`\\])/g, '\\$1');
    }
    /**
     * Validates environment variable names to prevent injection
     * @param envVarName The environment variable name to validate
     * @returns true if the environment variable name is safe
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
     * Creates a secure command with validated inputs
     * @param baseCommand The base command to execute
     * @param args Array of arguments
     * @param options Optional configuration
     * @returns Validated command string or null if invalid
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
                return arg.replace(/[;&|`$(){}[\]\\]/g, ''); // Remove dangerous characters
            }).filter(arg => arg.length > 0);
            command += ' ' + sanitizedArgs.join(' ');
        }
        // Add working directory if provided
        if (options.workingDir) {
            try {
                const sanitizedDir = this.sanitizePath(options.workingDir, process.cwd());
                command = `cd "${sanitizedDir}" && ${command}`;
            }
            catch (error) {
                console.error('Invalid working directory:', error);
                return null;
            }
        }
        // Final validation of the complete command
        if (!this.validateCommand(command)) {
            return null;
        }
        return command;
    }
}
exports.SecureCommandRunner = SecureCommandRunner;
SecureCommandRunner.ALLOWED_COMMANDS = new Set(security_config_1.SHARED_SECURITY_CONFIG.ALLOWED_COMMANDS);
SecureCommandRunner.ALLOWED_NPM_SCRIPTS = new Set(security_config_1.SHARED_SECURITY_CONFIG.ALLOWED_NPM_SCRIPTS);
SecureCommandRunner.DANGEROUS_PATTERNS = security_config_1.SHARED_SECURITY_CONFIG.DANGEROUS_PATTERNS;
SecureCommandRunner.ALLOWED_EXTENSIONS = new Set(security_config_1.SHARED_SECURITY_CONFIG.ALLOWED_EXTENSIONS);
SecureCommandRunner.SAFE_COMMAND_PATTERNS = security_config_1.SHARED_SECURITY_CONFIG.SAFE_COMMAND_PATTERNS;
/**
 * Utility functions for secure terminal operations
 */
class SecureTerminalUtils {
    /**
     * Sends a command to terminal with security validation
     * @param terminal VS Code terminal instance
     * @param command Command to execute
     * @param options Execution options
     * @returns true if command was sent, false if blocked
     */
    static sendSecureCommand(terminal, command, options = { validate: true }) {
        if (options.validate && !SecureCommandRunner.validateCommand(command)) {
            console.error(`Command blocked for security reasons: ${command}`);
            return false;
        }
        try {
            terminal.sendText(command);
            return true;
        }
        catch (error) {
            console.error('Failed to send command to terminal:', error);
            return false;
        }
    }
    /**
     * Creates and sends a secure project command
     * @param terminal VS Code terminal instance
     * @param projectPath Path to the project
     * @param command Command to execute in project directory
     * @param workspaceRoot Workspace root for path validation
     * @returns true if successful
     */
    static sendSecureProjectCommand(terminal, projectPath, command, workspaceRoot) {
        try {
            // Validate and sanitize the project path
            const sanitizedPath = SecureCommandRunner.sanitizePath(projectPath, workspaceRoot);
            // Validate the command
            if (!SecureCommandRunner.validateCommand(command)) {
                console.error(`Command blocked: ${command}`);
                return false;
            }
            // Escape the path for safe shell usage
            const escapedPath = SecureCommandRunner.escapeFilePath(sanitizedPath);
            // Create the full command
            const fullCommand = `cd ${escapedPath} && ${command}`;
            // Send to terminal
            terminal.sendText(fullCommand);
            return true;
        }
        catch (error) {
            console.error('Failed to send secure project command:', error);
            return false;
        }
    }
}
exports.SecureTerminalUtils = SecureTerminalUtils;
//# sourceMappingURL=securityService.js.map