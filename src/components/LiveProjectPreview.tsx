import React, { useState, useEffect, useRef } from 'react'
import { Project } from '../store/portfolioStore'
import { useProjectData } from '../hooks/useProjectData'
import GitUpdateButton from './GitUpdateButton'
import SvgIcon from './SvgIcon'
import { executeCommand, openInBrowser, openInExternalBrowser, openInVSCode, showNotification, isVSCodeEnvironment, openLivePreview, addProjectToWorkspace } from '../utils/vsCodeIntegration'
import styles from './LiveProjectPreview.module.css'

interface LiveProjectPreviewProps {
  project: Project
  isRunning: boolean
  port: number | null
  onProjectClick: (project: Project) => void
  globalViewMode?: 'mobile' | 'desktop'
  livePreviewsEnabled?: boolean
}

export default function LiveProjectPreview({ 
  project, 
  isRunning, 
  port, 
  onProjectClick,
  globalViewMode,
  livePreviewsEnabled = true
}: LiveProjectPreviewProps) {
  // Get project data from unified hook
  const { projects: allProjects, getProjectStatus: getUnifiedProjectStatus } = useProjectData()
  
  // Get project status from unified data (React Query + optimized port manager)
  const getProjectStatusData = () => {
    // Use React Query status from useProjectData hook (unified architecture)
    const queryStatus = getUnifiedProjectStatus(project.id)
    
    console.log(`🎯 LivePreview ${project.id} unified status:`, {
      queryStatus,
      projectPort: project.localPort,
      finalStatus: queryStatus
    })
    
    return {
      isRunning: queryStatus,
      port: project.localPort || null
    }
  }
  
  const { isRunning: actualIsRunning, port: actualPort } = getProjectStatusData()
  const [showLivePreview, setShowLivePreview] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [imageLoadStatus, setImageLoadStatus] = useState<boolean | undefined>(undefined)
  const [localViewMode, setLocalViewMode] = useState<'mobile' | 'desktop'>('desktop')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAIDropdown, setShowAIDropdown] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Use global view mode if provided, otherwise use local view mode
  const viewMode = globalViewMode || localViewMode

  // Helper function to get correct project path
  const getProjectPath = (): string => {
    if (isVSCodeEnvironment()) {
      // In VS Code, use proper path resolution
      const portfolioPath = 'D:\\ClaudeWindows\\claude-dev-portfolio'
      if (project.path) {
        if (project.path.startsWith('../Projects/')) {
          // New structure: ../Projects/project-name -> D:\ClaudeWindows\Projects\project-name
          return project.path.replace('../', portfolioPath.replace('claude-dev-portfolio', ''))
        } else if (project.path.startsWith('projects/')) {
          // Legacy structure: projects/project-name
          return `${portfolioPath}\\${project.path}`
        } else {
          // Other relative paths
          return `${portfolioPath}\\${project.path}`
        }
      } else {
        // Fallback to project ID
        return `${portfolioPath}\\projects\\${project.id}`
      }
    } else {
      // Web fallback - construct based on project path
      if (project.path && project.path.startsWith('../Projects/')) {
        return `D:\\ClaudeWindows\\${project.path.replace('../', '')}`
      } else {
        return `D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.id}`
      }
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAIDropdown(false)
      }
    }

    if (showAIDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAIDropdown])

  // Helper functions for project actions
  const handleRunProject = async () => {
    if (isVSCodeEnvironment()) {
      // Send message to VS Code extension to run project securely
      // Let the VS Code extension handle all security validation
      const projectPath = getProjectPath()
      const command = project.buildCommand || 'npm run dev'
      
      // Use unified architecture - executeCommand handles both VS Code and web modes
      const fullCommand = `cd "${projectPath}" && ${command}`
      await executeCommand(fullCommand, `Start ${project.title}`)
      showNotification(`Starting ${project.title}...`, 'info')
    } else {
      // Fallback for web version - validate combined command
      const projectPath = getProjectPath()
      const baseCommand = project.buildCommand || 'npm run dev'
      const command = `cd "${projectPath}" && ${baseCommand}`
      
      // Only validate the combined command for web version
      const { SecureCommandRunner } = await import('../services/securityService')
      if (!SecureCommandRunner.validateCommand(command)) {
        console.error(`Command blocked for security reasons: ${command}`)
        showNotification('Command blocked - security validation failed', 'error')
        return
      }
      
      await executeCommand(command, `Run ${project.title}`)
      showNotification(`Starting ${project.title}...`, 'info')
    }
  }

  const handleKillProject = async () => {
    if (!actualPort) {
      showNotification('Project is not running', 'warning')
      return
    }
    
    // Use port-specific kill command for precision
    const command = isVSCodeEnvironment() 
      ? `$proc = Get-NetTCPConnection -LocalPort ${actualPort} -ErrorAction SilentlyContinue | Select-Object -First 1; if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }`
      : `taskkill /F /PID (Get-NetTCPConnection -LocalPort ${actualPort} | Select-Object -ExpandProperty OwningProcess)`
    
    await executeCommand(command, `Kill ${project.title} on port ${actualPort}`)
    showNotification(`Stopping ${project.title} on port ${actualPort}...`, 'info')
  }

  const handleViewInNewTab = () => {
    if (actualPort) {
      const url = `http://localhost:${actualPort}`
      console.log(`🌐 Opening ${project.id} in new tab:`, { url, isVSCode: isVSCodeEnvironment() })
      
      // Check if project requires 3D navigation (needs pointer lock)
      if ((project as any).requires3D) {
        // Force external browser for 3D projects that need pointer lock
        openInExternalBrowser(url, 'Requires pointer lock for 3D navigation')
      } else {
        // Use Simple Browser for regular projects
        openInBrowser(url)
      }
    } else {
      showNotification('Project is not running', 'warning')
    }
  }

  const handleViewInIDE = async () => {
    // In VS Code environment, add project to workspace
    if (isVSCodeEnvironment()) {
      const projectPath = getProjectPath()
      
      // Use unified architecture - addProjectToWorkspace handles both VS Code and web modes
      await addProjectToWorkspace({ path: projectPath, title: project.title })
      showNotification(`Added ${project.title} to VS Code workspace`, 'info')
    } else {
      // Fallback to original behavior for web version
      onProjectClick(project)
    }
  }

  const handleAIAssistant = async (assistant: 'claude' | 'gemini' | 'copilot') => {
    const projectPath = getProjectPath()

    if (isVSCodeEnvironment()) {
      // In VS Code, open terminal and run the appropriate command
      let command = ''
      let notification = ''
      
      switch (assistant) {
        case 'claude':
          command = `cd "${projectPath}" && claude`
          notification = `Starting Claude Code in ${project.title}...`
          break
        case 'gemini':
          command = `cd "${projectPath}" && gemini`
          notification = `Starting Gemini in ${project.title}...`
          break
        case 'copilot':
          // For Copilot, just navigate to the directory and show instructions
          command = `cd "${projectPath}" && echo "GitHub Copilot: Press Ctrl+Alt+I (Windows/Linux) or Cmd+I (Mac) to open Copilot chat"`
          notification = `Terminal opened in ${project.title}. Press Ctrl+Alt+I to open Copilot chat.`
          break
      }
      
      await executeCommand(command, `${assistant.charAt(0).toUpperCase() + assistant.slice(1)} - ${project.title}`)
      showNotification(notification, 'info')
    } else {
      // Web fallback - copy commands
      let command = ''
      switch (assistant) {
        case 'claude':
          command = `cd "${projectPath}" && claude`
          break
        case 'gemini':
          command = `cd "${projectPath}" && gemini`
          break
        case 'copilot':
          command = `cd "${projectPath}" && code .`
          break
      }
      
      await navigator.clipboard.writeText(command)
      alert(`${assistant} command copied to clipboard!`)
    }
    
    setShowAIDropdown(false)
  }

  // Build preview URL without cache busting to prevent reload loops
  const getPreviewUrl = () => {
    if (!actualPort) return null
    
    const baseUrl = `http://localhost:${actualPort}`
    const params = new URLSearchParams()
    
    // Only add viewport hint (some apps may use this)
    params.set('viewport', viewMode)
    
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl
  }
  
  const previewUrl = getPreviewUrl()

  // Simple mini device previews that fit their containers
  const getPreviewDimensions = () => {
    if (viewMode === 'desktop') {
      // Mini monitor - wide aspect ratio for desktop content
      return {
        containerWidth: 400,
        containerHeight: 250, // Slightly taller to show more content
        containerClass: 'desktopDisplay',
        displayMode: 'Mini Monitor',
        deviceType: 'desktop'
      }
    } else {
      // Mini phone - phone aspect ratio for mobile content
      return {
        containerWidth: 200,
        containerHeight: 350, // Phone-like proportions
        containerClass: 'mobileDisplay', 
        displayMode: 'Mini Phone',
        deviceType: 'mobile'
      }
    }
  }

  // Auto-enable live preview when project starts running and global previews are enabled
  useEffect(() => {
    const isVSCode = isVSCodeEnvironment()
    console.log(`🖼️ LivePreview ${project.id} state check:`, {
      actualIsRunning,
      actualPort,
      showLivePreview,
      livePreviewsEnabled,
      isVSCode,
      willEnable: actualIsRunning && actualPort && !showLivePreview && livePreviewsEnabled
    })
    
    if (actualIsRunning && actualPort && !showLivePreview && livePreviewsEnabled) {
      setIsRefreshing(false) // Start without refresh indicator
      console.log(`✅ Enabling live preview for ${project.id} on port ${actualPort}`)
      // Small delay to let the server fully start
      setTimeout(() => {
        setShowLivePreview(true)
        setPreviewLoaded(false) // Will be set to true by iframe onLoad
        setIsRefreshing(false)
      }, 1500) // Reduced from 2000ms
    }
    if (!actualIsRunning || !livePreviewsEnabled) {
      if (showLivePreview) {
        console.log(`❌ Disabling live preview for ${project.id}`)
      }
      setShowLivePreview(false)
      setPreviewLoaded(false)
      setIsRefreshing(false)
    }
  }, [actualIsRunning, actualPort, livePreviewsEnabled, project.id, showLivePreview])

  // Force iframe reload when zoom mode or view mode changes (URL changes)
  useEffect(() => {
    if (showLivePreview) {
      setIsRefreshing(true)
      setPreviewLoaded(false)
      // Small delay to ensure clean reload
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = previewUrl || ''
          
          // Also try to detect loading by polling the iframe
          const checkInterval = setInterval(() => {
            if (iframeRef.current && !previewLoaded) {
              try {
                // Check if iframe has loaded content
                const iframeWindow = iframeRef.current.contentWindow
                if (iframeWindow && iframeWindow.location.href !== 'about:blank') {
                  console.log(`✅ LivePreview ${project.id} detected by polling`)
                  setPreviewLoaded(true)
                  setIsRefreshing(false)
                  clearInterval(checkInterval)
                }
              } catch (error) {
                // Cross-origin - that's fine, iframe is probably loaded
                console.log(`✅ LivePreview ${project.id} cross-origin detected (likely loaded)`)
                setPreviewLoaded(true)
                setIsRefreshing(false)
                clearInterval(checkInterval)
              }
            } else if (previewLoaded) {
              // Clear interval if already loaded
              clearInterval(checkInterval)
            }
          }, 500)
          
          // Clear interval after timeout
          setTimeout(() => clearInterval(checkInterval), 5000)
        }
      }, 100)
      
      // Shorter timeout fallback - stop spinner after 2 seconds
      const loadTimeout = setTimeout(() => {
        const isVSCode = isVSCodeEnvironment()
        console.warn(`⚠️ LivePreview ${project.id} timeout - forcing loaded state ${isVSCode ? '(VS Code Enhanced)' : '(Web Application)'}`)
        setPreviewLoaded(true)
        setIsRefreshing(false)
      }, 2000) // Reduced from 3000ms to 2000ms
      
      return () => clearTimeout(loadTimeout)
    }
  }, [viewMode, previewUrl, project.id])

  const handleIframeLoad = () => {
    setPreviewLoaded(true)
    setIsRefreshing(false)
    
    const isVSCode = isVSCodeEnvironment()
    console.log(`✅ LivePreview ${project.id} iframe loaded successfully ${isVSCode ? '(VS Code Enhanced)' : '(Web Application)'}`)
  }

  const handleIframeError = () => {
    setPreviewLoaded(false)
    setShowLivePreview(false)
    setIsRefreshing(false)
  }

  const handleImageLoad = () => {
    setImageLoadStatus(true)
  }

  const handleImageError = () => {
    setImageLoadStatus(false)
  }

  const togglePreview = () => {
    // Only allow toggling if global previews are enabled
    if (livePreviewsEnabled) {
      setIsRefreshing(true)
      setShowLivePreview(!showLivePreview)
      if (!showLivePreview) {
        setPreviewLoaded(false)
      }
    }
  }

  const toggleViewMode = () => {
    // Only allow local toggle if no global view mode is set
    if (!globalViewMode) {
      setLocalViewMode(localViewMode === 'mobile' ? 'desktop' : 'mobile')
    }
  }

  const openFullScreen = () => {
    if (previewUrl) {
      // Open preview in new window/tab at full size
      window.open(previewUrl, '_blank', 'width=1200,height=800,resizable=yes,scrollbars=yes')
    }
  }

  const previewConfig = getPreviewDimensions()

  // Prevent recursive preview loops for the portfolio app itself
  const isPortfolioApp = project.id === 'claude-portfolio-unified'
  const shouldShowPreview = showLivePreview && previewUrl && livePreviewsEnabled && !isPortfolioApp

  return (
    <div className={`${styles.projectCard} ${actualIsRunning ? styles.running : ''}`}>
      <div className={styles.previewContainer} style={{
        width: `${previewConfig.containerWidth}px`,
        height: `${previewConfig.containerHeight}px`
      }}>
        {shouldShowPreview ? (
          <div className={`${styles.livePreviewWrapper} ${styles[previewConfig.containerClass]}`}>
            <div className={styles.deviceViewport} style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {isVSCodeEnvironment() ? (
                // VS Code uses regular iframe (CSP allows localhost)
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                  title={`${project.title} Preview`}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
                  allow={project.permissions?.join('; ')}
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              ) : (
                // Regular iframe for web mode
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className={`${styles.livePreview} ${previewLoaded ? styles.loaded : ''}`}
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation allow-top-navigation-by-user-activation allow-modals allow-orientation-lock allow-presentation"
                  title={`${project.title} Preview`}
                  width="100%"
                  height="100%"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '6px'
                  }}
                />
              )}
            </div>
            {!previewLoaded && (
              <div className={styles.previewLoading}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading {project.title}...</p>
              </div>
            )}
            <div className={styles.scaleIndicator}>
              {previewConfig.displayMode}
            </div>
          </div>
        ) : (
          <div className={styles.staticPreview}>
            {isPortfolioApp ? (
              <div className={styles.placeholderThumbnail}>
                <div className={styles.placeholderIcon}>🔄</div>
                <p>Portfolio App</p>
                <small style={{color: '#888', fontSize: '10px', marginTop: '4px'}}>
                  Preview disabled to prevent recursion
                </small>
              </div>
            ) : project.thumbnail && imageLoadStatus !== false ? (
              <img
                src={project.thumbnail}
                alt={project.title}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className={styles.thumbnailImage}
              />
            ) : (
              <div className={styles.placeholderThumbnail}>
                <div className={styles.placeholderIcon}>🚀</div>
                <p>{project.title}</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Status Bar - Between monitor and description */}
      <div className={styles.statusBar}>
        <div className={styles.statusIndicator}>
          <span className={`${styles.statusDot} ${actualIsRunning ? styles.running : styles.stopped}`}></span>
          <span className={styles.statusText}>
            {actualIsRunning ? `SERVER :${actualPort}` : 'OFFLINE'}
          </span>
          {/* Refresh indicator */}
          {isRefreshing && (
            <div className={styles.refreshIndicator} title="Refreshing preview">
              <SvgIcon name="refreshCw" size={14} />
            </div>
          )}
        </div>

        {/* Tech Stack in status bar */}
        <div className={styles.statusTechStack}>
          {project.tech.slice(0, 3).map(tech => (
            <span key={tech} className={styles.statusTechBadge}>{tech}</span>
          ))}
          {project.tech.length > 3 && (
            <span className={styles.statusTechBadge}>+{project.tech.length - 3}</span>
          )}
        </div>
        
        <div className={styles.previewControls}>
          {actualIsRunning && actualPort && (
            <div className={styles.controlButtons}>
              {!globalViewMode && (
                <button
                  onClick={toggleViewMode}
                  className={styles.viewModeToggle}
                  title={viewMode === 'mobile' ? 'Switch to desktop view' : 'Switch to mobile view'}
                >
                  <SvgIcon name={viewMode === 'mobile' ? 'monitor' : 'smartphone'} size={16} />
                </button>
              )}
              <button
                onClick={openFullScreen}
                className={styles.fullScreenToggle}
                title="Open full screen"
              >
                ⛶
              </button>
              <button
                onClick={togglePreview}
                className={styles.previewToggle}
                title={showLivePreview ? 'Show static preview' : 'Show live preview'}
              >
                {showLivePreview ? '🖼️' : '🎬'}
              </button>
              <button
                onClick={() => window.open(previewUrl, '_blank')}
                className={styles.openExternal}
                title="Open in new tab"
              >
                ↗️
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Project Info */}
      <div className={styles.projectInfo}>
        <h3 className={styles.projectTitle}>{project.title}</h3>
        <p className={styles.projectDescription}>{project.description}</p>
        
        <div className={styles.projectMeta}>
          <div className={styles.projectActions}>
            <GitUpdateButton 
              type="project" 
              projectId={project.id}
              projectName={project.title}
              size="small" 
              variant="minimal"
            />
            
            {/* Primary Action Buttons */}
            <div className={styles.primaryActions}>
              <button
                onClick={handleRunProject}
                className={`${styles.actionButton} ${styles.runButton}`}
                title="Start project server"
              >
                <SvgIcon name="play" size={14} />
                Run
              </button>
              
              <button
                onClick={handleKillProject}
                className={`${styles.actionButton} ${styles.killButton}`}
                title="Stop project server"
                disabled={!actualIsRunning}
              >
                <SvgIcon name="stop" size={14} />
                Kill
              </button>
              
              <button
                onClick={handleViewInNewTab}
                className={`${styles.actionButton} ${styles.previewButton}`}
                title="View live preview"
                disabled={!actualIsRunning}
              >
                <SvgIcon name="monitor" size={14} />
                View Live Preview
              </button>
            </div>
            
            {/* AI Assistant Dropdown */}
            <div className={styles.aiDropdownContainer} ref={dropdownRef}>
              <button
                onClick={() => setShowAIDropdown(!showAIDropdown)}
                className={`${styles.actionButton} ${styles.aiButton}`}
                title="Open with AI Assistant"
              >
                <SvgIcon name="brain" size={14} />
                AI Assistant
                <SvgIcon name="chevronDown" size={12} />
              </button>
              
              {showAIDropdown && (
                <div className={styles.aiDropdown}>
                  <button
                    onClick={() => handleAIAssistant('claude')}
                    className={`${styles.aiOption} ${styles.claudeOption}`}
                  >
                    <SvgIcon name="brain" size={14} />
                    Claude
                  </button>
                  <button
                    onClick={() => handleAIAssistant('gemini')}
                    className={`${styles.aiOption} ${styles.geminiOption}`}
                  >
                    <SvgIcon name="sparkles" size={14} />
                    Gemini
                  </button>
                  <button
                    onClick={() => handleAIAssistant('copilot')}
                    className={`${styles.aiOption} ${styles.copilotOption}`}
                  >
                    <SvgIcon name="github" size={14} />
                    Copilot
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}