/**
 * Security Service - Command validation and workbranch isolation
 * 
 * This service provides comprehensive security validation for terminal commands:
 * - Command injection prevention with pattern matching
 * - Path traversal prevention and workspace boundary enforcement
 * - Dangerous command blocking (system commands, destructive operations)
 * - Workbranch isolation validation
 * - Resource usage monitoring and limits
 * - Audit logging for security events
 * - Configurable security policies
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export interface SecurityConfig {
    workspaceRoot: string;
    enabled: boolean;
    allowDangerousCommands?: boolean;
    maxCommandLength?: number;
    allowedExecutables?: string[];
    blockedPatterns?: RegExp[];
    logSecurityEvents?: boolean;
}

export interface SecurityValidationResult {
    valid: boolean;
    reason?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    suggestion?: string;
}

export interface SecurityAuditEvent {
    timestamp: Date;
    type: 'command_blocked' | 'path_violation' | 'workbranch_violation' | 'resource_limit';
    command: string;
    workbranchId: string;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userAgent?: string;
    sessionId?: string;
}

export class SecurityService {
    private config: SecurityConfig;
    private auditLog: SecurityAuditEvent[] = [];
    private commandCounts: Map<string, number> = new Map();
    private rateLimits: Map<string, { count: number; window: number }> = new Map();

    // Default security patterns
    private readonly DANGEROUS_PATTERNS: Array<{ pattern: RegExp; reason: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = [
        // System destructive commands
        { pattern: /rm\s+-rf\s+\//, reason: 'Dangerous recursive deletion', severity: 'critical' },
        { pattern: /format\s+[a-z]:/i, reason: 'Disk format command', severity: 'critical' },
        { pattern: /del\s*\/[sq]\s+[a-z]:\\/i, reason: 'Recursive Windows deletion', severity: 'critical' },
        { pattern: /shutdown|reboot|halt/i, reason: 'System shutdown command', severity: 'high' },
        { pattern: /mkfs|fdisk|parted/i, reason: 'Disk partitioning command', severity: 'critical' },
        { pattern: /dd\s+if=.*of=\/dev/i, reason: 'Direct disk write operation', severity: 'critical' },
        
        // Network and system access
        { pattern: /nc\s+-l|netcat\s+-l/i, reason: 'Network listener creation', severity: 'high' },
        { pattern: /telnet|ssh.*@/i, reason: 'Remote connection attempt', severity: 'medium' },
        { pattern: /wget|curl.*\|.*sh/i, reason: 'Download and execute pattern', severity: 'high' },
        { pattern: /sudo\s+|su\s+/i, reason: 'Privilege escalation attempt', severity: 'high' },
        
        // Command injection patterns
        { pattern: /;|\|\||&&|`|\$\(/i, reason: 'Command injection characters', severity: 'high' },
        { pattern: />\s*\/dev\/null.*&/i, reason: 'Background process creation', severity: 'medium' },
        { pattern: /<\(.*\)|>\(.*\)/i, reason: 'Process substitution', severity: 'medium' },
        
        // Path traversal
        { pattern: /\.\.\/|\.\.\\/, reason: 'Path traversal attempt', severity: 'high' },
        { pattern: /\/etc\/|\/root\/|\/home\/.*\/\./i, reason: 'System directory access', severity: 'high' },
        { pattern: /c:\\windows\\|c:\\users\\.*\\appdata/i, reason: 'Windows system directory access', severity: 'high' },
        
        // Registry and system modification (Windows)
        { pattern: /reg\s+(add|delete|import)/i, reason: 'Registry modification', severity: 'high' },
        { pattern: /sc\s+(create|delete|config)/i, reason: 'Windows service modification', severity: 'high' },
        { pattern: /wmic\s+/i, reason: 'Windows management interface access', severity: 'medium' },
        
        // Process manipulation
        { pattern: /kill\s+-9|killall/i, reason: 'Force process termination', severity: 'medium' },
        { pattern: /pkill|killall/i, reason: 'Mass process termination', severity: 'medium' },
        
        // File system manipulation
        { pattern: /chmod\s+777|chmod\s+\+x.*\/tmp/i, reason: 'Dangerous permission change', severity: 'high' },
        { pattern: /chown\s+root|chgrp\s+root/i, reason: 'Root ownership change', severity: 'high' },
        
        // Archive and compression (potential zip bombs)
        { pattern: /tar\s+.*zf.*\/dev\/zero/i, reason: 'Potential zip bomb creation', severity: 'medium' },
        { pattern: /gzip.*<\s*\/dev\/zero/i, reason: 'Compression bomb attempt', severity: 'medium' }
    ];

    // Allowed safe commands (whitelist approach for high security)
    private readonly SAFE_COMMANDS = [
        'ls', 'dir', 'cd', 'pwd', 'echo', 'cat', 'type', 'more', 'less',
        'npm', 'node', 'python', 'python3', 'pip', 'pip3',
        'git', 'code', 'notepad', 'nano', 'vim',
        'mkdir', 'touch', 'cp', 'copy', 'mv', 'move',
        'find', 'grep', 'where', 'which',
        'ps', 'top', 'tasklist',
        'clear', 'cls',
        'help', 'man', 'info'
    ];

    // Allowed npm scripts (common development scripts)
    private readonly ALLOWED_NPM_SCRIPTS = [
        'start', 'dev', 'build', 'test', 'lint', 'format',
        'install', 'update', 'audit', 'run', 'run-script',
        'version', 'publish', 'pack'
    ];

    constructor(config: SecurityConfig) {
        this.config = {
            maxCommandLength: 1000,
            allowDangerousCommands: false,
            logSecurityEvents: true,
            allowedExecutables: [],
            blockedPatterns: [],
            ...config
        };

        console.log(`🛡️ Security Service initialized:`, {
            enabled: this.config.enabled,
            workspaceRoot: this.config.workspaceRoot,
            allowDangerous: this.config.allowDangerousCommands,
            logEvents: this.config.logSecurityEvents
        });
    }

    /**
     * Validate a terminal command for security
     */
    validateCommand(command: string, workbranchId: string, sessionId?: string): SecurityValidationResult {
        if (!this.config.enabled) {
            return { valid: true };
        }

        // Basic command validation
        const basicValidation = this.performBasicValidation(command);
        if (!basicValidation.valid) {
            this.logSecurityEvent('command_blocked', command, workbranchId, basicValidation.reason!, basicValidation.severity!, sessionId);
            return basicValidation;
        }

        // Pattern-based validation
        const patternValidation = this.performPatternValidation(command);
        if (!patternValidation.valid) {
            this.logSecurityEvent('command_blocked', command, workbranchId, patternValidation.reason!, patternValidation.severity!, sessionId);
            return patternValidation;
        }

        // Workbranch isolation validation
        const isolationValidation = this.validateWorkbranchIsolation(command, workbranchId);
        if (!isolationValidation.valid) {
            this.logSecurityEvent('workbranch_violation', command, workbranchId, isolationValidation.reason!, isolationValidation.severity!, sessionId);
            return isolationValidation;
        }

        // Rate limiting validation
        const rateLimitValidation = this.validateRateLimit(command, workbranchId);
        if (!rateLimitValidation.valid) {
            this.logSecurityEvent('resource_limit', command, workbranchId, rateLimitValidation.reason!, rateLimitValidation.severity!, sessionId);
            return rateLimitValidation;
        }

        return { valid: true };
    }

    /**
     * Validate and sanitize a file path
     */
    validatePath(inputPath: string, workbranchId: string): { valid: boolean; sanitizedPath?: string; reason?: string } {
        try {
            // Resolve the path to handle relative paths and symlinks
            const resolvedPath = path.resolve(inputPath);
            const workspaceNormalized = path.normalize(this.config.workspaceRoot);
            const workbranchPath = path.join(workspaceNormalized, 'workbranches', workbranchId);
            
            // Check if path is within workspace
            if (!resolvedPath.startsWith(workspaceNormalized)) {
                return {
                    valid: false,
                    reason: 'Path is outside workspace boundaries'
                };
            }

            // For workbranch isolation, prefer paths within the workbranch
            if (!resolvedPath.startsWith(workbranchPath)) {
                console.warn(`⚠️ Path outside workbranch: ${resolvedPath} (workbranch: ${workbranchPath})`);
                // Allow but log the warning
            }

            return {
                valid: true,
                sanitizedPath: resolvedPath
            };

        } catch (error) {
            return {
                valid: false,
                reason: `Invalid path format: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Validate workbranch ID format and permissions
     */
    validateWorkbranchId(workbranchId: string): boolean {
        // Basic format validation
        if (!/^[a-zA-Z0-9_-]+$/.test(workbranchId)) {
            return false;
        }

        // Length validation
        if (workbranchId.length === 0 || workbranchId.length > 100) {
            return false;
        }

        // Reserved name validation
        const reservedNames = ['admin', 'root', 'system', 'config', 'temp', 'tmp'];
        if (reservedNames.includes(workbranchId.toLowerCase())) {
            return false;
        }

        return true;
    }

    /**
     * Get security audit log
     */
    getAuditLog(): SecurityAuditEvent[] {
        return [...this.auditLog];
    }

    /**
     * Clear audit log
     */
    clearAuditLog(): void {
        this.auditLog = [];
        console.log('🧹 Security audit log cleared');
    }

    /**
     * Get security statistics
     */
    getSecurityStats(): {
        totalEvents: number;
        eventsByType: Record<string, number>;
        eventsBySeverity: Record<string, number>;
        topBlockedCommands: Array<{ command: string; count: number }>;
        topViolatingWorkbranches: Array<{ workbranchId: string; count: number }>;
    } {
        const stats = {
            totalEvents: this.auditLog.length,
            eventsByType: {} as Record<string, number>,
            eventsBySeverity: {} as Record<string, number>,
            topBlockedCommands: [] as Array<{ command: string; count: number }>,
            topViolatingWorkbranches: [] as Array<{ workbranchId: string; count: number }>
        };

        // Count events by type and severity
        const commandCounts: Record<string, number> = {};
        const workbranchCounts: Record<string, number> = {};

        this.auditLog.forEach(event => {
            // Type counts
            stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
            
            // Severity counts
            stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;
            
            // Command counts
            const cmdKey = event.command.substring(0, 50); // Truncate for grouping
            commandCounts[cmdKey] = (commandCounts[cmdKey] || 0) + 1;
            
            // Workbranch counts
            workbranchCounts[event.workbranchId] = (workbranchCounts[event.workbranchId] || 0) + 1;
        });

        // Top blocked commands
        stats.topBlockedCommands = Object.entries(commandCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([command, count]) => ({ command, count }));

        // Top violating workbranches
        stats.topViolatingWorkbranches = Object.entries(workbranchCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([workbranchId, count]) => ({ workbranchId, count }));

        return stats;
    }

    /**
     * Perform basic command validation
     */
    private performBasicValidation(command: string): SecurityValidationResult {
        // Empty command
        if (!command || command.trim().length === 0) {
            return {
                valid: false,
                reason: 'Empty command',
                severity: 'low'
            };
        }

        // Command length validation
        if (command.length > this.config.maxCommandLength!) {
            return {
                valid: false,
                reason: `Command too long (${command.length} > ${this.config.maxCommandLength})`,
                severity: 'medium',
                suggestion: 'Break down the command into smaller parts'
            };
        }

        // Null byte injection
        if (command.includes('\0')) {
            return {
                valid: false,
                reason: 'Null byte injection detected',
                severity: 'critical'
            };
        }

        // Control character injection
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(command)) {
            return {
                valid: false,
                reason: 'Control character injection detected',
                severity: 'high'
            };
        }

        return { valid: true };
    }

    /**
     * Perform pattern-based security validation
     */
    private performPatternValidation(command: string): SecurityValidationResult {
        // Check against dangerous patterns
        for (const { pattern, reason, severity } of this.DANGEROUS_PATTERNS) {
            if (pattern.test(command)) {
                return {
                    valid: false,
                    reason,
                    severity,
                    suggestion: 'Use safer alternatives or contact administrator'
                };
            }
        }

        // Check against custom blocked patterns
        if (this.config.blockedPatterns) {
            for (const pattern of this.config.blockedPatterns) {
                if (pattern.test(command)) {
                    return {
                        valid: false,
                        reason: 'Command matches blocked pattern',
                        severity: 'medium'
                    };
                }
            }
        }

        // If high security mode and not allowing dangerous commands,
        // use whitelist approach for command executables
        if (!this.config.allowDangerousCommands) {
            const firstWord = command.trim().split(/\s+/)[0].toLowerCase();
            const commandName = path.basename(firstWord);
            
            // Allow npm scripts
            if (firstWord === 'npm' && this.isAllowedNpmScript(command)) {
                return { valid: true };
            }
            
            // Check if command is in safe list
            if (!this.SAFE_COMMANDS.includes(commandName) && 
                !this.config.allowedExecutables?.includes(commandName)) {
                return {
                    valid: false,
                    reason: `Command not in allowed list: ${commandName}`,
                    severity: 'medium',
                    suggestion: 'Use approved development commands only'
                };
            }
        }

        return { valid: true };
    }

    /**
     * Validate workbranch isolation
     */
    private validateWorkbranchIsolation(command: string, workbranchId: string): SecurityValidationResult {
        // Extract potential paths from command
        const pathMatches = command.match(/[^\s]+/g) || [];
        
        for (const match of pathMatches) {
            // Skip obvious non-paths
            if (match.length < 2 || match.startsWith('-') || !match.includes('/') && !match.includes('\\')) {
                continue;
            }

            // Validate each potential path
            const pathValidation = this.validatePath(match, workbranchId);
            if (!pathValidation.valid) {
                return {
                    valid: false,
                    reason: `Path violation: ${pathValidation.reason}`,
                    severity: 'high'
                };
            }
        }

        return { valid: true };
    }

    /**
     * Validate rate limiting
     */
    private validateRateLimit(command: string, workbranchId: string): SecurityValidationResult {
        const key = `${workbranchId}:${command.substring(0, 50)}`;
        const now = Date.now();
        const windowSize = 60000; // 1 minute window
        const maxCommands = 30; // Max 30 identical commands per minute

        if (!this.rateLimits.has(key)) {
            this.rateLimits.set(key, { count: 1, window: now });
            return { valid: true };
        }

        const rateLimit = this.rateLimits.get(key)!;
        
        // Reset window if expired
        if (now - rateLimit.window > windowSize) {
            rateLimit.count = 1;
            rateLimit.window = now;
            return { valid: true };
        }

        // Increment count
        rateLimit.count++;

        // Check limit
        if (rateLimit.count > maxCommands) {
            return {
                valid: false,
                reason: `Rate limit exceeded: ${rateLimit.count} commands in ${windowSize/1000}s`,
                severity: 'medium',
                suggestion: 'Slow down command execution'
            };
        }

        return { valid: true };
    }

    /**
     * Check if npm script is allowed
     */
    private isAllowedNpmScript(command: string): boolean {
        const parts = command.trim().split(/\s+/);
        if (parts[0] !== 'npm' || parts.length < 2) {
            return false;
        }

        const script = parts[1];
        return this.ALLOWED_NPM_SCRIPTS.includes(script);
    }

    /**
     * Log security event
     */
    private logSecurityEvent(
        type: SecurityAuditEvent['type'],
        command: string,
        workbranchId: string,
        reason: string,
        severity: SecurityAuditEvent['severity'],
        sessionId?: string
    ): void {
        if (!this.config.logSecurityEvents) {
            return;
        }

        const event: SecurityAuditEvent = {
            timestamp: new Date(),
            type,
            command: command.substring(0, 200), // Truncate for storage
            workbranchId,
            reason,
            severity,
            sessionId
        };

        this.auditLog.push(event);

        // Log to console based on severity
        const logLevel = severity === 'critical' ? 'error' : 
                        severity === 'high' ? 'warn' : 
                        'log';
        
        console[logLevel](`🛡️ Security ${type}:`, {
            workbranchId,
            command: command.substring(0, 100),
            reason,
            severity
        });

        // Keep audit log size manageable
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-500); // Keep last 500 events
        }
    }
}

export default SecurityService;