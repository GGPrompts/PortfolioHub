/**
 * Enhanced WebSocket Service for Terminal Integration
 * Based on patterns from standalone terminal system
 * Provides persistent terminal sessions with automatic reconnection
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
  reconnectAttempts: number;
  lastActivity: Date;
}

interface WebSocketConfig {
  url: string;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  messageTimeout: number;
}

class TerminalWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private sessions: Map<string, TerminalSession> = new Map();
  private messageHandlers: Map<string, (message: WebSocketMessage) => void> = new Map();
  private connectionPromise: Promise<void> | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isReconnecting = false;
  
  private config: WebSocketConfig = {
    url: 'ws://localhost:8125', // Use WebSocket port from standalone system
    reconnectDelay: 3000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    messageTimeout: 15000
  };
  
  private reconnectAttempts = 0;
  private pendingMessages: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();

  constructor() {
    console.log('🔗 Enhanced Terminal WebSocket Service initialized');
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for page visibility changes to handle reconnection
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.isConnected()) {
        console.log('📱 Page visible, attempting reconnection...');
        this.connect();
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Network online, attempting reconnection...');
      this.connect();
    });

    window.addEventListener('offline', () => {
      console.log('📵 Network offline');
      this.handleDisconnect();
    });
  }

  async connect(): Promise<void> {
    if (this.connectionPromise || this.isReconnecting) {
      return this.connectionPromise || Promise.resolve();
    }

    if (this.isConnected()) {
      return Promise.resolve();
    }

    this.isReconnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Connecting to Terminal Service at ${this.config.url}...`);
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('✅ Connected to Terminal Service');
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          this.connectionPromise = null;
          
          // Start heartbeat
          this.startHeartbeat();
          
          // Process queued messages
          this.processMessageQueue();
          
          // Restore sessions
          this.restoreSessions();
          
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

        this.ws.onclose = (event) => {
          console.log(`❌ Disconnected from Terminal Service (code: ${event.code})`);
          this.handleDisconnect();
          
          if (!event.wasClean) {
            reject(new Error(`WebSocket closed unexpectedly: ${event.reason || 'Unknown reason'}`));
          }
        };

        this.ws.onerror = (error) => {
          console.error('🔌 WebSocket error:', error);
          this.isReconnecting = false;
          this.connectionPromise = null;
          reject(error);
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        this.isReconnecting = false;
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage({ type: 'ping' }).catch(() => {
          console.warn('❤️ Heartbeat failed');
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleDisconnect() {
    this.ws = null;
    this.stopHeartbeat();
    this.connectionPromise = null;
    
    // Update session statuses
    this.sessions.forEach(session => {
      session.status = 'disconnected';
    });
    
    // Clear pending messages with timeout
    this.pendingMessages.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('WebSocket disconnected'));
    });
    this.pendingMessages.clear();
    
    // Schedule reconnect
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.notifyConnectionError();
      return;
    }

    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(1.5, this.reconnectAttempts),
      30000
    );
    
    this.reconnectAttempts++;
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(err => {
        console.error('Reconnection failed:', err);
      });
    }, delay);
  }

  private notifyConnectionError() {
    // Notify all handlers about connection error
    this.messageHandlers.forEach(handler => {
      handler({
        type: 'error',
        message: 'Terminal service connection lost'
      });
    });
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message).catch(err => {
          console.error('Failed to send queued message:', err);
        });
      }
    }
  }

  private async restoreSessions() {
    // Attempt to restore existing sessions
    for (const [terminalId, session] of this.sessions.entries()) {
      if (session.status === 'disconnected') {
        console.log(`🔄 Restoring session for terminal ${terminalId}`);
        try {
          await this.sendMessage({
            type: 'terminal-restore',
            terminalId,
            sessionId: session.sessionId,
            data: {
              workbranchId: session.workbranchId,
              projectId: session.projectId
            }
          });
          session.status = 'connected';
          session.reconnectAttempts = 0;
        } catch (error) {
          console.error(`Failed to restore session ${terminalId}:`, error);
          session.reconnectAttempts++;
        }
      }
    }
  }

  private handleMessage(message: WebSocketMessage) {
    // Handle heartbeat
    if (message.type === 'pong') {
      return;
    }

    // Handle response messages for pending requests
    if (message.id && this.pendingMessages.has(message.id)) {
      const pending = this.pendingMessages.get(message.id)!;
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(message.id);
      
      if (message.success === false) {
        pending.reject(new Error(message.message || 'Request failed'));
      } else {
        pending.resolve(message);
      }
      return;
    }

    // Handle terminal-specific messages
    if (message.terminalId || message.sessionId) {
      const terminalId = message.terminalId || message.sessionId;
      const handler = this.messageHandlers.get(terminalId!);
      if (handler) {
        handler(message);
      }
    }

    // Handle specific message types
    switch (message.type) {
      case 'terminal-output':
        this.handleTerminalOutput(message);
        break;

      case 'terminal-status':
        this.handleTerminalStatus(message);
        break;

      case 'terminal-error':
        this.handleTerminalError(message);
        break;

      case 'error':
        console.error('Terminal service error:', message.data || message.message);
        break;
    }
  }

  private handleTerminalOutput(message: WebSocketMessage) {
    const terminalId = message.terminalId || message.sessionId;
    if (!terminalId || !message.data) return;
    
    const handler = this.messageHandlers.get(terminalId);
    if (handler) {
      handler({
        type: 'output',
        data: message.data
      });
    }
    
    // Update session activity
    const session = this.sessions.get(terminalId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  private handleTerminalStatus(message: WebSocketMessage) {
    const terminalId = message.terminalId || message.sessionId;
    if (!terminalId) return;
    
    const session = this.sessions.get(terminalId);
    if (session) {
      session.status = message.data?.status || 'disconnected';
    }
  }

  private handleTerminalError(message: WebSocketMessage) {
    const terminalId = message.terminalId || message.sessionId;
    if (!terminalId) return;
    
    const handler = this.messageHandlers.get(terminalId);
    if (handler) {
      handler({
        type: 'error',
        message: message.message || 'Terminal error occurred'
      });
    }
    
    const session = this.sessions.get(terminalId);
    if (session) {
      session.status = 'error';
    }
  }

  private async sendMessage(message: WebSocketMessage): Promise<any> {
    if (!this.isConnected()) {
      // Queue message if not connected
      if (message.type !== 'ping') {
        this.messageQueue.push(message);
      }
      
      // Try to connect
      await this.connect();
      
      // If still not connected, reject
      if (!this.isConnected()) {
        throw new Error('WebSocket not connected');
      }
    }

    return new Promise((resolve, reject) => {
      const messageId = message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      message.id = messageId;

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        reject(new Error('Message timeout'));
      }, this.config.messageTimeout);

      // Store pending message
      this.pendingMessages.set(messageId, { resolve, reject, timeout });

      // Send message
      try {
        this.ws!.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingMessages.delete(messageId);
        reject(error);
      }
    });
  }

  // Public API

  async createTerminalSession(
    terminalId: string, 
    workbranchId: string, 
    projectId?: string
  ): Promise<string> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const session: TerminalSession = {
      sessionId,
      terminalId,
      workbranchId,
      projectId,
      status: 'connecting',
      reconnectAttempts: 0,
      lastActivity: new Date()
    };

    this.sessions.set(terminalId, session);

    try {
      await this.sendMessage({
        type: 'terminal-create',
        terminalId,
        sessionId,
        data: {
          workbranchId,
          projectId,
          shell: 'powershell',
          cwd: projectId || process.cwd()
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
        terminalId,
        sessionId: session.sessionId
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
      terminalId,
      sessionId: session.sessionId,
      command
    });
    
    session.lastActivity = new Date();
  }

  async resizeTerminal(terminalId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(terminalId);
    if (!session) return;

    try {
      await this.sendMessage({
        type: 'terminal-resize',
        terminalId,
        sessionId: session.sessionId,
        data: { cols, rows }
      });
    } catch (error) {
      console.warn(`Terminal resize failed for ${terminalId}:`, error);
    }
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

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.sessions.clear();
    this.messageHandlers.clear();
    this.pendingMessages.clear();
    this.messageQueue = [];
  }

  // Get all active sessions
  getSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  // Clean up stale sessions
  cleanupStaleSessions(maxIdleTime: number = 3600000) { // 1 hour default
    const now = new Date();
    this.sessions.forEach((session, terminalId) => {
      if (now.getTime() - session.lastActivity.getTime() > maxIdleTime) {
        console.log(`🧹 Cleaning up stale session: ${terminalId}`);
        this.destroyTerminalSession(terminalId);
      }
    });
  }
}

// Export singleton instance
export const terminalWebSocketService = new TerminalWebSocketService();