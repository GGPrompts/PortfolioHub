// VS Code workspace persistence utilities
export interface VSCodeWorkspaceState {
  lastOpenedWorkspace?: string;
  lastOpenedFolder?: string;
  recentWorkspaces: string[];
  instanceStates: Record<string, {
    workspace?: string;
    folder?: string;
  }>;
}

const STORAGE_KEY = 'vscode-workspace-state';

export function loadWorkspaceState(): VSCodeWorkspaceState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load workspace state:', error);
  }
  
  return {
    lastOpenedWorkspace: 'D:\\ClaudeWindows\\claude-dev-portfolio\\portfolio-absolute-paths.code-workspace',
    recentWorkspaces: [
      'D:\\ClaudeWindows\\claude-dev-portfolio\\portfolio-absolute-paths.code-workspace',
      'D:\\ClaudeWindows\\claude-dev-portfolio\\portfolio-dev.code-workspace'
    ],
    instanceStates: {}
  };
}

export function saveWorkspaceState(state: VSCodeWorkspaceState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save workspace state:', error);
  }
}

export function updateInstanceState(
  instanceId: string, 
  workspace?: string, 
  folder?: string
): void {
  const state = loadWorkspaceState();
  
  if (!state.instanceStates[instanceId]) {
    state.instanceStates[instanceId] = {};
  }
  
  if (workspace) {
    state.instanceStates[instanceId].workspace = workspace;
    state.lastOpenedWorkspace = workspace;
    
    // Add to recent workspaces if not already there
    if (!state.recentWorkspaces.includes(workspace)) {
      state.recentWorkspaces.unshift(workspace);
      // Keep only last 5 workspaces
      state.recentWorkspaces = state.recentWorkspaces.slice(0, 5);
    }
  }
  
  if (folder) {
    state.instanceStates[instanceId].folder = folder;
    state.lastOpenedFolder = folder;
  }
  
  saveWorkspaceState(state);
}

export function getInstanceState(instanceId: string): { workspace?: string; folder?: string } | undefined {
  const state = loadWorkspaceState();
  return state.instanceStates[instanceId];
}

export function clearInstanceState(instanceId: string): void {
  const state = loadWorkspaceState();
  delete state.instanceStates[instanceId];
  saveWorkspaceState(state);
}