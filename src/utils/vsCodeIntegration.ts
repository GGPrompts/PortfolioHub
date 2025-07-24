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

export const killAllProjects = async (): Promise<void> => {
  // Kill all projects - ENHANCED approach using existing port detection infrastructure
  console.log('🔴 Kill all projects - leveraging existing continuous port monitoring system');
  
  try {
    // First, get the real-time project status from the existing port monitoring system
    console.log('📊 Getting real-time project status from optimized port manager...');
    
    // Get project list from manifest (still needed for project metadata)
    const manifest = await fetch('/projects/manifest.json').then(r => r.json());
    const projects = manifest.projects || [];
    
    // Use the existing optimized port manager to get current running status
    // This leverages the continuous monitoring that's already running
    const { optimizedPortManager } = await import('./optimizedPortManager');
    const projectStatus = await optimizedPortManager.checkProjectPorts(projects);
    
    // Filter to only running projects (no need to attempt stopping inactive ones)
    const runningProjects = projects.filter(project => projectStatus.get(project.id) === true);
    
    console.log(`🎯 Port monitor detected ${runningProjects.length}/${projects.length} projects currently running`);
    runningProjects.forEach(project => {
      console.log(`  ✅ ${project.title} (${project.id}) - Port ${project.localPort} ACTIVE`);
    });
    
    if (runningProjects.length === 0) {
      console.log('✅ No running projects detected - all projects already stopped');
      return;
    }
    
    let stoppedCount = 0;
    let totalAttempted = 0;
    
    // Use the existing unified architecture to stop only the running projects
    for (const project of runningProjects) {
      try {
        console.log(`🔍 Stopping ${project.title} (port ${project.localPort}) via environment bridge...`);
        
        // Use the existing stopProject method - it handles both VS Code terminals and Windows Terminal processes
        const success = await environmentBridge.stopProject(project.id);
        
        totalAttempted++;
        if (success) {
          stoppedCount++;
          console.log(`✅ Successfully stopped ${project.title}`);
        } else {
          console.log(`⚠️ ${project.title} failed to stop via environment bridge`);
        }
        
        // Small delay between stops for stability
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.warn(`❌ Error stopping ${project.title}:`, error);
        totalAttempted++;
      }
    }
    
    console.log(`✅ Enhanced kill all complete - stopped ${stoppedCount}/${totalAttempted} running projects`);
    console.log('🎯 Used existing port monitoring + unified environment bridge architecture');
    
    // Clear port cache to force fresh detection on next status check
    optimizedPortManager.clearCache();
    console.log('🧹 Cleared port cache for fresh status detection');
    
  } catch (error) {
    console.error('❌ Error in enhanced kill all, falling back to direct port approach:', error);
    
    // Fallback: Use direct port killing for all known development ports
    const portfolioPorts = [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 5173, 5174, 5175, 5176, 5177, 9323, 9324];
    console.log(`🔄 Fallback: Attempting direct port kill for ${portfolioPorts.length} ports`);
    
    for (const port of portfolioPorts) {
      try {
        const killPortCommand = `$proc = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -First 1; if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }`;
        await executeCommand(killPortCommand);
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.warn(`⚠️ Fallback kill failed for port ${port}:`, error);
      }
    }
  }
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
  if (force) {
    // Force restart: Stop all projects first, then start them
    console.log('🔄 Force restart - stopping existing servers first...');
    
    // Get current project status to only stop running projects
    const manifest = await fetch('/projects/manifest.json').then(r => r.json());
    const allProjects = manifest.projects || [];
    const targetProjects = allProjects.filter((p: any) => projectIds.includes(p.id));
    
    // Use optimized port manager to check which are actually running
    const { optimizedPortManager } = await import('./optimizedPortManager');
    const projectStatus = await optimizedPortManager.checkProjectPorts(targetProjects);
    const runningTargets = targetProjects.filter((p: any) => projectStatus.get(p.id) === true);
    
    if (runningTargets.length > 0) {
      console.log(`🛑 Force restart - stopping ${runningTargets.length} running projects...`);
      
      for (const project of runningTargets) {
        await environmentBridge.stopProject(project.id);
        // Small delay between stops
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Wait for servers to fully stop
      console.log('⏳ Waiting for servers to fully stop...');
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  // Start all requested projects - keep original simple behavior for non-force
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