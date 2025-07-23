/**
 * VS Code Integration Utilities
 * Helper functions for seamless integration between portfolio and VS Code extension
 */

// Dynamic import for security service to avoid build issues

// Check if running inside VS Code webview
export const isVSCodeEnvironment = (): boolean => {
  return !!(window as any).vsCodePortfolio?.postMessage;
};

// Execute command in VS Code terminal with security validation
export const executeCommand = async (command: string, terminalName: string = 'Portfolio Command'): Promise<void> => {
  // Dynamic import and validate command for security
  const { SecureCommandRunner } = await import('../services/securityService');
  if (!SecureCommandRunner.validateCommand(command)) {
    console.error(`Command blocked for security reasons: ${command}`);
    showNotification('Command blocked - security validation failed', 'error');
    return;
  }

  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'terminal:execute',
      command,
      name: terminalName
    });
    showNotification(`Executing: ${terminalName}`, 'info');
  } else {
    // Fallback to clipboard for non-VS Code environments
    try {
      await navigator.clipboard.writeText(command);
      console.log(`Command copied to clipboard: ${command}`);
      showNotification(`Command copied to clipboard!\n\n📋 "${command}"\n\n💡 Paste this into your terminal to execute.`, 'info');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showNotification(`Failed to copy command to clipboard. Command: ${command}`, 'error');
    }
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

// Delete file through VS Code API
export const deleteFile = async (filePath: string): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'file:delete',
      path: filePath
    });
  } else {
    console.warn('File deletion only available in VS Code environment');
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

// Update git repository with path validation
export const updateGitRepo = async (projectPath: string): Promise<void> => {
  try {
    // Validate the project path
    const { SecureCommandRunner } = await import('../services/securityService');
    const workspaceRoot = 'D:\\ClaudeWindows\\claude-dev-portfolio';
    const sanitizedPath = SecureCommandRunner.sanitizePath(projectPath, workspaceRoot);
    
    if (isVSCodeEnvironment()) {
      (window as any).vsCodePortfolio.postMessage({
        type: 'git:update',
        projectPath: sanitizedPath
      });
    } else {
      // Fallback to clipboard with secure command
      const escapedPath = SecureCommandRunner.escapeFilePath(sanitizedPath);
      const command = `cd ${escapedPath} && git pull origin main`;
      
      if (SecureCommandRunner.validateCommand(command)) {
        await navigator.clipboard.writeText(command);
        console.log(`Git update command copied to clipboard: ${command}`);
      } else {
        console.error('Git update command failed security validation');
        showNotification('Git update command blocked - security validation failed', 'error');
      }
    }
  } catch (error) {
    console.error('Path validation failed:', error);
    showNotification('Invalid project path provided', 'error');
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

// Open in browser (VS Code Simple Browser)
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

// Open in external browser (forces external browser even in VS Code)
export const openInExternalBrowser = async (url: string, reason?: string): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'browser:openExternal',
      url,
      reason
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
    // Fallback to browser alert for web app users
    console.log(`Notification (${level}): ${text}`);
    if (level === 'error') {
      alert(`❌ Error: ${text}`);
    } else if (level === 'warning') {
      alert(`⚠️ Warning: ${text}`);
    } else {
      alert(`ℹ️ Info: ${text}`);
    }
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

// Launch all projects in VS Code terminals
export const launchAllProjects = async (): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'projects:launchAll'
    });
  } else {
    // Fallback to PowerShell script
    const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\start-all-enhanced.ps1';
    await copyToClipboard(command);
    console.log('Launch all command copied to clipboard');
  }
};

// Launch selected projects in VS Code terminals
export const launchSelectedProjects = async (projectIds: string[]): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'projects:launchSelected',
      projects: projectIds
    });
  } else {
    // Fallback - copy individual commands
    const commands = projectIds.map(id => `# Launch ${id}`).join('\n');
    await copyToClipboard(commands);
    console.log('Launch selected commands copied to clipboard');
  }
};

// Open Live Preview in VS Code
export const openLivePreview = async (url: string, title?: string, projectId?: string): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'livePreview:open',
      url,
      title,
      projectId
    });
  } else {
    // Fallback to opening in regular browser
    window.open(url, '_blank');
    console.log(`Live Preview not available - opened ${url} in regular browser`);
  }
};

// Open multiple Live Previews in VS Code
export const openMultipleLivePreviews = async (projects: Array<{id: string, title: string, url: string}>): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'livePreview:openMultiple',
      projects
    });
  } else {
    // Fallback to opening in regular browser tabs
    projects.forEach(project => {
      window.open(project.url, '_blank');
    });
    console.log(`Live Preview not available - opened ${projects.length} projects in regular browser tabs`);
  }
};

// Launch projects with enhanced script (port checking, etc.)
export const launchProjectsEnhanced = async (projectIds: string[], force: boolean = false): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'projects:launchEnhanced',
      projects: projectIds,
      force
    });
  } else {
    // Fallback to regular launch for web version
    await launchSelectedProjects(projectIds);
    console.log(`Enhanced launch not available in web version - used regular launch for ${projectIds.length} projects`);
  }
};

// Execute PowerShell script in VS Code
export const executeScript = async (scriptPath: string, scriptArgs: string[] = []): Promise<void> => {
  if (isVSCodeEnvironment()) {
    (window as any).vsCodePortfolio.postMessage({
      type: 'projects:executeScript',
      scriptPath,
      arguments: scriptArgs
    });
  } else {
    console.log(`Script execution not available in web version: ${scriptPath}`);
    showNotification('Script execution only available in VS Code', 'warning');
  }
};