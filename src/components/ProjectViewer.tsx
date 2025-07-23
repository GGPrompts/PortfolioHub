import React, { useState, useEffect } from 'react'
import { usePortfolioStore, Project } from '../store/portfolioStore'
import { getProjectPort, getProjectUrl, checkPort } from '../utils/portManager'
import { isVSCodeEnvironment, executeCommand, showNotification } from '../utils/vsCodeIntegration'
import styles from './ProjectViewer.module.css'

interface ProjectViewerProps {
  project: Project
  onClose: () => void
  isInline?: boolean
}

export default function ProjectViewer({ project, onClose, isInline = false }: ProjectViewerProps) {
  console.log(`🔍 ProjectViewer rendered for project: ${project.id}`, { 
    isInline, 
    displayType: project.displayType,
    localPort: project.localPort
  })
  
  const { setProjectLoading, isProjectLoading } = usePortfolioStore()
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [actualPort, setActualPort] = useState<number | null>(null)

  useEffect(() => {
    setProjectLoading(true)
    setError(null)

    // Check if external project is running and get actual port
    if (project.displayType === 'external') {
      // First check if we're in VS Code webview and use injected data
      if (isVSCodeEnvironment() && (window as any).vsCodePortfolio?.isVSCodeWebview) {
        const vsCodeProjects = (window as any).vsCodePortfolio.projectData?.projects || []
        const vsCodeProject = vsCodeProjects.find((p: any) => p.id === project.id)
        
        if (vsCodeProject) {
          console.log(`🎯 ProjectViewer ${project.id} using VS Code data:`, {
            status: vsCodeProject.status,
            localPort: vsCodeProject.localPort,
            actualPort: vsCodeProject.actualPort,
            isActive: vsCodeProject.status === 'active'
          })
          
          const running = vsCodeProject.status === 'active'
          const port = vsCodeProject.actualPort || vsCodeProject.localPort || project.localPort
          
          console.log(`🎯 ProjectViewer ${project.id} final values:`, {
            running,
            port,
            willShowRunning: running && port,
            url: running && port ? `http://localhost:${port}` : 'none'
          })
          
          setIsRunning(running)
          setActualPort(running ? port : null)
          setProjectLoading(false)
        } else {
          console.warn(`❌ ProjectViewer: ${project.id} not found in VS Code data`)
          setIsRunning(false)
          setActualPort(null)
          setProjectLoading(false)
        }
      } else {
        // Fallback to port manager for web browser
        getProjectPort(project).then(port => {
          setActualPort(port)
          setIsRunning(port !== null)
          setProjectLoading(false)
        })
      }
    } else {
      setTimeout(() => setProjectLoading(false), 500)
    }
  }, [project, setProjectLoading])

  const handleIframeLoad = () => {
    setProjectLoading(false)
  }

  const handleIframeError = () => {
    setError('Failed to load project')
    setProjectLoading(false)
  }

  const openExternal = async () => {
    if (project.demoUrl) {
      if (isVSCodeEnvironment()) {
        // Use VS Code integration for opening URLs
        const vsCode = (window as any).vsCodePortfolio
        vsCode.openInBrowser(project.demoUrl)
      } else {
        window.open(project.demoUrl, '_blank', 'noopener,noreferrer')
      }
    } else if (isRunning && actualPort) {
      const url = `http://localhost:${actualPort}`
      if (isVSCodeEnvironment()) {
        // Use VS Code integration to open in browser
        const vsCode = (window as any).vsCodePortfolio
        vsCode.openInBrowser(url)
        showNotification(`Opening ${project.title} in browser`, 'info')
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } else {
      const message = `${project.title} is not running!\n\n` +
        `To start it:\n` +
        `1. Open a terminal\n` +
        `2. cd ${getProjectPath(project.id)}\n` +
        `3. ${project.buildCommand || 'npm run dev'}\n\n` +
        `Or use the "Start All Projects" button in the sidebar!`
      
      if (isVSCodeEnvironment()) {
        showNotification(message, 'warning')
      } else {
        alert(message)
      }
    }
  }

  const getProjectPath = (projectId: string): string => {
    const paths: { [key: string]: string } = {
      'ggprompts-main': 'D:/ClaudeWindows/claude-dev-portfolio/projects/ggprompts',
      'ggprompts-style-guide': 'D:/ClaudeWindows/claude-dev-portfolio/projects/ggprompts-style-guide',
      'matrix-cards': 'D:/ClaudeWindows/claude-dev-portfolio/projects/matrix-cards',
      'sleak-card': 'D:/ClaudeWindows/claude-dev-portfolio/projects/sleak-card',
      '3d-matrix-cards': 'D:/ClaudeWindows/claude-dev-portfolio/projects/3d-matrix-cards',
      '3d-file-system': 'D:/ClaudeWindows/claude-dev-portfolio/projects/3d-file-system'
    }
    return paths[projectId] || 'project-directory'
  }

  return (
    <div className={`${styles.viewer} ${isInline ? styles.inlineViewer : ''}`}>
      {!isInline && (
        <div className={styles.header}>
          <div className={styles.projectInfo}>
            <h2>{project.title}</h2>
            <span className={styles.displayType}>{project.displayType}</span>
          </div>
          <div className={styles.controls}>
            {project.displayType === 'external' && (
              <button className={styles.openExternalBtn} onClick={openExternal}>
                Open in New Tab ↗
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
      )}

      <div className={styles.content}>
        {isProjectLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading {project.title}...</p>
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <p>{error}</p>
            {project.demoUrl && (
              <button onClick={openExternal}>
                Try opening in a new tab
              </button>
            )}
          </div>
        )}

        {project.displayType === 'iframe' && project.path && !error && (
          <iframe
            src={project.path}
            className={styles.iframe}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title={project.title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}

        {project.displayType === 'embed' && project.path && !error && (
          <iframe
            src={project.path}
            className={styles.iframe}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title={project.title}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
            allow={project.permissions?.join('; ')}
          />
        )}

        {project.displayType === 'embedded' && !isProjectLoading && (
          <div className={styles.metaProjectView}>
            <div className={styles.metaHeader}>
              <div className={styles.metaIcon}>🔄</div>
              <h2>Portfolio Self-Management Interface</h2>
              <p>This is the meta-view of the portfolio application itself</p>
            </div>
            
            <div className={styles.metaStats}>
              <div className={styles.statCard}>
                <h3>Current Status</h3>
                <p className={styles.statusRunning}>✅ Running on port {project.localPort}</p>
                <p>You are currently using this application</p>
              </div>
              
              <div className={styles.statCard}>
                <h3>Meta Features</h3>
                <ul>
                  <li>Self-referential project management</li>
                  <li>Real-time status monitoring</li>
                  <li>VS Code extension integration</li>
                  <li>Matrix Card notes system</li>
                  <li>Live development workflow</li>
                </ul>
              </div>
              
              <div className={styles.statCard}>
                <h3>Development Actions</h3>
                <button 
                  className={styles.metaBtn}
                  onClick={() => {
                    if (isVSCodeEnvironment()) {
                      // Send VS Code command message instead of trying to execute as shell command
                      (window as any).vsCodePortfolio?.postMessage?.({
                        type: 'command:execute',
                        command: 'workbench.action.files.openFolder',
                        args: ['D:\\ClaudeWindows\\claude-dev-portfolio']
                      });
                    } else {
                      window.open('vscode://file/D:/ClaudeWindows/claude-dev-portfolio', '_blank');
                    }
                  }}
                >
                  📁 Open in VS Code
                </button>
                <button 
                  className={styles.metaBtn}
                  onClick={() => window.open('http://localhost:5173', '_blank')}
                >
                  🔗 Open in New Tab
                </button>
              </div>
            </div>
            
            <div className={styles.metaFooter}>
              <p>💡 <strong>Meta-Development:</strong> This portfolio manages itself as a project, enabling real-time testing and development workflow optimization.</p>
            </div>
          </div>
        )}

        {project.displayType === 'external' && !isProjectLoading && (
          <>
            {isInline && isRunning && actualPort ? (
              isVSCodeEnvironment() ? (
                // VS Code fallback UI for inline preview
                <div className={styles.vsCodePreviewFallback} style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1e1e1e',
                  color: '#cccccc',
                  textAlign: 'center',
                  padding: '40px'
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>🖼️</div>
                  <h2 style={{ margin: '0 0 10px 0', color: '#e7e7e7' }}>Live Preview Not Available</h2>
                  <p style={{ margin: '0 0 30px 0', opacity: 0.8, fontSize: '16px' }}>VS Code security restrictions prevent iframe previews</p>
                  <button
                    onClick={openExternal}
                    style={{
                      backgroundColor: '#0e639c',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    Open {project.title} in Browser ↗
                  </button>
                </div>
              ) : (
                <iframe
                  src={`http://localhost:${actualPort}`}
                  className={styles.iframe}
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  title={project.title}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                />
              )
            ) : (
              <div className={styles.externalInfo}>
                <div className={styles.externalContent}>
                  <div className={styles.externalHeader}>
                    <h3>External Project</h3>
                    <button className={styles.closeBtn} onClick={onClose} title="Close and return to portfolio">
                      ✕
                    </button>
                  </div>
                  <p>{project.description}</p>
                  
                  <div className={styles.externalDetails}>
                    {project.demoUrl && (
                      <div className={styles.detail}>
                        <strong>Demo URL:</strong>
                        <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                          {project.demoUrl}
                        </a>
                      </div>
                    )}
                    
                    {project.repository && (
                      <div className={styles.detail}>
                        <strong>Repository:</strong>
                        <a href={project.repository} target="_blank" rel="noopener noreferrer">
                          {project.repository}
                        </a>
                      </div>
                    )}
                    
                    {project.localPort && (
                      <div className={styles.detail}>
                        <strong>Port:</strong>
                        <code>
                          {actualPort ? `http://localhost:${actualPort}` : `Default: ${project.localPort}`}
                        </code>
                        {actualPort && actualPort !== project.localPort && (
                          <span className={styles.portNote}>
                            (running on port {actualPort}, default: {project.localPort})
                          </span>
                        )}
                      </div>
                    )}
                    
                    {project.buildCommand && (
                      <div className={styles.detail}>
                        <strong>Build Command:</strong>
                        <code>{project.buildCommand}</code>
                      </div>
                    )}
                  </div>

                  <div className={styles.techStack}>
                    <h4>Technologies:</h4>
                    <div className={styles.techTags}>
                      {project.tech.map(tech => (
                        <span key={tech} className={styles.techTag}>{tech}</span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.actionButtons}>
                    <button className={styles.primaryBtn} onClick={openExternal}>
                      {isRunning ? '🟢 Open Project ↗' : '🔴 Project Not Running'}
                    </button>
                    {!isRunning && (
                      <button 
                        className={styles.secondaryBtn}
                        onClick={async () => {
                          const command = `cd ${getProjectPath(project.id)}; ${project.buildCommand || 'npm run dev'}`
                          if (isVSCodeEnvironment()) {
                            await executeCommand(command, `Start ${project.title}`)
                            showNotification(`Starting ${project.title}...`)
                          } else {
                            await executeCommand(command)
                            alert('Start command copied to clipboard!')
                          }
                        }}
                        title="Copy start command to clipboard"
                      >
                        📋 Copy Start Command
                      </button>
                    )}
                  </div>
                  {isRunning && actualPort && (
                    <p className={styles.runningStatus}>
                      ✅ Project is running on port {actualPort}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}