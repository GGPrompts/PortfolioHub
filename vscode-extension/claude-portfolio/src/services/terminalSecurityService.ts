/**
 * Terminal Security Service - Enhanced security validation for terminal commands
 * 
 * This service provides specialized security validation for terminal operations,
 * workbranch permission checking, and command sanitization.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { VSCodeSecurityService } from '../securityService';

export interface TerminalSecurityContext {
    workbranchId: string;
    workingDirectory: string;
    shell: 'powershell' | 'bash' | 'cmd';
    sessionId: string;
}

export interface TerminalValidationResult {
    valid: boolean;
    reason?: string;
    message?: string;
    sanitizedCommand?: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class TerminalSecurityService {
    private static readonly DANGEROUS_TERMINAL_COMMANDS = [
        // System destruction
        /rm\s+-rf\s+\//, 
        /format\s+[cd]:/i,
        /del\s+\/[sq]\s+c:\\/i,
        /rd\s+\/s\s+c:\\/i,
        
        // System control
        /shutdown/i,
        /reboot/i,
        /restart-computer/i,
        /stop-computer/i,
        
        // Disk operations
        /mkfs/,
        /dd\s+if=.*of=\/dev/,
        /fsutil\s+file\s+createnew/i,
        
        // Network operations
        /netsh\s+wlan\s+.*password/i,
        /netsh\s+interface\s+ip\s+set/i,
        
        // Registry manipulation (high risk)
        /reg\s+delete\s+hklm/i,
        /reg\s+add\s+hklm.*\/f/i,
        
        // Service manipulation
        /sc\s+delete/i,
        /net\s+stop\s+(spooler|windefend)/i,
        
        // User account manipulation
        /net\s+user\s+.*\/add/i,
        /net\s+localgroup\s+administrators/i,
        
        // PowerShell execution policy bypass
        /set-executionpolicy\s+unrestricted/i,
        /invoke-expression.*downloadstring/i,
        /iex.*downloadstring/i,
        
        // Malicious file operations
        /copy\s+.*\$recycle\.bin/i,
        /attrib\s+\+h\s+\+s/i,
    ];

    private static readonly MEDIUM_RISK_PATTERNS = [
        // Process termination
        /taskkill\s+\/f\s+\/im/i,
        /stop-process\s+-force/i,
        /pkill\s+-9/,
        
        // File system operations
        /rmdir\s+\/s/i,
        /rd\s+\/s/i,
        /rm\s+-r/,
        
        // System information gathering
        /whoami\s+\/all/i,
        /systeminfo/i,
        /get-computerinfo/i,
        
        // Network scanning
        /nmap\s+/,
        /ping\s+-t/i,
        /netstat\s+-a/i,
    ];

    private static readonly ALLOWED_WORKBRANCH_COMMANDS = [
        // Development commands
        /npm\s+(install|start|run|build|test)/i,
        /yarn\s+(install|start|build|test)/i,
        /git\s+(status|add|commit|push|pull|clone)/i,
        /code\s+/i,
        
        // File operations (within workbranch)
        /mkdir\s+/i,
        /touch\s+/i,
        /echo\s+/i,
        /cat\s+/i,
        /ls\s*/,
        /dir\s*/i,
        /type\s+/i,
        
        // Navigation
        /cd\s+/i,
        /pwd/,
        /where/i,
        
        // Process inspection
        /ps\s*/,
        /get-process/i,
        /tasklist/i,
        
        // Safe PowerShell cmdlets
        /get-childitem/i,
        /get-content/i,
        /set-content/i,
        /out-file/i,
    ];

    /**
     * Validate a terminal command with enhanced security checks
     */
    static validateTerminalCommand(command: string, context: TerminalSecurityContext): TerminalValidationResult {
        if (!command || typeof command !== 'string') {
            return {
                valid: false,
                reason: 'invalid-input',
                message: 'Command is null or not a string',
                riskLevel: 'low'
            };
        }

        const trimmedCommand = command.trim();
        if (trimmedCommand.length === 0) {
            return {
                valid: false,
                reason: 'empty-command',
                message: 'Command is empty',
                riskLevel: 'low'
            };
        }

        // Check for critical dangerous patterns first
        if (this.DANGEROUS_TERMINAL_COMMANDS.some(pattern => pattern.test(trimmedCommand))) {
            return {
                valid: false,
                reason: 'dangerous-command',
                message: 'Command contains dangerous patterns that could harm the system',
                riskLevel: 'critical'
            };
        }

        // Check for medium risk patterns
        if (this.MEDIUM_RISK_PATTERNS.some(pattern => pattern.test(trimmedCommand))) {
            // Medium risk commands require additional validation
            if (!this.validateMediumRiskCommand(trimmedCommand, context)) {
                return {
                    valid: false,
                    reason: 'medium-risk-blocked',
                    message: 'Command blocked due to medium risk security patterns',
                    riskLevel: 'medium'
                };
            }
        }

        // Use base VS Code security validation
        if (!VSCodeSecurityService.validateCommand(trimmedCommand)) {
            return {
                valid: false,
                reason: 'base-validation-failed',
                message: 'Command failed base security validation',
                riskLevel: 'high'
            };
        }

        // Validate workbranch permissions
        if (!this.checkWorkbranchCommandPermissions(trimmedCommand, context)) {
            return {
                valid: false,
                reason: 'workbranch-permission-denied',
                message: 'Command not allowed in this workbranch context',
                riskLevel: 'medium'
            };
        }

        // Sanitize the command
        const sanitizedCommand = this.sanitizeTerminalInput(trimmedCommand);

        return {
            valid: true,
            sanitizedCommand,
            riskLevel: this.assessRiskLevel(trimmedCommand)
        };
    }

    /**
     * Sanitize terminal input to remove potentially dangerous characters
     */
    static sanitizeTerminalInput(input: string): string {
        if (!input || typeof input !== 'string') {
            return '';
        }

        // Remove control characters except for common ones
        let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        // Remove potential command injection characters (but preserve legitimate uses)
        // This is a conservative approach - we keep basic shell features but remove dangerous ones
        sanitized = sanitized.replace(/[`]/g, ''); // Remove backticks (command substitution)
        
        // Limit length to prevent buffer overflow attempts
        if (sanitized.length > 4096) {
            sanitized = sanitized.substring(0, 4096);
        }

        return sanitized.trim();
    }

    /**
     * Check workbranch-specific command permissions
     */
    static checkWorkbranchPermissions(workbranchId: string): boolean {
        // Basic workbranch ID validation
        if (!workbranchId || typeof workbranchId !== 'string') {
            return false;
        }

        // Workbranch ID should be alphanumeric with limited special characters
        const validWorkbranchPattern = /^[a-zA-Z0-9_-]+$/;
        if (!validWorkbranchPattern.test(workbranchId)) {
            return false;
        }

        // Length validation
        if (workbranchId.length < 1 || workbranchId.length > 100) {
            return false;
        }

        // Reserved workbranch names that should not be allowed
        const reservedNames = ['system', 'admin', 'root', 'windows', 'program files', 'users'];
        if (reservedNames.includes(workbranchId.toLowerCase())) {
            return false;
        }

        return true;
    }

    /**
     * Validate medium risk commands with additional context
     */
    private static validateMediumRiskCommand(command: string, context: TerminalSecurityContext): boolean {
        // Medium risk commands are allowed only in development contexts
        // and with specific workbranch permissions
        
        // Check if it's a development-related command
        const isDevelopmentCommand = this.ALLOWED_WORKBRANCH_COMMANDS.some(pattern => 
            pattern.test(command)
        );

        if (isDevelopmentCommand) {
            return true;
        }

        // For process termination commands, only allow termination of specific processes
        if (/taskkill|stop-process|pkill/.test(command.toLowerCase())) {
            return this.validateProcessTerminationCommand(command, context);
        }

        // For file system operations, ensure they're within workbranch scope
        if (/rmdir|rd|rm/.test(command.toLowerCase())) {
            return this.validateFileSystemCommand(command, context);
        }

        // Default deny for unrecognized medium risk commands
        return false;
    }

    /**
     * Validate process termination commands
     */
    private static validateProcessTerminationCommand(command: string, context: TerminalSecurityContext): boolean {
        // Allow termination of development processes only
        const allowedProcessPatterns = [
            /node\.exe/i,
            /npm\.exe/i,
            /yarn\.exe/i,
            /webpack/i,
            /vite/i,
            /react-scripts/i,
            /next-dev/i,
        ];

        return allowedProcessPatterns.some(pattern => pattern.test(command));
    }

    /**
     * Validate file system commands to ensure they're within workbranch scope
     */
    private static validateFileSystemCommand(command: string, context: TerminalSecurityContext): boolean {
        // Extract path from command
        const pathMatch = command.match(/(?:rmdir|rd|rm)\s+([^\s]+)/i);
        if (!pathMatch) {
            return false;
        }

        const targetPath = pathMatch[1];
        
        // Ensure the path is relative or within the workbranch directory
        if (path.isAbsolute(targetPath)) {
            const normalizedPath = path.normalize(targetPath);
            const workbranchPath = path.normalize(context.workingDirectory);
            
            // Path must be within the workbranch directory
            return normalizedPath.startsWith(workbranchPath);
        }

        // Relative paths are generally safer, but check for traversal attempts
        if (targetPath.includes('..')) {
            return false;
        }

        return true;
    }

    /**
     * Check workbranch command permissions based on context
     */
    private static checkWorkbranchCommandPermissions(command: string, context: TerminalSecurityContext): boolean {
        // Commands that are always allowed in workbranch context
        if (this.ALLOWED_WORKBRANCH_COMMANDS.some(pattern => pattern.test(command))) {
            return true;
        }

        // Shell-specific validations
        switch (context.shell) {
            case 'powershell':
                return this.validatePowerShellCommand(command, context);
            case 'bash':
                return this.validateBashCommand(command, context);
            case 'cmd':
                return this.validateCmdCommand(command, context);
            default:
                return false;
        }
    }

    /**
     * PowerShell-specific command validation
     */
    private static validatePowerShellCommand(command: string, context: TerminalSecurityContext): boolean {
        const lowerCommand = command.toLowerCase();

        // Allow common PowerShell cmdlets that are safe in workbranch context
        const safePowerShellCmdlets = [
            'get-childitem', 'get-content', 'set-content', 'out-file', 'write-host',
            'write-output', 'measure-object', 'select-object', 'where-object',
            'foreach-object', 'sort-object', 'group-object', 'compare-object',
            'get-date', 'get-location', 'set-location', 'push-location', 'pop-location',
            'test-path', 'resolve-path', 'split-path', 'join-path',
            'get-variable', 'set-variable', 'clear-variable',
        ];

        return safePowerShellCmdlets.some(cmdlet => lowerCommand.includes(cmdlet));
    }

    /**
     * Bash-specific command validation
     */
    private static validateBashCommand(command: string, context: TerminalSecurityContext): boolean {
        const lowerCommand = command.toLowerCase();

        // Allow common bash commands that are safe in workbranch context
        const safeBashCommands = [
            'ls', 'cat', 'grep', 'find', 'head', 'tail', 'wc', 'sort', 'uniq',
            'sed', 'awk', 'cut', 'tr', 'basename', 'dirname', 'realpath',
            'date', 'whoami', 'id', 'groups', 'which', 'whereis',
            'tar', 'gzip', 'gunzip', 'zip', 'unzip',
        ];

        const commandWord = lowerCommand.split(/\s+/)[0];
        return safeBashCommands.includes(commandWord);
    }

    /**
     * CMD-specific command validation
     */
    private static validateCmdCommand(command: string, context: TerminalSecurityContext): boolean {
        const lowerCommand = command.toLowerCase();

        // Allow common CMD commands that are safe in workbranch context
        const safeCmdCommands = [
            'dir', 'type', 'copy', 'move', 'ren', 'rename', 'del', 'erase',
            'md', 'mkdir', 'rd', 'rmdir', 'cd', 'chdir', 'pushd', 'popd',
            'date', 'time', 'ver', 'vol', 'label', 'tree', 'fc', 'comp',
            'find', 'findstr', 'sort', 'more',
        ];

        const commandWord = lowerCommand.split(/\s+/)[0];
        return safeCmdCommands.includes(commandWord);
    }

    /**
     * Assess the risk level of a command
     */
    private static assessRiskLevel(command: string): 'low' | 'medium' | 'high' | 'critical' {
        const lowerCommand = command.toLowerCase();

        // Critical risk patterns
        if (this.DANGEROUS_TERMINAL_COMMANDS.some(pattern => pattern.test(command))) {
            return 'critical';
        }

        // High risk patterns
        if (lowerCommand.includes('invoke-expression') || 
            lowerCommand.includes('downloadstring') ||
            lowerCommand.includes('bypass') ||
            /reg\s+(add|delete)/i.test(command)) {
            return 'high';
        }

        // Medium risk patterns
        if (this.MEDIUM_RISK_PATTERNS.some(pattern => pattern.test(command))) {
            return 'medium';
        }

        // Default to low risk
        return 'low';
    }

    /**
     * Generate security report for a command
     */
    static generateSecurityReport(command: string, context: TerminalSecurityContext): {
        command: string;
        validation: TerminalValidationResult;
        recommendations: string[];
        securityNote: string;
    } {
        const validation = this.validateTerminalCommand(command, context);
        const recommendations: string[] = [];
        let securityNote = '';

        if (validation.riskLevel === 'critical') {
            recommendations.push('Command blocked due to critical security risk');
            recommendations.push('Consider using safer alternatives');
            securityNote = 'This command has been identified as potentially harmful to system security.';
        } else if (validation.riskLevel === 'high') {
            recommendations.push('Exercise extreme caution with this command');
            recommendations.push('Ensure you understand the full implications');
            securityNote = 'This command carries high security risks and should be used carefully.';
        } else if (validation.riskLevel === 'medium') {
            recommendations.push('Review command parameters carefully');
            recommendations.push('Ensure command scope is limited to your workbranch');
            securityNote = 'This command has moderate security implications.';
        } else {
            recommendations.push('Command appears safe for workbranch use');
            securityNote = 'This command has low security risk in the current context.';
        }

        return {
            command,
            validation,
            recommendations,
            securityNote
        };
    }
}