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

export interface ClaudeCommandContext {
    claudeSessionId: string;
    commandType: 'ai_generated' | 'user_originated' | 'system_prompt';
    metadata?: {
        model?: string;
        confidence?: number;
        tokenCount?: number;
        contextLength?: number;
        promptHash?: string;
        conversationId?: string;
    };
    attribution: {
        sourceType: 'claude_desktop' | 'claude_web' | 'claude_api' | 'vs_code_extension';
        clientVersion?: string;
        timestamp: Date;
    };
}

export interface ClaudeSecurityConfig extends SecurityConfig {
    claudeSpecificValidation?: boolean;
    claudeRateLimiting?: {
        commandsPerMinute: number;
        commandsPerHour: number;
        maxConcurrentSessions: number;
    };
    claudeAllowedPatterns?: RegExp[];
    claudeBlockedPatterns?: RegExp[];
    claudeAuditLevel?: 'basic' | 'detailed' | 'full';
}

export interface SecurityAuditEvent {
    timestamp: Date;
    type: 'command_blocked' | 'path_violation' | 'workbranch_violation' | 'resource_limit' | 'claude_command_blocked' | 'claude_rate_limit' | 'claude_session_violation';
    command: string;
    workbranchId: string;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userAgent?: string;
    sessionId?: string;
    claudeSessionId?: string;
    claudeCommandType?: 'ai_generated' | 'user_originated' | 'system_prompt';
    claudeMetadata?: {
        model?: string;
        confidence?: number;
        tokenCount?: number;
        contextLength?: number;
    };
}

export class SecurityService {
    private config: SecurityConfig;
    private auditLog: SecurityAuditEvent[] = [];
    private commandCounts: Map<string, number> = new Map();
    private rateLimits: Map<string, { count: number; window: number }> = new Map();
    private claudeSessions: Map<string, { commands: number; firstSeen: Date; lastSeen: Date }> = new Map();
    private claudeRateLimits: Map<string, { perMinute: number; perHour: number; windowStart: number }> = new Map();

    // Claude-specific dangerous patterns (AI-generated command risks)
    private readonly CLAUDE_SPECIFIC_PATTERNS: Array<{ pattern: RegExp; reason: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = [
        // AI might generate complex command chains
        { pattern: /;\s*.*;\s*.*;\s*.*/i, reason: 'Complex command chain - AI over-automation risk', severity: 'medium' },
        { pattern: /for\s+.*in.*;\s*do\s+.*rm/i, reason: 'AI-generated loop with destructive commands', severity: 'critical' },
        { pattern: /while\s+.*;\s*do\s+.*del/i, reason: 'AI-generated loop with file deletion', severity: 'critical' },
        
        // AI might suggest dangerous automation
        { pattern: /find\s+.*-exec\s+rm/i, reason: 'AI bulk file deletion pattern', severity: 'high' },
        { pattern: /xargs\s+.*rm/i, reason: 'AI piped file deletion', severity: 'high' },
        { pattern: /\|\s*sh\s*$/i, reason: 'AI pipe-to-shell execution', severity: 'critical' },
        
        // AI hallucination of system commands
        { pattern: /sudo\s+.*install.*--force/i, reason: 'AI forced installation command', severity: 'high' },
        { pattern: /curl.*\|\s*bash/i, reason: 'AI download-and-execute pattern', severity: 'critical' },
        { pattern: /wget.*&&.*chmod.*&&/i, reason: 'AI download-chmod-execute chain', severity: 'critical' },
        
        // AI might generate overprivileged commands
        { pattern: /chmod\s+777.*\*/i, reason: 'AI bulk permission change', severity: 'high' },
        { pattern: /chown\s+.*:.*\s+\/.*\*$/i, reason: 'AI recursive ownership change', severity: 'high' },
        
        // AI context confusion (might think it's on different OS)
        { pattern: /apt-get|yum|pacman/i, reason: 'AI Linux package manager on Windows', severity: 'medium' },
        { pattern: /\/usr\/bin|\/etc\/|\/var\//i, reason: 'AI Linux paths on Windows system', severity: 'medium' },
        
        // AI over-automation patterns
        { pattern: /.*&&.*&&.*&&/i, reason: 'AI excessive command chaining', severity: 'medium' },
        { pattern: /.*\|\|.*\|\|.*\|\|/i, reason: 'AI excessive fallback chaining', severity: 'medium' }
    ];

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
            logEvents: this.config.logSecurityEvents,
            claudeValidation: (config as ClaudeSecurityConfig).claudeSpecificValidation || false
        });
    }

    /**
     * Create a Claude command context for validation
     */
    static createClaudeContext(
        claudeSessionId: string,
        commandType: 'ai_generated' | 'user_originated' | 'system_prompt',
        sourceType: 'claude_desktop' | 'claude_web' | 'claude_api' | 'vs_code_extension',
        metadata?: {
            model?: string;
            confidence?: number;
            tokenCount?: number;
            contextLength?: number;
            promptHash?: string;
            conversationId?: string;
        },
        clientVersion?: string
    ): ClaudeCommandContext {
        return {
            claudeSessionId,
            commandType,
            metadata,
            attribution: {
                sourceType,
                clientVersion,
                timestamp: new Date()
            }
        };
    }

    /**
     * Check if a Claude session is active
     */
    isClaudeSessionActive(claudeSessionId: string): boolean {
        const session = this.claudeSessions.get(claudeSessionId);
        if (!session) return false;

        const now = new Date();
        const timeSinceLastActivity = now.getTime() - session.lastSeen.getTime();
        const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

        return timeSinceLastActivity < maxInactiveTime;
    }

    /**
     * Clean up inactive Claude sessions
     */
    cleanupInactiveClaudeSessions(): void {
        const now = new Date();
        const maxInactiveTime = 60 * 60 * 1000; // 1 hour
        let cleanedCount = 0;

        for (const [sessionId, session] of this.claudeSessions.entries()) {
            const timeSinceLastActivity = now.getTime() - session.lastSeen.getTime();
            if (timeSinceLastActivity > maxInactiveTime) {
                this.claudeSessions.delete(sessionId);
                this.claudeRateLimits.delete(sessionId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} inactive Claude sessions`);
        }
    }

    /**
     * Get detailed Claude session information
     */
    getClaudeSessionDetails(claudeSessionId: string): {
        exists: boolean;
        active: boolean;
        commands: number;
        duration: number;
        firstSeen: Date;
        lastSeen: Date;
        rateLimitStatus: {
            perMinute: number;
            perHour: number;
            windowStart: number;
        };
    } | null {
        const session = this.claudeSessions.get(claudeSessionId);
        if (!session) {
            return null;
        }

        const rateLimit = this.claudeRateLimits.get(claudeSessionId) || {
            perMinute: 0,
            perHour: 0,
            windowStart: Date.now()
        };

        return {
            exists: true,
            active: this.isClaudeSessionActive(claudeSessionId),
            commands: session.commands,
            duration: session.lastSeen.getTime() - session.firstSeen.getTime(),
            firstSeen: session.firstSeen,
            lastSeen: session.lastSeen,
            rateLimitStatus: rateLimit
        };
    }

    /**
     * Enhanced command validation specifically for Claude-originated commands
     * Provides additional AI-specific security patterns and session tracking
     */
    validateClaudeCommand(
        command: string, 
        workbranchId: string, 
        claudeContext: ClaudeCommandContext,
        sessionId?: string
    ): SecurityValidationResult {
        if (!this.config.enabled) {
            return { valid: true };
        }

        console.log(`🤖 Validating Claude command:`, {
            command: command.substring(0, 100),
            claudeSessionId: claudeContext.claudeSessionId,
            commandType: claudeContext.commandType,
            sourceType: claudeContext.attribution.sourceType
        });

        // Track Claude session
        this.trackClaudeSession(claudeContext.claudeSessionId);

        // Basic command validation
        const basicValidation = this.performBasicValidation(command);
        if (!basicValidation.valid) {
            this.logClaudeSecurityEvent('claude_command_blocked', command, workbranchId, basicValidation.reason!, basicValidation.severity!, claudeContext, sessionId);
            return basicValidation;
        }

        // Claude-specific pattern validation
        const claudePatternValidation = this.performClaudePatternValidation(command, claudeContext);
        if (!claudePatternValidation.valid) {
            this.logClaudeSecurityEvent('claude_command_blocked', command, workbranchId, claudePatternValidation.reason!, claudePatternValidation.severity!, claudeContext, sessionId);
            return claudePatternValidation;
        }

        // Standard pattern validation
        const patternValidation = this.performPatternValidation(command);
        if (!patternValidation.valid) {
            this.logClaudeSecurityEvent('claude_command_blocked', command, workbranchId, patternValidation.reason!, patternValidation.severity!, claudeContext, sessionId);
            return patternValidation;
        }

        // Claude-specific rate limiting
        const claudeRateLimitValidation = this.validateClaudeRateLimit(command, claudeContext);
        if (!claudeRateLimitValidation.valid) {
            this.logClaudeSecurityEvent('claude_rate_limit', command, workbranchId, claudeRateLimitValidation.reason!, claudeRateLimitValidation.severity!, claudeContext, sessionId);
            return claudeRateLimitValidation;
        }

        // Workbranch isolation validation
        const isolationValidation = this.validateWorkbranchIsolation(command, workbranchId);
        if (!isolationValidation.valid) {
            this.logClaudeSecurityEvent('claude_session_violation', command, workbranchId, isolationValidation.reason!, isolationValidation.severity!, claudeContext, sessionId);
            return isolationValidation;
        }

        // Standard rate limiting validation
        const rateLimitValidation = this.validateRateLimit(command, workbranchId);
        if (!rateLimitValidation.valid) {
            this.logClaudeSecurityEvent('claude_rate_limit', command, workbranchId, rateLimitValidation.reason!, rateLimitValidation.severity!, claudeContext, sessionId);
            return rateLimitValidation;
        }

        console.log(`✅ Claude command validated successfully`);
        return { valid: true };
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
     * Get enhanced security statistics including Claude-specific metrics
     */
    getSecurityStats(): {
        totalEvents: number;
        eventsByType: Record<string, number>;
        eventsBySeverity: Record<string, number>;
        topBlockedCommands: Array<{ command: string; count: number }>;
        topViolatingWorkbranches: Array<{ workbranchId: string; count: number }>;
        claudeSpecific: {
            claudeEvents: number;
            claudeEventsByType: Record<string, number>;
            claudeSessionViolations: Array<{ sessionId: string; count: number }>;
            claudeCommandTypes: Record<string, number>;
            mostBlockedClaudePatterns: Array<{ pattern: string; count: number }>;
        };
    } {
        const stats = {
            totalEvents: this.auditLog.length,
            eventsByType: {} as Record<string, number>,
            eventsBySeverity: {} as Record<string, number>,
            topBlockedCommands: [] as Array<{ command: string; count: number }>,
            topViolatingWorkbranches: [] as Array<{ workbranchId: string; count: number }>,
            claudeSpecific: {
                claudeEvents: 0,
                claudeEventsByType: {} as Record<string, number>,
                claudeSessionViolations: [] as Array<{ sessionId: string; count: number }>,
                claudeCommandTypes: {} as Record<string, number>,
                mostBlockedClaudePatterns: [] as Array<{ pattern: string; count: number }>
            }
        };

        // Count events by type and severity
        const commandCounts: Record<string, number> = {};
        const workbranchCounts: Record<string, number> = {};
        const claudeSessionCounts: Record<string, number> = {};
        const claudePatternCounts: Record<string, number> = {};

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

            // Claude-specific statistics
            if (event.claudeSessionId) {
                stats.claudeSpecific.claudeEvents++;
                
                // Claude event types
                stats.claudeSpecific.claudeEventsByType[event.type] = (stats.claudeSpecific.claudeEventsByType[event.type] || 0) + 1;
                
                // Claude session violations
                claudeSessionCounts[event.claudeSessionId] = (claudeSessionCounts[event.claudeSessionId] || 0) + 1;
                
                // Claude command types
                if (event.claudeCommandType) {
                    stats.claudeSpecific.claudeCommandTypes[event.claudeCommandType] = (stats.claudeSpecific.claudeCommandTypes[event.claudeCommandType] || 0) + 1;
                }
                
                // Track Claude-specific pattern violations
                if (event.reason && event.reason.includes('Claude AI Risk:')) {
                    const pattern = event.reason.split('Claude AI Risk: ')[1] || 'Unknown pattern';
                    claudePatternCounts[pattern] = (claudePatternCounts[pattern] || 0) + 1;
                }
            }
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

        // Claude session violations
        stats.claudeSpecific.claudeSessionViolations = Object.entries(claudeSessionCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([sessionId, count]) => ({ sessionId, count }));

        // Most blocked Claude patterns
        stats.claudeSpecific.mostBlockedClaudePatterns = Object.entries(claudePatternCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([pattern, count]) => ({ pattern, count }));

        return stats;
    }

    /**
     * Perform Claude-specific pattern validation
     */
    private performClaudePatternValidation(command: string, claudeContext: ClaudeCommandContext): SecurityValidationResult {
        // Check Claude-specific dangerous patterns
        for (const { pattern, reason, severity } of this.CLAUDE_SPECIFIC_PATTERNS) {
            if (pattern.test(command)) {
                return {
                    valid: false,
                    reason: `Claude AI Risk: ${reason}`,
                    severity,
                    suggestion: 'AI-generated commands may be over-complex; consider simpler alternatives'
                };
            }
        }

        // Additional validation for AI-generated commands
        if (claudeContext.commandType === 'ai_generated') {
            // Check for hallucinated commands
            if (this.detectCommandHallucination(command)) {
                return {
                    valid: false,
                    reason: 'AI command hallucination detected',
                    severity: 'high',
                    suggestion: 'AI may have suggested non-existent or incorrect commands'
                };
            }

            // Check for context confusion
            if (this.detectContextConfusion(command)) {
                return {
                    valid: false,
                    reason: 'AI context confusion - wrong OS or environment',
                    severity: 'medium',
                    suggestion: 'AI may be suggesting commands for a different operating system'
                };
            }

            // Validate command complexity for AI-generated content
            if (this.isCommandTooComplex(command)) {
                return {
                    valid: false,
                    reason: 'AI-generated command too complex for secure execution',
                    severity: 'medium',
                    suggestion: 'Break down complex AI suggestions into simpler, verifiable steps'
                };
            }
        }

        return { valid: true };
    }

    /**
     * Validate Claude-specific rate limiting
     */
    private validateClaudeRateLimit(command: string, claudeContext: ClaudeCommandContext): SecurityValidationResult {
        const claudeSessionId = claudeContext.claudeSessionId;
        const now = Date.now();
        const minuteWindow = 60 * 1000; // 1 minute
        const hourWindow = 60 * 60 * 1000; // 1 hour

        // Default limits (can be configured via ClaudeSecurityConfig)
        const maxCommandsPerMinute = 10; // Stricter than regular commands
        const maxCommandsPerHour = 100;

        if (!this.claudeRateLimits.has(claudeSessionId)) {
            this.claudeRateLimits.set(claudeSessionId, {
                perMinute: 1,
                perHour: 1,
                windowStart: now
            });
            return { valid: true };
        }

        const rateLimit = this.claudeRateLimits.get(claudeSessionId)!;

        // Reset windows if expired
        if (now - rateLimit.windowStart > hourWindow) {
            rateLimit.perMinute = 1;
            rateLimit.perHour = 1;
            rateLimit.windowStart = now;
            return { valid: true };
        }

        if (now - rateLimit.windowStart > minuteWindow) {
            rateLimit.perMinute = 1;
        }

        // Increment counters
        rateLimit.perMinute++;
        rateLimit.perHour++;

        // Check limits
        if (rateLimit.perMinute > maxCommandsPerMinute) {
            return {
                valid: false,
                reason: `Claude session rate limit exceeded: ${rateLimit.perMinute} commands/minute (max: ${maxCommandsPerMinute})`,
                severity: 'medium',
                suggestion: 'Claude sessions are rate-limited for security - please slow down command execution'
            };
        }

        if (rateLimit.perHour > maxCommandsPerHour) {
            return {
                valid: false,
                reason: `Claude session hourly limit exceeded: ${rateLimit.perHour} commands/hour (max: ${maxCommandsPerHour})`,
                severity: 'medium',
                suggestion: 'Claude session has exceeded hourly command limit - take a break'
            };
        }

        return { valid: true };
    }

    /**
     * Track Claude session activity
     */
    private trackClaudeSession(claudeSessionId: string): void {
        const now = new Date();
        
        if (!this.claudeSessions.has(claudeSessionId)) {
            this.claudeSessions.set(claudeSessionId, {
                commands: 1,
                firstSeen: now,
                lastSeen: now
            });
        } else {
            const session = this.claudeSessions.get(claudeSessionId)!;
            session.commands++;
            session.lastSeen = now;
        }
    }

    /**
     * Detect if AI has hallucinated a command
     */
    private detectCommandHallucination(command: string): boolean {
        const hallucinatedCommands = [
            /claude-install/i,
            /ai-setup/i,
            /auto-fix/i,
            /magic-deploy/i,
            /smart-build/i,
            /claude-command/i,
            /anthropic-cli/i
        ];

        return hallucinatedCommands.some(pattern => pattern.test(command));
    }

    /**
     * Detect if AI is confused about the operating system context
     */
    private detectContextConfusion(command: string): boolean {
        // On Windows, these would indicate Linux/Unix confusion
        if (process.platform === 'win32') {
            const linuxPatterns = [
                /apt-get|yum|pacman|brew/i,
                /\/usr\/bin|\/etc\/|\/var\/|\/home\//i,
                /sudo\s+/i,
                /systemctl|service\s+/i,
                /\.\/configure|make\s+install/i
            ];
            return linuxPatterns.some(pattern => pattern.test(command));
        }

        // On Linux/Mac, these would indicate Windows confusion
        if (process.platform !== 'win32') {
            const windowsPatterns = [
                /C:\\|D:\\|%APPDATA%|%USERPROFILE%/i,
                /powershell\.exe|cmd\.exe/i,
                /taskkill|tasklist/i,
                /reg\s+add|reg\s+delete/i
            ];
            return windowsPatterns.some(pattern => pattern.test(command));
        }

        return false;
    }

    /**
     * Check if a command is too complex for safe AI execution
     */
    private isCommandTooComplex(command: string): boolean {
        // Count command operators
        const operatorCount = (command.match(/[;&|]/g) || []).length;
        const commandCount = command.split(/[;&|]/).length;

        // Too many chained commands
        if (commandCount > 4) {
            return true;
        }

        // Too many operators
        if (operatorCount > 3) {
            return true;
        }

        // Complex loops or conditionals
        if (/for\s+.*in.*do|while\s+.*do|if\s+.*then/i.test(command)) {
            return true;
        }

        return false;
    }

    /**
     * Enhanced logging for Claude-specific security events
     */
    private logClaudeSecurityEvent(
        type: SecurityAuditEvent['type'],
        command: string,
        workbranchId: string,
        reason: string,
        severity: SecurityAuditEvent['severity'],
        claudeContext: ClaudeCommandContext,
        sessionId?: string
    ): void {
        if (!this.config.logSecurityEvents) {
            return;
        }

        const event: SecurityAuditEvent = {
            timestamp: new Date(),
            type,
            command: command.substring(0, 200),
            workbranchId,
            reason,
            severity,
            sessionId,
            claudeSessionId: claudeContext.claudeSessionId,
            claudeCommandType: claudeContext.commandType,
            claudeMetadata: {
                model: claudeContext.metadata?.model,
                confidence: claudeContext.metadata?.confidence,
                tokenCount: claudeContext.metadata?.tokenCount,
                contextLength: claudeContext.metadata?.contextLength
            }
        };

        this.auditLog.push(event);

        // Enhanced logging for Claude events
        const logLevel = severity === 'critical' ? 'error' : 
                        severity === 'high' ? 'warn' : 
                        'log';
        
        console[logLevel](`🤖🛡️ Claude Security ${type}:`, {
            claudeSessionId: claudeContext.claudeSessionId,
            commandType: claudeContext.commandType,
            sourceType: claudeContext.attribution.sourceType,
            workbranchId,
            command: command.substring(0, 100),
            reason,
            severity,
            model: claudeContext.metadata?.model
        });

        // Keep audit log size manageable
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-500);
        }
    }

    /**
     * Get Claude session statistics
     */
    getClaudeSessionStats(): {
        totalSessions: number;
        activeSessions: number;
        totalCommands: number;
        averageCommandsPerSession: number;
        sessionDetails: Array<{
            sessionId: string;
            commands: number;
            duration: number;
            lastActive: Date;
        }>;
    } {
        const now = new Date();
        const activeSessions = Array.from(this.claudeSessions.entries()).filter(
            ([, session]) => now.getTime() - session.lastSeen.getTime() < 30 * 60 * 1000 // 30 minutes
        );

        const totalCommands = Array.from(this.claudeSessions.values())
            .reduce((sum, session) => sum + session.commands, 0);

        return {
            totalSessions: this.claudeSessions.size,
            activeSessions: activeSessions.length,
            totalCommands,
            averageCommandsPerSession: this.claudeSessions.size > 0 ? totalCommands / this.claudeSessions.size : 0,
            sessionDetails: Array.from(this.claudeSessions.entries()).map(([sessionId, session]) => ({
                sessionId,
                commands: session.commands,
                duration: session.lastSeen.getTime() - session.firstSeen.getTime(),
                lastActive: session.lastSeen
            }))
        };
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

// Export all Claude-specific types and interfaces
export type {
    ClaudeCommandContext,
    ClaudeSecurityConfig,
    SecurityValidationResult,
    SecurityAuditEvent,
    SecurityConfig
};

export default SecurityService;

/**
 * Utility functions for Claude integration
 */
export class ClaudeSecurityUtils {
    /**
     * Generate a unique Claude session ID
     */
    static generateClaudeSessionId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2);
        return `claude-${timestamp}-${random}`;
    }

    /**
     * Hash a prompt for tracking purposes (without storing sensitive content)
     */
    static hashPrompt(prompt: string): string {
        // Simple hash function for prompt tracking (not cryptographically secure)
        let hash = 0;
        for (let i = 0; i < prompt.length; i++) {
            const char = prompt.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * Create a default Claude security configuration
     */
    static createClaudeSecurityConfig(workspaceRoot: string): ClaudeSecurityConfig {
        return {
            workspaceRoot,
            enabled: true,
            allowDangerousCommands: false,
            maxCommandLength: 1000,
            logSecurityEvents: true,
            claudeSpecificValidation: true,
            claudeRateLimiting: {
                commandsPerMinute: 10,
                commandsPerHour: 100,
                maxConcurrentSessions: 5
            },
            claudeAuditLevel: 'detailed',
            allowedExecutables: [],
            blockedPatterns: []
        };
    }

    /**
     * Validate if a command might be AI-generated based on patterns
     */
    static detectPotentialAIGeneration(command: string): {
        isLikelyAI: boolean;
        confidence: number;
        indicators: string[];
    } {
        const aiIndicators: Array<{ pattern: RegExp; name: string; weight: number }> = [
            { pattern: /&&.*&&.*&&/i, name: 'excessive command chaining', weight: 0.3 },
            { pattern: /;\s*.*;\s*.*;\s*.*/i, name: 'complex semicolon chains', weight: 0.25 },
            { pattern: /curl.*\|\s*bash/i, name: 'download-execute pattern', weight: 0.4 },
            { pattern: /for\s+.*in.*;\s*do\s+.*rm/i, name: 'loop with destructive commands', weight: 0.5 },
            { pattern: /\|\s*sh\s*$/i, name: 'pipe to shell', weight: 0.35 },
            { pattern: /apt-get|yum|pacman/i, name: 'cross-platform confusion', weight: 0.2 },
            { pattern: /sudo\s+.*install.*--force/i, name: 'forced installation', weight: 0.4 }
        ];

        let totalWeight = 0;
        const foundIndicators: string[] = [];

        for (const { pattern, name, weight } of aiIndicators) {
            if (pattern.test(command)) {
                totalWeight += weight;
                foundIndicators.push(name);
            }
        }

        const confidence = Math.min(totalWeight, 1.0);
        const isLikelyAI = confidence > 0.3;

        return {
            isLikelyAI,
            confidence,
            indicators: foundIndicators
        };
    }
}

/**
 * Example usage for Claude integration:
 * 
 * ```typescript
 * // 1. Create Claude security configuration
 * const config = ClaudeSecurityUtils.createClaudeSecurityConfig('/path/to/workspace');
 * const securityService = new SecurityService(config);
 * 
 * // 2. Create Claude context for command validation
 * const claudeContext = SecurityService.createClaudeContext(
 *     'claude-session-123',
 *     'ai_generated',
 *     'vs_code_extension',
 *     {
 *         model: 'claude-3-sonnet',
 *         confidence: 0.95,
 *         tokenCount: 150,
 *         contextLength: 4000
 *     },
 *     '1.0.0'
 * );
 * 
 * // 3. Validate Claude command with enhanced security
 * const result = securityService.validateClaudeCommand(
 *     'npm run build && git add . && git commit -m "AI build"',
 *     'workbranch-1',
 *     claudeContext,
 *     'user-session-456'
 * );
 * 
 * if (!result.valid) {
 *     console.error('Claude command blocked:', result.reason);
 *     console.log('Suggestion:', result.suggestion);
 * }
 * 
 * // 4. Monitor Claude sessions and get statistics
 * const claudeStats = securityService.getClaudeSessionStats();
 * const overallStats = securityService.getSecurityStats();
 * 
 * console.log('Claude-specific events:', overallStats.claudeSpecific);
 * console.log('Active Claude sessions:', claudeStats.activeSessions);
 * 
 * // 5. Clean up inactive sessions periodically
 * setInterval(() => {
 *     securityService.cleanupInactiveClaudeSessions();
 * }, 15 * 60 * 1000); // Every 15 minutes
 * ```
 */