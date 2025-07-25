/**
 * Standalone WebSocket Terminal Service
 * 
 * This service provides a comprehensive WebSocket-based terminal system at port 8002
 * using node-pty for cross-platform terminal emulation. It works independently of VS Code,
 * providing full terminal functionality for the React application.
 * 
 * Features:
 * - Multi-session terminal management with workbranch isolation
 * - Bidirectional WebSocket communication (input/output/resize/control)
 * - Session lifecycle management with automatic cleanup
 * - Security validation and command filtering
 * - Cross-platform shell support (PowerShell, Bash, CMD)
 * - Real-time terminal output streaming
 * - Session persistence and reconnection handling
 */

import { WebSocketServer, WebSocket } from 'ws';
import { SessionManager } from './SessionManager';
import { SecurityService } from './SecurityService';
import { MessageRouter } from './MessageRouter';
import * as http from 'http';

export interface TerminalServiceConfig {
    port: number;
    host: string;
    workspaceRoot: string;
    maxSessions: number;
    sessionTimeout: number;
    enableSecurity: boolean;
    allowedOrigins: string[];
}

export interface WebSocketMessage {
    type: string;
    id?: string;
    sessionId?: string;
    terminalId?: string;
    workbranchId?: string;
    projectId?: string;
    command?: string;
    data?: any;
    success?: boolean;
    message?: string;
    timestamp?: number;
}

export interface TerminalServiceCapabilities {
    shells: string[];
    workbranchIsolation: boolean;
    sessionPersistence: boolean;
    crossPlatform: boolean;
    realTimeOutput: boolean;
    securityValidation: boolean;
    multiSession: boolean;
}

export class TerminalService {
    private server: WebSocketServer | null = null;
    private httpServer: http.Server | null = null;
    private sessionManager: SessionManager;
    private securityService: SecurityService;
    private messageRouter: MessageRouter;
    private clients: Set<WebSocket> = new Set();
    private isRunning = false;

    private readonly config: TerminalServiceConfig;

    constructor(config: Partial<TerminalServiceConfig> = {}) {
        // Default configuration
        this.config = {
            port: 8002,
            host: 'localhost',
            workspaceRoot: process.cwd(),
            maxSessions: 50,
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            enableSecurity: true,
            allowedOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
            ...config
        };

        // Initialize core services
        this.sessionManager = new SessionManager({
            workspaceRoot: this.config.workspaceRoot,
            maxSessions: this.config.maxSessions,
            sessionTimeout: this.config.sessionTimeout
        });

        this.securityService = new SecurityService({
            workspaceRoot: this.config.workspaceRoot,
            enabled: this.config.enableSecurity
        });

        this.messageRouter = new MessageRouter({
            sessionManager: this.sessionManager,
            securityService: this.securityService
        });

        // Bind methods to preserve context
        this.handleConnection = this.handleConnection.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleDisconnection = this.handleDisconnection.bind(this);
    }

    /**
     * Start the terminal service
     */
    async start(): Promise<boolean> {
        if (this.isRunning) {
            console.log('⚠️ Terminal service is already running');
            return true;
        }

        try {
            console.log(`🚀 Starting Terminal Service on ${this.config.host}:${this.config.port}`);

            // Create HTTP server for WebSocket upgrade
            this.httpServer = http.createServer();

            // Create WebSocket server
            this.server = new WebSocketServer({
                server: this.httpServer,
                perMessageDeflate: {
                    // Enable per-message compression for better performance
                    zlibDeflateOptions: {
                        level: 6,
                        chunkSize: 1024
                    }
                }
            });

            // Setup event handlers
            this.server.on('connection', this.handleConnection);
            this.server.on('error', this.handleServerError.bind(this));

            // Setup HTTP server
            this.httpServer.on('error', this.handleHttpError.bind(this));

            // Start listening
            await new Promise<void>((resolve, reject) => {
                this.httpServer!.listen(this.config.port, this.config.host, () => {
                    console.log(`✅ Terminal Service started successfully`);
                    console.log(`📡 WebSocket server: ws://${this.config.host}:${this.config.port}`);
                    console.log(`🛡️ Security: ${this.config.enableSecurity ? 'Enabled' : 'Disabled'}`);
                    console.log(`📁 Workspace: ${this.config.workspaceRoot}`);
                    console.log(`🔧 Max sessions: ${this.config.maxSessions}`);
                    resolve();
                });

                this.httpServer!.on('error', (error) => {
                    console.error('❌ Failed to start HTTP server:', error);
                    reject(error);
                });
            });

            // Start session cleanup
            this.sessionManager.startCleanupTimer();

            this.isRunning = true;
            return true;

        } catch (error) {
            console.error('❌ Failed to start Terminal Service:', error);
            await this.stop();
            return false;
        }
    }

    /**
     * Stop the terminal service
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        console.log('🛑 Stopping Terminal Service...');

        try {
            // Stop session cleanup
            this.sessionManager.stopCleanupTimer();

            // Close all client connections
            const closePromises = Array.from(this.clients).map(ws => {
                return new Promise<void>((resolve) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close(1000, 'Server shutting down');
                        ws.once('close', () => resolve());
                        setTimeout(() => resolve(), 1000); // Force close after 1s
                    } else {
                        resolve();
                    }
                });
            });

            await Promise.all(closePromises);
            this.clients.clear();

            // Destroy all terminal sessions
            await this.sessionManager.destroyAllSessions();

            // Close WebSocket server
            if (this.server) {
                await new Promise<void>((resolve) => {
                    this.server!.close(() => {
                        console.log('✅ WebSocket server closed');
                        resolve();
                    });
                });
                this.server = null;
            }

            // Close HTTP server
            if (this.httpServer) {
                await new Promise<void>((resolve) => {
                    this.httpServer!.close(() => {
                        console.log('✅ HTTP server closed');
                        resolve();
                    });
                });
                this.httpServer = null;
            }

            this.isRunning = false;
            console.log('✅ Terminal Service stopped successfully');

        } catch (error) {
            console.error('❌ Error stopping Terminal Service:', error);
            this.isRunning = false;
        }
    }

    /**
     * Handle new WebSocket connections
     */
    private handleConnection(ws: WebSocket, request: http.IncomingMessage): void {
        console.log('🔌 New terminal client connected');

        // Validate origin for security
        if (this.config.enableSecurity && !this.validateOrigin(request)) {
            console.warn('❌ Connection rejected: invalid origin');
            ws.close(1008, 'Invalid origin');
            return;
        }

        // Add to client set
        this.clients.add(ws);

        // Setup client event handlers
        ws.on('message', async (data: Buffer) => {
            await this.handleMessage(ws, data);
        });

        ws.on('close', (code: number, reason: Buffer) => {
            this.handleDisconnection(ws, code, reason);
        });

        ws.on('error', (error: Error) => {
            console.error('🔌 WebSocket client error:', error);
            this.clients.delete(ws);
            this.sessionManager.cleanupWebSocketSessions(ws);
        });

        ws.on('pong', () => {
            // Handle pong response for heartbeat
            (ws as any).isAlive = true;
        });

        // Send initial capabilities message
        this.sendMessage(ws, {
            type: 'connected',
            success: true,
            message: 'Connected to Terminal Service',
            data: this.getCapabilities(),
            timestamp: Date.now()
        });

        // Start heartbeat for this connection
        this.startHeartbeat(ws);
    }

    /**
     * Handle incoming WebSocket messages
     */
    private async handleMessage(ws: WebSocket, data: Buffer): Promise<void> {
        try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            
            // Add timestamp if not present
            if (!message.timestamp) {
                message.timestamp = Date.now();
            }

            console.log('📨 Received message:', {
                type: message.type,
                sessionId: message.sessionId,
                terminalId: message.terminalId,
                id: message.id
            });

            // Route message through message router
            const response = await this.messageRouter.handleMessage(message, ws);

            // Send response if provided
            if (response) {
                this.sendMessage(ws, response);
            }

        } catch (error) {
            console.error('❌ Error handling message:', error);
            
            this.sendMessage(ws, {
                type: 'error',
                success: false,
                message: 'Invalid message format',
                data: { error: error instanceof Error ? error.message : 'Unknown error' },
                timestamp: Date.now()
            });
        }
    }

    /**
     * Handle WebSocket disconnections
     */
    private handleDisconnection(ws: WebSocket, code: number, reason: Buffer): void {
        console.log(`❌ Terminal client disconnected: ${code} - ${reason.toString()}`);
        
        // Remove from client set
        this.clients.delete(ws);
        
        // Cleanup any sessions associated with this WebSocket
        this.sessionManager.cleanupWebSocketSessions(ws);
    }

    /**
     * Send message to WebSocket client
     */
    private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                // Add timestamp if not present
                if (!message.timestamp) {
                    message.timestamp = Date.now();
                }

                const data = JSON.stringify(message);
                ws.send(data);

                console.log('📤 Sent message:', {
                    type: message.type,
                    success: message.success,
                    sessionId: message.sessionId,
                    id: message.id
                });

            } catch (error) {
                console.error('❌ Error sending message:', error);
            }
        }
    }

    /**
     * Broadcast message to all connected clients
     */
    broadcast(message: WebSocketMessage): void {
        if (!message.timestamp) {
            message.timestamp = Date.now();
        }

        const data = JSON.stringify(message);
        let sentCount = 0;

        this.clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(data);
                    sentCount++;
                } catch (error) {
                    console.error('❌ Error broadcasting to client:', error);
                }
            }
        });

        console.log(`📡 Broadcast sent to ${sentCount} clients:`, {
            type: message.type,
            message: message.message
        });
    }

    /**
     * Validate request origin for security
     */
    private validateOrigin(request: http.IncomingMessage): boolean {
        const origin = request.headers.origin;
        
        if (!origin) {
            return false; // Require origin header
        }

        return this.config.allowedOrigins.includes(origin);
    }

    /**
     * Start heartbeat for WebSocket connection
     */
    private startHeartbeat(ws: WebSocket): void {
        (ws as any).isAlive = true;

        const heartbeat = setInterval(() => {
            if (!(ws as any).isAlive) {
                console.log('💔 Client failed heartbeat, terminating connection');
                clearInterval(heartbeat);
                ws.terminate();
                return;
            }

            (ws as any).isAlive = false;
            ws.ping();
        }, 30000); // 30 second heartbeat

        ws.on('close', () => {
            clearInterval(heartbeat);
        });
    }

    /**
     * Handle WebSocket server errors
     */
    private handleServerError(error: Error): void {
        console.error('❌ WebSocket server error:', error);
    }

    /**
     * Handle HTTP server errors
     */
    private handleHttpError(error: Error): void {
        console.error('❌ HTTP server error:', error);
    }

    /**
     * Get service capabilities
     */
    private getCapabilities(): TerminalServiceCapabilities {
        return {
            shells: this.sessionManager.getAvailableShells(),
            workbranchIsolation: true,
            sessionPersistence: true,
            crossPlatform: true,
            realTimeOutput: true,
            securityValidation: this.config.enableSecurity,
            multiSession: true
        };
    }

    /**
     * Get service status
     */
    getStatus(): {
        running: boolean;
        port: number;
        host: string;
        clients: number;
        sessions: number;
        uptime: number;
        capabilities: TerminalServiceCapabilities;
        config: TerminalServiceConfig;
    } {
        return {
            running: this.isRunning,
            port: this.config.port,
            host: this.config.host,
            clients: this.clients.size,
            sessions: this.sessionManager.getSessionCount(),
            uptime: this.isRunning ? Date.now() - (this as any).startTime : 0,
            capabilities: this.getCapabilities(),
            config: this.config
        };
    }
}

// Export singleton instance for easy usage
export const terminalService = new TerminalService();

// Export types for external usage
export * from './SessionManager';
export * from './SecurityService';
export * from './MessageRouter';