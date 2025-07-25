/**
 * Session Manager - Multi-terminal session coordination
 * 
 * This class manages multiple terminal sessions with:
 * - Session lifecycle management (create, track, cleanup, destroy)
 * - Workbranch isolation and validation
 * - Automatic cleanup of inactive sessions
 * - WebSocket association and cleanup
 * - Session discovery and querying
 * - Resource management and limits
 * - Cross-platform shell detection
 * - Session persistence and recovery
 */

import { WebSocket } from 'ws';
import TerminalSession, { TerminalSessionConfig, TerminalSessionState } from './TerminalSession';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export interface SessionManagerConfig {
    workspaceRoot: string;
    maxSessions: number;
    sessionTimeout: number;
    cleanupInterval?: number;
}

export interface SessionStats {
    totalSessions: number;
    runningSessions: number;
    terminatedSessions: number;
    errorSessions: number;
    sessionsByWorkbranch: Record<string, number>;
    sessionsByShell: Record<string, number>;
    totalOutput: number;
    totalCommands: number;
    oldestSession?: Date;
    newestSession?: Date;
}

export class SessionManager {
    private sessions: Map<string, TerminalSession> = new Map();
    private sessionsByWorkbranch: Map<string, Set<string>> = new Map();
    private sessionsByWebSocket: Map<WebSocket, Set<string>> = new Map();
    private cleanupTimer: NodeJS.Timeout | null = null;
    private sessionCounter = 0;

    private readonly config: SessionManagerConfig;

    constructor(config: SessionManagerConfig) {
        this.config = {
            cleanupInterval: 5 * 60 * 1000, // 5 minutes
            ...config
        };

        console.log(`🏗️ Session Manager initialized:`, {
            workspaceRoot: this.config.workspaceRoot,
            maxSessions: this.config.maxSessions,
            sessionTimeout: this.config.sessionTimeout,
            cleanupInterval: this.config.cleanupInterval
        });
    }

    /**
     * Create a new terminal session
     */
    async createSession(
        workbranchId: string,
        shell: 'powershell' | 'bash' | 'cmd' | 'zsh' = 'powershell',
        projectId?: string,
        options: {
            title?: string;
            cwd?: string;
            env?: Record<string, string>;
            cols?: number;
            rows?: number;
            webSocket?: WebSocket;
        } = {}
    ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
        try {
            // Check session limits
            if (this.sessions.size >= this.config.maxSessions) {
                const error = `Maximum sessions reached: ${this.config.maxSessions}`;
                console.warn(`⚠️ ${error}`);
                return { success: false, error };
            }

            // Validate workbranch ID
            if (!this.validateWorkbranchId(workbranchId)) {
                const error = `Invalid workbranch ID: ${workbranchId}`;
                console.warn(`⚠️ ${error}`);
                return { success: false, error };
            }

            // Validate shell availability
            if (!this.isShellAvailable(shell)) {
                const error = `Shell not available: ${shell}`;
                console.warn(`⚠️ ${error}`);
                return { success: false, error };
            }

            // Generate unique session ID
            const sessionId = this.generateSessionId(workbranchId);

            // Create session configuration
            const sessionConfig: TerminalSessionConfig = {
                sessionId,
                workbranchId,
                projectId,
                shell,
                workspaceRoot: this.config.workspaceRoot,
                cwd: options.cwd,
                title: options.title,
                env: options.env,
                cols: options.cols || 80,
                rows: options.rows || 24
            };

            // Create terminal session
            const session = new TerminalSession(sessionConfig);

            // Setup event handlers
            this.setupSessionEventHandlers(session);

            // Associate with WebSocket if provided
            if (options.webSocket) {
                this.associateWebSocket(sessionId, options.webSocket);
                session.setWebSocket(options.webSocket);
            }

            // Initialize the session
            const initialized = await session.initialize();
            if (!initialized) {
                return { success: false, error: 'Failed to initialize terminal session' };
            }

            // Store session
            this.sessions.set(sessionId, session);

            // Track by workbranch
            if (!this.sessionsByWorkbranch.has(workbranchId)) {
                this.sessionsByWorkbranch.set(workbranchId, new Set());
            }
            this.sessionsByWorkbranch.get(workbranchId)!.add(sessionId);

            console.log(`✅ Session created successfully:`, {
                sessionId,
                workbranchId,
                shell,
                pid: session.getState().pid
            });

            return { success: true, sessionId };

        } catch (error) {
            console.error('❌ Failed to create session:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error during session creation'
            };
        }
    }

    /**
     * Get session by ID
     */
    getSession(sessionId: string): TerminalSession | null {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * Get sessions by workbranch ID
     */
    getSessionsByWorkbranch(workbranchId: string): TerminalSession[] {
        const sessionIds = this.sessionsByWorkbranch.get(workbranchId);
        if (!sessionIds) return [];

        return Array.from(sessionIds)
            .map(id => this.sessions.get(id))
            .filter((session): session is TerminalSession => session !== undefined);
    }

    /**
     * Get sessions by WebSocket
     */
    getSessionsByWebSocket(webSocket: WebSocket): TerminalSession[] {
        const sessionIds = this.sessionsByWebSocket.get(webSocket);
        if (!sessionIds) return [];

        return Array.from(sessionIds)
            .map(id => this.sessions.get(id))
            .filter((session): session is TerminalSession => session !== undefined);
    }

    /**
     * Get all sessions
     */
    getAllSessions(): TerminalSession[] {
        return Array.from(this.sessions.values());
    }

    /**
     * Get session states
     */
    getSessionStates(): TerminalSessionState[] {
        return Array.from(this.sessions.values()).map(session => session.getState());
    }

    /**
     * Destroy a specific session
     */
    async destroySession(sessionId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                return { success: false, error: `Session not found: ${sessionId}` };
            }

            const state = session.getState();
            console.log(`🗑️ Destroying session: ${sessionId} (${state.workbranchId})`);

            // Remove from tracking maps
            this.removeSessionFromTracking(sessionId, state.workbranchId, state.webSocket);

            // Destroy the session
            await session.destroy();

            // Remove from sessions map
            this.sessions.delete(sessionId);

            console.log(`✅ Session destroyed: ${sessionId}`);
            return { success: true };

        } catch (error) {
            console.error(`❌ Failed to destroy session ${sessionId}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error during session destruction'
            };
        }
    }

    /**
     * Destroy sessions by workbranch
     */
    async destroySessionsByWorkbranch(workbranchId: string): Promise<{ destroyed: number; errors: string[] }> {
        const sessions = this.getSessionsByWorkbranch(workbranchId);
        const errors: string[] = [];
        let destroyed = 0;

        for (const session of sessions) {
            const result = await this.destroySession(session.getState().sessionId);
            if (result.success) {
                destroyed++;
            } else if (result.error) {
                errors.push(result.error);
            }
        }

        console.log(`🧹 Destroyed ${destroyed} sessions for workbranch ${workbranchId}`, {
            errors: errors.length
        });

        return { destroyed, errors };
    }

    /**
     * Destroy all sessions
     */
    async destroyAllSessions(): Promise<{ destroyed: number; errors: string[] }> {
        const allSessions = Array.from(this.sessions.keys());
        const errors: string[] = [];
        let destroyed = 0;

        console.log(`🧹 Destroying all ${allSessions.length} sessions...`);

        for (const sessionId of allSessions) {
            const result = await this.destroySession(sessionId);
            if (result.success) {
                destroyed++;
            } else if (result.error) {
                errors.push(result.error);
            }
        }

        console.log(`✅ Destroyed ${destroyed} sessions, ${errors.length} errors`);
        return { destroyed, errors };
    }

    /**
     * Associate a WebSocket with session(s)
     */
    associateWebSocket(sessionId: string, webSocket: WebSocket): void {
        if (!this.sessionsByWebSocket.has(webSocket)) {
            this.sessionsByWebSocket.set(webSocket, new Set());
        }
        this.sessionsByWebSocket.get(webSocket)!.add(sessionId);

        const session = this.sessions.get(sessionId);
        if (session) {
            session.setWebSocket(webSocket);
        }

        console.log(`🔗 Associated WebSocket with session: ${sessionId}`);
    }

    /**
     * Clean up sessions associated with a WebSocket
     */
    cleanupWebSocketSessions(webSocket: WebSocket): void {
        const sessionIds = this.sessionsByWebSocket.get(webSocket);
        if (!sessionIds) return;

        console.log(`🧹 Cleaning up ${sessionIds.size} sessions for disconnected WebSocket`);

        // Remove WebSocket association from sessions
        sessionIds.forEach(sessionId => {
            const session = this.sessions.get(sessionId);
            if (session) {
                session.removeWebSocket();
            }
        });

        // Remove WebSocket tracking
        this.sessionsByWebSocket.delete(webSocket);

        // Optionally destroy orphaned sessions (configurable behavior)
        // For now, we keep them running but unassociated
        console.log(`✅ WebSocket cleanup completed`);
    }

    /**
     * Start automatic cleanup timer
     */
    startCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.cleanupTimer = setInterval(() => {
            this.performCleanup();
        }, this.config.cleanupInterval!);

        console.log(`🕐 Session cleanup timer started (interval: ${this.config.cleanupInterval}ms)`);
    }

    /**
     * Stop cleanup timer
     */
    stopCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
            console.log(`🛑 Session cleanup timer stopped`);
        }
    }

    /**
     * Perform cleanup of inactive/terminated sessions
     */
    private async performCleanup(): Promise<void> {
        const now = new Date();
        const sessionsToCleanup: string[] = [];

        // Find sessions to cleanup
        for (const [sessionId, session] of this.sessions.entries()) {
            const state = session.getState();
            
            // Check for terminated sessions
            if (state.status === 'terminated' || state.status === 'error') {
                sessionsToCleanup.push(sessionId);
                continue;
            }

            // Check for inactive sessions
            const inactiveTime = now.getTime() - state.lastActivity.getTime();
            if (inactiveTime > this.config.sessionTimeout) {
                console.log(`🕐 Session ${sessionId} inactive for ${Math.round(inactiveTime / 1000)}s`);
                sessionsToCleanup.push(sessionId);
            }
        }

        // Cleanup identified sessions
        if (sessionsToCleanup.length > 0) {
            console.log(`🧹 Cleaning up ${sessionsToCleanup.length} sessions`);
            
            for (const sessionId of sessionsToCleanup) {
                await this.destroySession(sessionId);
            }
        }
    }

    /**
     * Get session statistics
     */
    getStats(): SessionStats {
        const states = this.getSessionStates();
        const stats: SessionStats = {
            totalSessions: states.length,
            runningSessions: 0,
            terminatedSessions: 0,
            errorSessions: 0,
            sessionsByWorkbranch: {},
            sessionsByShell: {},
            totalOutput: 0,
            totalCommands: 0
        };

        let oldestDate: Date | undefined;
        let newestDate: Date | undefined;

        states.forEach(state => {
            // Status counts
            switch (state.status) {
                case 'running':
                    stats.runningSessions++;
                    break;
                case 'terminated':
                    stats.terminatedSessions++;
                    break;
                case 'error':
                    stats.errorSessions++;
                    break;
            }

            // Workbranch counts
            stats.sessionsByWorkbranch[state.workbranchId] = 
                (stats.sessionsByWorkbranch[state.workbranchId] || 0) + 1;

            // Shell counts
            stats.sessionsByShell[state.shell] = 
                (stats.sessionsByShell[state.shell] || 0) + 1;

            // Totals
            stats.totalOutput += state.totalOutput;
            stats.totalCommands += state.commandCount;

            // Date tracking
            if (!oldestDate || state.createdAt < oldestDate) {
                oldestDate = state.createdAt;
            }
            if (!newestDate || state.createdAt > newestDate) {
                newestDate = state.createdAt;
            }
        });

        stats.oldestSession = oldestDate;
        stats.newestSession = newestDate;

        return stats;
    }

    /**
     * Get session count
     */
    getSessionCount(): number {
        return this.sessions.size;
    }

    /**
     * Get available shells on current platform
     */
    getAvailableShells(): string[] {
        const platform = os.platform();
        const shells: string[] = [];

        switch (platform) {
            case 'win32':
                shells.push('powershell');
                if (this.isCommandAvailable('cmd')) shells.push('cmd');
                if (this.isCommandAvailable('bash')) shells.push('bash');
                break;
            
            case 'darwin':
            case 'linux':
                if (this.isCommandAvailable('bash')) shells.push('bash');
                if (this.isCommandAvailable('zsh')) shells.push('zsh');
                if (this.isCommandAvailable('pwsh')) shells.push('powershell');
                break;
            
            default:
                shells.push('bash');
        }

        return shells;
    }

    /**
     * Setup event handlers for a session
     */
    private setupSessionEventHandlers(session: TerminalSession): void {
        const sessionId = session.getState().sessionId;

        // Handle session output
        session.setOutputCallback((data: string) => {
            // Output is handled by the session itself
            // Additional logging or processing can be added here if needed
        });

        // Handle session exit
        session.setExitCallback((exitCode: number, signal?: number) => {
            console.log(`🔚 Session ${sessionId} exited:`, { exitCode, signal });
            
            // Optionally auto-cleanup terminated sessions
            setTimeout(() => {
                this.destroySession(sessionId);
            }, 5000); // Clean up after 5 seconds
        });

        // Handle session errors
        session.setErrorCallback((error: Error) => {
            console.error(`❌ Session ${sessionId} error:`, error);
        });
    }

    /**
     * Remove session from tracking maps
     */
    private removeSessionFromTracking(sessionId: string, workbranchId: string, webSocket?: WebSocket): void {
        // Remove from workbranch tracking
        const workbranchSessions = this.sessionsByWorkbranch.get(workbranchId);
        if (workbranchSessions) {
            workbranchSessions.delete(sessionId);
            if (workbranchSessions.size === 0) {
                this.sessionsByWorkbranch.delete(workbranchId);
            }
        }

        // Remove from WebSocket tracking
        if (webSocket) {
            const webSocketSessions = this.sessionsByWebSocket.get(webSocket);
            if (webSocketSessions) {
                webSocketSessions.delete(sessionId);
                if (webSocketSessions.size === 0) {
                    this.sessionsByWebSocket.delete(webSocket);
                }
            }
        }
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(workbranchId: string): string {
        return `${workbranchId}_${Date.now()}_${++this.sessionCounter}`;
    }

    /**
     * Validate workbranch ID
     */
    private validateWorkbranchId(workbranchId: string): boolean {
        // Basic validation - alphanumeric, hyphens, underscores only
        return /^[a-zA-Z0-9_-]+$/.test(workbranchId) && 
               workbranchId.length > 0 && 
               workbranchId.length < 100;
    }

    /**
     * Check if shell is available on the system
     */
    private isShellAvailable(shell: string): boolean {
        const availableShells = this.getAvailableShells();
        return availableShells.includes(shell);
    }

    /**
     * Check if a command is available in the system PATH
     */
    private isCommandAvailable(command: string): boolean {
        try {
            const { execSync } = require('child_process');
            const platform = os.platform();
            
            if (platform === 'win32') {
                execSync(`where ${command}`, { stdio: 'ignore' });
            } else {
                execSync(`which ${command}`, { stdio: 'ignore' });
            }
            
            return true;
        } catch {
            return false;
        }
    }
}

export default SessionManager;