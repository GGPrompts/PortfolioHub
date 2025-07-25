import React, { useEffect, useState } from 'react';
import { copyToClipboard as copyText, executeCommand, isVSCodeEnvironment, openFolder, openInVSCode, showNotification } from '../utils/vsCodeIntegration';
import { showBrowserNotification } from '../services/environmentBridge';
import SvgIcon from './SvgIcon';
import { VSCodeTerminal } from './VSCodeTerminal';
import './VSCodeTerminal.css';

interface VSCodeInstance {
  id: string;
  projectId: string;
  projectPath: string;
  port: number;
  title: string;
  isRunning: boolean;
}

interface Project {
  id: string;
  title: string;
  path: string;
  localPort?: number;
}

export const VSCodeManager: React.FC = () => {
  const [instances, setInstances] = useState<VSCodeInstance[]>([]);
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Store workspace state for each instance
  const [instanceWorkspaces, setInstanceWorkspaces] = useState<Record<string, string>>({});
  
  // Store whether tips have been shown for each instance
  const [instanceTipsShown, setInstanceTipsShown] = useState<Record<string, boolean>>({});
  
  // Keep track of which instances have been rendered to prevent re-rendering
  const [renderedInstances, setRenderedInstances] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load projects from manifest
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/projects/manifest.json');
      const data = await response.json();
      const projectsData = data.projects.map((project: any) => ({
        id: project.id,
        title: project.title,
        path: `D:/ClaudeWindows/claude-dev-portfolio/projects/${project.path}`,
        localPort: project.localPort
      }));
      
      // Add the main portfolio project
      projectsData.unshift({
        id: 'portfolio',
        title: 'Portfolio Hub',
        path: 'D:/ClaudeWindows/claude-dev-portfolio',
        localPort: 5173
      });
      
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const createVSCodeInstance = (project: Project, tabLabel?: string) => {
    const instance: VSCodeInstance = {
      id: `vscode-${project.id}-${Date.now()}`,
      projectId: project.id,
      projectPath: project.path,
      port: 8080, // VS Code Server port
      title: tabLabel || `${project.title}`,
      isRunning: true
    };
    
    setInstances(prev => [...prev, instance]);
    setActiveInstanceId(instance.id);
    
    // Set default workspace for this instance
    setInstanceWorkspaces(prev => ({
      ...prev,
      [instance.id]: project.path
    }));
    
    // Initialize tip state
    setInstanceTipsShown(prev => ({
      ...prev,
      [instance.id]: false
    }));
  };

  const closeInstance = (instanceId: string) => {
    setInstances(prev => prev.filter(instance => instance.id !== instanceId));
    
    // Clean up workspace state
    setInstanceWorkspaces(prev => {
      const newWorkspaces = { ...prev };
      delete newWorkspaces[instanceId];
      return newWorkspaces;
    });
    
    // Clean up tip state
    setInstanceTipsShown(prev => {
      const newTips = { ...prev };
      delete newTips[instanceId];
      return newTips;
    });
    
    if (activeInstanceId === instanceId) {
      const remainingInstances = instances.filter(instance => instance.id !== instanceId);
      setActiveInstanceId(remainingInstances.length > 0 ? remainingInstances[0].id : null);
    }
  };

  // VS Code Server API automation functions
  const executeVSCodeServerAPI = async (command: string, args?: any): Promise<boolean> => {
    // IMPORTANT: VS Code Server doesn't expose REST APIs for command execution
    // This is a security limitation. The automation will always fall back to clipboard.
    // Future enhancement: Could use browser extension or postMessage to VS Code iframe
    return false;
    
    /* 
    // This code is commented out because VS Code Server doesn't expose these endpoints
    // Keeping for future reference if API becomes available
    try {
      const response = await fetch('http://localhost:8080/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: command,
          arguments: args || []
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('VS Code command executed successfully:', result);
        return true;
      } else {
        console.warn('VS Code API call failed:', response.status);
        return false;
      }
    } catch (error) {
      console.warn('VS Code Server API not available:', error);
      return false;
    }
    */
  };

  const executeRemoteVSCodeCommand = async (command: string) => {
    // For remote VS Code Server commands - always use clipboard
    const remoteCommand = `# Execute this in the remote VS Code Server at http://localhost:8080
# Use Ctrl+Shift+P in the remote browser VS Code and paste:
${command}`;
    
    try {
      await copyText(remoteCommand);
      showBrowserNotification(`📋 Remote VS Code command copied: ${command}`, 'info');
      showBrowserNotification('💡 Open http://localhost:8080, press Ctrl+Shift+P, and paste the command', 'info');
    } catch (error) {
      showBrowserNotification(`⚠️ Remote VS Code Command: ${command}`, 'warning');
      showBrowserNotification('Execute in VS Code Server at http://localhost:8080 (Ctrl+Shift+P)', 'info');
    }
  };

  const executeVSCodeCommand = async (command: string) => {
    // Debug: console.log('Executing VS Code command:', command, 'Server status:', serverStatus, 'Automation status:', automationStatus);
    
    if (serverStatus !== 'running') {
      showBrowserNotification('❌ VS Code Server is not running', 'error');
      return;
    }

    // Handle new VS Code tab
    if (command === 'new-vscode-tab') {
      const portfolioProject = projects.find(p => p.id === 'portfolio');
      if (portfolioProject) {
        const tabNumber = instances.length + 1;
        createVSCodeInstance(portfolioProject, `VS Code Tab ${tabNumber}`);
        showBrowserNotification(`✅ New VS Code tab created: "VS Code Tab ${tabNumber}"`, 'info');
      }
      return;
    }

    // Handle portfolio workspace - Try automation first
    if (command === 'open-portfolio-workspace') {
      const workspacePath = 'D:/ClaudeWindows/claude-dev-portfolio/portfolio-dev.code-workspace';
      
      // Try automated workspace opening
      const success = await executeVSCodeServerAPI('workbench.action.openWorkspace', [
        { uri: `file:///${workspacePath.replace(/\\/g, '/')}` }
      ]);
      
      if (success) {
        showBrowserNotification('✅ Portfolio workspace opened automatically!', 'info');
        return;
      } else {
        // Fallback to clipboard method
        const windowsPath = workspacePath.replace(/\//g, '\\');
        if (isVSCodeEnvironment()) {
          await openInVSCode(windowsPath);
          showNotification(`Opening workspace: ${windowsPath}`);
          showBrowserNotification(`🚀 Opening workspace: ${windowsPath}`, 'info');
        } else {
          await copyTextToClipboard(windowsPath, '💡 In VS Code: Ctrl+Shift+P → "File: Open Workspace from File" → Paste path');
        }
        return;
      }
    }

    // Handle custom project opening - Try automation first
    if (command.startsWith('open-project-')) {
      const projectId = command.replace('open-project-', '');
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const projectPath = project.path;
        
        // Try automated folder opening
        const success = await executeVSCodeServerAPI('vscode.openFolder', [
          { uri: `file:///${projectPath.replace(/\\/g, '/')}` }
        ]);
        
        if (success) {
          showBrowserNotification(`✅ ${project.title} opened automatically!`, 'info');
          return;
        } else {
          // Fallback to clipboard method
          const folderPath = projectPath.replace(/\//g, '\\');
          if (isVSCodeEnvironment()) {
            await openFolder(folderPath);
            showNotification(`Opening folder: ${folderPath}`);
            showBrowserNotification(`📁 Opening folder: ${folderPath}`, 'info');
          } else {
            await copyTextToClipboard(folderPath, '💡 In VS Code: Ctrl+Shift+P → "File: Open Folder" → Paste path');
          }
          return;
        }
      }
    }

    // Handle terminal commands - Try API automation first
    if (command.startsWith('npm-') || command.startsWith('git-')) {
      const terminalCommand = command.replace('npm-', 'npm ').replace('git-', 'git ').replace('-', ' ');
      
      // Try automated terminal execution
      const success = await executeVSCodeServerAPI('workbench.action.terminal.sendSequence', [
        { text: terminalCommand + '\r' }
      ]);
      
      if (success) {
        showBrowserNotification(`✅ Command executed automatically: ${terminalCommand}`, 'info');
        return;
      } else {
        // Fallback to clipboard method
        if (isVSCodeEnvironment()) {
          await executeCommand(terminalCommand, 'VS Code Command');
          showNotification(`Executing command: ${terminalCommand}`);
          showBrowserNotification(`⚡ Executing command: ${terminalCommand}`, 'info');
        } else {
          await copyTextToClipboard(terminalCommand, '💡 In VS Code: Ctrl+` (open terminal) → Paste & Enter');
        }
        return;
      }
    }

    // Execute VS Code command palette commands - Try automation first
    try {
      const success = await executeVSCodeServerAPI(command);
      
      if (success) {
        const commandName = getCommandDisplayName(command);
        showBrowserNotification(`✅ Command executed automatically: ${commandName}`, 'info');
        return;
      } else {
        // Fallback to clipboard method
        const commandName = getCommandDisplayName(command);
        try {
          if (isVSCodeEnvironment()) {
            showNotification(`Command: ${commandName}`);
            showBrowserNotification(`📋 Command ready: ${commandName}`, 'info');
          } else {
            await copyTextToClipboard(commandName, '💡 In VS Code: Ctrl+Shift+P → Paste & Enter');
          }
        } catch (clipboardError) {
          console.error('Clipboard access failed:', clipboardError);
          showBrowserNotification(`⚠️ Cannot access clipboard. Command: ${commandName}`, 'warning');
          showBrowserNotification('💡 Manually use: Ctrl+Shift+P in VS Code → Type the command', 'info');
        }
      }
    } catch (error) {
      console.error('Failed to execute VS Code command:', error);
      showBrowserNotification(`❌ Command execution failed: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const getCommandDisplayName = (command: string) => {
    const commandMap: Record<string, string> = {
      'workbench.action.files.openFolder': 'File: Open Folder',
      'workbench.action.files.openFileFolder': 'File: Open File or Folder',
      'workbench.action.openWorkspace': 'File: Open Workspace from File',
      'terminal.new': 'Terminal: Create New Terminal',
      'terminal.split': 'Terminal: Split Terminal',
      'workbench.action.terminal.clear': 'Terminal: Clear'
    };
    return commandMap[command] || command;
  };

  const copyTextToClipboard = async (text: string, description?: string) => {
    try {
      if (isVSCodeEnvironment()) {
        showNotification(`Copied: ${text}`);
        showBrowserNotification(`📋 Copied to clipboard: ${text}`, 'info');
      } else {
        await copyText(text);
        showBrowserNotification(`📋 Copied to clipboard: ${text}`, 'info');
      }
      
      if (description) {
        showBrowserNotification(description, 'info');
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showBrowserNotification(`❌ Failed to copy to clipboard: ${text}`, 'error');
    }
  };

  const checkVSCodeServerStatus = async () => {
    try {
      // Use HTTP HEAD request to check if VS Code Server is running (port 8080)
      // VS Code Server provides HTTP interface, not WebSocket
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch('http://localhost:8080', {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors'
      });
      
      clearTimeout(timeout);
      return true; // If we get here, server is responding
    } catch (error) {
      // Server not responding or timeout - this is expected when VS Code Server is not running
      return false;
    }
  };

  const [serverStatus, setServerStatus] = useState<'checking' | 'running' | 'stopped'>('checking');
  const [automationStatus, setAutomationStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');

  const checkAutomationAvailability = async (): Promise<boolean> => {
    // VS Code Server (serve-web) doesn't expose REST APIs for security reasons
    // Always return false to use clipboard method
    // Removed console.log to reduce noise
    return false;
    
    /* 
    // Future: Could implement automation via:
    // 1. Browser extension with content script injection
    // 2. VS Code extension with WebSocket communication  
    // 3. PostMessage communication with VS Code iframe (limited by security)
    // 4. Custom VS Code Server build with API endpoints
    
    try {
      // Test multiple potential API endpoints
      const endpoints = [
        'http://localhost:8080/api/commands',
        'http://localhost:8080/api/execute-command', 
        'http://localhost:8080/vscode-server-api/commands'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'HEAD',
            credentials: 'include'
          });
          if (response.ok) {
            console.log('VS Code API available at:', endpoint);
            return true;
          }
        } catch (e) {
          console.log('API not available at:', endpoint);
        }
      }
      
      console.log('No VS Code Server API endpoints found - using clipboard fallback');
      return false;
    } catch {
      return false;
    }
    */
  };

  useEffect(() => {
    const checkStatus = async () => {
      const isRunning = await checkVSCodeServerStatus();
      const newStatus = isRunning ? 'running' : 'stopped';
      
      // Check automation availability when server is running
      if (newStatus === 'running') {
        const isAutomationAvailable = await checkAutomationAvailability();
        setAutomationStatus(isAutomationAvailable ? 'available' : 'unavailable');
      } else {
        setAutomationStatus('unknown');
      }
      
      // Auto-load portfolio when server starts running and no instances exist
      if (newStatus === 'running' && serverStatus !== 'running' && instances.length === 0 && projects.length > 0) {
        const portfolioProject = projects.find(p => p.id === 'portfolio');
        if (portfolioProject) {
          createVSCodeInstance(portfolioProject, 'Portfolio Hub');
        }
      }
      
      setServerStatus(newStatus);
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [serverStatus, instances.length, projects]);

  const startVSCodeServer = async () => {
    if (isVSCodeEnvironment()) {
      // ✅ SECURE: Use VS Code extension integration for server startup
      if (window.vsCodePortfolio?.postMessage) {
        // Send message to VS Code extension to start server securely
        window.vsCodePortfolio.postMessage({
          type: 'server:start',
          serverType: 'vscode-web',
          port: 8080
        });
        showNotification('Starting VS Code Server via extension...', 'info');
      } else {
        // Fallback: Use PowerShell script that's pre-approved
        try {
          // Use the dedicated PowerShell script for better error handling and user experience
          const scriptCommand = 'powershell -File "D:\\ClaudeWindows\\claude-dev-portfolio\\scripts\\start-vscode-server.ps1"';
          console.log('Starting VS Code server with PowerShell script:', scriptCommand);
          await executeCommand(scriptCommand, 'Start VS Code Server');
          showNotification('VS Code Server startup initiated! Check terminal for details.', 'info');
          
        } catch (error) {
          console.error('Failed to start VS Code server:', error);
          showNotification('Failed to start VS Code server. Commands may be blocked by security. Try manual setup using clipboard commands below.', 'error');
        }
        
        // Show helpful message after startup with new window option
        setTimeout(() => {
          showNotification('💡 VS Code Server starting! Use the 🔗 button to open in a new browser window for the best experience.', 'info');
        }, 5000);
      }
    } else {
      // For non-VS Code environments, copy the full command set with workspace setup
      const commands = `# Stop VS Code Server first (if running)
Stop-Process -Name "code-tunnel" -Force -ErrorAction SilentlyContinue

# Change to portfolio directory  
Set-Location "D:\\ClaudeWindows\\claude-dev-portfolio"

# Verify location
Write-Host "Starting VS Code Server from: $(Get-Location)"

# Start VS Code Server with workspace
code serve-web --port 8080 --host 0.0.0.0 --without-connection-token --accept-server-license-terms`;

      try {
        await copyText(commands);
        showBrowserNotification('📋 VS Code Server commands copied!', 'info');
        showBrowserNotification('💡 Run the copied commands in PowerShell to start the VS Code Server', 'info');
        showBrowserNotification('🎯 Pro Tip: Use the 🔗 button to open in a separate browser window for full functionality', 'info');
      } catch (error) {
        showBrowserNotification('⚠️ Failed to copy to clipboard - check console for commands', 'warning');
        console.log('To start VS Code Server:', commands);
      }
    }
  };

  const activeInstance = instances.find(instance => instance.id === activeInstanceId);

  // Helper function to render automation badge
  const AutomationBadge = ({ show }: { show: boolean }) => {
    if (!show || automationStatus === 'unknown') return null;
    
    return (
      <span className={`automation-badge ${automationStatus}`}>
        {automationStatus === 'available' ? '⚡' : '📋'}
      </span>
    );
  };

  return (
    <div className="vscode-manager">
      <div className="vscode-toolbar">
        <div className="toolbar-left">
          <h3>VS Code Server</h3>
          <div className="server-status">
            <span className={`status-indicator ${serverStatus}`}>
              {serverStatus === 'running' ? '●' : serverStatus === 'checking' ? '○' : '●'}
            </span>
            <span className="status-text">
              Server: {serverStatus === 'running' ? 'Running' : serverStatus === 'checking' ? 'Checking...' : 'Stopped'}
            </span>
            {serverStatus === 'stopped' && (
              <button onClick={() => {
                startVSCodeServer();
                showBrowserNotification('🚀 Starting VS Code Server...', 'info');
              }} className="start-server-btn">
                Launch VS Code Server
              </button>
            )}
            {serverStatus === 'running' && (
              <button onClick={() => {
                window.open('http://localhost:8080', '_blank');
                showBrowserNotification('🌐 Opening VS Code Server in new window', 'info');
              }} className="open-external-btn">
                🔗 Open in New Window
              </button>
            )}
          </div>
        </div>
        
        <div className="toolbar-right">
          <div className="server-info">
            <span className="info-text">
              {serverStatus === 'running' ? (
                automationStatus === 'available' ? 
                  '⚡ Full VS Code in browser - Click 🔗 to open in new window' :
                  automationStatus === 'unavailable' ?
                  '🌐 VS Code Server running - Use 🔗 button to open externally' :
                  'VS Code Server ready - Use tabs below or open externally'
              ) : 'Start server to launch VS Code in browser'}
            </span>
          </div>
        </div>
      </div>

      {(instances.length > 0 || serverStatus === 'running') && (
        <div className="vscode-tabs">
          {/* VS Code Commands Tab - Always visible when server running */}
          {serverStatus === 'running' && (
            <div
              className={`vscode-tab commands-tab ${activeInstanceId === 'commands' ? 'active' : ''}`}
              onClick={() => setActiveInstanceId('commands')}
              title="VS Code Commands"
            >
              <SvgIcon name="settings" className="tab-icon" />
            </div>
          )}
          
          {/* Cheat Sheet Tab - Always visible when server running */}
          {serverStatus === 'running' && (
            <div
              className={`vscode-tab cheatsheet-tab ${activeInstanceId === 'cheatsheet' ? 'active' : ''}`}
              onClick={() => setActiveInstanceId('cheatsheet')}
              title="PowerShell & Development Commands"
            >
              <SvgIcon name="terminal" className="tab-icon" />
            </div>
          )}
          
          {/* AI Prompts Tab - Always visible when server running */}
          {serverStatus === 'running' && (
            <div
              className={`vscode-tab prompts-tab ${activeInstanceId === 'prompts' ? 'active' : ''}`}
              onClick={() => setActiveInstanceId('prompts')}
              title="Claude AI Prompts & Commands"
            >
              <SvgIcon name="github" className="tab-icon" />
            </div>
          )}
          
          {/* Extensions Tab - Always visible when server running */}
          {serverStatus === 'running' && (
            <div
              className={`vscode-tab extensions-tab ${activeInstanceId === 'extensions' ? 'active' : ''}`}
              onClick={() => setActiveInstanceId('extensions')}
              title="VS Code Extensions & Remote Installation"
            >
              <SvgIcon name="package" className="tab-icon" />
              <span className="tab-title">VS Remote</span>
            </div>
          )}
          
          {/* Regular VS Code Instance Tabs */}
          {instances.map(instance => (
            <div
              key={instance.id}
              className={`vscode-tab ${activeInstanceId === instance.id ? 'active' : ''}`}
              onClick={() => setActiveInstanceId(instance.id)}
            >
              <SvgIcon name="code" className="tab-icon" />
              <span className="tab-title">{instance.title || projects.find(p => p.id === instance.projectId)?.title || instance.projectId}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeInstance(instance.id);
                }}
                className="tab-close"
              >
                <SvgIcon name="x" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="vscode-content-area">
        {/* Render all VS Code instances but only show the active one */}
        {instances.map(instance => (
          <div
            key={instance.id}
            style={{ display: activeInstanceId === instance.id ? 'block' : 'none' }}
            className="vscode-instance-container"
          >
            <VSCodeTerminal
              projectPath={instance.projectPath}
              serverPort={instance.port}
              onClose={() => closeInstance(instance.id)}
              className="active-vscode-terminal"
              workspacePath={instanceWorkspaces[instance.id]}
            />
          </div>
        ))}
        
        {/* Command panels and other non-instance content */}
        {activeInstanceId === 'commands' && (
          // VS Code Commands Panel
          <div className="vscode-commands-panel">
            <div className="commands-header">
              <SvgIcon name="settings" className="header-icon" />
              <h3>VS Code Commands</h3>
              <p>Execute commands in your VS Code Server instance</p>
              {automationStatus !== 'unknown' && (
                <div className={`automation-status ${automationStatus}`}>
                  {automationStatus === 'available' ? 
                    '⚡ Automation enabled - Commands execute automatically!' :
                    '📋 API unavailable - Commands copy to clipboard for manual execution'
                  }
                </div>
              )}
              <div className="keyboard-hint">
                <SvgIcon name="terminal" />
                <span>Most commands start with <kbd>Ctrl+Shift+P</kbd> in VS Code</span>
              </div>
            </div>
            
            <div className="command-groups">
              <div className="command-group">
                <h4><SvgIcon name="folder" /> Project Navigation</h4>
                <div className="command-buttons">
                  <button onClick={() => {
                    executeVSCodeCommand('workbench.action.files.openFolder');
                    showBrowserNotification('📁 Opening folder dialog...', 'info');
                  }} className="command-btn">
                    <SvgIcon name="folder" />
                    Open Folder...
                  </button>
                  <button onClick={() => {
                    executeVSCodeCommand('workbench.action.openWorkspace');
                    showBrowserNotification('📄 Opening workspace dialog...', 'info');
                  }} className="command-btn">
                    <SvgIcon name="fileText" />
                    Open Workspace...
                  </button>
                  <button onClick={() => {
                    executeVSCodeCommand('open-portfolio-workspace');
                    showBrowserNotification('⚙️ Opening Portfolio workspace...', 'info');
                  }} className="command-btn primary">
                    <SvgIcon name="settings" />
                    Open Portfolio Workspace
                    <AutomationBadge show={true} />
                  </button>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="code" /> VS Code Tabs</h4>
                <div className="command-buttons">
                  <button onClick={() => {
                    executeVSCodeCommand('new-vscode-tab');
                    showBrowserNotification('➕ Creating new VS Code tab...', 'info');
                  }} className="command-btn">
                    <SvgIcon name="plus" />
                    New VS Code Tab
                  </button>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="terminal" /> Terminal Commands</h4>
                <div className="command-buttons">
                  <button onClick={() => {
                    executeVSCodeCommand('terminal.new');
                    showBrowserNotification('🖥️ Creating new terminal...', 'info');
                  }} className="command-btn">
                    <SvgIcon name="plus" />
                    New Terminal
                  </button>
                  <button onClick={() => {
                    executeVSCodeCommand('terminal.split');
                    showBrowserNotification('📋 Splitting terminal...', 'info');
                  }} className="command-btn">
                    <SvgIcon name="copy" />
                    Split Terminal
                  </button>
                  <button onClick={() => {
                    executeVSCodeCommand('workbench.action.terminal.clear');
                    showBrowserNotification('🧹 Clearing terminal...', 'info');
                  }} className="command-btn">
                    <SvgIcon name="x" />
                    Clear Terminal
                  </button>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="play" /> Development</h4>
                <div className="command-buttons">
                  <button onClick={() => {
                    executeVSCodeCommand('npm-run-dev');
                    showBrowserNotification('🚀 Running npm dev...', 'info');
                  }} className="command-btn">
                    <SvgIcon name="play" />
                    npm run dev
                    <AutomationBadge show={true} />
                  </button>
                  <button onClick={() => {
                    executeVSCodeCommand('npm-install');
                    showBrowserNotification('📦 Installing npm packages...', 'info');
                  }} className="command-btn">
                    <SvgIcon name="settings" />
                    npm install
                    <AutomationBadge show={true} />
                  </button>
                  <button onClick={() => {
                    executeVSCodeCommand('git-status');
                    showBrowserNotification('📊 Checking git status...', 'info');
                  }} className="command-btn">
                    <SvgIcon name="github" />
                    git status
                    <AutomationBadge show={true} />
                  </button>
                  <button onClick={() => {
                    executeVSCodeCommand('git-pull');
                    showBrowserNotification('⬇️ Pulling from git...', 'info');
                  }} className="command-btn">
                    <SvgIcon name="refreshCw" />
                    git pull
                    <AutomationBadge show={true} />
                  </button>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="folder" /> Quick Open Projects</h4>
                <div className="command-buttons">
                  {projects.map(project => (
                    <button 
                      key={project.id} 
                      onClick={() => {
                        executeVSCodeCommand(`open-project-${project.id}`);
                        showBrowserNotification(`📁 Opening ${project.title}...`, 'info');
                      }} 
                      className="command-btn"
                    >
                      <SvgIcon name="folder" />
                      {project.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeInstanceId === 'cheatsheet' && (
          // PowerShell & Development Commands Panel
          <div className="vscode-commands-panel">
            <div className="commands-header">
              <SvgIcon name="terminal" className="header-icon" />
              <h3>PowerShell & Development Commands</h3>
              <p>Essential Windows development commands for daily workflow</p>
              <div className="keyboard-hint">
                <SvgIcon name="terminal" />
                <span>All commands can be copied by clicking the copy icon</span>
              </div>
            </div>
            
            <div className="command-groups">
              <div className="command-group">
                <h4><SvgIcon name="code" /> Claude Code Commands</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('claude', 'Start Claude Code interactive session')}>
                    <code>claude</code>
                    <span>Start Claude Code interactive session</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('claude mcp list', 'List all configured MCP servers')}>
                    <code>claude mcp list</code>
                    <span>List all configured MCP servers</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('claude commit', 'AI-assisted git commit with generated messages')}>
                    <code>claude commit</code>
                    <span>AI-assisted git commit with generated messages</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="terminal" /> PowerShell Navigation</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('Set-Location "D:\\ClaudeWindows"', 'Navigate to directory (PowerShell cd equivalent)')}>
                    <code>Set-Location "D:\ClaudeWindows"</code>
                    <span>Navigate to directory (PowerShell cd equivalent)</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('Get-ChildItem', 'List directory contents (PowerShell ls equivalent)')}>
                    <code>Get-ChildItem</code>
                    <span>List directory contents (PowerShell ls equivalent)</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('New-Item -ItemType Directory -Name "folder"', 'Create new directory')}>
                    <code>New-Item -ItemType Directory -Name "folder"</code>
                    <span>Create new directory</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('Remove-Item -Recurse -Force "folder"', 'Delete directory recursively')}>
                    <code>Remove-Item -Recurse -Force "folder"</code>
                    <span>Delete directory recursively</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('explorer.exe .', 'Open current directory in Windows Explorer')}>
                    <code>explorer.exe .</code>
                    <span>Open current directory in Windows Explorer</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="github" /> Git Commands</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('git status', 'Check repository status')}>
                    <code>git status</code>
                    <span>Check repository status</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('git add .', 'Stage all changes')}>
                    <code>git add .</code>
                    <span>Stage all changes</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('git commit -m "message"', 'Commit with message')}>
                    <code>git commit -m "message"</code>
                    <span>Commit with message</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('git checkout -b feature-branch', 'Create and switch to new branch')}>
                    <code>git checkout -b feature-branch</code>
                    <span>Create and switch to new branch</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('git push origin main', 'Push to remote repository')}>
                    <code>git push origin main</code>
                    <span>Push to remote repository</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="package" /> Node.js & npm</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('npm init -y', 'Initialize new Node.js project')}>
                    <code>npm init -y</code>
                    <span>Initialize new Node.js project</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('npm install', 'Install dependencies from package.json')}>
                    <code>npm install</code>
                    <span>Install dependencies from package.json</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('npm run dev', 'Start development server')}>
                    <code>npm run dev</code>
                    <span>Start development server</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('npm run build', 'Build production version')}>
                    <code>npm run build</code>
                    <span>Build production version</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('npx create-react-app myapp', 'Create new React application')}>
                    <code>npx create-react-app myapp</code>
                    <span>Create new React application</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="code" /> VS Code Integration</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code .', 'Open current directory in VS Code')}>
                    <code>code .</code>
                    <span>Open current directory in VS Code</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code filename.js', 'Open specific file in VS Code')}>
                    <code>code filename.js</code>
                    <span>Open specific file in VS Code</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code serve-web --port 8080', 'Start VS Code server for remote access')}>
                    <code>code serve-web --port 8080</code>
                    <span>Start VS Code server for remote access</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="settings" /> System Commands</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('Get-Process', 'List running processes')}>
                    <code>Get-Process</code>
                    <span>List running processes</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('Stop-Process -Name "process" -Force', 'Kill process by name')}>
                    <code>Stop-Process -Name "process" -Force</code>
                    <span>Kill process by name</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('netstat -ano | findstr :3000', 'Check what\'s using port 3000')}>
                    <code>netstat -ano | findstr :3000</code>
                    <span>Check what's using port 3000</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('Get-Location', 'Show current directory path')}>
                    <code>Get-Location</code>
                    <span>Show current directory path</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeInstanceId === 'extensions' && (
          // VS Code Extensions Panel
          <div className="vscode-commands-panel">
            <div className="commands-header">
              <SvgIcon name="package" className="header-icon" />
              <h3>VS Code Extensions & Remote Installation</h3>
              <p>Install and manage VS Code extensions for remote development</p>
              <div className="keyboard-hint">
                <SvgIcon name="package" />
                <span>Commands copy to clipboard for execution in VS Code terminal</span>
              </div>
            </div>
            
            <div className="command-groups">
              <div className="command-group">
                <h4><SvgIcon name="globe" /> Remote VS Code Extension Management</h4>
                <div className="command-buttons">
                  <button onClick={() => {
                    executeRemoteVSCodeCommand('Extensions: Install Extensions');
                    showBrowserNotification('📦 Extension installation instructions copied', 'info');
                  }} className="command-btn primary">
                    <SvgIcon name="plus" />
                    Install Extension (Remote)
                    <span className="remote-badge">🌐</span>
                  </button>
                  <button onClick={() => {
                    executeRemoteVSCodeCommand('Extensions: Show Installed Extensions');
                    showBrowserNotification('📋 Show installed extensions command copied', 'info');
                  }} className="command-btn">
                    <SvgIcon name="package" />
                    Show Installed (Remote)
                    <span className="remote-badge">🌐</span>
                  </button>
                  <button onClick={() => {
                    executeRemoteVSCodeCommand('Extensions: Show Enabled Extensions');
                    showBrowserNotification('📋 Show enabled extensions command copied', 'info');
                  }} className="command-btn">
                    <SvgIcon name="check" />
                    Show Enabled (Remote)
                    <span className="remote-badge">🌐</span>
                  </button>
                </div>
                <p className="command-group-note">
                  <SvgIcon name="info" />
                  These commands work in your remote VS Code Server at <code>http://localhost:8080</code>
                </p>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="terminal" /> Terminal Extension Commands (For Remote Server)</h4>
                <div className="command-buttons">
                  <button 
                    onClick={() => copyTextToClipboard('code --install-extension ./vscode-extension/claude-portfolio/claude-portfolio-vscode-pages.vsix', 'Install Claude Portfolio extension in remote VS Code Server via terminal')}
                    className="command-btn"
                  >
                    <SvgIcon name="code" />
                    Install Claude Portfolio Extension
                    <span className="remote-badge">🖥️</span>
                  </button>
                  <button 
                    onClick={() => copyTextToClipboard('code --list-extensions', 'List all extensions installed in remote server')}
                    className="command-btn"
                  >
                    <SvgIcon name="search" />
                    List All Remote Extensions
                  </button>
                  <button 
                    onClick={() => copyTextToClipboard('code --install-extension ms-python.python', 'Install Python extension in remote server')}
                    className="command-btn"
                  >
                    <SvgIcon name="package" />
                    Install Python Extension
                  </button>
                </div>
                <p className="command-group-note">
                  <SvgIcon name="terminal" />
                  Run these commands in a terminal on the machine hosting VS Code Server
                </p>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="terminal" /> CLI Extension Commands</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --install-extension ms-python.python', 'Install Python extension via command line')}>
                    <code>code --install-extension ms-python.python</code>
                    <span>Install Python extension via CLI</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --install-extension ms-vscode.vscode-typescript-next', 'Install TypeScript extension')}>
                    <code>code --install-extension ms-vscode.vscode-typescript-next</code>
                    <span>Install TypeScript Nightly extension</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --install-extension esbenp.prettier-vscode', 'Install Prettier code formatter')}>
                    <code>code --install-extension esbenp.prettier-vscode</code>
                    <span>Install Prettier code formatter</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --install-extension bradlc.vscode-tailwindcss', 'Install Tailwind CSS IntelliSense')}>
                    <code>code --install-extension bradlc.vscode-tailwindcss</code>
                    <span>Install Tailwind CSS IntelliSense</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --list-extensions', 'List all installed extensions')}>
                    <code>code --list-extensions</code>
                    <span>List all installed extensions</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --list-extensions --show-versions', 'List extensions with version numbers')}>
                    <code>code --list-extensions --show-versions</code>
                    <span>List extensions with version numbers</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="globe" /> Remote Development Extensions</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --install-extension ms-vscode-remote.remote-ssh', 'Install Remote SSH extension')}>
                    <code>code --install-extension ms-vscode-remote.remote-ssh</code>
                    <span>Install Remote SSH extension for remote development</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --install-extension ms-vscode-remote.remote-wsl', 'Install Remote WSL extension')}>
                    <code>code --install-extension ms-vscode-remote.remote-wsl</code>
                    <span>Install Remote WSL extension for Linux subsystem</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --install-extension ms-vscode-remote.remote-containers', 'Install Remote Containers extension')}>
                    <code>code --install-extension ms-vscode-remote.remote-containers</code>
                    <span>Install Remote Containers for Docker development</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --install-extension ms-vscode.remote-explorer', 'Install Remote Explorer')}>
                    <code>code --install-extension ms-vscode.remote-explorer</code>
                    <span>Install Remote Explorer for managing connections</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="settings" /> Extension Management</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --disable-extension EXTENSION_ID', 'Disable specific extension')}>
                    <code>code --disable-extension EXTENSION_ID</code>
                    <span>Disable specific extension (replace EXTENSION_ID)</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --enable-extension EXTENSION_ID', 'Enable specific extension')}>
                    <code>code --enable-extension EXTENSION_ID</code>
                    <span>Enable specific extension (replace EXTENSION_ID)</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --uninstall-extension EXTENSION_ID', 'Uninstall specific extension')}>
                    <code>code --uninstall-extension EXTENSION_ID</code>
                    <span>Uninstall specific extension (replace EXTENSION_ID)</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('code --install-extension ./path/to/extension.vsix', 'Install extension from VSIX file')}>
                    <code>code --install-extension ./path/to/extension.vsix</code>
                    <span>Install extension from local VSIX file</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeInstanceId === 'prompts' && (
          // Claude AI Prompts Panel
          <div className="vscode-commands-panel">
            <div className="commands-header">
              <SvgIcon name="github" className="header-icon" />
              <h3>Claude AI Prompts & Techniques</h3>
              <p>Powerful AI prompts for enhanced development and problem-solving</p>
              <div className="keyboard-hint">
                <SvgIcon name="github" />
                <span>Click prompts to copy - paste into Claude for best results</span>
              </div>
            </div>
            
            <div className="command-groups">
              <div className="command-group">
                <h4><SvgIcon name="github" /> Deep Analysis Prompts</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('think hard about this architecture', 'Prompt for deep architectural analysis')}>
                    <code>"think hard about this architecture"</code>
                    <span>Deep architectural analysis with critical evaluation</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('ultrathink through this complex problem', 'Maximum thinking mode for complex issues')}>
                    <code>"ultrathink through this complex problem"</code>
                    <span>Maximum depth analysis (31,999 token thinking)</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('analyze the security implications of this code', 'Security-focused code review')}>
                    <code>"analyze the security implications"</code>
                    <span>Security-focused analysis and vulnerability assessment</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="settings" /> Multi-Agent Coordination</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('deploy 3 sub-agents in parallel to research', 'Use multiple AI agents for complex tasks')}>
                    <code>"deploy 3 sub-agents in parallel"</code>
                    <span>Parallel AI agents for complex research tasks</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('/senior-engineer', 'Get expert code review and architecture guidance')}>
                    <code>"/senior-engineer"</code>
                    <span>Expert code reviews and architecture guidance</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('/execute optimize React performance', 'Task execution with intelligent routing')}>
                    <code>"/execute [task]"</code>
                    <span>Quick task execution with intelligent agent routing</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="fileText" /> Code Quality & Review</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('review this code for best practices and potential improvements', 'Comprehensive code review')}>
                    <code>"review this code for best practices"</code>
                    <span>Comprehensive code quality analysis</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('refactor this to be more maintainable and performant', 'Code refactoring suggestions')}>
                    <code>"refactor this to be more maintainable"</code>
                    <span>Refactoring suggestions for better maintainability</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('add comprehensive error handling and logging', 'Error handling improvements')}>
                    <code>"add comprehensive error handling"</code>
                    <span>Improve error handling and logging strategies</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="play" /> Development Workflow</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('create a comprehensive test suite for this component', 'Test generation prompt')}>
                    <code>"create comprehensive test suite"</code>
                    <span>Generate thorough test coverage for components</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('document this code with clear examples and usage', 'Documentation generation')}>
                    <code>"document this code with examples"</code>
                    <span>Generate clear documentation with usage examples</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('optimize this for performance and bundle size', 'Performance optimization')}>
                    <code>"optimize for performance and bundle size"</code>
                    <span>Performance optimization and bundle size reduction</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="helpCircle" /> Problem Solving</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyTextToClipboard('debug this issue step by step', 'Systematic debugging approach')}>
                    <code>"debug this issue step by step"</code>
                    <span>Systematic debugging and troubleshooting</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('suggest alternative approaches to solve this problem', 'Alternative solutions')}>
                    <code>"suggest alternative approaches"</code>
                    <span>Multiple solution strategies and trade-offs</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyTextToClipboard('explain this like I am a senior developer', 'Technical explanation')}>
                    <code>"explain this like I am a senior developer"</code>
                    <span>Technical explanations with advanced context</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Empty state when no instances and no special tab selected */}
        {instances.length === 0 && !['commands', 'cheatsheet', 'prompts', 'extensions'].includes(activeInstanceId || '') && (
          <div className="vscode-empty-state">
            <SvgIcon name="code" className="empty-icon" />
            <h3>No VS Code Instances</h3>
            <p>Click the Commands tab (⚙️) above or create a new VS Code tab</p>
            <div className="workspace-instructions">
              <p><strong>💡 Pro Tip:</strong> After opening VS Code:</p>
              <ol>
                <li>Use <code>File → Open Workspace from File...</code></li>
                <li>Navigate to <code>D:\ClaudeWindows\claude-dev-portfolio</code></li>
                <li>Select <code>portfolio-absolute-paths.code-workspace</code></li>
              </ol>
              <p>This will automatically load all project folders with optimized settings!</p>
              <p className="troubleshooting-note">If folders don't appear, use <code>File → Add Folder to Workspace</code> and add the Portfolio Hub, Projects, and Scripts folders manually.</p>
            </div>
            <div className="quick-actions">
              <button
                onClick={() => {
                  const portfolioProject = projects.find(p => p.id === 'portfolio');
                  if (portfolioProject) {
                    createVSCodeInstance(portfolioProject, 'Portfolio Hub');
                    showBrowserNotification('📁 Opening Portfolio Hub in VS Code', 'info');
                  }
                }}
                className="quick-action-btn"
                disabled={serverStatus !== 'running'}
              >
                <SvgIcon name="folder" />
                Open VS Code
              </button>
              <button
                onClick={() => {
                  executeVSCodeCommand('new-vscode-tab');
                  showBrowserNotification('➕ Creating new VS Code tab', 'info');
                }}
                className="quick-action-btn"
                disabled={serverStatus !== 'running'}
              >
                <SvgIcon name="plus" />
                New Tab
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};