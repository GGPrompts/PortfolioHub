/**
 * VS Code Integration Utilities
 * Helper functions for seamless integration between portfolio and VS Code extension
 */

// Check if running inside VS Code webview
export const isVSCodeEnvironment = (): boolean => {
  return !!(window as any).vsCodePortfolio?.postMessage;
};

// Execute command in VS Code terminal
export const executeCommand = async (command: string, terminalName: string = 'Portfolio Command'): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'terminal:execute',
      command,
      name: terminalName
    });
  } else {
    // Fallback to clipboard for non-VS Code environments
    await navigator.clipboard.writeText(command);
    console.log(`Command copied to clipboard: ${command}`);
  }
};

// Save file through VS Code API
export const saveFile = async (filePath: string, content: string): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'file:save',
      path: filePath,
      content
    });
  } else {
    console.warn('File saving only available in VS Code environment');
  }
};

// Add project to VS Code workspace
export const addProjectToWorkspace = async (projectPath: string): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'workspace:addProject',
      project: projectPath
    });
  } else {
    console.warn('Workspace management only available in VS Code environment');
  }
};

// Update git repository
export const updateGitRepo = async (projectPath: string): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'git:update',
      projectPath
    });
  } else {
    // Fallback to clipboard
    const command = `cd "${projectPath}" && git pull origin main`;
    await navigator.clipboard.writeText(command);
    console.log(`Git update command copied to clipboard: ${command}`);
  }
};

// Open in VS Code
export const openInVSCode = async (path: string): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'vscode:open',
      path
    });
  } else {
    const command = `code "${path}"`;
    await navigator.clipboard.writeText(command);
    console.log(`VS Code command copied to clipboard: ${command}`);
  }
};

// Open in browser
export const openInBrowser = async (url: string): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'browser:open',
      url
    });
  } else {
    window.open(url, '_blank');
  }
};

// Open folder in file explorer
export const openFolder = async (path: string): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'folder:open',
      path
    });
  } else {
    const command = process.platform === 'win32' ? `explorer "${path}"` : `open "${path}"`;
    await navigator.clipboard.writeText(command);
    console.log(`Folder open command copied to clipboard: ${command}`);
  }
};

// Show notification
export const showNotification = (text: string, level: 'info' | 'warning' | 'error' = 'info'): void => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'notification:show',
      text,
      level
    });
  } else {
    // Fallback to console
    console.log(`Notification (${level}): ${text}`);
  }
};

// Copy to clipboard with VS Code integration awareness
export const copyToClipboard = async (text: string): Promise<void> => {
  if (isVSCodeEnvironment()) {
    // In VS Code, show notification instead of silent clipboard
    showNotification(`Copied to clipboard: ${text}`);
  }
  
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.warn('Failed to copy to clipboard:', error);
    showNotification('Failed to copy to clipboard', 'warning');
  }
};