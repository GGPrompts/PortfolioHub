import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { TerminalInstance, TerminalDimensions } from '../types';

// Terminal service interface for WebSocket communication
interface TerminalServiceConnection {
  websocket: WebSocket | null;
  connected: boolean;
  lastPing: number;
  reconnectAttempts: number;
}

// Configuration for terminal WebSocket connections
const WEBSOCKET_CONFIG = {
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  pingInterval: 30000,
  connectionTimeout: 5000
};

// Default terminal options
const DEFAULT_TERMINAL_OPTIONS = {
  cursorBlink: true,
  cursorStyle: 'bar' as const,
  convertEol: true,
  rightClickSelectsWord: true,
  allowTransparency: false,
  allowProposedApi: true,
  scrollback: 10000,
  screenReaderMode: false,
  macOptionIsMeta: true,
  macOptionClickForcesSelection: false
};

/**
 * Hook for managing xterm.js integration with React components
 * Handles terminal lifecycle, WebSocket connections, and DOM integration
 */
export function useXtermIntegration(
  terminalInstance: TerminalInstance,
  dimensions: TerminalDimensions,
  onStatusChange?: (terminalId: string, status: TerminalInstance['status']) => void
) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const webLinksAddonRef = useRef<WebLinksAddon | null>(null);
  const serviceConnectionRef = useRef<TerminalServiceConnection>({
    websocket: null,
    connected: false,
    lastPing: Date.now(),
    reconnectAttempts: 0
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  // Initialize terminal when DOM element is available
  useEffect(() => {
    if (!terminalRef.current || isInitialized || terminalInstance.terminal) return;

    try {
      // Create the terminal with dimensions from the start
      const terminal = new Terminal({
        theme: {
          background: '#0f0f0f',
          foreground: '#ffffff',
          cursor: '#ffffff',
          selection: 'rgba(255, 255, 255, 0.3)',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5'
        },
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: 14,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: 'bar',
        allowTransparency: false,
        convertEol: true,
        rightClickSelectsWord: true,
        allowProposedApi: true,
        cols: dimensions.cols || 80,
        rows: dimensions.rows || 24
      });

      // Store the terminal instance
      terminalInstance.terminal = terminal;

      // Initialize addons
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      
      fitAddonRef.current = fitAddon;
      webLinksAddonRef.current = webLinksAddon;

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);

      // Ensure the container has dimensions before opening
      const container = terminalRef.current;
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        // Set minimum dimensions if container is not properly sized
        container.style.width = '800px';
        container.style.height = '600px';
      }

      // Open terminal in DOM
      terminal.open(container);
      
      // Wait a moment for DOM to settle, then fit
      setTimeout(() => {
        if (fitAddon && terminalRef.current) {
          try {
            fitAddon.fit();
          } catch (error) {
            console.warn('FitAddon fit failed:', error);
          }
        }
      }, 50);

      // Store element reference
      terminalInstance.element = terminalRef.current;

      // Setup terminal event handlers
      setupTerminalEventHandlers(terminal, terminalInstance.id, onStatusChange);

      // Add mock terminal content for testing
      terminal.writeln('🚀 Terminal initialized!');
      terminal.writeln(`📊 Terminal ID: ${terminalInstance.id}`);
      terminal.writeln(`🌿 Workbranch: ${terminalInstance.workbranchId}`);
      if (terminalInstance.projectId) {
        terminal.writeln(`📁 Project: ${terminalInstance.projectId}`);
      }
      terminal.writeln('WebSocket connection pending...');
      terminal.write('$ ');

      // Set up mock echo functionality for testing
      terminal.onData((data) => {
        if (data === '\r') {
          terminal.write('\r\n$ ');
        } else if (data === '\u007F') { // Backspace
          terminal.write('\b \b');
        } else {
          terminal.write(data);
        }
      });

      setIsInitialized(true);
      console.log(`✅ Terminal ${terminalInstance.id} initialized successfully`);

    } catch (error) {
      console.error(`❌ Failed to initialize terminal ${terminalInstance.id}:`, error);
      onStatusChange?.(terminalInstance.id, 'error');
    }
  }, [terminalInstance, isInitialized, onStatusChange]);

  // Handle dimension changes and terminal fitting
  useEffect(() => {
    if (!isInitialized || !fitAddonRef.current) return;

    try {
      // Resize terminal to fit new dimensions
      fitAddonRef.current.fit();
      
      // Update terminal dimensions
      const terminal = terminalInstance.terminal;
      if (terminal.rows !== dimensions.rows || terminal.cols !== dimensions.cols) {
        terminal.resize(dimensions.cols, dimensions.rows);
      }

      console.log(`📏 Terminal ${terminalInstance.id} resized to ${dimensions.cols}x${dimensions.rows}`);
    } catch (error) {
      console.error(`❌ Failed to resize terminal ${terminalInstance.id}:`, error);
    }
  }, [dimensions, isInitialized, terminalInstance]);

  // Setup WebSocket connection for terminal service
  const connectToTerminalService = useCallback(async () => {
    if (serviceConnectionRef.current.connected || !terminalInstance.workbranchId) return;

    setConnectionStatus('connecting');
    
    try {
      // Create WebSocket connection to terminal service
      const wsUrl = `ws://localhost:8002/terminal/${terminalInstance.workbranchId}/${terminalInstance.id}`;
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log(`🔌 Terminal ${terminalInstance.id} connected to service`);
        serviceConnectionRef.current.websocket = websocket;
        serviceConnectionRef.current.connected = true;
        serviceConnectionRef.current.reconnectAttempts = 0;
        setConnectionStatus('connected');
        onStatusChange?.(terminalInstance.id, 'running');
        
        // Send initial terminal setup
        websocket.send(JSON.stringify({
          type: 'init',
          terminalId: terminalInstance.id,
          workbranchId: terminalInstance.workbranchId,
          projectId: terminalInstance.projectId,
          dimensions: {
            rows: dimensions.rows,
            cols: dimensions.cols
          }
        }));
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleTerminalServiceMessage(message, terminalInstance.terminal);
        } catch (error) {
          console.error(`❌ Failed to parse terminal service message:`, error);
        }
      };

      websocket.onclose = (event) => {
        console.log(`🔌 Terminal ${terminalInstance.id} disconnected from service`);
        serviceConnectionRef.current.connected = false;
        serviceConnectionRef.current.websocket = null;
        setConnectionStatus('disconnected');
        onStatusChange?.(terminalInstance.id, 'idle');
        
        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && serviceConnectionRef.current.reconnectAttempts < WEBSOCKET_CONFIG.maxReconnectAttempts) {
          setTimeout(() => {
            serviceConnectionRef.current.reconnectAttempts++;
            connectToTerminalService();
          }, WEBSOCKET_CONFIG.reconnectDelay * serviceConnectionRef.current.reconnectAttempts);
        }
      };

      websocket.onerror = (error) => {
        console.error(`❌ Terminal ${terminalInstance.id} WebSocket error:`, error);
        setConnectionStatus('error');
        onStatusChange?.(terminalInstance.id, 'error');
      };

      // Set connection timeout
      setTimeout(() => {
        if (websocket.readyState === WebSocket.CONNECTING) {
          websocket.close();
          setConnectionStatus('error');
          onStatusChange?.(terminalInstance.id, 'error');
        }
      }, WEBSOCKET_CONFIG.connectionTimeout);

    } catch (error) {
      console.error(`❌ Failed to connect terminal ${terminalInstance.id} to service:`, error);
      setConnectionStatus('error');
      onStatusChange?.(terminalInstance.id, 'error');
    }
  }, [terminalInstance, dimensions, onStatusChange]);

  // Disconnect from terminal service
  const disconnectFromTerminalService = useCallback(() => {
    const connection = serviceConnectionRef.current;
    if (connection.websocket) {
      connection.websocket.close(1000); // Normal closure
      connection.websocket = null;
      connection.connected = false;
    }
    setConnectionStatus('disconnected');
  }, []);

  // Send command to terminal
  const sendCommand = useCallback((command: string) => {
    const connection = serviceConnectionRef.current;
    if (!connection.connected || !connection.websocket) {
      console.warn(`Terminal ${terminalInstance.id} not connected - cannot send command`);
      return false;
    }

    try {
      connection.websocket.send(JSON.stringify({
        type: 'command',
        data: command
      }));
      return true;
    } catch (error) {
      console.error(`❌ Failed to send command to terminal ${terminalInstance.id}:`, error);
      return false;
    }
  }, [terminalInstance.id]);

  // Auto-connect when terminal is initialized (disabled for mock mode)
  useEffect(() => {
    if (isInitialized && !serviceConnectionRef.current.connected) {
      // Temporarily disabled for testing - enable when backend is ready
      // connectToTerminalService();
      console.log('📡 WebSocket connection disabled for mock mode');
      setConnectionStatus('connected'); // Mock connected state
      onStatusChange?.(terminalInstance.id, 'running');
    }
  }, [isInitialized, connectToTerminalService, terminalInstance.id, onStatusChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromTerminalService();
      
      // Dispose terminal and addons
      if (terminalInstance.terminal) {
        terminalInstance.terminal.dispose();
      }
      
      fitAddonRef.current = null;
      webLinksAddonRef.current = null;
    };
  }, [disconnectFromTerminalService, terminalInstance.terminal]);

  return {
    terminalRef,
    isInitialized,
    connectionStatus,
    connectToService: connectToTerminalService,
    disconnectFromService: disconnectFromTerminalService,
    sendCommand,
    isConnected: connectionStatus === 'connected'
  };
}

// Setup terminal event handlers
function setupTerminalEventHandlers(
  terminal: Terminal,
  terminalId: string,
  onStatusChange?: (terminalId: string, status: TerminalInstance['status']) => void
) {
  // Handle data input from user
  terminal.onData((data) => {
    // Echo data back to terminal for local display
    // In a real implementation, this would be sent to the backend
    console.log(`📝 Terminal ${terminalId} input:`, data);
  });

  // Handle terminal resize
  terminal.onResize(({ cols, rows }) => {
    console.log(`📏 Terminal ${terminalId} resized to ${cols}x${rows}`);
  });

  // Handle selection changes
  terminal.onSelectionChange(() => {
    const selection = terminal.getSelection();
    if (selection) {
      console.log(`📋 Terminal ${terminalId} selection:`, selection);
    }
  });

  // Handle title changes
  terminal.onTitleChange((title) => {
    console.log(`📝 Terminal ${terminalId} title changed to:`, title);
  });
}

// Handle messages from terminal service
function handleTerminalServiceMessage(message: any, terminal: Terminal) {
  switch (message.type) {
    case 'output':
      // Write output to terminal
      terminal.write(message.data);
      break;
      
    case 'clear':
      // Clear terminal
      terminal.clear();
      break;
      
    case 'resize':
      // Resize terminal
      if (message.rows && message.cols) {
        terminal.resize(message.cols, message.rows);
      }
      break;
      
    case 'title':
      // Set terminal title
      if (message.title) {
        terminal.setOption('title', message.title);
      }
      break;
      
    case 'error':
      // Handle error messages
      terminal.write(`\r\n❌ Error: ${message.message}\r\n`);
      break;

    case 'connected':
      // Terminal service connection established
      terminal.write(`\r\n✅ Connected to terminal service\r\n`);
      break;

    case 'status':
      // Status update from terminal service
      console.log('Terminal service status:', message);
      break;
      
    default:
      // Only warn for actual unknown types, ignore undefined/empty messages
      if (message.type && message.type !== 'undefined') {
        console.warn('Unknown terminal service message type:', message.type);
      }
  }
}