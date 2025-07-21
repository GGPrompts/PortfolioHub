import React, { useState, useEffect } from 'react';
import { VSCodeTerminal } from './VSCodeTerminal';
import SvgIcon from './SvgIcon';
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
  };

  const closeInstance = (instanceId: string) => {
    setInstances(prev => prev.filter(instance => instance.id !== instanceId));
    
    if (activeInstanceId === instanceId) {
      const remainingInstances = instances.filter(instance => instance.id !== instanceId);
      setActiveInstanceId(remainingInstances.length > 0 ? remainingInstances[0].id : null);
    }
  };

  const executeVSCodeCommand = async (command: string) => {
    if (serverStatus !== 'running') {
      alert('VS Code Server is not running');
      return;
    }

    // Handle new VS Code tab
    if (command === 'new-vscode-tab') {
      const portfolioProject = projects.find(p => p.id === 'portfolio');
      if (portfolioProject) {
        const tabNumber = instances.length + 1;
        createVSCodeInstance(portfolioProject, `VS Code Tab ${tabNumber}`);
        alert(`New VS Code tab created: "VS Code Tab ${tabNumber}"`);
      }
      return;
    }

    // Handle portfolio workspace
    if (command === 'open-portfolio-workspace') {
      const workspacePath = 'D:\\ClaudeWindows\\claude-dev-portfolio\\portfolio-dev.code-workspace';
      navigator.clipboard.writeText(workspacePath);
      alert(`Workspace path copied: ${workspacePath}\n\nIn VS Code: Ctrl+Shift+P → "File: Open Workspace from File" → Paste path`);
      return;
    }

    // Handle custom commands
    if (command.startsWith('open-project-')) {
      const projectId = command.replace('open-project-', '');
      const project = projects.find(p => p.id === projectId);
      if (project) {
        // Copy just the clean folder path
        const folderPath = project.path.replace(/\//g, '\\');
        navigator.clipboard.writeText(folderPath);
        alert(`Folder path copied: ${folderPath}\n\nIn VS Code: Ctrl+Shift+P → "File: Open Folder" → Paste path`);
      }
      return;
    }

    // Handle terminal commands
    if (command.startsWith('npm-') || command.startsWith('git-')) {
      const terminalCommand = command.replace('npm-', 'npm ').replace('git-', 'git ').replace('-', ' ');
      navigator.clipboard.writeText(terminalCommand);
      alert(`Command copied: ${terminalCommand}\n\nIn VS Code: Ctrl+\` (open terminal) → Paste & Enter`);
      return;
    }

    // Execute VS Code command palette commands
    try {
      // Copy just the clean command name
      const commandName = getCommandDisplayName(command);
      navigator.clipboard.writeText(commandName);
      alert(`Command copied: ${commandName}\n\nIn VS Code: Ctrl+Shift+P → Paste & Enter`);
    } catch (error) {
      console.error('Failed to execute VS Code command:', error);
      alert('Failed to execute command');
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

  const copyToClipboard = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`Copied: ${text}\n\n${description}`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert(`Failed to copy. Command: ${text}`);
    }
  };

  const checkVSCodeServerStatus = async () => {
    try {
      // Use image loading to check if server is running (avoids CORS issues)
      return new Promise<boolean>((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => {
          resolve(false);
        }, 3000);
        
        img.onload = () => {
          clearTimeout(timeout);
          resolve(true);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          // Even if favicon fails, server might be running - try to detect port
          fetch('http://localhost:8080/', { 
            method: 'HEAD', 
            mode: 'no-cors',
            cache: 'no-cache'
          }).then(() => resolve(true)).catch(() => resolve(false));
        };
        
        img.src = `http://localhost:8080/favicon.ico?t=${Date.now()}`;
      });
    } catch (error) {
      return false;
    }
  };

  const [serverStatus, setServerStatus] = useState<'checking' | 'running' | 'stopped'>('checking');

  useEffect(() => {
    const checkStatus = async () => {
      const isRunning = await checkVSCodeServerStatus();
      const newStatus = isRunning ? 'running' : 'stopped';
      
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

  const startVSCodeServer = () => {
    // Copy the correct command
    const commands = `# Stop VS Code Server first (if running)
Stop-Process -Name "code-tunnel" -Force -ErrorAction SilentlyContinue

# Change to portfolio directory  
Set-Location "D:\\ClaudeWindows\\claude-dev-portfolio"

# Verify location
Write-Host "Starting VS Code Server from: $(Get-Location)"

# Start VS Code Server (profile will be set via window.newWindowProfile setting)
code serve-web --port 8080 --host 0.0.0.0 --without-connection-token --accept-server-license-terms`;
    
    navigator.clipboard.writeText(commands).then(() => {
      alert(`VS Code Server commands copied!\n\n💡 Quick Setup:\n1. Paste and run in PowerShell\n2. Open http://localhost:8080 in your browser\n3. File → Open Workspace → Select "portfolio-dev.code-workspace"\n\nThe workspace file will automatically open all the right folders and apply your development settings!`);
    }).catch(() => {
      alert(`To start VS Code Server:\n\n${commands}`);
    });
  };

  const activeInstance = instances.find(instance => instance.id === activeInstanceId);

  return (
    <div className="vscode-manager">
      <div className="vscode-toolbar">
        <div className="toolbar-left">
          <h3>VS Code Terminals</h3>
          <div className="server-status">
            <span className={`status-indicator ${serverStatus}`}>
              {serverStatus === 'running' ? '●' : serverStatus === 'checking' ? '○' : '●'}
            </span>
            <span className="status-text">
              Server: {serverStatus === 'running' ? 'Running' : serverStatus === 'checking' ? 'Checking...' : 'Stopped'}
            </span>
            {serverStatus === 'stopped' && (
              <button onClick={startVSCodeServer} className="start-server-btn">
                Start Server
              </button>
            )}
          </div>
        </div>
        
        <div className="toolbar-right">
          <div className="server-info">
            <span className="info-text">
              {serverStatus === 'running' ? 'Click the ⚙️ Commands tab for VS Code operations' : 'Start server to access commands'}
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
          
          {/* Regular VS Code Instance Tabs */}
          {instances.map(instance => (
            <div
              key={instance.id}
              className={`vscode-tab ${activeInstanceId === instance.id ? 'active' : ''}`}
              onClick={() => setActiveInstanceId(instance.id)}
            >
              <SvgIcon name="code" className="tab-icon" />
              <span className="tab-title">{projects.find(p => p.id === instance.projectId)?.title || instance.projectId}</span>
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
        {activeInstanceId === 'commands' ? (
          // VS Code Commands Panel
          <div className="vscode-commands-panel">
            <div className="commands-header">
              <SvgIcon name="settings" className="header-icon" />
              <h3>VS Code Commands</h3>
              <p>Quick access to common VS Code operations</p>
              <div className="keyboard-hint">
                <SvgIcon name="terminal" />
                <span>Most commands start with <kbd>Ctrl+Shift+P</kbd> in VS Code</span>
              </div>
            </div>
            
            <div className="command-groups">
              <div className="command-group">
                <h4><SvgIcon name="folder" /> Project Navigation</h4>
                <div className="command-buttons">
                  <button onClick={() => executeVSCodeCommand('workbench.action.files.openFolder')} className="command-btn">
                    <SvgIcon name="folder" />
                    Open Folder...
                  </button>
                  <button onClick={() => executeVSCodeCommand('workbench.action.openWorkspace')} className="command-btn">
                    <SvgIcon name="fileText" />
                    Open Workspace...
                  </button>
                  <button onClick={() => executeVSCodeCommand('open-portfolio-workspace')} className="command-btn primary">
                    <SvgIcon name="settings" />
                    Open Portfolio Workspace
                  </button>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="code" /> VS Code Tabs</h4>
                <div className="command-buttons">
                  <button onClick={() => executeVSCodeCommand('new-vscode-tab')} className="command-btn">
                    <SvgIcon name="plus" />
                    New VS Code Tab
                  </button>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="terminal" /> Terminal Commands</h4>
                <div className="command-buttons">
                  <button onClick={() => executeVSCodeCommand('terminal.new')} className="command-btn">
                    <SvgIcon name="plus" />
                    New Terminal
                  </button>
                  <button onClick={() => executeVSCodeCommand('terminal.split')} className="command-btn">
                    <SvgIcon name="copy" />
                    Split Terminal
                  </button>
                  <button onClick={() => executeVSCodeCommand('workbench.action.terminal.clear')} className="command-btn">
                    <SvgIcon name="x" />
                    Clear Terminal
                  </button>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="play" /> Development</h4>
                <div className="command-buttons">
                  <button onClick={() => executeVSCodeCommand('npm-run-dev')} className="command-btn">
                    <SvgIcon name="play" />
                    npm run dev
                  </button>
                  <button onClick={() => executeVSCodeCommand('npm-install')} className="command-btn">
                    <SvgIcon name="settings" />
                    npm install
                  </button>
                  <button onClick={() => executeVSCodeCommand('git-status')} className="command-btn">
                    <SvgIcon name="github" />
                    git status
                  </button>
                  <button onClick={() => executeVSCodeCommand('git-pull')} className="command-btn">
                    <SvgIcon name="refreshCw" />
                    git pull
                  </button>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="folder" /> Quick Open Projects</h4>
                <div className="command-buttons">
                  {projects.map(project => (
                    <button 
                      key={project.id} 
                      onClick={() => executeVSCodeCommand(`open-project-${project.id}`)} 
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
        ) : activeInstanceId === 'cheatsheet' ? (
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
                  <div className="cheat-item" onClick={() => copyToClipboard('claude', 'Start Claude Code interactive session')}>
                    <code>claude</code>
                    <span>Start Claude Code interactive session</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('claude mcp list', 'List all configured MCP servers')}>
                    <code>claude mcp list</code>
                    <span>List all configured MCP servers</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('claude commit', 'AI-assisted git commit with generated messages')}>
                    <code>claude commit</code>
                    <span>AI-assisted git commit with generated messages</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="terminal" /> PowerShell Navigation</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyToClipboard('Set-Location "D:\\ClaudeWindows"', 'Navigate to directory (PowerShell cd equivalent)')}>
                    <code>Set-Location "D:\ClaudeWindows"</code>
                    <span>Navigate to directory (PowerShell cd equivalent)</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('Get-ChildItem', 'List directory contents (PowerShell ls equivalent)')}>
                    <code>Get-ChildItem</code>
                    <span>List directory contents (PowerShell ls equivalent)</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('New-Item -ItemType Directory -Name "folder"', 'Create new directory')}>
                    <code>New-Item -ItemType Directory -Name "folder"</code>
                    <span>Create new directory</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('Remove-Item -Recurse -Force "folder"', 'Delete directory recursively')}>
                    <code>Remove-Item -Recurse -Force "folder"</code>
                    <span>Delete directory recursively</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('explorer.exe .', 'Open current directory in Windows Explorer')}>
                    <code>explorer.exe .</code>
                    <span>Open current directory in Windows Explorer</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="github" /> Git Commands</h4>
                <div className="cheat-commands">
                  <div className="cheat-item">
                    <code>git status</code>
                    <span>Check repository status</span>
                  </div>
                  <div className="cheat-item">
                    <code>git add .</code>
                    <span>Stage all changes</span>
                  </div>
                  <div className="cheat-item">
                    <code>git commit -m "message"</code>
                    <span>Commit with message</span>
                  </div>
                  <div className="cheat-item">
                    <code>git checkout -b feature-branch</code>
                    <span>Create and switch to new branch</span>
                  </div>
                  <div className="cheat-item">
                    <code>git push origin main</code>
                    <span>Push to remote repository</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="package" /> Node.js & npm</h4>
                <div className="cheat-commands">
                  <div className="cheat-item">
                    <code>npm init -y</code>
                    <span>Initialize new Node.js project</span>
                  </div>
                  <div className="cheat-item">
                    <code>npm install</code>
                    <span>Install dependencies from package.json</span>
                  </div>
                  <div className="cheat-item">
                    <code>npm run dev</code>
                    <span>Start development server</span>
                  </div>
                  <div className="cheat-item">
                    <code>npm run build</code>
                    <span>Build production version</span>
                  </div>
                  <div className="cheat-item">
                    <code>npx create-react-app myapp</code>
                    <span>Create new React application</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="code" /> VS Code Integration</h4>
                <div className="cheat-commands">
                  <div className="cheat-item">
                    <code>code .</code>
                    <span>Open current directory in VS Code</span>
                  </div>
                  <div className="cheat-item">
                    <code>code filename.js</code>
                    <span>Open specific file in VS Code</span>
                  </div>
                  <div className="cheat-item">
                    <code>code serve-web --port 8080</code>
                    <span>Start VS Code server for remote access</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="settings" /> System Commands</h4>
                <div className="cheat-commands">
                  <div className="cheat-item">
                    <code>Get-Process</code>
                    <span>List running processes</span>
                  </div>
                  <div className="cheat-item">
                    <code>Stop-Process -Name "process" -Force</code>
                    <span>Kill process by name</span>
                  </div>
                  <div className="cheat-item">
                    <code>netstat -ano | findstr :3000</code>
                    <span>Check what's using port 3000</span>
                  </div>
                  <div className="cheat-item">
                    <code>Get-Location</code>
                    <span>Show current directory path</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeInstanceId === 'prompts' ? (
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
                  <div className="cheat-item" onClick={() => copyToClipboard('think hard about this architecture', 'Prompt for deep architectural analysis')}>
                    <code>"think hard about this architecture"</code>
                    <span>Deep architectural analysis with critical evaluation</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('ultrathink through this complex problem', 'Maximum thinking mode for complex issues')}>
                    <code>"ultrathink through this complex problem"</code>
                    <span>Maximum depth analysis (31,999 token thinking)</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('analyze the security implications of this code', 'Security-focused code review')}>
                    <code>"analyze the security implications"</code>
                    <span>Security-focused analysis and vulnerability assessment</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="settings" /> Multi-Agent Coordination</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyToClipboard('deploy 3 sub-agents in parallel to research', 'Use multiple AI agents for complex tasks')}>
                    <code>"deploy 3 sub-agents in parallel"</code>
                    <span>Parallel AI agents for complex research tasks</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('/senior-engineer', 'Get expert code review and architecture guidance')}>
                    <code>"/senior-engineer"</code>
                    <span>Expert code reviews and architecture guidance</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('/execute optimize React performance', 'Task execution with intelligent routing')}>
                    <code>"/execute [task]"</code>
                    <span>Quick task execution with intelligent agent routing</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="fileText" /> Code Quality & Review</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyToClipboard('review this code for best practices and potential improvements', 'Comprehensive code review')}>
                    <code>"review this code for best practices"</code>
                    <span>Comprehensive code quality analysis</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('refactor this to be more maintainable and performant', 'Code refactoring suggestions')}>
                    <code>"refactor this to be more maintainable"</code>
                    <span>Refactoring suggestions for better maintainability</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('add comprehensive error handling and logging', 'Error handling improvements')}>
                    <code>"add comprehensive error handling"</code>
                    <span>Improve error handling and logging strategies</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="play" /> Development Workflow</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyToClipboard('create a comprehensive test suite for this component', 'Test generation prompt')}>
                    <code>"create comprehensive test suite"</code>
                    <span>Generate thorough test coverage for components</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('document this code with clear examples and usage', 'Documentation generation')}>
                    <code>"document this code with examples"</code>
                    <span>Generate clear documentation with usage examples</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('optimize this for performance and bundle size', 'Performance optimization')}>
                    <code>"optimize for performance and bundle size"</code>
                    <span>Performance optimization and bundle size reduction</span>
                  </div>
                </div>
              </div>

              <div className="command-group">
                <h4><SvgIcon name="helpCircle" /> Problem Solving</h4>
                <div className="cheat-commands">
                  <div className="cheat-item" onClick={() => copyToClipboard('debug this issue step by step', 'Systematic debugging approach')}>
                    <code>"debug this issue step by step"</code>
                    <span>Systematic debugging and troubleshooting</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('suggest alternative approaches to solve this problem', 'Alternative solutions')}>
                    <code>"suggest alternative approaches"</code>
                    <span>Multiple solution strategies and trade-offs</span>
                  </div>
                  <div className="cheat-item" onClick={() => copyToClipboard('explain this like I am a senior developer', 'Technical explanation')}>
                    <code>"explain this like I am a senior developer"</code>
                    <span>Technical explanations with advanced context</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : instances.length === 0 ? (
          <div className="vscode-empty-state">
            <SvgIcon name="code" className="empty-icon" />
            <h3>No VS Code Instances</h3>
            <p>Click the Commands tab (⚙️) above or create a new VS Code tab</p>
            <div className="workspace-instructions">
              <p><strong>💡 Pro Tip:</strong> After opening VS Code, use <code>File → Open Workspace...</code> and select <code>portfolio-dev.code-workspace</code> to automatically load all project folders with optimized settings!</p>
            </div>
            <div className="quick-actions">
              <button
                onClick={() => {
                  const portfolioProject = projects.find(p => p.id === 'portfolio');
                  if (portfolioProject) {
                    createVSCodeInstance(portfolioProject, 'Portfolio Hub');
                  }
                }}
                className="quick-action-btn"
                disabled={serverStatus !== 'running'}
              >
                <SvgIcon name="folder" />
                Open VS Code
              </button>
              <button
                onClick={() => executeVSCodeCommand('new-vscode-tab')}
                className="quick-action-btn"
                disabled={serverStatus !== 'running'}
              >
                <SvgIcon name="plus" />
                New Tab
              </button>
            </div>
          </div>
        ) : activeInstance ? (
          <VSCodeTerminal
            key={activeInstance.id}
            projectPath={activeInstance.projectPath}
            serverPort={activeInstance.port}
            onClose={() => closeInstance(activeInstance.id)}
            className="active-vscode-terminal"
          />
        ) : null}
      </div>
    </div>
  );
};