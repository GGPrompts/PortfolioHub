/**
 * WebSocket Service for Terminal Integration
 * Connects React app terminals to VS Code extension
 */

import { TerminalInstance } from '../components/CenterArea/types';

export interface WebSocketMessage {
  type?: string;
  id?: string;
  terminalId?: string;
  sessionId?: string;
  workbranchId?: string;
  projectId?: string;
  command?: string;
  data?: any;
  success?: boolean;
  message?: string;
}

export interface TerminalSession {
  sessionId: string;
  terminalId: string;
  workbranchId: string;
  projectId?: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

class TerminalWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private sessions: Map<string, TerminalSession> = new Map();
  private messageHandlers: Map<string, (message: WebSocketMessage) => void> = new Map();
  private connectionPromise: Promise<void> | null = null;
  
  private readonly WS_URL = 'ws://localhost:8123'; // Use the existing WebSocket Bridge that was working
  private readonly RECONNECT_DELAY = 3000;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectAttempts = 0;

  constructor() {
    // Don't auto-connect - let Environment Bridge handle the WebSocket connection
    console.log('🔗 Terminal service initialized - will use Environment Bridge for commands');
  }

  private connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to Terminal Service...');
        this.ws = new WebSocket(this.WS_URL);

        this.ws.onopen = () => {
          console.log('✅ Connected to Terminal Service at ws://localhost:8002');
          console.log('📊 WebSocket readyState:', this.ws?.readyState);
          this.reconnectAttempts = 0;
          this.connectionPromise = null;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('❌ Disconnected from Terminal Service');
          this.ws = null;
          this.connectionPromise = null;
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('🔌 WebSocket connection error:', error);
          this.connectionPromise = null;
          reject(error);
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.RECONNECT_DELAY);
  }

  private handleMessage(message: WebSocketMessage) {
    // RESTORE DEBUG: Log all WebSocket messages for troubleshooting
    console.log('📨 WebSocket message:', message);
    
    // Special logging for output messages
    if (message.type === 'terminal-output') {
      console.log('🔍 TERMINAL OUTPUT DETECTED:', {
        type: message.type,
        terminalId: message.terminalId,
        sessionId: message.sessionId,
        data: message.data,
        hasHandler: this.messageHandlers.has(message.terminalId || message.sessionId || '')
      });
    }

    // Handle response messages for pending requests
    if (message.id && this.pendingMessages.has(message.id)) {
      const pending = this.pendingMessages.get(message.id)!;
      this.pendingMessages.delete(message.id);
      
      if (message.success === false) {
        pending.reject(new Error(message.message || 'Request failed'));
      } else {
        pending.resolve(message);
      }
      return;
    }

    // Check if message is an error response without proper structure
    if (message.success === false && !message.type) {
      console.warn('⚠️ Received error response:', message.message);
      return;
    }

    // Handle terminal-specific messages
    if (message.terminalId) {
      const handler = this.messageHandlers.get(message.terminalId);
      console.log(`📨 Found handler for ${message.terminalId}:`, !!handler);
      if (handler) {
        handler(message);
      } else {
        console.warn(`⚠️ No handler registered for terminal ${message.terminalId}`);
      }
    }

    // Handle global messages
    switch (message.type) {
      case 'connected':
        console.log('Terminal service ready:', message.data);
        break;

      case 'terminal-output':
        this.handleTerminalOutput(message);
        break;

      case 'terminal-status':
        this.handleTerminalStatus(message);
        break;

      case 'terminal-create-response':
        // These are handled above in pending messages
        break;

      case 'terminal-command-response':
        // These are handled above in pending messages  
        break;

      case 'error':
        console.error('Terminal service error:', message.data);
        break;
        
      default:
        if (message.type?.endsWith('-response')) {
          // All response types are handled by pending messages above
          break;
        }
        console.log('🔄 Unhandled message type:', message.type);
    }
  }

  private handleTerminalOutput(message: WebSocketMessage) {
    if (!message.terminalId || !message.data) return;
    
    console.log(`📺 Terminal output for ${message.terminalId}:`, message.data);
    const handler = this.messageHandlers.get(message.terminalId);
    if (handler) {
      console.log(`📺 Sending output to handler for ${message.terminalId}`);
      handler({
        type: 'output',
        data: message.data // Pass the full data object containing {output: "..."}
      });
    } else {
      console.warn(`📺 No handler found for terminal output: ${message.terminalId}`);
      // Check if we have a handler registered under a different ID
      console.log(`📺 Available handler IDs:`, Array.from(this.messageHandlers.keys()));
    }
  }

  private handleTerminalStatus(message: WebSocketMessage) {
    if (!message.terminalId) return;
    
    const session = this.sessions.get(message.terminalId);
    if (session) {
      session.status = message.data?.status || 'disconnected';
    }
  }

  private async sendMessage(message: WebSocketMessage): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('🔌 WebSocket not ready, attempting to connect...');
      await this.connect();
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected - VS Code extension terminal service may not be responding');
    }

    return new Promise((resolve, reject) => {
      const messageId = message.id || `msg-${Date.now()}`;
      message.id = messageId;

      // Store pending message for response handling
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        reject(new Error('Message timeout - VS Code extension may be busy or unresponsive'));
      }, 15000); // Increased to 15 second timeout

      this.pendingMessages.set(messageId, { 
        resolve: (response: any) => {
          clearTimeout(timeout);
          resolve(response);
        }, 
        reject: (error: any) => {
          clearTimeout(timeout);
          reject(error);
        }
      });

      // RESTORE DEBUG: Log all outgoing WebSocket messages
      console.log(`📤 Sending WebSocket message:`, message);
      this.ws!.send(JSON.stringify(message));
    });
  }

  private pendingMessages: Map<string, { resolve: Function; reject: Function }> = new Map();

  // Public API

  async createTerminalSession(
    terminalId: string, 
    workbranchId: string, 
    projectId?: string
  ): Promise<string> {
    console.log(`🚀 Creating visual terminal session for ${terminalId} (using Environment Bridge for commands)`);
    
    // Create a simple session for visual terminals
    // Commands will be executed via Environment Bridge, not dedicated terminal sessions
    const session: TerminalSession = {
      sessionId: `visual-${terminalId}`, // Visual session, not backend session
      terminalId,
      workbranchId,
      projectId,
      status: 'connected' // Always connected since we use Environment Bridge
    };

    this.sessions.set(terminalId, session);
    console.log(`✅ Visual terminal session created: ${terminalId}`);
    
    return terminalId;
  }

  async destroyTerminalSession(terminalId: string): Promise<void> {
    const session = this.sessions.get(terminalId);
    if (!session) return;

    try {
      await this.sendMessage({
        type: 'terminal-destroy',
        id: session.sessionId,
        data: {
          sessionId: session.sessionId
        }
      });
    } finally {
      this.sessions.delete(terminalId);
      this.messageHandlers.delete(terminalId);
      // Also remove the session ID handler if it exists
      if (session.sessionId) {
        this.messageHandlers.delete(session.sessionId);
        console.log(`🧹 Cleaned up handlers for both ${terminalId} and ${session.sessionId}`);
      }
    }
  }

  async sendCommand(terminalId: string, command: string): Promise<void> {
    // Use the existing Environment Bridge instead of competing WebSocket
    const { environmentBridge } = await import('./environmentBridge');
    
    console.log(`🤖 AI sending command via Environment Bridge: "${command}"`);
    
    // Show command in visual terminal
    const handler = this.messageHandlers.get(terminalId);
    if (handler) {
      // Show the command being executed
      handler({
        type: 'output',
        data: { output: `$ ${command}\r\n` }
      });
    }
    
    try {
      const success = await environmentBridge.executeCommand(command);
      
      // Show result in visual terminal
      if (handler) {
        if (success) {
          handler({
            type: 'output',
            data: { output: `✅ Command executed successfully in VS Code\r\n$ ` }
          });
        } else {
          handler({
            type: 'output',
            data: { output: `❌ Command execution failed\r\n$ ` }
          });
        }
      }
      
      if (!success) {
        throw new Error('Command execution failed via Environment Bridge');
      }
      console.log(`✅ Command executed successfully via Environment Bridge`);
    } catch (error) {
      // Show error in visual terminal
      if (handler) {
        handler({
          type: 'output',
          data: { output: `❌ Error: ${error instanceof Error ? error.message : error}\r\n$ ` }
        });
      }
      console.error(`❌ Failed to execute command via Environment Bridge:`, error);
      throw error;
    }
  }

  async sendData(terminalId: string, data: string): Promise<void> {
    const session = this.sessions.get(terminalId);
    if (!session) {
      throw new Error(`No session found for terminal ${terminalId}`);
    }

    await this.sendMessage({
      type: 'terminal-data',
      id: session.sessionId,
      terminalId,
      data: {
        sessionId: session.sessionId,
        data
      }
    });
  }

  async resizeTerminal(terminalId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(terminalId);
    if (!session) {
      console.warn(`⚠️ No session found for terminal ${terminalId}, skipping resize`);
      return;
    }

    try {
      await this.sendMessage({
        type: 'terminal-resize',
        id: `resize-${Date.now()}`,
        sessionId: session.sessionId,
        data: {
          cols,
          rows
        }
      });
      console.log(`📐 Terminal ${terminalId} resized to ${cols}x${rows}`);
    } catch (error) {
      console.warn(`⚠️ Terminal resize failed for ${terminalId}:`, error);
      // Don't throw - resize failures shouldn't break the UI
    }
  }

  registerTerminalHandler(terminalId: string, handler: (message: WebSocketMessage) => void) {
    console.log(`🔗 Registering handler for terminal ${terminalId}`);
    this.messageHandlers.set(terminalId, handler);
    console.log(`🔗 Total handlers registered: ${this.messageHandlers.size}`);
  }

  unregisterTerminalHandler(terminalId: string) {
    this.messageHandlers.delete(terminalId);
  }

  getSessionStatus(terminalId: string): TerminalSession['status'] | null {
    const session = this.sessions.get(terminalId);
    return session ? session.status : null;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.sessions.clear();
    this.messageHandlers.clear();
  }
}

// Export singleton instance
export const terminalWebSocketService = new TerminalWebSocketService();
