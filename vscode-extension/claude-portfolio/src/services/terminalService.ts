/**
 * Terminal Service - Multi-terminal support with VS Code terminal integration
 * 
 * This service provides terminal lifecycle management, WebSocket communication,
 * and workbranch-isolated terminal sessions for the React app using VS Code's built-in terminals.
 */

import * as vscode from 'vscode';
import { WebSocketServer, WebSocket } from 'ws';
import { VSCodeSecurityService } from '../securityService';
import * as path from 'path';
import * as os from 'os';
import * as pty from '@homebridge/node-pty-prebuilt-multiarch';

export interface TerminalSession {
    id: string;
    workbranchId: string;
    shell: 'powershell' | 'bash' | 'cmd';
    terminal: vscode.Terminal; // Keep VS Code terminal for display
    ptyTerminal: pty.IPty; // Add node-pty for real output streaming
    webSocket?: WebSocket;
    workingDirectory: string;
    createdAt: Date;
    lastActivity: Date;
    title: string;
}

export interface TerminalMessage {
    type: 'create' | 'destroy' | 'command' | 'resize' | 'data' | 'output';
    sessionId?: string;
    workbranchId?: string;
    shell?: 'powershell' | 'bash' | 'cmd';
    command?: string;
    data?: string;
    cols?: number;
    rows?: number;
    title?: string;
    cwd?: string;
}

export interface TerminalResponse {
    type: 'created' | 'destroyed' | 'output' | 'error' | 'status';
    sessionId?: string;
    success: boolean;
    message?: string;
    error?: string;
    data?: any;
}

export class TerminalService {
    private sessions: Map<string, TerminalSession> = new Map();
    private server: WebSocketServer | null = null;
    private clients: Set<WebSocket> = new Set();
    private readonly port = 8002;
    private workspaceRoot: string;
    private sessionCounter = 0;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Start the terminal WebSocket service
     */
    async start(): Promise<boolean> {
        try {
            this.server = new WebSocketServer({
                port: this.port,
                host: 'localhost'
            });

            this.server.on('connection', (ws: WebSocket) => {
                console.log('🖥️ Terminal client connected');
                this.clients.add(ws);

                ws.on('message', async (data: Buffer) => {
                    try {
                        const message: TerminalMessage = JSON.parse(data.toString());
                        const response = await this.handleMessage(message, ws);
                        if (response) {
                            ws.send(JSON.stringify(response));
                        }
                    } catch (error) {
                        console.error('Terminal message error:', error);
                        ws.send(JSON.stringify({
                            type: 'error',
                            success: false,
                            error: 'Invalid message format'
                        }));
                    }
                });

                ws.on('close', () => {
                    console.log('❌ Terminal client disconnected');
                    this.clients.delete(ws);
                    // Clean up any sessions associated with this WebSocket
                    this.cleanupWebSocketSessions(ws);
                });

                ws.on('error', (error) => {
                    console.error('Terminal WebSocket error:', error);
                    this.clients.delete(ws);
                    this.cleanupWebSocketSessions(ws);
                });

                // Send initial connection confirmation
                ws.send(JSON.stringify({
                    type: 'connected',
                    success: true,
                    message: 'Connected to Terminal Service',
                    capabilities: {
                        shells: this.getAvailableShells(),
                        workbranchIsolation: true,
                        sessionPersistence: true,
                        crossPlatform: true
                    }
                }));
            });

            this.server.on('error', (error) => {
                console.error('Terminal WebSocket server error:', error);
            });

            // Start session cleanup timer
            this.startSessionCleanup();

            console.log(`🚀 Terminal Service started on ws://localhost:${this.port}`);
            return true;
        } catch (error) {
            console.error('Failed to start Terminal Service:', error);
            return false;
        }
    }

    /**
     * Stop the terminal service
     */
    async stop(): Promise<void> {
        if (this.server) {
            // Close all terminal sessions
            for (const session of this.sessions.values()) {
                session.terminal.dispose();
            }
            this.sessions.clear();

            // Close all client connections
            this.clients.forEach(ws => {
                ws.close(1000, 'Server shutting down');
            });
            this.clients.clear();

            // Close server
            this.server.close();
            this.server = null;
            console.log('🛑 Terminal Service stopped');
        }
    }

    /**
     * Handle incoming WebSocket messages
     */
    private async handleMessage(message: TerminalMessage, ws: WebSocket): Promise<TerminalResponse | null> {
        const { type, sessionId, workbranchId, shell, command, data, cols, rows, title, cwd } = message;

        try {
            switch (type) {
                case 'create':
                    return await this.createSession(workbranchId!, shell, ws, title, cwd);

                case 'destroy':
                    return await this.destroySession(sessionId!, ws);

                case 'command':
                    return await this.executeCommand(sessionId!, command!, ws);

                case 'resize':
                    return await this.resizeTerminal(sessionId!, cols!, rows!, ws);

                case 'data':
                    return await this.sendData(sessionId!, data!, ws);

                default:
                    return {
                        type: 'error',
                        success: false,
                        error: `Unknown message type: ${type}`
                    };
            }
        } catch (error) {
            console.error(`Terminal error handling ${type}:`, error);
            return {
                type: 'error',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Create a new terminal session
     */
    async createSession(
        workbranchId: string, 
        shell: 'powershell' | 'bash' | 'cmd' = 'powershell',
        webSocket?: WebSocket,
        title?: string,
        cwd?: string
    ): Promise<TerminalResponse> {
        try {
            // Validate workbranch permissions
            if (!this.checkWorkbranchPermissions(workbranchId)) {
                return {
                    type: 'error',
                    success: false,
                    error: `Invalid workbranch: ${workbranchId}`
                };
            }

            // Generate unique session ID
            const sessionId = `${workbranchId}_${Date.now()}_${++this.sessionCounter}`;

            // Determine shell executable and working directory
            const shellInfo = this.getShellInfo(shell);
            const workingDirectory = cwd ? path.resolve(this.workspaceRoot, cwd) : 
                                   path.join(this.workspaceRoot, 'workbranches', workbranchId);

            // Ensure working directory exists
            try {
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(workingDirectory));
            } catch (error) {
                // Directory may already exist, that's fine
            }

            // Create VS Code terminal for display
            const terminal = vscode.window.createTerminal({
                name: title || `Terminal - ${workbranchId}`,
                shellPath: shellInfo.executable,
                shellArgs: shellInfo.args,
                cwd: workingDirectory,
                env: {
                    WORKBRANCH_ID: workbranchId,
                    PORTFOLIO_ROOT: this.workspaceRoot
                }
            });

            // Create node-pty terminal for real output streaming
            const ptyTerminal = pty.spawn(shellInfo.executable, shellInfo.args, {
                name: 'xterm-color',
                cols: 80,
                rows: 30,
                cwd: workingDirectory,
                env: {
                    ...process.env,
                    WORKBRANCH_ID: workbranchId,
                    PORTFOLIO_ROOT: this.workspaceRoot
                }
            });

            // Create session object
            const session: TerminalSession = {
                id: sessionId,
                workbranchId,
                shell,
                terminal,
                ptyTerminal,
                webSocket,
                workingDirectory,
                createdAt: new Date(),
                lastActivity: new Date(),
                title: title || `Terminal - ${workbranchId}`
            };

            // Set up real output streaming from node-pty to WebSocket
            ptyTerminal.onData((data: string) => {
                // Send output to connected WebSocket clients
                this.broadcast({
                    type: 'output',
                    sessionId,
                    data
                });
                
                // Also send to VS Code terminal for dual display
                terminal.sendText(data, false);
            });

            ptyTerminal.onExit((e: { exitCode: number; signal?: number }) => {
                console.log(`Terminal ${sessionId} exited with code ${e.exitCode}, signal ${e.signal}`);
                this.broadcast({
                    type: 'exit',
                    sessionId,
                    exitCode: e.exitCode,
                    signal: e.signal
                });
            });

            // Store session
            this.sessions.set(sessionId, session);

            console.log(`✅ Terminal session created: ${sessionId} (${shell}) in ${workingDirectory}`);

            return {
                type: 'created',
                sessionId,
                success: true,
                message: `Terminal session created: ${sessionId}`,
                data: {
                    sessionId,
                    workbranchId,
                    shell,
                    workingDirectory,
                    title: session.title
                }
            };

        } catch (error) {
            console.error('Failed to create terminal session:', error);
            return {
                type: 'error',
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create terminal session'
            };
        }
    }

    /**
     * Destroy a terminal session
     */
    async destroySession(sessionId: string, webSocket?: WebSocket): Promise<TerminalResponse> {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                return {
                    type: 'error',
                    success: false,
                    error: `Session not found: ${sessionId}`
                };
            }

            // Verify ownership if WebSocket is provided
            if (webSocket && session.webSocket !== webSocket) {
                return {
                    type: 'error',
                    success: false,
                    error: 'Permission denied: not session owner'
                };
            }

            // Dispose both terminals
            session.terminal.dispose();
            session.ptyTerminal.kill();
            this.sessions.delete(sessionId);

            console.log(`🗑️ Terminal session destroyed: ${sessionId}`);

            return {
                type: 'destroyed',
                sessionId,
                success: true,
                message: `Terminal session destroyed: ${sessionId}`
            };

        } catch (error) {
            console.error('Failed to destroy terminal session:', error);
            return {
                type: 'error',
                success: false,
                error: error instanceof Error ? error.message : 'Failed to destroy terminal session'
            };
        }
    }

    /**
     * Execute a command in a terminal session
     */
    async executeCommand(sessionId: string, command: string, webSocket?: WebSocket): Promise<TerminalResponse> {
        try {
            console.log(`🔍🔍🔍 TERMINAL SERVICE EXECUTE COMMAND 🔍🔍🔍`);
            console.log(`Session ID: ${sessionId}`);
            console.log(`Command: ${command}`);
            console.log(`Available sessions:`, Array.from(this.sessions.keys()));
            
            const session = this.sessions.get(sessionId);
            if (!session) {
                console.error(`❌ Session not found: ${sessionId}`);
                console.log(`Available sessions:`, Array.from(this.sessions.keys()));
                return {
                    type: 'error',
                    success: false,
                    error: `Session not found: ${sessionId}`
                };
            }

            console.log(`✅ Session found:`, {
                id: session.id,
                workbranchId: session.workbranchId,
                shell: session.shell,
                title: session.title,
                workingDirectory: session.workingDirectory
            });

            // Verify ownership if WebSocket is provided
            if (webSocket && session.webSocket !== webSocket) {
                console.error(`❌ Permission denied - WebSocket mismatch`);
                return {
                    type: 'error',
                    success: false,
                    error: 'Permission denied: not session owner'
                };
            }

            // Enhanced security validation for terminal commands
            if (!this.validateTerminalCommand(command, session.workbranchId)) {
                console.error(`❌ Command blocked for security: ${command}`);
                return {
                    type: 'error',
                    success: false,
                    error: `Command blocked for security reasons: ${command.substring(0, 50)}...`
                };
            }

            console.log(`🎯 Sending command to VS Code terminal...`);
            // Send command to VS Code terminal
            session.terminal.sendText(command);
            session.lastActivity = new Date();

            console.log(`📤✅ Command executed successfully in ${sessionId}: ${command}`);

            return {
                type: 'status',
                sessionId,
                success: true,
                message: `Command executed: ${command}`
            };

        } catch (error) {
            console.error('❌❌❌ TERMINAL SERVICE ERROR ❌❌❌:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            return {
                type: 'error',
                success: false,
                error: error instanceof Error ? error.message : 'Failed to execute command'
            };
        }
    }

    /**
     * Send raw data to terminal session
     */
    async sendData(sessionId: string, data: string, webSocket?: WebSocket): Promise<TerminalResponse> {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                return {
                    type: 'error',
                    success: false,
                    error: `Session not found: ${sessionId}`
                };
            }

            // Verify ownership if WebSocket is provided
            if (webSocket && session.webSocket !== webSocket) {
                return {
                    type: 'error',
                    success: false,
                    error: 'Permission denied: not session owner'
                };
            }

            // Send raw data to VS Code terminal
            session.terminal.sendText(data, false);
            session.lastActivity = new Date();

            return {
                type: 'status',
                sessionId,
                success: true,
                message: 'Data sent to terminal'
            };

        } catch (error) {
            console.error('Failed to send data to terminal:', error);
            return {
                type: 'error',
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send data'
            };
        }
    }

    /**
     * Resize a terminal session
     */
    async resizeTerminal(sessionId: string, cols: number, rows: number, webSocket?: WebSocket): Promise<TerminalResponse> {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                return {
                    type: 'error',
                    success: false,
                    error: `Session not found: ${sessionId}`
                };
            }

            // Verify ownership if WebSocket is provided
            if (webSocket && session.webSocket !== webSocket) {
                return {
                    type: 'error',
                    success: false,
                    error: 'Permission denied: not session owner'
                };
            }

            // Validate dimensions
            if (cols < 1 || cols > 1000 || rows < 1 || rows > 1000) {
                return {
                    type: 'error',
                    success: false,
                    error: 'Invalid terminal dimensions'
                };
            }

            // Note: VS Code terminals auto-resize based on panel size
            // No manual resize needed
            session.lastActivity = new Date();

            console.log(`📏 Terminal resized ${sessionId}: ${cols}x${rows}`);

            return {
                type: 'status',
                sessionId,
                success: true,
                message: `Terminal resized to ${cols}x${rows}`
            };

        } catch (error) {
            console.error('Failed to resize terminal:', error);
            return {
                type: 'error',
                success: false,
                error: error instanceof Error ? error.message : 'Failed to resize terminal'
            };
        }
    }

    /**
     * Get available shells on the current platform
     */
    private getAvailableShells(): string[] {
        const platform = os.platform();
        switch (platform) {
            case 'win32':
                return ['powershell', 'cmd'];
            case 'darwin':
            case 'linux':
                return ['bash', 'zsh', 'sh'];
            default:
                return ['bash'];
        }
    }

    /**
     * Get shell executable information
     */
    private getShellInfo(shell: 'powershell' | 'bash' | 'cmd'): { executable: string; args: string[] } {
        const platform = os.platform();
        
        switch (shell) {
            case 'powershell':
                if (platform === 'win32') {
                    return { executable: 'powershell.exe', args: ['-NoLogo'] };
                } else {
                    return { executable: 'pwsh', args: ['-NoLogo'] };
                }
            case 'cmd':
                return { executable: 'cmd.exe', args: ['/K'] };
            case 'bash':
            default:
                return { executable: 'bash', args: ['--login'] };
        }
    }

    /**
     * Enhanced security validation for terminal commands
     */
    private validateTerminalCommand(command: string, workbranchId: string): boolean {
        // Use existing VS Code security service with enhanced terminal validation
        if (!VSCodeSecurityService.validateCommand(command)) {
            return false;
        }

        // Additional terminal-specific validations
        const dangerousTerminalPatterns = [
            /rm\s+-rf\s+\//, // Dangerous rm commands
            /format\s+c:/, // Format drive commands
            /del\/s\s+c:\\/, // Recursive delete
            /shutdown/, // System shutdown
            /reboot/, // System reboot
            /mkfs/, // Format filesystem
            /dd\s+if=.*of=\/dev/, // Disk operations
        ];

        if (dangerousTerminalPatterns.some(pattern => pattern.test(command.toLowerCase()))) {
            console.warn(`Dangerous terminal command blocked: ${command}`);
            return false;
        }

        return true;
    }

    /**
     * Check workbranch permissions
     */
    private checkWorkbranchPermissions(workbranchId: string): boolean {
        // Basic validation - can be enhanced with actual permission system
        return /^[a-zA-Z0-9_-]+$/.test(workbranchId) && workbranchId.length > 0 && workbranchId.length < 100;
    }

    /**
     * Clean up sessions associated with a WebSocket
     */
    private cleanupWebSocketSessions(ws: WebSocket): void {
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.webSocket === ws) {
                console.log(`🧹 Cleaning up orphaned session: ${sessionId}`);
                session.terminal.dispose();
                this.sessions.delete(sessionId);
            }
        }
    }

    /**
     * Start session cleanup timer for inactive sessions
     */
    private startSessionCleanup(): void {
        setInterval(() => {
            const now = new Date();
            const maxInactivity = 30 * 60 * 1000; // 30 minutes

            for (const [sessionId, session] of this.sessions.entries()) {
                const inactiveTime = now.getTime() - session.lastActivity.getTime();
                if (inactiveTime > maxInactivity) {
                    console.log(`🕐 Cleaning up inactive session: ${sessionId}`);
                    session.terminal.dispose();
                    this.sessions.delete(sessionId);
                }
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
    }

    /**
     * Get service status
     */
    getStatus(): {
        running: boolean;
        port: number;
        sessions: number;
        clients: number;
        activeSessions: Array<{
            id: string;
            workbranchId: string;
            shell: string;
            title: string;
            createdAt: Date;
            lastActivity: Date;
        }>;
    } {
        return {
            running: this.server !== null,
            port: this.port,
            sessions: this.sessions.size,
            clients: this.clients.size,
            activeSessions: Array.from(this.sessions.values()).map(session => ({
                id: session.id,
                workbranchId: session.workbranchId,
                shell: session.shell,
                title: session.title,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity
            }))
        };
    }

    /**
     * Broadcast message to all connected clients
     */
    broadcast(message: any): void {
        const data = JSON.stringify(message);
        this.clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });
    }

    /**
     * Get session by ID
     */
    getSession(sessionId: string): TerminalSession | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * Get sessions by workbranch ID
     */
    getSessionsByWorkbranch(workbranchId: string): TerminalSession[] {
        return Array.from(this.sessions.values()).filter(session => session.workbranchId === workbranchId);
    }
}