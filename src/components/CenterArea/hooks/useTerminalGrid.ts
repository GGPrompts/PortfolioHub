import React, { useState, useCallback, useEffect, useRef, useReducer } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { 
  TerminalInstance, 
  TerminalGridLayout, 
  TerminalDimensions,
  GridPosition,
  CenterAreaState,
  CenterAreaAction
} from '../types';

// Default terminal theme
const DEFAULT_THEME = {
  background: '#0d1117',
  foreground: '#c9d1d9',
  cursor: '#58a6ff',
  selection: '#264f78',
  fontFamily: 'Cascadia Code, Consolas, Monaco, monospace',
  fontSize: 14,
  lineHeight: 1.2
};

// Layout configurations for different grid layouts
const LAYOUT_CONFIGS = {
  single: { rows: 1, cols: 1, positions: [{ row: 0, col: 0, rowSpan: 1, colSpan: 1 }] },
  split: { rows: 1, cols: 2, positions: [
    { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
    { row: 0, col: 1, rowSpan: 1, colSpan: 1 }
  ]},
  triple: { rows: 2, cols: 2, positions: [
    { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
    { row: 0, col: 1, rowSpan: 1, colSpan: 1 },
    { row: 1, col: 0, rowSpan: 1, colSpan: 2 }
  ]},
  quad: { rows: 2, cols: 2, positions: [
    { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
    { row: 0, col: 1, rowSpan: 1, colSpan: 1 },
    { row: 1, col: 0, rowSpan: 1, colSpan: 1 },
    { row: 1, col: 1, rowSpan: 1, colSpan: 1 }
  ]},
  vertical: { rows: 1, cols: 4, positions: [
    { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
    { row: 0, col: 1, rowSpan: 1, colSpan: 1 },
    { row: 0, col: 2, rowSpan: 1, colSpan: 1 },
    { row: 0, col: 3, rowSpan: 1, colSpan: 1 }
  ]},
  custom: { rows: 2, cols: 3, positions: [] } // Dynamically configured
};

// Reducer for managing center area state
function centerAreaReducer(state: CenterAreaState, action: CenterAreaAction): CenterAreaState {
  switch (action.type) {
    case 'ADD_TERMINAL': {
      const newTerminal = createTerminalInstance(action.payload.workbranchId, action.payload.projectId);
      return {
        ...state,
        terminals: [...state.terminals, newTerminal]
      };
    }
    
    case 'REMOVE_TERMINAL': {
      const terminals = state.terminals.filter(t => t.id !== action.payload.terminalId);
      const selectedTerminals = new Set(state.selectedTerminals);
      selectedTerminals.delete(action.payload.terminalId);
      return {
        ...state,
        terminals,
        selectedTerminals
      };
    }
    
    case 'SELECT_TERMINAL': {
      const selectedTerminals = new Set(state.selectedTerminals);
      if (action.payload.selected) {
        selectedTerminals.add(action.payload.terminalId);
      } else {
        selectedTerminals.delete(action.payload.terminalId);
      }
      
      // Update terminal selection state
      const terminals = state.terminals.map(t => 
        t.id === action.payload.terminalId 
          ? { ...t, selected: action.payload.selected }
          : t
      );
      
      return {
        ...state,
        terminals,
        selectedTerminals
      };
    }
    
    case 'SELECT_ALL_TERMINALS': {
      const selectedTerminals = new Set(state.terminals.map(t => t.id));
      const terminals = state.terminals.map(t => ({ ...t, selected: true }));
      return {
        ...state,
        terminals,
        selectedTerminals
      };
    }
    
    case 'DESELECT_ALL_TERMINALS': {
      const terminals = state.terminals.map(t => ({ ...t, selected: false }));
      return {
        ...state,
        terminals,
        selectedTerminals: new Set()
      };
    }
    
    case 'SET_LAYOUT': {
      return {
        ...state,
        layout: action.payload.layout
      };
    }
    
    case 'SEND_MESSAGE': {
      const newMessage = {
        id: `msg-${Date.now()}`,
        content: action.payload.content,
        timestamp: new Date(),
        targets: action.payload.targets,
        source: 'user' as const,
        status: 'sending' as const
      };
      
      return {
        ...state,
        chatHistory: [...state.chatHistory, newMessage],
        messageInput: ''
      };
    }
    
    case 'TOGGLE_CHAT': {
      return {
        ...state,
        chatEnabled: action.payload.enabled,
        showChat: action.payload.enabled
      };
    }
    
    case 'UPDATE_TERMINAL_STATUS': {
      const terminals = state.terminals.map(t => 
        t.id === action.payload.terminalId 
          ? { ...t, status: action.payload.status, lastActivity: new Date() }
          : t
      );
      return {
        ...state,
        terminals
      };
    }
    
    case 'RESIZE_GRID': {
      return {
        ...state,
        gridDimensions: action.payload.dimensions
      };
    }
    
    default:
      return state;
  }
}

// Helper function to create terminal instances
function createTerminalInstance(workbranchId: string, projectId?: string): TerminalInstance {
  // Don't create the terminal here - will be created when DOM is ready
  return {
    id: `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: projectId ? `${projectId} Terminal` : `Terminal ${workbranchId}`,
    terminal: null as any, // Will be created when DOM is ready
    workbranchId,
    projectId,
    selected: false,
    status: 'idle',
    lastActivity: new Date()
  };
}

// Main hook for terminal grid management
export function useTerminalGrid(initialLayout: TerminalGridLayout = 'single', maxTerminals: number = 8) {
  // Initialize state using useReducer instead of useState for complex state management
  const [state, dispatch] = useReducer(centerAreaReducer, {
    layout: initialLayout,
    terminals: [],
    selectedTerminals: new Set(),
    chatEnabled: true,
    messageInput: '',
    chatHistory: [],
    isResizing: false,
    showChat: true,
    gridDimensions: { width: 0, height: 0, rows: 24, cols: 80 },
    theme: DEFAULT_THEME,
    shortcuts: [],
    selectionPresets: [
      {
        id: 'all',
        name: 'All',
        description: 'Select all terminals',
        terminalFilter: () => true,
        icon: 'selectAll'
      },
      {
        id: 'projects',
        name: 'Projects',
        description: 'Select project terminals only',
        terminalFilter: (terminal) => !!terminal.projectId,
        icon: 'folder'
      },
      {
        id: 'tools',
        name: 'Tools',
        description: 'Select utility terminals',
        terminalFilter: (terminal) => !terminal.projectId,
        icon: 'settings'
      },
      {
        id: 'running',
        name: 'Running',
        description: 'Select active terminals',
        terminalFilter: (terminal) => terminal.status === 'running',
        icon: 'play'
      }
    ]
  });

  const gridRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Dispatch wrapper for actions
  const dispatchAction = useCallback((action: CenterAreaAction) => {
    dispatch(action);
  }, []);

  // Terminal management functions
  const addTerminal = useCallback((workbranchId: string, projectId?: string) => {
    if (state.terminals.length >= maxTerminals) {
      console.warn(`Maximum terminals (${maxTerminals}) reached`);
      return;
    }
    
    dispatchAction({ 
      type: 'ADD_TERMINAL', 
      payload: { workbranchId, projectId } 
    });
  }, [state.terminals.length, maxTerminals, dispatchAction]);

  const removeTerminal = useCallback((terminalId: string) => {
    const terminal = state.terminals.find(t => t.id === terminalId);
    if (terminal) {
      // Clean up terminal resources
      if (terminal.terminal) {
        terminal.terminal.dispose();
      }
      if (terminal.websocket) {
        terminal.websocket.close();
      }
    }
    
    dispatchAction({ 
      type: 'REMOVE_TERMINAL', 
      payload: { terminalId } 
    });
  }, [state.terminals, dispatchAction]);

  const selectTerminal = useCallback((terminalId: string, selected: boolean) => {
    dispatchAction({
      type: 'SELECT_TERMINAL',
      payload: { terminalId, selected }
    });
  }, [dispatchAction]);

  const selectAllTerminals = useCallback(() => {
    dispatchAction({ type: 'SELECT_ALL_TERMINALS' });
  }, [dispatchAction]);

  const deselectAllTerminals = useCallback(() => {
    dispatchAction({ type: 'DESELECT_ALL_TERMINALS' });
  }, [dispatchAction]);

  const selectByPreset = useCallback((presetId: string) => {
    const preset = state.selectionPresets.find(p => p.id === presetId);
    if (!preset) return;

    // First deselect all
    deselectAllTerminals();

    // Then select matching terminals
    const matchingTerminals = state.terminals.filter(preset.terminalFilter);
    matchingTerminals.forEach(terminal => {
      selectTerminal(terminal.id, true);
    });
  }, [state.selectionPresets, state.terminals, deselectAllTerminals, selectTerminal]);

  const setLayout = useCallback((layout: TerminalGridLayout) => {
    dispatchAction({
      type: 'SET_LAYOUT',
      payload: { layout }
    });
  }, [dispatchAction]);

  const sendMessage = useCallback((content: string, targets?: string[]) => {
    const messageTargets = targets || Array.from(state.selectedTerminals);
    console.log('🎯 Sending command to terminals:', { command: content, targets: messageTargets.length });
    
    if (messageTargets.length === 0) {
      console.warn('❌ No terminals selected for message');
      return;
    }

    dispatchAction({
      type: 'SEND_MESSAGE',
      payload: { content, targets: messageTargets }
    });

    // Send the command to terminals via main WebSocket bridge
    messageTargets.forEach(async (terminalId) => {
      const terminal = state.terminals.find(t => t.id === terminalId);
      
      if (terminal) {
        try {
          // Import the WebSocket service (connects to main bridge at 8123)
          const { terminalWebSocketService } = await import('../../../services/terminalWebSocketService');
          
          // Check if we need to create a terminal session
          const sessionStatus = terminalWebSocketService.getSessionStatus(terminalId);
          if (!sessionStatus || sessionStatus === 'error') {
            try {
              await terminalWebSocketService.createTerminalSession(
                terminalId,
                terminal.workbranchId,
                terminal.projectId
              );
            } catch (sessionError) {
              console.error(`❌ Failed to create terminal session for ${terminalId}:`, sessionError);
              // Don't continue if session creation failed
              if (terminal.terminal) {
                terminal.terminal.write(`\r\n❌ Failed to create VS Code terminal session\r\n`);
                terminal.terminal.write(`💡 Make sure VS Code extension is active\r\n$ `);
              }
              return;
            }
          }
          
          // Send command via WebSocket to VS Code bridge
          await terminalWebSocketService.sendCommand(terminalId, content);
          
          // Update terminal to show the command was sent
          if (terminal.terminal) {
            terminal.terminal.write(`\r\n> ${content}\r\n`);
            terminal.terminal.write('📤 Command sent to VS Code terminal...\r\n');
          }
          
        } catch (error) {
          console.error(`❌ Error sending to terminal ${terminalId}:`, error);
          
          // Fallback: write locally if WebSocket fails
          if (terminal.terminal) {
            terminal.terminal.write(`\r\n$ ${content}\r\n`);
            terminal.terminal.write('⚠️ WebSocket connection failed - Running in local mode\r\n');
            terminal.terminal.write('💡 Ensure VS Code extension is active for terminal integration\r\n$ ');
          }
        }
      } else {
        console.warn(`❌ Terminal ${terminalId} not found`);
      }
    });
  }, [state.selectedTerminals, state.terminals, dispatchAction]);

  const toggleChat = useCallback((enabled?: boolean) => {
    const chatEnabled = enabled ?? !state.chatEnabled;
    dispatchAction({
      type: 'TOGGLE_CHAT',
      payload: { enabled: chatEnabled }
    });
  }, [state.chatEnabled, dispatchAction]);

  // Grid layout calculations
  const getGridPositions = useCallback((layout: TerminalGridLayout): GridPosition[] => {
    const config = LAYOUT_CONFIGS[layout];
    if (!config) return [];
    
    return config.positions;
  }, []);

  const calculateTerminalDimensions = useCallback((
    containerDimensions: { width: number; height: number },
    layout: TerminalGridLayout
  ): TerminalDimensions => {
    const config = LAYOUT_CONFIGS[layout];
    if (!config) return { width: 800, height: 600, rows: 24, cols: 80 };

    // Ensure we have valid container dimensions
    const safeWidth = Math.max(containerDimensions.width || 800, 300);
    const safeHeight = Math.max(containerDimensions.height || 600, 200);

    const termWidth = Math.floor(safeWidth / config.cols);
    const termHeight = Math.floor(safeHeight / config.rows);
    
    // Calculate terminal rows and columns based on font size
    const charWidth = 7; // Approximate character width
    const charHeight = 14; // Approximate character height
    
    const cols = Math.floor(Math.max(termWidth, 300) / charWidth);
    const rows = Math.floor(Math.max(termHeight, 200) / charHeight);

    const finalDimensions = {
      width: Math.max(termWidth, 300),
      height: Math.max(termHeight, 200),
      rows: Math.max(rows, 10),
      cols: Math.max(cols, 40)
    };

    // Throttle dimension logging to prevent spam
    const dimensionsKey = `${safeWidth}x${safeHeight}-${layout}`;
    if (!calculateTerminalDimensions.lastLogKey || calculateTerminalDimensions.lastLogKey !== dimensionsKey) {
      calculateTerminalDimensions.lastLogKey = dimensionsKey;
      console.log(`📐 Terminal dimensions updated:`, {
        container: { width: safeWidth, height: safeHeight },
        layout,
        terminal: finalDimensions
      });
    }

    return finalDimensions;
  }, []);

  // Setup resize observer for dynamic grid sizing
  useEffect(() => {
    if (!gridRef.current) return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        
        // Only update if we have meaningful dimensions
        if (width > 0 && height > 0) {
          const dimensions = calculateTerminalDimensions({ width, height }, state.layout);
          
          // Verify calculated dimensions are valid before dispatching
          if (dimensions.width > 0 && dimensions.height > 0 && dimensions.rows > 0 && dimensions.cols > 0) {
            dispatchAction({
              type: 'RESIZE_GRID',
              payload: { dimensions }
            });
          } else {
            console.warn('⚠️ Invalid dimensions calculated, skipping resize:', dimensions);
          }
        }
      }
    });

    resizeObserverRef.current.observe(gridRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [state.layout, calculateTerminalDimensions, dispatchAction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up all terminals
      state.terminals.forEach(terminal => {
        terminal.terminal.dispose();
        if (terminal.websocket) {
          terminal.websocket.close();
        }
      });
    };
  }, []);

  return {
    // State
    terminals: state.terminals,
    selectedTerminals: state.selectedTerminals,
    layout: state.layout,
    chatEnabled: state.chatEnabled,
    messageInput: state.messageInput,
    chatHistory: state.chatHistory,
    gridDimensions: state.gridDimensions,
    selectionPresets: state.selectionPresets,
    isResizing: state.isResizing,
    showChat: state.showChat,

    // Actions
    addTerminal,
    removeTerminal,
    selectTerminal,
    selectAllTerminals,
    deselectAllTerminals,
    selectByPreset,
    setLayout,
    sendMessage,
    toggleChat,

    // Layout helpers
    getGridPositions,
    calculateTerminalDimensions,

    // Refs
    gridRef,

    // Computed values
    selectedCount: state.selectedTerminals.size,
    totalTerminals: state.terminals.length,
    canAddTerminal: state.terminals.length < maxTerminals
  };
}