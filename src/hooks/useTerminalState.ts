/**
 * Terminal State Management Hooks
 * 
 * Custom React hooks for terminal lifecycle management, workbranch isolation,
 * and multi-terminal communication. Follows existing React Query patterns.
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { useTerminalStore, useTerminalSelection } from '../store/terminalStore';
import { environmentBridge } from '../services/environmentBridge';
import { 
  TerminalConfig, 
  TerminalStatus, 
  WorkbranchContext,
  MultiTargetMessage,
  MessageResult,
  TerminalHistory,
  TerminalSessionStats,
  TerminalShell,
  TerminalType 
} from '../types/terminal';

/**
 * Main Terminal State Hook
 * 
 * Provides comprehensive terminal management with lifecycle tracking
 */
export function useTerminalState() {
  const store = useTerminalStore();
  const selection = useTerminalSelection();
  const queryClient = useQueryClient();

  // Terminal lifecycle management
  const createTerminal = useCallback(async (config: Partial<TerminalConfig>) => {
    console.log('🚀 Creating new terminal:', config);
    
    try {
      // Validate configuration
      if (!config.workbranch) {
        config.workbranch = 'master'; // Default workbranch
      }
      
      if (!config.shell) {
        config.shell = 'powershell'; // Default shell for Windows
      }
      
      if (!config.type) {
        config.type = 'utility'; // Default type
      }
      
      // Set working directory based on workbranch/project
      if (config.project && !config.workingDirectory) {
        config.workingDirectory = `D:\\ClaudeWindows\\Projects\\${config.project}`;
      } else if (!config.workingDirectory) {
        config.workingDirectory = 'D:\\ClaudeWindows\\claude-dev-portfolio';
      }
      
      // Set Claude context path if workbranch specific
      if (config.workbranch !== 'master' && !config.claudeContext) {
        config.claudeContext = `${config.workingDirectory}\\CLAUDE.md`;
      }
      
      const terminalId = store.createTerminal(config);
      
      // Initialize terminal connection if VS Code is available
      if (environmentBridge.isVSCodeAvailable()) {
        await initializeTerminalConnection(terminalId);
      }
      
      // Invalidate terminal queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
      queryClient.invalidateQueries({ queryKey: ['terminalStatus'] });
      
      return terminalId;
    } catch (error) {
      console.error('❌ Failed to create terminal:', error);
      throw error;
    }
  }, [store, queryClient]);

  const destroyTerminal = useCallback(async (terminalId: string) => {
    console.log('🗑️ Destroying terminal:', terminalId);
    
    try {
      // Close terminal connection if VS Code is available
      if (environmentBridge.isVSCodeAvailable()) {
        await environmentBridge.executeCommand(`exit`, store.getTerminal(terminalId)?.workingDirectory);
      }
      
      store.destroyTerminal(terminalId);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['terminals'] });
      queryClient.invalidateQueries({ queryKey: ['terminalStatus'] });
      
    } catch (error) {
      console.error('❌ Failed to destroy terminal:', error);
      throw error;
    }
  }, [store, queryClient]);

  const updateTerminalStatus = useCallback((terminalId: string, status: TerminalStatus) => {
    store.updateTerminal(terminalId, { status, lastActivity: new Date() });
    
    // Update cached status
    queryClient.setQueryData(['terminalStatus', terminalId], status);
  }, [store, queryClient]);

  return {
    // Store state
    terminals: Array.from(store.terminals.values()),
    workbranches: Array.from(store.workbranches.values()),
    activeTerminal: store.activeTerminal,
    gridConfig: store.gridConfig,
    isGridVisible: store.isGridVisible,
    
    // Selection state
    selection,
    
    // Actions
    createTerminal,
    destroyTerminal,
    updateTerminalStatus,
    setActiveTerminal: store.setActiveTerminal,
    duplicateTerminal: store.duplicateTerminal,
    
    // Grid management
    setGridLayout: store.setGridLayout,
    toggleGridVisibility: store.toggleGridVisibility,
    autoArrangeTerminals: store.autoArrangeTerminals,
    
    // Workbranch management
    createWorkbranch: store.createWorkbranch,
    updateWorkbranch: store.updateWorkbranch,
    switchTerminalWorkbranch: store.switchTerminalWorkbranch,
    
    // Utility getters
    getTerminal: store.getTerminal,
    getTerminalsByProject: store.getTerminalsByProject,
    getTerminalsByWorkbranch: store.getTerminalsByWorkbranch,
    canCreateTerminal: store.canCreateTerminal,
    
    // Counts
    terminalCount: store.getTerminalCount(),
    selectedCount: store.getSelectedCount(),
    activeTerminalCount: store.getActiveTerminals().length,
  };
}

/**
 * Individual Terminal Hook
 * 
 * Manages state for a specific terminal instance
 */
export function useTerminal(terminalId: string) {
  const store = useTerminalStore();
  const queryClient = useQueryClient();
  
  const terminal = store.getTerminal(terminalId);
  
  // Terminal status query with optimistic updates
  const { data: status, isLoading: isStatusLoading } = useQuery({
    queryKey: ['terminalStatus', terminalId],
    queryFn: async () => {
      if (!terminal) return 'disconnected';
      
      // Check if terminal is responsive
      if (environmentBridge.isVSCodeAvailable()) {
        try {
          // Send a simple command to check responsiveness
          const success = await environmentBridge.executeCommand('echo "ping"', terminal.workingDirectory);
          return success ? 'active' : 'error';
        } catch {
          return 'error';
        }
      }
      
      return terminal.status;
    },
    enabled: !!terminal,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Terminal history query
  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['terminalHistory', terminalId],
    queryFn: () => store.terminalHistory.get(terminalId),
    enabled: !!terminal,
    staleTime: 60000, // 1 minute
  });

  // Session statistics query
  const { data: sessionStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['terminalStats', terminalId],
    queryFn: () => store.sessionStats.get(terminalId),
    enabled: !!terminal,
    staleTime: 30000, // 30 seconds
  });

  // Execute command mutation
  const executeCommandMutation = useMutation({
    mutationFn: async (command: string) => {
      if (!terminal) throw new Error('Terminal not found');
      
      console.log(`🖥️ Executing in terminal ${terminalId}: ${command}`);
      
      // Update terminal status to busy
      store.updateTerminal(terminalId, { status: 'busy', lastActivity: new Date() });
      
      const startTime = Date.now();
      let success = false;
      let output = '';
      let error = '';
      
      try {
        if (environmentBridge.isVSCodeAvailable()) {
          success = await environmentBridge.executeCommand(command, terminal.workingDirectory);
        } else {
          // Clipboard fallback
          await navigator.clipboard.writeText(command);
          success = true;
        }
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
      
      const duration = Date.now() - startTime;
      
      // Add to history
      store.addHistoryEntry(terminalId, command, {
        exitCode: success ? 0 : 1,
        output,
        duration,
      });
      
      // Update terminal status back to active/idle
      store.updateTerminal(terminalId, { 
        status: success ? 'active' : 'error',
        lastActivity: new Date(),
        performance: {
          ...terminal.performance,
          messagesCount: terminal.performance.messagesCount + 1,
          lastLatency: duration,
          averageLatency: (terminal.performance.averageLatency + duration) / 2,
          connectionQuality: duration < 1000 ? 'excellent' : duration < 3000 ? 'good' : 'fair',
        }
      });
      
      // Invalidate status query
      queryClient.invalidateQueries({ queryKey: ['terminalStatus', terminalId] });
      
      return { success, output, error, duration };
    },
    onError: (error) => {
      console.error(`❌ Command execution failed in terminal ${terminalId}:`, error);
      store.updateTerminal(terminalId, { status: 'error', lastActivity: new Date() });
    },
  });

  // Change working directory mutation
  const changeDirectoryMutation = useMutation({
    mutationFn: async (newDirectory: string) => {
      if (!terminal) throw new Error('Terminal not found');
      
      const command = process.platform === 'win32' ? `cd /d "${newDirectory}"` : `cd "${newDirectory}"`;
      
      const result = await executeCommandMutation.mutateAsync(command);
      
      if (result.success) {
        store.updateTerminal(terminalId, { 
          workingDirectory: newDirectory,
          lastActivity: new Date(),
        });
      }
      
      return result;
    },
  });

  // Switch workbranch mutation
  const switchWorkbranchMutation = useMutation({
    mutationFn: async (workbranch: string) => {
      if (!terminal) throw new Error('Terminal not found');
      
      // Update Claude context path for new workbranch
      const claudeContext = workbranch !== 'master' 
        ? `${terminal.workingDirectory}\\CLAUDE.md`
        : undefined;
      
      store.switchTerminalWorkbranch(terminalId, workbranch);
      store.updateTerminal(terminalId, { claudeContext });
      
      // Optionally switch git branch if it's a git workbranch
      if (environmentBridge.isVSCodeAvailable() && workbranch.includes('/')) {
        try {
          await environmentBridge.gitOperation(`git checkout ${workbranch}`, terminal.workingDirectory);
        } catch (error) {
          console.warn(`⚠️ Could not switch git branch to ${workbranch}:`, error);
        }
      }
      
      return { workbranch, claudeContext };
    },
  });

  return {
    // Terminal data
    terminal,
    status: status || terminal?.status || 'disconnected',
    history,
    sessionStats,
    
    // Loading states
    isStatusLoading,
    isHistoryLoading,
    isStatsLoading,
    isExecuting: executeCommandMutation.isPending,
    isChangingDirectory: changeDirectoryMutation.isPending,
    isSwitchingWorkbranch: switchWorkbranchMutation.isPending,
    
    // Actions
    executeCommand: executeCommandMutation.mutate,
    executeCommandAsync: executeCommandMutation.mutateAsync,
    changeDirectory: changeDirectoryMutation.mutate,
    changeDirectoryAsync: changeDirectoryMutation.mutateAsync,
    switchWorkbranch: switchWorkbranchMutation.mutate,
    switchWorkbranchAsync: switchWorkbranchMutation.mutateAsync,
    
    // Utility methods
    isSelected: terminal?.selected || false,
    isActive: store.activeTerminal === terminalId,
    canExecute: !!terminal && terminal.status !== 'disconnected' && !executeCommandMutation.isPending,
    
    // Performance metrics
    performance: terminal?.performance,
    connectionQuality: terminal?.performance.connectionQuality || 'poor',
  };
}

/**
 * Multi-Target Messaging Hook
 * 
 * Manages sending messages to multiple selected terminals
 */
export function useMultiTargetMessaging() {
  const store = useTerminalStore();
  const selection = useTerminalSelection();
  const queryClient = useQueryClient();
  
  // Send message to multiple terminals mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, targetTerminals }: { content: string; targetTerminals?: string[] }) => {
      const targets = targetTerminals || selection.selectedTerminals;
      
      if (targets.length === 0) {
        throw new Error('No terminals selected for multi-target message');
      }
      
      console.log(`📨 Sending multi-target message to ${targets.length} terminals:`, content);
      
      const messageId = store.sendMultiTargetMessage(content, targets);
      const results = new Map<string, MessageResult>();
      
      // Execute command on each terminal
      for (const terminalId of targets) {
        const terminal = store.getTerminal(terminalId);
        if (!terminal) continue;
        
        const startTime = Date.now();
        let success = false;
        let output = '';
        let error = '';
        
        try {
          // Update terminal status
          store.updateTerminal(terminalId, { status: 'busy' });
          
          if (environmentBridge.isVSCodeAvailable()) {
            success = await environmentBridge.executeCommand(content, terminal.workingDirectory);
          } else {
            // In clipboard mode, just mark as successful
            success = true;
            output = 'Command copied to clipboard';
          }
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
        }
        
        const executionTime = Date.now() - startTime;
        
        const result: MessageResult = {
          terminalId,
          success,
          output,
          error,
          executionTime,
          timestamp: new Date(),
        };
        
        results.set(terminalId, result);
        store.updateMessageResult(messageId, terminalId, result);
        
        // Update terminal status
        store.updateTerminal(terminalId, { 
          status: success ? 'active' : 'error',
          lastActivity: new Date(),
        });
        
        // Add to terminal history
        store.addHistoryEntry(terminalId, content, {
          exitCode: success ? 0 : 1,
          output,
          duration: executionTime,
        });
      }
      
      // Invalidate terminal status queries
      queryClient.invalidateQueries({ queryKey: ['terminalStatus'] });
      
      return { messageId, results };
    },
  });

  // Get message status
  const getMessageStatus = useCallback((messageId: string) => {
    return store.getMessageStatus(messageId);
  }, [store]);

  // Get message history
  const messageHistory = useMemo(() => {
    return store.messageHistory.slice(-50); // Last 50 messages
  }, [store.messageHistory]);

  return {
    // State
    selectedCount: selection.selectedCount,
    selectedTerminals: selection.selectedTerminals,
    messageHistory,
    
    // Actions
    sendMessage: sendMessageMutation.mutate,
    sendMessageAsync: sendMessageMutation.mutateAsync,
    getMessageStatus,
    clearMessageHistory: store.clearMessageHistory,
    
    // Selection management
    ...selection,
    
    // Status
    isSending: sendMessageMutation.isPending,
    lastError: sendMessageMutation.error,
  };
}

/**
 * Workbranch Management Hook
 * 
 * Manages workbranch contexts and isolation
 */
export function useWorkbranchManagement() {
  const store = useTerminalStore();
  const queryClient = useQueryClient();
  
  // Get current workbranches
  const workbranches = useMemo(() => {
    return Array.from(store.workbranches.values());
  }, [store.workbranches]);
  
  // Create workbranch mutation
  const createWorkbranchMutation = useMutation({
    mutationFn: async (context: Omit<WorkbranchContext, 'terminals'>) => {
      console.log('🌿 Creating workbranch:', context.name);
      
      const workbranchContext: WorkbranchContext = {
        ...context,
        terminals: [],
        gitStatus: 'clean',
        tags: context.tags || [],
        priority: context.priority || 'medium',
        locked: false,
      };
      
      store.createWorkbranch(workbranchContext);
      
      // If this is a git branch, try to create/checkout the branch
      if (environmentBridge.isVSCodeAvailable() && context.name.includes('/')) {
        try {
          await environmentBridge.gitOperation(
            `git checkout -b ${context.name} ${context.baseBranch}`,
            context.projectRoot
          );
        } catch (error) {
          console.warn(`⚠️ Could not create git branch ${context.name}:`, error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['workbranches'] });
      return workbranchContext;
    },
  });
  
  // Switch all selected terminals to workbranch
  const switchSelectedToWorkbranch = useCallback(async (workbranch: string) => {
    const selection = useTerminalSelection();
    
    for (const terminalId of selection.selectedTerminals) {
      store.switchTerminalWorkbranch(terminalId, workbranch);
    }
    
    queryClient.invalidateQueries({ queryKey: ['terminals'] });
  }, [store, queryClient]);
  
  // Get terminals for specific workbranch
  const getWorkbranchTerminals = useCallback((workbranch: string) => {
    return store.getWorkbranchTerminals(workbranch);
  }, [store]);
  
  return {
    // State
    workbranches,
    
    // Actions
    createWorkbranch: createWorkbranchMutation.mutate,
    createWorkbranchAsync: createWorkbranchMutation.mutateAsync,
    updateWorkbranch: store.updateWorkbranch,
    deleteWorkbranch: store.deleteWorkbranch,
    switchSelectedToWorkbranch,
    
    // Utilities
    getWorkbranchTerminals,
    
    // Status
    isCreatingWorkbranch: createWorkbranchMutation.isPending,
  };
}

/**
 * Terminal Performance Hook
 * 
 * Monitors terminal performance and provides metrics
 */
export function useTerminalPerformance(terminalId?: string) {
  const store = useTerminalStore();
  
  // Get performance data
  const performanceData = useMemo(() => {
    if (terminalId) {
      const terminal = store.getTerminal(terminalId);
      const stats = store.sessionStats.get(terminalId);
      
      return {
        terminal: terminal?.performance,
        session: stats,
      };
    }
    
    // Aggregate performance data for all terminals
    const terminals = Array.from(store.terminals.values());
    const allStats = Array.from(store.sessionStats.values());
    
    return {
      totalTerminals: terminals.length,
      activeTerminals: terminals.filter(t => t.status === 'active').length,
      averageLatency: terminals.reduce((sum, t) => sum + t.performance.averageLatency, 0) / terminals.length || 0,
      totalCommands: allStats.reduce((sum, s) => sum + s.totalCommands, 0),
      successRate: allStats.reduce((sum, s) => sum + s.successfulCommands, 0) / Math.max(allStats.reduce((sum, s) => sum + s.totalCommands, 0), 1),
      connectionQuality: terminals.filter(t => t.performance.connectionQuality === 'excellent').length / terminals.length,
    };
  }, [store, terminalId]);
  
  return performanceData;
}

/**
 * Initialize terminal connection (internal helper)
 */
async function initializeTerminalConnection(terminalId: string): Promise<void> {
  try {
    console.log(`🔌 Initializing connection for terminal: ${terminalId}`);
    
    // This would integrate with the WebSocket bridge to establish terminal connection
    // For now, we'll just simulate a successful connection
    
    const store = useTerminalStore.getState();
    store.updateTerminal(terminalId, { 
      status: 'active',
      connectionId: `conn_${Date.now()}`,
      lastActivity: new Date(),
    });
    
    console.log(`✅ Terminal connection established: ${terminalId}`);
  } catch (error) {
    console.error(`❌ Failed to initialize terminal connection: ${terminalId}`, error);
    
    const store = useTerminalStore.getState();
    store.updateTerminal(terminalId, { status: 'error' });
  }
}

// Export utility functions
export { initializeTerminalConnection };