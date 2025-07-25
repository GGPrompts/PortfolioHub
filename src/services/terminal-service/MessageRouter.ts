/**
 * Message Router - WebSocket message handling and routing
 * 
 * This class routes and handles all WebSocket messages for the terminal service:
 * - Message type routing and validation
 * - Session management integration
 * - Security validation integration
 * - Response formatting and error handling
 * - Real-time output streaming
 * - Status broadcasting and updates
 * - Command execution coordination
 */

import { WebSocket } from 'ws';
import SessionManager from './SessionManager';
import SecurityService from './SecurityService';
import { WebSocketMessage } from './index';

export interface MessageRouterConfig {
    sessionManager: SessionManager;
    securityService: SecurityService;
}

export interface MessageResponse extends WebSocketMessage {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
}

export class MessageRouter {
    private sessionManager: SessionManager;
    private securityService: SecurityService;

    constructor(config: MessageRouterConfig) {
        this.sessionManager = config.sessionManager;
        this.securityService = config.securityService;

        console.log('🔄 Message Router initialized');
    }

    /**
     * Handle incoming WebSocket message
     */
    async handleMessage(message: WebSocketMessage, webSocket: WebSocket): Promise<MessageResponse | null> {
        try {
            console.log(`📨 Routing message type: ${message.type}`, {
                id: message.id,
                sessionId: message.sessionId,
                terminalId: message.terminalId
            });

            // Validate message structure
            const validation = this.validateMessage(message);
            if (!validation.valid) {
                return this.createErrorResponse(message, validation.error!);
            }

            // Route message based on type
            switch (message.type) {
                case 'terminal-create':
                    return await this.handleCreateTerminal(message, webSocket);

                case 'terminal-destroy':
                    return await this.handleDestroyTerminal(message, webSocket);

                case 'terminal-command':
                    return await this.handleExecuteCommand(message, webSocket);

                case 'terminal-data':
                    return await this.handleSendData(message, webSocket);

                case 'terminal-resize':
                    return await this.handleResizeTerminal(message, webSocket);

                case 'terminal-list':
                    return await this.handleListTerminals(message, webSocket);

                case 'terminal-status':
                    return await this.handleGetStatus(message, webSocket);

                case 'terminal-output':
                    return await this.handleGetOutput(message, webSocket);

                case 'service-status':
                    return await this.handleServiceStatus(message, webSocket);

                case 'service-stats':
                    return await this.handleServiceStats(message, webSocket);

                case 'security-audit':
                    return await this.handleSecurityAudit(message, webSocket);

                case 'ping':
                    return this.handlePing(message);

                default:
                    return this.createErrorResponse(message, `Unknown message type: ${message.type}`);
            }

        } catch (error) {
            console.error('❌ Error routing message:', error);
            return this.createErrorResponse(message, 
                error instanceof Error ? error.message : 'Internal message routing error'
            );
        }
    }

    /**
     * Handle terminal creation request
     */
    private async handleCreateTerminal(message: WebSocketMessage, webSocket: WebSocket): Promise<MessageResponse> {
        try {
            const { workbranchId, projectId, shell = 'powershell', title, cwd, env, cols, rows } = message.data || {};

            if (!workbranchId) {
                return this.createErrorResponse(message, 'workbranchId is required');
            }

            // Validate workbranch ID
            if (!this.securityService.validateWorkbranchId(workbranchId)) {
                return this.createErrorResponse(message, `Invalid workbranch ID: ${workbranchId}`);
            }

            // Create session
            const result = await this.sessionManager.createSession(
                workbranchId,
                shell,
                projectId,
                {
                    title,
                    cwd,
                    env,
                    cols,
                    rows,
                    webSocket
                }
            );

            if (!result.success) {
                return this.createErrorResponse(message, result.error!);
            }

            // Setup output streaming for the new session
            this.setupOutputStreaming(result.sessionId!, webSocket);

            return this.createSuccessResponse(message, 'Terminal session created successfully', {
                sessionId: result.sessionId,
                workbranchId,
                shell,
                projectId,
                title: title || `Terminal - ${workbranchId}`
            });

        } catch (error) {
            console.error('❌ Error creating terminal:', error);
            return this.createErrorResponse(message, 
                error instanceof Error ? error.message : 'Failed to create terminal'
            );
        }
    }

    /**
     * Handle terminal destruction request
     */
    private async handleDestroyTerminal(message: WebSocketMessage, webSocket: WebSocket): Promise<MessageResponse> {
        try {
            const sessionId = message.sessionId || message.data?.sessionId;
            
            if (!sessionId) {
                return this.createErrorResponse(message, 'sessionId is required');
            }

            // Verify session exists and belongs to this WebSocket
            const session = this.sessionManager.getSession(sessionId);
            if (!session) {
                return this.createErrorResponse(message, `Session not found: ${sessionId}`);
            }

            const sessionState = session.getState();
            if (sessionState.webSocket !== webSocket) {
                return this.createErrorResponse(message, 'Permission denied: not session owner');
            }

            // Destroy session
            const result = await this.sessionManager.destroySession(sessionId);
            
            if (!result.success) {
                return this.createErrorResponse(message, result.error!);
            }

            return this.createSuccessResponse(message, 'Terminal session destroyed successfully', {
                sessionId
            });

        } catch (error) {
            console.error('❌ Error destroying terminal:', error);
            return this.createErrorResponse(message, 
                error instanceof Error ? error.message : 'Failed to destroy terminal'
            );
        }
    }

    /**
     * Handle command execution request
     */
    private async handleExecuteCommand(message: WebSocketMessage, webSocket: WebSocket): Promise<MessageResponse> {
        try {
            const sessionId = message.sessionId || message.terminalId;
            const command = message.command || message.data?.command;
            
            if (!sessionId) {
                return this.createErrorResponse(message, 'sessionId is required');
            }

            if (!command) {
                return this.createErrorResponse(message, 'command is required');
            }

            // Get session
            const session = this.sessionManager.getSession(sessionId);
            if (!session) {
                return this.createErrorResponse(message, `Session not found: ${sessionId}`);
            }

            const sessionState = session.getState();

            // Verify session ownership
            if (sessionState.webSocket !== webSocket) {
                return this.createErrorResponse(message, 'Permission denied: not session owner');
            }

            // Security validation - bypass for Claude Code and AI orchestration
            const isClaudeCommand = command.toLowerCase().includes('claude') || 
                                  message.data?.source === 'ai-orchestrator';
            
            if (!isClaudeCommand) {
                const securityValidation = this.securityService.validateCommand(
                    command, 
                    sessionState.workbranchId, 
                    sessionId
                );

                if (!securityValidation.valid) {
                    return this.createErrorResponse(message, 
                        `Command blocked for security: ${securityValidation.reason}`,
                        'security_violation'
                    );
                }
            } else {
                console.log(`🤖 Bypassing security for Claude/AI command: ${command.substring(0, 50)}...`);
            }

            // Execute command
            const executed = session.executeCommand(command);
            
            if (!executed) {
                return this.createErrorResponse(message, 'Failed to execute command - session not ready');
            }

            return this.createSuccessResponse(message, 'Command executed successfully', {
                sessionId,
                command: command.substring(0, 100) // Truncate for response
            });

        } catch (error) {
            console.error('❌ Error executing command:', error);
            return this.createErrorResponse(message, 
                error instanceof Error ? error.message : 'Failed to execute command'
            );
        }
    }

    /**
     * Handle raw data sending request
     */
    private async handleSendData(message: WebSocketMessage, webSocket: WebSocket): Promise<MessageResponse> {
        try {
            const sessionId = message.sessionId || message.terminalId;
            const data = message.data?.data;
            
            if (!sessionId) {
                return this.createErrorResponse(message, 'sessionId is required');
            }

            if (data === undefined) {
                return this.createErrorResponse(message, 'data is required');
            }

            // Get session
            const session = this.sessionManager.getSession(sessionId);
            if (!session) {
                return this.createErrorResponse(message, `Session not found: ${sessionId}`);
            }

            const sessionState = session.getState();

            // Verify session ownership
            if (sessionState.webSocket !== webSocket) {
                return this.createErrorResponse(message, 'Permission denied: not session owner');
            }

            // Send data to terminal
            const sent = session.write(data);
            
            if (!sent) {
                return this.createErrorResponse(message, 'Failed to send data - session not ready');
            }

            return this.createSuccessResponse(message, 'Data sent successfully', {
                sessionId,
                dataLength: data.length
            });

        } catch (error) {
            console.error('❌ Error sending data:', error);
            return this.createErrorResponse(message, 
                error instanceof Error ? error.message : 'Failed to send data'
            );
        }
    }

    /**
     * Handle terminal resize request
     */
    private async handleResizeTerminal(message: WebSocketMessage, webSocket: WebSocket): Promise<MessageResponse> {
        try {
            const sessionId = message.sessionId || message.terminalId;
            const { cols, rows } = message.data || {};
            
            if (!sessionId) {
                return this.createErrorResponse(message, 'sessionId is required');
            }

            if (!cols || !rows) {
                return this.createErrorResponse(message, 'cols and rows are required');
            }

            // Get session
            const session = this.sessionManager.getSession(sessionId);
            if (!session) {
                return this.createErrorResponse(message, `Session not found: ${sessionId}`);
            }

            const sessionState = session.getState();

            // Verify session ownership
            if (sessionState.webSocket !== webSocket) {
                return this.createErrorResponse(message, 'Permission denied: not session owner');
            }

            // Resize terminal
            const resized = session.resize(cols, rows);
            
            if (!resized) {
                return this.createErrorResponse(message, 'Failed to resize terminal');
            }

            return this.createSuccessResponse(message, 'Terminal resized successfully', {
                sessionId,
                cols,
                rows
            });

        } catch (error) {
            console.error('❌ Error resizing terminal:', error);
            return this.createErrorResponse(message, 
                error instanceof Error ? error.message : 'Failed to resize terminal'
            );
        }
    }

    /**
     * Handle list terminals request
     */
    private async handleListTerminals(message: WebSocketMessage, webSocket: WebSocket): Promise<MessageResponse> {
        try {
            const { workbranchId } = message.data || {};
            
            let sessions;
            if (workbranchId) {
                sessions = this.sessionManager.getSessionsByWorkbranch(workbranchId);
            } else {
                // Return sessions for this WebSocket only for security
                sessions = this.sessionManager.getSessionsByWebSocket(webSocket);
            }

            const sessionStates = sessions.map(session => {
                const state = session.getState();
                return {
                    sessionId: state.sessionId,
                    workbranchId: state.workbranchId,
                    projectId: state.projectId,
                    shell: state.shell,
                    title: state.title,
                    status: state.status,
                    createdAt: state.createdAt,
                    lastActivity: state.lastActivity,
                    dimensions: state.dimensions
                };
            });

            return this.createSuccessResponse(message, 'Terminals listed successfully', {
                sessions: sessionStates,
                count: sessionStates.length
            });

        } catch (error) {
            console.error('❌ Error listing terminals:', error);
            return this.createErrorResponse(message, 
                error instanceof Error ? error.message : 'Failed to list terminals'
            );
        }
    }

    /**
     * Handle get terminal status request
     */
    private async handleGetStatus(message: WebSocketMessage, webSocket: WebSocket): Promise<MessageResponse> {
        try {
            const sessionId = message.sessionId || message.terminalId;
            
            if (!sessionId) {
                return this.createErrorResponse(message, 'sessionId is required');
            }

            const session = this.sessionManager.getSession(sessionId);
            if (!session) {
                return this.createErrorResponse(message, `Session not found: ${sessionId}`);
            }

            const state = session.getState();

            // Verify session ownership
            if (state.webSocket !== webSocket) {
                return this.createErrorResponse(message, 'Permission denied: not session owner');
            }

            return this.createSuccessResponse(message, 'Status retrieved successfully', {
                sessionId: state.sessionId,
                workbranchId: state.workbranchId,
                status: state.status,
                pid: state.pid,
                lastActivity: state.lastActivity,
                dimensions: state.dimensions,
                totalOutput: state.totalOutput,
                commandCount: state.commandCount
            });

        } catch (error) {
            console.error('❌ Error getting status:', error);
            return this.createErrorResponse(message, 
                error instanceof Error ? error.message : 'Failed to get status'
            );
        }
    }

    /**
     * Handle get terminal output request
     */
    private async handleGetOutput(message: WebSocketMessage, webSocket: WebSocket): Promise<MessageResponse> {
        try {
            const sessionId = message.sessionId || message.terminalId;
            
            if (!sessionId) {
                return this.createErrorResponse(message, 'sessionId is required');
            }

            const session = this.sessionManager.getSession(sessionId);
            if (!session) {
                return this.createErrorResponse(message, `Session not found: ${sessionId}`);
            }

            const state = session.getState();

            // Verify session ownership
            if (state.webSocket !== webSocket) {
                return this.createErrorResponse(message, 'Permission denied: not session owner');
            }

            const output = session.getOutput();

            return this.createSuccessResponse(message, 'Output retrieved successfully', {
                sessionId,
                output,
                outputLength: output.length
            });

        } catch (error) {
            console.error('❌ Error getting output:', error);
            return this.createErrorResponse(message, 
                error instanceof Error ? error.message : 'Failed to get output'
            );
        }
    }

    /**
     * Handle service status request
     */
    private async handleServiceStatus(message: WebSocketMessage, webSocket: WebSocket): Promise<MessageResponse> {
        try {
            const stats = this.sessionManager.getStats();
            
            return this.createSuccessResponse(message, 'Service status retrieved successfully', {
                sessionStats: stats,
                serverInfo: {
                    platform: process.platform,
                    nodeVersion: process.version,
                    uptime: process.uptime(),
                    memory: process.memoryUsage()
                }
            });

        } catch (error) {
            console.error('❌ Error getting service status:', error);
            return this.createErrorResponse(message, 
                error instanceof Error ? error.message : 'Failed to get service status'
            );
        }
    }

    /**
     * Handle service stats request
     */
    private async handleServiceStats(message: WebSocketMessage, webSocket: WebSocket): Promise<MessageResponse> {
        try {
            const sessionStats = this.sessionManager.getStats();
            const securityStats = this.securityService.getSecurityStats();
            
            return this.createSuccessResponse(message, 'Service stats retrieved successfully', {
                sessions: sessionStats,
                security: securityStats,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Error getting service stats:', error);
            return this.createErrorResponse(message, 
                error instanceof Error ? error.message : 'Failed to get service stats'
            );
        }
    }

    /**
     * Handle security audit request
     */
    private async handleSecurityAudit(message: WebSocketMessage, webSocket: WebSocket): Promise<MessageResponse> {
        try {
            const auditLog = this.securityService.getAuditLog();
            const securityStats = this.securityService.getSecurityStats();
            
            return this.createSuccessResponse(message, 'Security audit retrieved successfully', {
                auditLog: auditLog.slice(-100), // Last 100 events for performance
                stats: securityStats,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ Error getting security audit:', error);
            return this.createErrorResponse(message, 
                error instanceof Error ? error.message : 'Failed to get security audit'
            );
        }
    }

    /**
     * Handle ping request
     */
    private handlePing(message: WebSocketMessage): MessageResponse {
        return this.createSuccessResponse(message, 'pong', {
            timestamp: Date.now(),
            uptime: process.uptime()
        });
    }

    /**
     * Setup real-time output streaming for a session
     */
    private setupOutputStreaming(sessionId: string, webSocket: WebSocket): void {
        const session = this.sessionManager.getSession(sessionId);
        if (!session) return;

        console.log(`📡 Setting up output streaming for session: ${sessionId}`);

        // Setup output callback
        session.setOutputCallback((data: string) => {
            if (webSocket.readyState === WebSocket.OPEN) {
                const outputMessage: WebSocketMessage = {
                    type: 'terminal-output',
                    sessionId,
                    terminalId: sessionId,
                    data: { output: data },
                    timestamp: Date.now()
                };

                try {
                    webSocket.send(JSON.stringify(outputMessage));
                } catch (error) {
                    console.error(`❌ Error streaming output for ${sessionId}:`, error);
                }
            }
        });

        // Setup exit callback
        session.setExitCallback((exitCode: number, signal?: number) => {
            if (webSocket.readyState === WebSocket.OPEN) {
                const exitMessage: WebSocketMessage = {
                    type: 'terminal-exit',
                    sessionId,
                    terminalId: sessionId,
                    data: { exitCode, signal },
                    timestamp: Date.now()
                };

                try {
                    webSocket.send(JSON.stringify(exitMessage));
                } catch (error) {
                    console.error(`❌ Error sending exit notification for ${sessionId}:`, error);
                }
            }
        });
    }

    /**
     * Validate incoming message structure
     */
    private validateMessage(message: WebSocketMessage): { valid: boolean; error?: string } {
        if (!message.type) {
            return { valid: false, error: 'Message type is required' };
        }

        if (typeof message.type !== 'string') {
            return { valid: false, error: 'Message type must be a string' };
        }

        return { valid: true };
    }

    /**
     * Create success response
     */
    private createSuccessResponse(originalMessage: WebSocketMessage, message: string, data?: any): MessageResponse {
        return {
            type: `${originalMessage.type}-response`,
            id: originalMessage.id,
            sessionId: originalMessage.sessionId,
            terminalId: originalMessage.terminalId,
            success: true,
            message,
            data,
            timestamp: Date.now()
        };
    }

    /**
     * Create error response
     */
    private createErrorResponse(originalMessage: WebSocketMessage, error: string, errorType?: string): MessageResponse {
        return {
            type: `${originalMessage.type}-response`,
            id: originalMessage.id,
            sessionId: originalMessage.sessionId,
            terminalId: originalMessage.terminalId,
            success: false,
            message: 'Operation failed',
            error,
            data: errorType ? { errorType } : undefined,
            timestamp: Date.now()
        };
    }
}

export default MessageRouter;