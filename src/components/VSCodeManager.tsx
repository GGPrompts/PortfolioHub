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

  const checkVSCodeServerStatus = async () => {
    try {
      // Use a more reliable method - try to fetch a VS Code specific endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch('http://localhost:8080/favicon.ico', { 
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      
      // VS Code Server should respond to favicon requests
      return response.status < 500; // Any response except server error means it's running
    } catch (error) {
      // If fetch fails completely, server is definitely not running
      return false;
    }
  };

  const [serverStatus, setServerStatus] = useState<'checking' | 'running' | 'stopped'>('checking');

  useEffect(() => {
    const checkStatus = async () => {
      const isRunning = await checkVSCodeServerStatus();
      setServerStatus(isRunning ? 'running' : 'stopped');
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const startVSCodeServer = () => {
    // Copy the correct command
    const commands = `# Stop VS Code Server first (if running)
Stop-Process -Name "code-tunnel" -Force -ErrorAction SilentlyContinue

# Change to portfolio directory  
Set-Location "D:\\ClaudeWindows\\claude-dev-portfolio"

# Verify location
Write-Host "Starting VS Code Server from: $(Get-Location)"

# Start VS Code Server with your Matt profile as default
code serve-web --port 8080 --host 0.0.0.0 --without-connection-token --accept-server-license-terms --default-profile "Matt"`;
    
    navigator.clipboard.writeText(commands).then(() => {
      alert(`VS Code Server commands copied!\n\nAfter starting, the Portfolio Hub will automatically open your workspace file with dark mode and settings configured.\n\nPaste and run in PowerShell.`);
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
          <div className="project-selector">
            <label htmlFor="project-select">Open Project:</label>
            <select
              id="project-select"
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value);
                if (project) {
                  createVSCodeInstance(project);
                }
                e.target.value = '';
              }}
              value=""
            >
              <option value="">Select a project...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {instances.length > 0 && (
        <div className="vscode-tabs">
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
        {instances.length === 0 ? (
          <div className="vscode-empty-state">
            <SvgIcon name="code" className="empty-icon" />
            <h3>No VS Code Instances</h3>
            <p>Select a project from the dropdown above to open it in VS Code</p>
            <div className="workspace-instructions">
              <p><strong>💡 Pro Tip:</strong> After opening VS Code, use <code>File → Open Workspace...</code> and select <code>portfolio-dev.code-workspace</code> for dark mode and optimized settings!</p>
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
                onClick={() => {
                  const portfolioProject = projects.find(p => p.id === 'portfolio');
                  if (portfolioProject) {
                    createVSCodeInstance(portfolioProject, 'Editor Tab 1');
                  }
                }}
                className="quick-action-btn"
                disabled={serverStatus !== 'running'}
              >
                <SvgIcon name="code" />
                New Tab 1
              </button>
              <button
                onClick={() => {
                  const portfolioProject = projects.find(p => p.id === 'portfolio');
                  if (portfolioProject) {
                    createVSCodeInstance(portfolioProject, 'Editor Tab 2');
                  }
                }}
                className="quick-action-btn"
                disabled={serverStatus !== 'running'}
              >
                <SvgIcon name="folder" />
                New Tab 2
              </button>
              <button
                onClick={() => {
                  const portfolioProject = projects.find(p => p.id === 'portfolio');
                  if (portfolioProject) {
                    createVSCodeInstance(portfolioProject, 'Editor Tab 3');
                  }
                }}
                className="quick-action-btn"
                disabled={serverStatus !== 'running'}
              >
                <SvgIcon name="code" />
                New Tab 3
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