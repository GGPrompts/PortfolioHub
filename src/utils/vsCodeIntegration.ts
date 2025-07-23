/**
 * VS Code Integration Utilities
 * UNIFIED SINGLE APP ARCHITECTURE
 * 
 * This service now uses the new WebSocket bridge for VS Code integration
 * instead of the embedded webview approach. One React app works everywhere!
 */

import environmentBridge, { EnvironmentMode } from '../services/environmentBridge';

// Check if running with VS Code bridge available (replaces embedded webview detection)
export const isVSCodeEnvironment = (): boolean => {
  return environmentBridge.isVSCodeAvailable();
};

// Get current environment mode
export const getEnvironmentMode = (): EnvironmentMode => {
  return environmentBridge.getMode();
};

// Get environment capabilities
export const getEnvironmentCapabilities = () => {
  return environmentBridge.getCapabilities();
};

// Execute command using unified environment bridge
export const executeCommand = async (command: string, terminalName: string = 'Portfolio Command'): Promise<void> => {
  // Security validation is now handled in the bridge service
  const success = await environmentBridge.executeCommand(command);
  
  // Note: Notifications are handled by the bridge service based on environment
  // VS Code mode: Native VS Code notifications
  // Web mode: Browser notifications with clipboard copy confirmation
};

// Save file using environment bridge
export const saveFile = async (filePath: string, content: string): Promise<void> => {
  await environmentBridge.saveFile(filePath, content);
};

// Delete file using environment bridge
export const deleteFile = async (filePath: string): Promise<void> => {
  await environmentBridge.deleteFile(filePath);
};

// Add project to VS Code workspace using environment bridge
export const addProjectToWorkspace = async (project: any): Promise<void> => {
  await environmentBridge.addProjectToWorkspace(project);
};

// Git operations using environment bridge
export const updateGitRepo = async (projectPath: string): Promise<void> => {
  await environmentBridge.gitOperation('git pull origin main', projectPath);
};

// Open in VS Code using environment bridge
export const openInVSCode = async (path: string): Promise<void> => {
  await environmentBridge.openInVSCode(path);
};

// Open in browser - now handles both Simple Browser (VS Code) and regular browser
export const openInBrowser = async (url: string): Promise<void> => {
  // Try Live Preview first, fallback to regular browser
  const success = await environmentBridge.openLivePreview(url);
  if (!success) {
    window.open(url, '_blank');
  }
};

// Open in external browser (forces external browser)
export const openInExternalBrowser = async (url: string, reason?: string): Promise<void> => {
  // Always open in external browser, bypass VS Code
  window.open(url, '_blank');
  console.log(`🌍 Opened in external browser${reason ? ` (${reason})` : ''}: ${url}`);
};

// Open folder using environment bridge
export const openFolder = async (path: string): Promise<void> => {
  await environmentBridge.openFolder(path);
};

// Show notification - now handled by environment bridge
export const showNotification = (text: string, level: 'info' | 'warning' | 'error' = 'info'): void => {
  // Notifications are now handled internally by the environment bridge
  // This function is kept for backward compatibility
  console.log(`Notification (${level}): ${text}`);
};

// Copy to clipboard - simplified
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    console.log(`Copied to clipboard: ${text}`);
  } catch (error) {
    console.warn('Failed to copy to clipboard:', error);
  }
};

// Project management functions using environment bridge
export const launchAllProjects = async (): Promise<void> => {
  // Launch all projects - implementation depends on project data
  console.log('Launch all projects - using environment bridge');
  await executeCommand('cd D:\\ClaudeWindows\\claude-dev-portfolio && .\\scripts\\start-all-enhanced.ps1');
};

export const launchSelectedProjects = async (projectIds: string[]): Promise<void> => {
  console.log('Launch selected projects:', projectIds);
  // Start each project individually
  for (const projectId of projectIds) {
    await environmentBridge.startProject(projectId);
  }
};

export const openLivePreview = async (url: string, title?: string, projectId?: string): Promise<void> => {
  await environmentBridge.openLivePreview(url, title);
};

export const openMultipleLivePreviews = async (projects: Array<{id: string, title: string, url: string}>): Promise<void> => {
  // Open each project in Live Preview
  for (const project of projects) {
    await environmentBridge.openLivePreview(project.url, project.title);
  }
};

export const launchProjectsEnhanced = async (projectIds: string[], force: boolean = false): Promise<void> => {
  // Enhanced launch with force option
  for (const projectId of projectIds) {
    await environmentBridge.startProject(projectId);
  }
};

export const executeScript = async (scriptPath: string, scriptArgs: string[] = []): Promise<void> => {
  const command = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}" ${scriptArgs.join(' ')}`;
  await executeCommand(command);
};

// Environment status and capabilities
export const getConnectionStatus = (): string => {
  return environmentBridge.getConnectionStatus();
};

export const refreshProjects = async (): Promise<any> => {
  return await environmentBridge.refreshProjects();
};