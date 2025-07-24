/**
 * Terminal State Management Store
 * 
 * Zustand store for multi-terminal support with workbranch isolation
 * and visual selection capabilities. Follows existing portfolio store patterns.
 */

import { create } from 'zustand';
import { 
  TerminalConfig, 
  TerminalSelection, 
  TerminalGridConfig, 
  TerminalGridLayout,
  WorkbranchContext,
  MultiTargetMessage,
  MessageResult,
  TerminalHistory,
  TerminalSessionStats,
  TerminalTheme,
  TerminalFeatures,
  TerminalStatus,
  TerminalType,
  TerminalShell
} from '../types/terminal';

/**
 * Terminal Store State Interface
 */
interface TerminalStore {
  // Core State
  terminals: Map<string, TerminalConfig>;
  workbranches: Map<string, WorkbranchContext>;
  selectedTerminals: Set<string>;
  activeTerminal: string | null;
  gridConfig: TerminalGridConfig;
  theme: TerminalTheme;
  features: TerminalFeatures;
  
  // Message State
  messages: Map<string, MultiTargetMessage>;
  messageHistory: MultiTargetMessage[];
  
  // History and Statistics
  terminalHistory: Map<string, TerminalHistory>;
  sessionStats: Map<string, TerminalSessionStats>;
  
  // UI State
  isGridVisible: boolean;
  isSelectionMode: boolean;
  showPerformanceMetrics: boolean;
  compactMode: boolean;
  
  // Terminal Management Actions
  createTerminal: (config: Partial<TerminalConfig>) => string;
  destroyTerminal: (terminalId: string) => void;
  updateTerminal: (terminalId: string, updates: Partial<TerminalConfig>) => void;
  setActiveTerminal: (terminalId: string | null) => void;
  duplicateTerminal: (terminalId: string) => string;
  
  // Selection Management Actions
  toggleTerminalSelection: (terminalId: string) => void;
  selectAllTerminals: () => void;
  selectNoneTerminals: () => void;
  selectTerminalsByType: (type: TerminalType) => void;
  selectTerminalsByWorkbranch: (workbranch: string) => void;
  selectTerminalsByProject: (projectId: string) => void;
  selectActiveTerminals: () => void;
  selectIdleTerminals: () => void;
  invertSelection: () => void;
  selectRecentTerminals: (count: number) => void;
  
  // Grid Layout Actions
  setGridLayout: (layout: TerminalGridLayout) => void;
  updateGridConfig: (config: Partial<TerminalGridConfig>) => void;
  toggleGridVisibility: () => void;
  setCompactMode: (compact: boolean) => void;
  autoArrangeTerminals: () => void;
  
  // Workbranch Management Actions
  createWorkbranch: (context: WorkbranchContext) => void;
  updateWorkbranch: (name: string, updates: Partial<WorkbranchContext>) => void;
  deleteWorkbranch: (name: string) => void;
  switchTerminalWorkbranch: (terminalId: string, workbranch: string) => void;
  
  // Message Management Actions
  sendMultiTargetMessage: (content: string, targetTerminals?: string[]) => string;
  updateMessageResult: (messageId: string, terminalId: string, result: MessageResult) => void;
  getMessageStatus: (messageId: string) => MultiTargetMessage | null;
  clearMessageHistory: () => void;
  
  // History and Statistics Actions
  addHistoryEntry: (terminalId: string, command: string, result?: any) => void;
  clearTerminalHistory: (terminalId: string) => void;
  searchHistory: (terminalId: string, query: string) => any[];
  updateSessionStats: (terminalId: string, stats: Partial<TerminalSessionStats>) => void;
  
  // Theme and Appearance Actions
  setTheme: (theme: TerminalTheme) => void;
  updateFeatures: (features: Partial<TerminalFeatures>) => void;
  toggleSelectionMode: () => void;
  togglePerformanceMetrics: () => void;
  
  // Utility Getters
  getTerminal: (terminalId: string) => TerminalConfig | undefined;
  getSelectedTerminals: () => TerminalConfig[];
  getTerminalsByWorkbranch: (workbranch: string) => TerminalConfig[];
  getTerminalsByProject: (projectId: string) => TerminalConfig[];
  getTerminalsByType: (type: TerminalType) => TerminalConfig[];
  getActiveTerminals: () => TerminalConfig[];
  getIdleTerminals: () => TerminalConfig[];
  getTerminalCount: () => number;
  getSelectedCount: () => number;
  getWorkbranchTerminals: (workbranch: string) => TerminalConfig[];
  canCreateTerminal: () => boolean;
}

/**
 * Default Grid Configuration
 */
const DEFAULT_GRID_CONFIG: TerminalGridConfig = {
  layout: '2x2',
  maxTerminals: 4,
  autoResize: true,
  showHeaders: true,
  showSelection: true,
  compactMode: false,
  dimensions: {
    rows: 2,
    cols: 2,
    minTerminalWidth: 300,
    minTerminalHeight: 200,
  },
  responsive: {
    small: '1x1',
    medium: '1x2',
    large: '2x2',
  },
};

/**
 * Default Terminal Theme
 */
const DEFAULT_THEME: TerminalTheme = {
  name: 'VS Code Dark',
  colors: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    selection: '#264f78',
    accent: '#007acc',
  },
  fonts: {
    family: 'Consolas, "Courier New", monospace',
    size: 14,
    weight: 400,
    lineHeight: 1.2,
  },
  ui: {
    borderRadius: 4,
    padding: 8,
    headerHeight: 32,
    showScrollbar: true,
  },
};

/**
 * Default Terminal Features
 */
const DEFAULT_FEATURES: TerminalFeatures = {
  multiSelect: true,
  workbranchIsolation: true,
  autoComplete: true,
  historySearch: true,
  scriptRecording: false,
  macroSupport: false,
  templateCommands: true,
  smartRouting: true,
  gitIntegration: true,
  projectAware: true,
  claudeIntegration: true,
  performanceMonitoring: true,
  commandValidation: true,
  workspaceIsolation: true,
  auditLogging: false,
  privilegeEscalation: false,
};

/**
 * Generate unique terminal ID
 */
function generateTerminalId(): string {
  return `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create default terminal configuration
 */
function createDefaultTerminal(config: Partial<TerminalConfig>): TerminalConfig {
  const now = new Date();
  const id = config.id || generateTerminalId();
  
  return {
    id,
    title: config.title || `Terminal ${id.slice(-4)}`,
    workbranch: config.workbranch || 'master',
    project: config.project,
    shell: config.shell || 'powershell',
    selected: false,
    status: 'connecting',
    type: config.type || 'utility',
    autoAssign: config.autoAssign ?? false,
    createdAt: now,
    lastActivity: now,
    workingDirectory: config.workingDirectory || 'D:\\ClaudeWindows\\claude-dev-portfolio',
    environmentVars: config.environmentVars || {},
    claudeContext: config.claudeContext,
    color: config.color || '#007acc',
    icon: config.icon || 'terminal',
    position: config.position || { row: 0, col: 0 },
    connectionId: config.connectionId,
    pid: config.pid,
    performance: {
      messagesCount: 0,
      lastLatency: 0,
      averageLatency: 0,
      memoryUsage: undefined,
      connectionQuality: 'good',
      ...config.performance,
    },
    ...config,
  };
}

/**
 * Terminal Store Implementation
 */
export const useTerminalStore = create<TerminalStore>((set, get) => ({
  // Initial State
  terminals: new Map(),
  workbranches: new Map(),
  selectedTerminals: new Set(),
  activeTerminal: null,
  gridConfig: DEFAULT_GRID_CONFIG,
  theme: DEFAULT_THEME,
  features: DEFAULT_FEATURES,
  messages: new Map(),
  messageHistory: [],
  terminalHistory: new Map(),
  sessionStats: new Map(),
  isGridVisible: true,
  isSelectionMode: false,
  showPerformanceMetrics: false,
  compactMode: false,

  // Terminal Management Actions
  createTerminal: (config) => {
    const terminal = createDefaultTerminal(config);
    
    set((state) => {
      const newTerminals = new Map(state.terminals);
      newTerminals.set(terminal.id, terminal);
      
      // Initialize history and stats
      const newHistory = new Map(state.terminalHistory);
      newHistory.set(terminal.id, {
        terminalId: terminal.id,
        commands: [],
        maxEntries: 1000,
        searchIndex: new Map(),
      });
      
      const newStats = new Map(state.sessionStats);
      newStats.set(terminal.id, {
        terminalId: terminal.id,
        sessionStart: new Date(),
        totalCommands: 0,
        totalTime: 0,
        successfulCommands: 0,
        failedCommands: 0,
        averageResponseTime: 0,
        mostUsedCommands: [],
        workbranchSwitches: 0,
        messagesReceived: 0,
        messagesSent: 0,
      });
      
      return {
        terminals: newTerminals,
        terminalHistory: newHistory,
        sessionStats: newStats,
        activeTerminal: state.activeTerminal || terminal.id,
      };
    });
    
    console.log(`✅ Created terminal: ${terminal.title} (${terminal.id})`);
    return terminal.id;
  },

  destroyTerminal: (terminalId) => {
    set((state) => {
      const newTerminals = new Map(state.terminals);
      const newSelectedTerminals = new Set(state.selectedTerminals);
      const newHistory = new Map(state.terminalHistory);
      const newStats = new Map(state.sessionStats);
      
      // Remove terminal and related data
      newTerminals.delete(terminalId);
      newSelectedTerminals.delete(terminalId);
      newHistory.delete(terminalId);
      newStats.delete(terminalId);
      
      // Update active terminal if it was destroyed
      const newActiveTerminal = state.activeTerminal === terminalId 
        ? (newTerminals.size > 0 ? newTerminals.keys().next().value : null)
        : state.activeTerminal;
      
      return {
        terminals: newTerminals,
        selectedTerminals: newSelectedTerminals,
        terminalHistory: newHistory,
        sessionStats: newStats,
        activeTerminal: newActiveTerminal,
      };
    });
    
    console.log(`🗑️ Destroyed terminal: ${terminalId}`);
  },

  updateTerminal: (terminalId, updates) => {
    set((state) => {
      const newTerminals = new Map(state.terminals);
      const terminal = newTerminals.get(terminalId);
      
      if (terminal) {
        const updatedTerminal = {
          ...terminal,
          ...updates,
          lastActivity: new Date(),
        };
        newTerminals.set(terminalId, updatedTerminal);
      }
      
      return { terminals: newTerminals };
    });
  },

  setActiveTerminal: (terminalId) => {
    set({ activeTerminal: terminalId });
  },

  duplicateTerminal: (terminalId) => {
    const state = get();
    const terminal = state.terminals.get(terminalId);
    
    if (terminal) {
      const duplicateConfig = {
        ...terminal,
        id: undefined, // Will be auto-generated
        title: `${terminal.title} Copy`,
        selected: false,
        createdAt: undefined, // Will be set to current time
        lastActivity: undefined, // Will be set to current time
      };
      
      return state.createTerminal(duplicateConfig);
    }
    
    return '';
  },

  // Selection Management Actions
  toggleTerminalSelection: (terminalId) => {
    set((state) => {
      const newSelectedTerminals = new Set(state.selectedTerminals);
      
      if (newSelectedTerminals.has(terminalId)) {
        newSelectedTerminals.delete(terminalId);
      } else {
        newSelectedTerminals.add(terminalId);
      }
      
      // Update terminal selection state
      const newTerminals = new Map(state.terminals);
      const terminal = newTerminals.get(terminalId);
      if (terminal) {
        newTerminals.set(terminalId, {
          ...terminal,
          selected: newSelectedTerminals.has(terminalId),
        });
      }
      
      return { 
        selectedTerminals: newSelectedTerminals,
        terminals: newTerminals,
      };
    });
  },

  selectAllTerminals: () => {
    set((state) => {
      const newSelectedTerminals = new Set(state.terminals.keys());
      const newTerminals = new Map();
      
      // Update selection state for all terminals
      for (const [id, terminal] of state.terminals) {
        newTerminals.set(id, { ...terminal, selected: true });
      }
      
      return { 
        selectedTerminals: newSelectedTerminals,
        terminals: newTerminals,
      };
    });
  },

  selectNoneTerminals: () => {
    set((state) => {
      const newTerminals = new Map();
      
      // Update selection state for all terminals
      for (const [id, terminal] of state.terminals) {
        newTerminals.set(id, { ...terminal, selected: false });
      }
      
      return { 
        selectedTerminals: new Set(),
        terminals: newTerminals,
      };
    });
  },

  selectTerminalsByType: (type) => {
    set((state) => {
      const newSelectedTerminals = new Set<string>();
      const newTerminals = new Map();
      
      for (const [id, terminal] of state.terminals) {
        const shouldSelect = terminal.type === type;
        if (shouldSelect) {
          newSelectedTerminals.add(id);
        }
        newTerminals.set(id, { ...terminal, selected: shouldSelect });
      }
      
      return { 
        selectedTerminals: newSelectedTerminals,
        terminals: newTerminals,
      };
    });
  },

  selectTerminalsByWorkbranch: (workbranch) => {
    set((state) => {
      const newSelectedTerminals = new Set<string>();
      const newTerminals = new Map();
      
      for (const [id, terminal] of state.terminals) {
        const shouldSelect = terminal.workbranch === workbranch;
        if (shouldSelect) {
          newSelectedTerminals.add(id);
        }
        newTerminals.set(id, { ...terminal, selected: shouldSelect });
      }
      
      return { 
        selectedTerminals: newSelectedTerminals,
        terminals: newTerminals,
      };
    });
  },

  selectTerminalsByProject: (projectId) => {
    set((state) => {
      const newSelectedTerminals = new Set<string>();
      const newTerminals = new Map();
      
      for (const [id, terminal] of state.terminals) {
        const shouldSelect = terminal.project === projectId;
        if (shouldSelect) {
          newSelectedTerminals.add(id);
        }
        newTerminals.set(id, { ...terminal, selected: shouldSelect });
      }
      
      return { 
        selectedTerminals: newSelectedTerminals,
        terminals: newTerminals,
      };
    });
  },

  selectActiveTerminals: () => {
    set((state) => {
      const newSelectedTerminals = new Set<string>();
      const newTerminals = new Map();
      
      for (const [id, terminal] of state.terminals) {
        const shouldSelect = terminal.status === 'active';
        if (shouldSelect) {
          newSelectedTerminals.add(id);
        }
        newTerminals.set(id, { ...terminal, selected: shouldSelect });
      }
      
      return { 
        selectedTerminals: newSelectedTerminals,
        terminals: newTerminals,
      };
    });
  },

  selectIdleTerminals: () => {
    set((state) => {
      const newSelectedTerminals = new Set<string>();
      const newTerminals = new Map();
      
      for (const [id, terminal] of state.terminals) {
        const shouldSelect = terminal.status === 'idle';
        if (shouldSelect) {
          newSelectedTerminals.add(id);
        }
        newTerminals.set(id, { ...terminal, selected: shouldSelect });
      }
      
      return { 
        selectedTerminals: newSelectedTerminals,
        terminals: newTerminals,
      };
    });
  },

  invertSelection: () => {
    set((state) => {
      const newSelectedTerminals = new Set<string>();
      const newTerminals = new Map();
      
      for (const [id, terminal] of state.terminals) {
        const shouldSelect = !state.selectedTerminals.has(id);
        if (shouldSelect) {
          newSelectedTerminals.add(id);
        }
        newTerminals.set(id, { ...terminal, selected: shouldSelect });
      }
      
      return { 
        selectedTerminals: newSelectedTerminals,
        terminals: newTerminals,
      };
    });
  },

  selectRecentTerminals: (count) => {
    set((state) => {
      // Sort terminals by last activity
      const sortedTerminals = Array.from(state.terminals.entries())
        .sort(([, a], [, b]) => b.lastActivity.getTime() - a.lastActivity.getTime())
        .slice(0, count);
      
      const newSelectedTerminals = new Set(sortedTerminals.map(([id]) => id));
      const newTerminals = new Map();
      
      for (const [id, terminal] of state.terminals) {
        const shouldSelect = newSelectedTerminals.has(id);
        newTerminals.set(id, { ...terminal, selected: shouldSelect });
      }
      
      return { 
        selectedTerminals: newSelectedTerminals,
        terminals: newTerminals,
      };
    });
  },

  // Grid Layout Actions
  setGridLayout: (layout) => {
    set((state) => ({
      gridConfig: { ...state.gridConfig, layout },
    }));
  },

  updateGridConfig: (config) => {
    set((state) => ({
      gridConfig: { ...state.gridConfig, ...config },
    }));
  },

  toggleGridVisibility: () => {
    set((state) => ({ isGridVisible: !state.isGridVisible }));
  },

  setCompactMode: (compact) => {
    set({ compactMode: compact });
  },

  autoArrangeTerminals: () => {
    set((state) => {
      const newTerminals = new Map();
      let position = 0;
      const { rows, cols } = state.gridConfig.dimensions;
      
      for (const [id, terminal] of state.terminals) {
        const row = Math.floor(position / cols);
        const col = position % cols;
        
        newTerminals.set(id, {
          ...terminal,
          position: { row, col },
        });
        
        position++;
      }
      
      return { terminals: newTerminals };
    });
  },

  // Workbranch Management Actions
  createWorkbranch: (context) => {
    set((state) => {
      const newWorkbranches = new Map(state.workbranches);
      newWorkbranches.set(context.name, context);
      return { workbranches: newWorkbranches };
    });
  },

  updateWorkbranch: (name, updates) => {
    set((state) => {
      const newWorkbranches = new Map(state.workbranches);
      const workbranch = newWorkbranches.get(name);
      
      if (workbranch) {
        newWorkbranches.set(name, { ...workbranch, ...updates });
      }
      
      return { workbranches: newWorkbranches };
    });
  },

  deleteWorkbranch: (name) => {
    set((state) => {
      const newWorkbranches = new Map(state.workbranches);
      newWorkbranches.delete(name);
      return { workbranches: newWorkbranches };
    });
  },

  switchTerminalWorkbranch: (terminalId, workbranch) => {
    set((state) => {
      const newTerminals = new Map(state.terminals);
      const terminal = newTerminals.get(terminalId);
      
      if (terminal) {
        newTerminals.set(terminalId, {
          ...terminal,
          workbranch,
          lastActivity: new Date(),
        });
        
        // Update session stats
        const newStats = new Map(state.sessionStats);
        const stats = newStats.get(terminalId);
        if (stats) {
          newStats.set(terminalId, {
            ...stats,
            workbranchSwitches: stats.workbranchSwitches + 1,
          });
        }
        
        return { terminals: newTerminals, sessionStats: newStats };
      }
      
      return state;
    });
  },

  // Message Management Actions
  sendMultiTargetMessage: (content, targetTerminals) => {
    const messageId = generateMessageId();
    const targets = targetTerminals || Array.from(get().selectedTerminals);
    
    if (targets.length === 0) {
      console.warn('No terminals selected for multi-target message');
      return messageId;
    }
    
    const message: MultiTargetMessage = {
      id: messageId,
      content,
      targetTerminals: targets,
      timestamp: new Date(),
      sequential: false,
      waitForCompletion: false,
      timeout: 10000,
      collectResponses: true,
      aggregateOutput: false,
      showIndividualResults: true,
      workbranchSpecific: false,
      projectSpecific: false,
      shellSpecific: false,
      status: 'pending',
      results: new Map(),
      overallProgress: 0,
    };
    
    set((state) => {
      const newMessages = new Map(state.messages);
      const newMessageHistory = [...state.messageHistory, message];
      
      newMessages.set(messageId, message);
      
      return {
        messages: newMessages,
        messageHistory: newMessageHistory,
      };
    });
    
    console.log(`📨 Sent multi-target message to ${targets.length} terminals: ${content}`);
    return messageId;
  },

  updateMessageResult: (messageId, terminalId, result) => {
    set((state) => {
      const newMessages = new Map(state.messages);
      const message = newMessages.get(messageId);
      
      if (message) {
        const newResults = new Map(message.results);
        newResults.set(terminalId, result);
        
        const completedCount = newResults.size;
        const totalCount = message.targetTerminals.length;
        const overallProgress = (completedCount / totalCount) * 100;
        
        const updatedMessage = {
          ...message,
          results: newResults,
          overallProgress,
          status: completedCount === totalCount ? 'completed' as const : message.status,
        };
        
        newMessages.set(messageId, updatedMessage);
      }
      
      return { messages: newMessages };
    });
  },

  getMessageStatus: (messageId) => {
    return get().messages.get(messageId) || null;
  },

  clearMessageHistory: () => {
    set({ messageHistory: [], messages: new Map() });
  },

  // History and Statistics Actions
  addHistoryEntry: (terminalId, command, result) => {
    set((state) => {
      const newHistory = new Map(state.terminalHistory);
      const history = newHistory.get(terminalId);
      
      if (history) {
        const entry = {
          id: `${terminalId}_${Date.now()}`,
          command,
          timestamp: new Date(),
          workingDirectory: state.terminals.get(terminalId)?.workingDirectory || '',
          exitCode: result?.exitCode,
          output: result?.output,
          duration: result?.duration || 0,
          tags: [],
        };
        
        const updatedHistory = {
          ...history,
          commands: [...history.commands, entry].slice(-history.maxEntries),
        };
        
        newHistory.set(terminalId, updatedHistory);
        
        // Update session stats
        const newStats = new Map(state.sessionStats);
        const stats = newStats.get(terminalId);
        if (stats) {
          newStats.set(terminalId, {
            ...stats,
            totalCommands: stats.totalCommands + 1,
            successfulCommands: result?.exitCode === 0 ? stats.successfulCommands + 1 : stats.successfulCommands,
            failedCommands: result?.exitCode !== 0 ? stats.failedCommands + 1 : stats.failedCommands,
            averageResponseTime: (stats.averageResponseTime + (result?.duration || 0)) / 2,
          });
        }
        
        return { terminalHistory: newHistory, sessionStats: newStats };
      }
      
      return state;
    });
  },

  clearTerminalHistory: (terminalId) => {
    set((state) => {
      const newHistory = new Map(state.terminalHistory);
      const history = newHistory.get(terminalId);
      
      if (history) {
        newHistory.set(terminalId, {
          ...history,
          commands: [],
          searchIndex: new Map(),
        });
      }
      
      return { terminalHistory: newHistory };
    });
  },

  searchHistory: (terminalId, query) => {
    const state = get();
    const history = state.terminalHistory.get(terminalId);
    
    if (!history) {
      return [];
    }
    
    return history.commands.filter(entry =>
      entry.command.toLowerCase().includes(query.toLowerCase()) ||
      entry.output?.toLowerCase().includes(query.toLowerCase())
    );
  },

  updateSessionStats: (terminalId, stats) => {
    set((state) => {
      const newStats = new Map(state.sessionStats);
      const currentStats = newStats.get(terminalId);
      
      if (currentStats) {
        newStats.set(terminalId, { ...currentStats, ...stats });
      }
      
      return { sessionStats: newStats };
    });
  },

  // Theme and Appearance Actions
  setTheme: (theme) => {
    set({ theme });
  },

  updateFeatures: (features) => {
    set((state) => ({
      features: { ...state.features, ...features },
    }));
  },

  toggleSelectionMode: () => {
    set((state) => ({ isSelectionMode: !state.isSelectionMode }));
  },

  togglePerformanceMetrics: () => {
    set((state) => ({ showPerformanceMetrics: !state.showPerformanceMetrics }));
  },

  // Utility Getters
  getTerminal: (terminalId) => {
    return get().terminals.get(terminalId);
  },

  getSelectedTerminals: () => {
    const state = get();
    return Array.from(state.selectedTerminals)
      .map(id => state.terminals.get(id))
      .filter(Boolean) as TerminalConfig[];
  },

  getTerminalsByWorkbranch: (workbranch) => {
    const state = get();
    return Array.from(state.terminals.values())
      .filter(terminal => terminal.workbranch === workbranch);
  },

  getTerminalsByProject: (projectId) => {
    const state = get();
    return Array.from(state.terminals.values())
      .filter(terminal => terminal.project === projectId);
  },

  getTerminalsByType: (type) => {
    const state = get();
    return Array.from(state.terminals.values())
      .filter(terminal => terminal.type === type);
  },

  getActiveTerminals: () => {
    const state = get();
    return Array.from(state.terminals.values())
      .filter(terminal => terminal.status === 'active');
  },

  getIdleTerminals: () => {
    const state = get();
    return Array.from(state.terminals.values())
      .filter(terminal => terminal.status === 'idle');
  },

  getTerminalCount: () => {
    return get().terminals.size;
  },

  getSelectedCount: () => {
    return get().selectedTerminals.size;
  },

  getWorkbranchTerminals: (workbranch) => {
    const state = get();
    return Array.from(state.terminals.values())
      .filter(terminal => terminal.workbranch === workbranch);
  },

  canCreateTerminal: () => {
    const state = get();
    return state.terminals.size < state.gridConfig.maxTerminals;
  },
}));

/**
 * Terminal Selection Hook (following existing patterns)
 * 
 * Provides a convenient interface for terminal selection management
 */
export function useTerminalSelection(): TerminalSelection {
  const store = useTerminalStore();
  
  return {
    selectedCount: store.getSelectedCount(),
    selectedTerminals: Array.from(store.selectedTerminals),
    allSelected: store.selectedTerminals.size === store.terminals.size && store.terminals.size > 0,
    
    toggleTerminal: store.toggleTerminalSelection,
    selectAll: store.selectAllTerminals,
    selectNone: store.selectNoneTerminals,
    selectProjects: () => store.selectTerminalsByType('project'),
    selectUtilities: () => store.selectTerminalsByType('utility'),
    selectWorkbranch: store.selectTerminalsByWorkbranch,
    selectByType: store.selectTerminalsByType,
    selectActive: store.selectActiveTerminals,
    selectIdle: store.selectIdleTerminals,
    invertSelection: store.invertSelection,
    selectByProject: store.selectTerminalsByProject,
    selectRecent: store.selectRecentTerminals,
  };
}

export default useTerminalStore;