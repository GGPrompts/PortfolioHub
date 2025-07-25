/**
 * WebSocket Service for Terminal Integration
 * Connects React app terminals to VS Code extension
 */

import { TerminalInstance } from '../components/CenterArea/types';

export interface WebSocketMessage {
  type: string;
  id?: string;
  terminalId?: string;
  sessionId?: string;
  workbranchId?: string;
  projectId?: string;
  command?: string;
  data?: any;
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
  
  private readonly WS_URL = 'ws://localhost:8123';
  private readonly RECONNECT_DELAY = 3000;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectAttempts = 0;

  constructor() {
    this.connect();
  }

  private connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to VS Code WebSocket bridge...');
        this.ws = new WebSocket(this.WS_URL);

        this.ws.onopen = () => {
          console.log('✅ Connected to VS Code WebSocket bridge');
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
          console.log('❌ Disconnected from VS Code WebSocket bridge');
          this.ws = null;
          this.connectionPromise = null;
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
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
    console.log('📨 Received message:', message);

    // Handle terminal-specific messages
    if (message.terminalId) {
      const handler = this.messageHandlers.get(message.terminalId);
      if (handler) {
        handler(message);
      }
    }

    // Handle global messages
    switch (message.type) {
      case 'connected':
        console.log('VS Code bridge ready:', message.data);
        break;

      case 'terminal-output':
        this.handleTerminalOutput(message);
        break;

      case 'terminal-status':
        this.handleTerminalStatus(message);
        break;

      case 'error':
        console.error('VS Code error:', message.data);
        break;
    }
  }

  private handleTerminalOutput(message: WebSocketMessage) {
    if (!message.terminalId || !message.data) return;
    
    const handler = this.messageHandlers.get(message.terminalId);
    if (handler) {
      handler({
        type: 'output',
        data: message.data
      });
    }
  }

  private handleTerminalStatus(message: WebSocketMessage) {
    if (!message.terminalId) return;
    
    const session = this.sessions.get(message.terminalId);
    if (session) {
      session.status = message.data?.status || 'disconnected';
    }
  }

  private async sendMessage(message: WebSocketMessage): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket not connected');
    }
  }

  // Public API

  async createTerminalSession(
    terminalId: string, 
    workbranchId: string, 
    projectId?: string
  ): Promise<string> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: TerminalSession = {
      sessionId,
      terminalId,
      workbranchId,
      projectId,
      status: 'connecting'
    };

    this.sessions.set(terminalId, session);

    try {
      await this.sendMessage({
        type: 'terminal-create',
        id: sessionId,
        data: {
          workbranchId,
          projectId,
          title: projectId ? `${projectId} Terminal` : `Terminal ${workbranchId}`,
          shell: 'powershell'
        }
      });

      session.status = 'connected';
      return sessionId;
    } catch (error) {
      session.status = 'error';
      throw error;
    }
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
    }
  }

  async sendCommand(terminalId: string, command: string): Promise<void> {
    const session = this.sessions.get(terminalId);
    if (!session) {
      throw new Error(`No session found for terminal ${terminalId}`);
    }

    await this.sendMessage({
      type: 'terminal-command',
      id: session.sessionId,
      terminalId,
      data: {
        sessionId: session.sessionId,
        command
      }
    });
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
    if (!session) return;

    await this.sendMessage({
      type: 'terminal-resize',
      id: session.sessionId,
      terminalId,
      data: {
        sessionId: session.sessionId,
        cols,
        rows
      }
    });
  }

  registerTerminalHandler(terminalId: string, handler: (message: WebSocketMessage) => void) {
    this.messageHandlers.set(terminalId, handler);
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
