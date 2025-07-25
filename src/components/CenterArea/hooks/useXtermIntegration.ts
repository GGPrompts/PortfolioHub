import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { TerminalInstance, TerminalDimensions } from '../types';
import { terminalWebSocketService } from '../../../services/terminalWebSocketService';

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
  const lastDimensionsRef = useRef<{ cols: number; rows: number }>({ cols: 0, rows: 0 });

  // Initialize terminal when DOM element is available
  useEffect(() => {
    if (!terminalRef.current || isInitialized || terminalInstance.terminal) return;

    // Wait for DOM element to have proper dimensions
    const containerRect = terminalRef.current.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) {
      console.log('⏳ Terminal container not ready, delaying initialization...');
      // Retry after a short delay
      setTimeout(() => {
        if (terminalRef.current && !isInitialized && !terminalInstance.terminal) {
          const retryRect = terminalRef.current.getBoundingClientRect();
          if (retryRect.width > 0 && retryRect.height > 0) {
            console.log('🔄 Retrying terminal initialization...');
            // Trigger re-render by updating a dummy state
            setConnectionStatus(prev => prev);
          }
        }
      }, 100);
      return;
    }

    try {
      // Create the terminal with safe dimensions
      const safeCols = Math.max((dimensions?.cols || 80), 10);
      const safeRows = Math.max((dimensions?.rows || 24), 5);
      
      console.log(`🖥️ Initializing terminal ${terminalInstance.id} with dimensions: ${safeCols}x${safeRows}`);
      
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
        cols: safeCols,
        rows: safeRows
      });

      // Store the terminal instance and protect it from being cleared
      terminalInstance.terminal = terminal;
      
      // Override the clear method to prevent accidental clearing
      const originalClear = terminal.clear.bind(terminal);
      terminal.clear = () => {
        console.warn(`🚫 Terminal ${terminalInstance.id} clear() blocked to preserve content`);
        // Don't actually clear - just log the attempt
      };
      
      // Store original clear method in case we need it later
      (terminal as any)._originalClear = originalClear;
      
      // Monitor all write operations to see what's happening
      const originalWrite = terminal.write.bind(terminal);
      terminal.write = (data: string | Uint8Array) => {
        console.log(`📝 Terminal ${terminalInstance.id} write:`, typeof data === 'string' ? JSON.stringify(data) : 'Uint8Array');
        return originalWrite(data);
      };
      
      const originalWriteln = terminal.writeln.bind(terminal);
      terminal.writeln = (data: string | Uint8Array) => {
        console.log(`📝 Terminal ${terminalInstance.id} writeln:`, typeof data === 'string' ? JSON.stringify(data) : 'Uint8Array');
        return originalWriteln(data);
      };
      
      // Monitor reset and other potentially clearing operations
      const originalReset = terminal.reset.bind(terminal);
      terminal.reset = () => {
        console.warn(`🔄 Terminal ${terminalInstance.id} reset() called - this will clear content!`);
        return originalReset();
      };
      
      // Monitor refresh calls too
      const originalRefresh = terminal.refresh.bind(terminal);
      terminal.refresh = (start?: number, end?: number) => {
        console.log(`🔄 Terminal ${terminalInstance.id} refresh(${start}, ${end}) called`);
        return originalRefresh(start, end);
      };

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
        container.style.minWidth = '300px';
        container.style.minHeight = '200px';
      }

      // Ensure container is properly sized before opening terminal
      container.style.width = container.offsetWidth > 0 ? `${container.offsetWidth}px` : '800px';
      container.style.height = container.offsetHeight > 0 ? `${container.offsetHeight}px` : '400px';
      container.style.position = 'relative';
      container.style.display = 'block';
      
      // Open terminal in DOM with error handling
      try {
        console.log(`🎨 Opening terminal ${terminalInstance.id} in container:`, {
          width: container.offsetWidth,
          height: container.offsetHeight,
          display: getComputedStyle(container).display,
          position: getComputedStyle(container).position
        });
        
        terminal.open(container);
        
        // Force canvas creation by ensuring DOM is ready
        setTimeout(() => {
          const canvasElements = container.querySelectorAll('canvas');
          console.log(`🎨 After open - Terminal ${terminalInstance.id} canvas elements:`, canvasElements.length);
          if (canvasElements.length === 0) {
            console.warn(`⚠️ No canvas created for terminal ${terminalInstance.id}, forcing re-render`);
            // Force refresh to create canvas
            terminal.refresh(0, terminal.rows - 1);
          }
        }, 50);
        
      } catch (error) {
        console.error('Failed to open terminal:', error);
        // Retry with explicit dimensions
        container.style.width = '800px';
        container.style.height = '400px';
        terminal.open(container);
      }
      
      // Wait for DOM to settle and ensure terminal is properly sized
      setTimeout(() => {
        if (fitAddon && terminalRef.current && terminal) {
          try {
            // Double-check dimensions exist before fitting
            if (container.offsetWidth > 0 && container.offsetHeight > 0) {
              // Ensure canvas exists before fitting
              const canvasElements = container.querySelectorAll('canvas');
              console.log(`🎨 Before fit - Terminal ${terminalInstance.id} canvas elements:`, canvasElements.length);
              
              if (canvasElements.length > 0) {
                fitAddon.fit();
                console.log(`📐 Terminal ${terminalInstance.id} fitted with dimensions:`, {
                  containerWidth: container.offsetWidth,
                  containerHeight: container.offsetHeight,
                  terminalCols: terminal.cols,
                  terminalRows: terminal.rows
                });
                
                // Force a refresh of the terminal content
                terminal.refresh(0, terminal.rows - 1);
              } else {
                console.warn(`⚠️ No canvas elements found for terminal ${terminalInstance.id}, skipping fit`);
                // Try to force canvas creation
                terminal.refresh(0, terminal.rows - 1);
                
                // Retry fit after canvas creation
                setTimeout(() => {
                  const retryCanvas = container.querySelectorAll('canvas');
                  if (retryCanvas.length > 0) {
                    fitAddon.fit();
                    console.log(`🔄 Retry fit successful for terminal ${terminalInstance.id}`);
                  }
                }, 100);
              }
            } else {
              console.warn(`⚠️ Container still has zero dimensions for terminal ${terminalInstance.id}`);
            }
          } catch (error) {
            console.warn('FitAddon fit failed:', error);
          }
        }
      }, 200); // Increased timeout to allow more time for canvas creation

      // Store element reference
      terminalInstance.element = terminalRef.current;

      // Setup terminal event handlers
      setupTerminalEventHandlers(terminal, terminalInstance.id, onStatusChange);

      // Initial terminal content with explicit formatting (no clear screen)
      console.log(`🖥️ Writing initial content to terminal ${terminalInstance.id}`);
      
      // Add content after a delay to ensure terminal is fully rendered
      setTimeout(() => {
        try {
          console.log(`🖥️ Writing initial content to terminal ${terminalInstance.id} - Step 1`);
          terminal.writeln('\x1b[32m🚀 Terminal initialized!\x1b[0m');
          console.log(`🖥️ Writing initial content to terminal ${terminalInstance.id} - Step 2`);
          terminal.writeln(`\x1b[36m📊 Terminal ID: ${terminalInstance.id}\x1b[0m`);
          console.log(`🖥️ Writing initial content to terminal ${terminalInstance.id} - Step 3`);
          terminal.writeln(`\x1b[33m🌿 Workbranch: ${terminalInstance.workbranchId}\x1b[0m`);
          if (terminalInstance.projectId) {
            console.log(`🖥️ Writing initial content to terminal ${terminalInstance.id} - Step 4`);
            terminal.writeln(`\x1b[35m📁 Project: ${terminalInstance.projectId}\x1b[0m`);
          }
          console.log(`🖥️ Writing initial content to terminal ${terminalInstance.id} - Step 5`);
          terminal.writeln('\x1b[34mConnecting to VS Code...\x1b[0m');
          console.log(`🖥️ Writing initial content to terminal ${terminalInstance.id} - Step 6`);
          terminal.write('\x1b[37m$ \x1b[0m'); // Show cursor prompt
          console.log(`✅ Initial content written to terminal ${terminalInstance.id} - ALL STEPS COMPLETE`);
          
          // Force refresh to ensure content is visible
          terminal.refresh(0, terminal.rows - 1);
          console.log(`🔄 Terminal ${terminalInstance.id} content refreshed`);
          
          // Check if content is actually there
          setTimeout(() => {
            console.log(`🔍 Terminal ${terminalInstance.id} content check:`, {
              rows: terminal.rows,
              cols: terminal.cols,
              bufferLength: terminal.buffer?.active?.length || 'unknown'
            });
          }, 100);
        } catch (error) {
          console.error(`❌ Failed to write initial content to terminal ${terminalInstance.id}:`, error);
        }
      }, 500); // Increased delay to ensure terminal is fully rendered

      // Set up terminal data handler to send to VS Code
      terminal.onData((data) => {
        // Send keystrokes to VS Code terminal
        if (serviceConnectionRef.current.connected) {
          terminalWebSocketService.sendData(terminalInstance.id, data)
            .catch(err => console.error('Failed to send data to VS Code:', err));
        } else {
          // Fallback to local echo if not connected
          if (data === '\r') {
            terminal.write('\r\n$ ');
          } else if (data === '\u007F') { // Backspace
            terminal.write('\b \b');
          } else {
            terminal.write(data);
          }
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
    if (!isInitialized || !fitAddonRef.current || !terminalInstance.terminal) return;

    try {
      // Ensure we have valid dimensions
      if (!dimensions || dimensions.cols <= 0 || dimensions.rows <= 0) {
        console.warn(`⚠️ Invalid dimensions for terminal ${terminalInstance.id}:`, dimensions);
        return;
      }

      // Resize terminal to fit new dimensions
      fitAddonRef.current.fit();
      
      // Update terminal dimensions with safe values
      const terminal = terminalInstance.terminal;
      const safeCols = Math.max(dimensions.cols, 10);
      const safeRows = Math.max(dimensions.rows, 5);
      
      // Only resize if dimensions actually changed
      if (terminal.rows !== safeRows || terminal.cols !== safeCols) {
        terminal.resize(safeCols, safeRows);
        console.log(`📏 Terminal ${terminalInstance.id} resized to ${safeCols}x${safeRows}`);
      }
    } catch (error) {
      console.error(`❌ Failed to resize terminal ${terminalInstance.id}:`, error);
    }
  }, [dimensions, isInitialized, terminalInstance]);

  // Setup WebSocket connection for terminal service
  const connectToTerminalService = useCallback(async () => {
    console.log(`🔗 connectToTerminalService called for ${terminalInstance.id}:`, {
      alreadyConnected: serviceConnectionRef.current.connected,
      hasWorkbranchId: !!terminalInstance.workbranchId,
      workbranchId: terminalInstance.workbranchId,
      connectionStatus: connectionStatus
    });
    
    if (serviceConnectionRef.current.connected || !terminalInstance.workbranchId) {
      console.log(`🔗 Skipping connection for ${terminalInstance.id}: already connected or no workbranchId`);
      return;
    }
    
    // Prevent multiple simultaneous connection attempts
    if (connectionStatus === 'connecting') {
      console.log(`🔗 Skipping connection for ${terminalInstance.id}: already connecting`);
      return;
    }

    console.log(`🔗 Starting connection process for ${terminalInstance.id}...`);
    setConnectionStatus('connecting');
    
    try {
      // Create terminal session via WebSocket service
      await terminalWebSocketService.createTerminalSession(
        terminalInstance.id,
        terminalInstance.workbranchId,
        terminalInstance.projectId
      );

      // Register message handler for this terminal - will be re-registered with session ID later
      terminalWebSocketService.registerTerminalHandler(terminalInstance.id, (message) => {
        console.log(`📺 Handler received message for ${terminalInstance.id}:`, message);
        if (message.type === 'output' && message.data && terminalInstance.terminal) {
          // Extract the actual output text from the data
          const outputText = message.data.output || message.data;
          console.log(`📺 Writing to terminal ${terminalInstance.id}:`, JSON.stringify(outputText));
          console.log(`📺 Terminal instance state:`, {
            terminalExists: !!terminalInstance.terminal,
            terminalId: terminalInstance.id,
            isInitialized: terminalInstance.terminal?._initialized
          });
          
          try {
            terminalInstance.terminal.write(outputText);
            console.log(`✅ Successfully wrote to terminal ${terminalInstance.id}`);
          } catch (error) {
            console.error(`❌ Failed to write to terminal ${terminalInstance.id}:`, error);
          }
        } else {
          console.log(`📺 Handler for ${terminalInstance.id} - no output to process:`, {
            messageType: message.type,
            hasData: !!message.data,
            hasTerminal: !!terminalInstance.terminal
          });
        }
      });

      serviceConnectionRef.current.connected = true;
      setConnectionStatus('connected');
      onStatusChange?.(terminalInstance.id, 'running');
      
      // Update terminal to show connection status (after delay to not interfere with initial content)
      setTimeout(() => {
        if (terminalInstance.terminal) {
          console.log(`🔗 Adding connection status to terminal ${terminalInstance.id}`);
          terminalInstance.terminal.writeln('✅ Connected to VS Code via Environment Bridge');
          terminalInstance.terminal.writeln('💡 Commands execute in VS Code and show status here');
          terminalInstance.terminal.write('$ ');
          console.log(`🔗 Connection status added to terminal ${terminalInstance.id}`);
        }
      }, 3000); // Increased delay to ensure initial content is visible first

    } catch (error) {
      console.error(`❌ Failed to connect terminal ${terminalInstance.id} to service:`, error);
      setConnectionStatus('error');
      onStatusChange?.(terminalInstance.id, 'error');
      
      setTimeout(() => {
        if (terminalInstance.terminal) {
          terminalInstance.terminal.writeln('❌ Failed to connect to VS Code extension');
          terminalInstance.terminal.writeln('💡 Start VS Code with Claude Portfolio extension to enable real terminals');
          terminalInstance.terminal.writeln('For now, running in demo mode...');
          terminalInstance.terminal.write('$ ');
          
          // Add a demo command to show it's working
          setTimeout(() => {
            terminalInstance.terminal?.writeln('echo "VS Code extension needed for real terminal functionality"');
            terminalInstance.terminal?.writeln('VS Code extension needed for real terminal functionality');
            terminalInstance.terminal?.write('$ ');
          }, 1000);
        }
      }, 500); // Delay to avoid interfering with initial content
    }
  }, [terminalInstance, onStatusChange, connectionStatus]);

  // Disconnect from terminal service
  const disconnectFromTerminalService = useCallback(async () => {
    if (serviceConnectionRef.current.connected) {
      try {
        await terminalWebSocketService.destroyTerminalSession(terminalInstance.id);
      } catch (error) {
        console.error('Failed to destroy terminal session:', error);
      }
      serviceConnectionRef.current.connected = false;
    }
    setConnectionStatus('disconnected');
  }, [terminalInstance.id]);

  // Send command to terminal
  const sendCommand = useCallback(async (command: string) => {
    if (!serviceConnectionRef.current.connected) {
      console.warn(`Terminal ${terminalInstance.id} not connected - cannot send command`);
      
      // Fallback: write command locally
      if (terminalInstance.terminal) {
        terminalInstance.terminal.write(`\r\n$ ${command}\r\n`);
        terminalInstance.terminal.write('⚠️  Not connected to VS Code - command not executed\r\n$ ');
      }
      return false;
    }

    try {
      await terminalWebSocketService.sendCommand(terminalInstance.id, command);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send command to terminal ${terminalInstance.id}:`, error);
      return false;
    }
  }, [terminalInstance]);

  // Auto-connect when terminal is initialized (with delay to preserve initial content)
  useEffect(() => {
    console.log(`🔗 Auto-connect check for ${terminalInstance.id}:`, {
      isInitialized,
      alreadyConnected: serviceConnectionRef.current.connected,
      willConnect: isInitialized && !serviceConnectionRef.current.connected
    });
    
    if (isInitialized && !serviceConnectionRef.current.connected) {
      console.log(`🔗 Starting connection for ${terminalInstance.id}...`);
      // Delay connection to allow initial content to be displayed first
      setTimeout(() => {
        connectToTerminalService();
      }, 2000); // 2 second delay to ensure initial content is visible
    }
  }, [isInitialized, connectToTerminalService]);

  // Handle terminal resize with terminal service integration (debounced and optimized)
  useEffect(() => {
    if (!isInitialized || !serviceConnectionRef.current.connected) return;

    const safeCols = dimensions?.cols || 80;
    const safeRows = dimensions?.rows || 24;
    
    // Only resize if dimensions actually changed significantly (avoid spam)
    const lastDimensions = lastDimensionsRef.current;
    const colsChanged = Math.abs(lastDimensions.cols - safeCols) > 5;  // Increased threshold
    const rowsChanged = Math.abs(lastDimensions.rows - safeRows) > 3;  // Increased threshold
    
    if (!colsChanged && !rowsChanged) {
      console.log(`📏 Skipping resize for ${terminalInstance.id}: dimensions haven't changed significantly (${lastDimensions.cols}x${lastDimensions.rows} vs ${safeCols}x${safeRows})`);
      return;
    }
    
    // Update our tracking
    lastDimensionsRef.current = { cols: safeCols, rows: safeRows };
    
    // Debounce resize calls to avoid spam
    const resizeTimer = setTimeout(() => {
      console.log(`📏 Triggering resize for ${terminalInstance.id}: ${lastDimensions.cols}x${lastDimensions.rows} → ${safeCols}x${safeRows}`);
      
      // Non-blocking resize - don't let resize failures break the terminal
      terminalWebSocketService.resizeTerminal(terminalInstance.id, safeCols, safeRows)
        .catch(err => {
          console.warn(`⚠️ Terminal resize failed for ${terminalInstance.id}, continuing anyway:`, err.message);
          // Don't throw - resize failures are not critical
        });
    }, 500); // Further increased debounce to reduce spam and allow text rendering

    return () => clearTimeout(resizeTimer);
  }, [dimensions, isInitialized, terminalInstance.id]);

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