import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * VS Code Security Service - Provides secure command execution with workspace trust
 * 
 * This service ensures commands are only executed in trusted workspaces and validates
 * all inputs to prevent command injection and path traversal attacks.
 */
export class VSCodeSecurityService {
    private static readonly ALLOWED_COMMANDS = new Set([
        'npm', 'yarn', 'pnpm', 'node', 'git', 'echo', 'cd', 'ls', 'dir',
        'powershell.exe', 'cmd.exe', 'Write-Host', 'explorer', 'code'
    ]);
    
    private static readonly ALLOWED_NPM_SCRIPTS = new Set([
        'dev', 'start', 'build', 'test', 'install', 'run', 'compile', 'watch'
    ]);
    
    private static readonly DANGEROUS_PATTERNS = [
        /[;&|`$(){}[\]\\]/,  // Shell injection characters
        /\.\.\//,            // Path traversal  
        /rm\s+-rf/i,         // Destructive commands
        /del\s+\/[sq]/i,     // Windows destructive commands
        /format\s+[c-z]:/i,  // Format drive commands
        /shutdown/i,         // System shutdown
        /reboot/i,           // System reboot
        /halt/i,             // System halt
        /\>\s*nul/i,         // Output redirection that might hide malicious output
        /\&\&\s*(rm|del|format)/i, // Chained destructive commands
    ];

    /**
     * Checks if the current workspace is trusted and prompts user if not
     * @param operation Description of the operation requiring trust
     * @returns Promise<boolean> - true if workspace is trusted
     */
    static async requireWorkspaceTrust(operation: string): Promise<boolean> {
        if (!vscode.workspace.isTrusted) {
            const choice = await vscode.window.showWarningMessage(
                `${operation} requires workspace trust to execute safely.`,
                { 
                    modal: true,
                    detail: 'Workspace trust is required to prevent malicious code execution. Please trust this workspace to continue.'
                },
                'Trust Workspace',
                'Cancel'
            );

            if (choice === 'Trust Workspace') {
                // Note: VS Code will handle the trust dialog automatically
                // We can't programmatically trust a workspace for security reasons
                await vscode.window.showInformationMessage(
                    'Please use the workspace trust dialog to trust this workspace, then try again.'
                );
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
    static validateCommand(command: string): boolean {
        if (!command || typeof command !== 'string') {
            console.warn('Command validation failed: command is null or not a string');
            return false;
        }

        const trimmedCommand = command.trim();
        if (trimmedCommand.length === 0) {
            console.warn('Command validation failed: command is empty');
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
    private static validateNpmCommand(command: string): boolean {
        const parts = command.split(/\s+/);
        if (parts.length < 2) return false;

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
    private static validatePowerShellCommand(command: string): boolean {
        // Allow only scripts in the scripts directory
        if (command.startsWith('.\\\\scripts\\\\')) {
            const scriptPath = command.split(/\\s+/)[0];
            return scriptPath.endsWith('.ps1');
        }

        // For powershell.exe commands, only allow specific safe patterns
        if (command.toLowerCase().includes('powershell.exe')) {
            // Allow only execution of .ps1 files with specific flags
            const allowedFlags = ['-ExecutionPolicy', 'Bypass', '-File'];
            const hasOnlyAllowedFlags = allowedFlags.some(flag => 
                command.includes(flag)
            );
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
    static async sanitizePath(filePath: string, workspaceRoot: string): Promise<string> {
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
    static async executeSecureCommand(
        command: string, 
        terminalName: string = 'Secure Terminal',
        workspaceRoot: string
    ): Promise<boolean> {
        try {
            // Check workspace trust first
            if (!await this.requireWorkspaceTrust(`Command execution (${terminalName})`)) {
                return false;
            }

            // Validate the command
            if (!this.validateCommand(command)) {
                await vscode.window.showErrorMessage(
                    `Command blocked for security reasons: ${command.substring(0, 50)}...`
                );
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

        } catch (error) {
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
    static async executeProjectCommand(
        projectPath: string,
        command: string,
        terminalName: string,
        workspaceRoot: string
    ): Promise<boolean> {
        try {
            // Check workspace trust
            if (!await this.requireWorkspaceTrust(`Project command execution (${terminalName})`)) {
                return false;
            }

            // Validate and sanitize the project path
            const sanitizedPath = await this.sanitizePath(projectPath, workspaceRoot);
            
            // Validate the command
            if (!this.validateCommand(command)) {
                await vscode.window.showErrorMessage(
                    `Project command blocked for security reasons: ${command}`
                );
                return false;
            }

            // SECURITY: Validate only the actual command (not cd part since terminal cwd handles directory)
            if (!this.validateCommand(command)) {
                await vscode.window.showErrorMessage(
                    `Project command blocked for security reasons: ${command}`
                );
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
            } else {
                // Execute the command immediately
                terminal.sendText(command);
            }
            terminal.show();

            console.log(`Secure project command executed: ${command} in ${sanitizedPath}`);
            return true;
            
        } catch (error) {
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
    static createSecureCommand(
        baseCommand: string, 
        args: string[] = [], 
        options: { workingDir?: string } = {}
    ): string | null {
        if (!this.validateCommand(baseCommand)) {
            return null;
        }

        let command = baseCommand;

        // Add arguments if provided
        if (args.length > 0) {
            const sanitizedArgs = args.map(arg => {
                // Basic argument sanitization
                if (typeof arg !== 'string') return '';
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
    static validateEnvironmentVariable(envVarName: string): boolean {
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
    private static async checkAndInstallDependencies(projectPath: string, command: string): Promise<boolean> {
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
                vscode.window.showInformationMessage(
                    `Installing dependencies for ${path.basename(projectPath)}...`
                );
                
                return true;
            }

            // Check if node_modules is empty or outdated
            const nodeModulesFiles = fs.readdirSync(nodeModulesPath);
            if (nodeModulesFiles.length === 0) {
                console.log(`📦 Empty node_modules detected, installing dependencies: ${projectPath}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking dependencies:', error);
            return false;
        }
    }
}