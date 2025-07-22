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
  const { setProjectLoading, isProjectLoading } = usePortfolioStore()
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [actualPort, setActualPort] = useState<number | null>(null)

  useEffect(() => {
    setProjectLoading(true)
    setError(null)

    // Check if external project is running and get actual port
    if (project.displayType === 'external') {
      getProjectPort(project).then(port => {
        setActualPort(port)
        setIsRunning(port !== null)
        setProjectLoading(false)
      })
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
      window.open(project.demoUrl, '_blank', 'noopener,noreferrer')
    } else if (isRunning && actualPort) {
      window.open(`http://localhost:${actualPort}`, '_blank', 'noopener,noreferrer')
    } else {
      alert(
        `${project.title} is not running!\n\n` +
        `To start it:\n` +
        `1. Open a terminal\n` +
        `2. cd ${getProjectPath(project.id)}\n` +
        `3. ${project.buildCommand || 'npm run dev'}\n\n` +
        `Or use the "Start All Projects" button in the sidebar!`
      )
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

        {project.displayType === 'external' && !isProjectLoading && (
          <>
            {isInline && isRunning && actualPort ? (
              <iframe
                src={`http://localhost:${actualPort}`}
                className={styles.iframe}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title={project.title}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
              />
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