import React, { useState, useEffect, useRef } from 'react'
import { Project } from '../store/portfolioStore'
import GitUpdateButton from './GitUpdateButton'
import SvgIcon from './SvgIcon'
import { executeCommand, openInBrowser, openInVSCode, showNotification, isVSCodeEnvironment } from '../utils/vsCodeIntegration'
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
  
  // In VS Code webview, get project status from injected data
  const getVSCodeProjectStatus = () => {
    if (!window.vsCodePortfolio?.isVSCodeWebview) return { isRunning, port }
    
    const vsCodeProjects = window.vsCodePortfolio.projectData?.projects || []
    const vsCodeProject = vsCodeProjects.find((p: any) => p.id === project.id)
    
    if (vsCodeProject) {
      console.log(`🎯 LivePreview ${project.id} VS Code data:`, {
        status: vsCodeProject.status,
        localPort: vsCodeProject.localPort,
        actualPort: vsCodeProject.actualPort,
        isActive: vsCodeProject.status === 'active'
      })
    }
    
    return {
      isRunning: vsCodeProject?.status === 'active' || false,
      port: vsCodeProject?.actualPort || vsCodeProject?.localPort || project.localPort || null
    }
  }
  
  const { isRunning: actualIsRunning, port: actualPort } = getVSCodeProjectStatus()
  const [showLivePreview, setShowLivePreview] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [imageLoadStatus, setImageLoadStatus] = useState<boolean | undefined>(undefined)
  const [localViewMode, setLocalViewMode] = useState<'mobile' | 'desktop'>('desktop')
  const [zoomMode, setZoomMode] = useState<'fit' | '25%' | '50%' | '75%' | '100%'>('fit')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAIDropdown, setShowAIDropdown] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Use global view mode if provided, otherwise use local view mode
  const viewMode = globalViewMode || localViewMode

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
    const projectPath = isVSCodeEnvironment() && window.vsCodePortfolio?.portfolioPath 
      ? `${window.vsCodePortfolio.portfolioPath}\\projects\\${project.id}`
      : `D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.id}`
      
    const command = `cd "${projectPath}" && ${project.buildCommand || 'npm run dev'}`
    await executeCommand(command, `Run ${project.title}`)
    showNotification(`Starting ${project.title}...`, 'info')
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
      openInBrowser(url)
    } else {
      showNotification('Project is not running', 'warning')
    }
  }

  const handleViewInIDE = () => {
    // In VS Code environment, add project to workspace
    if (isVSCodeEnvironment()) {
      const projectPath = window.vsCodePortfolio?.portfolioPath 
        ? `${window.vsCodePortfolio.portfolioPath}\\projects\\${project.id}`
        : `D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.id}`
      
      // Use the VS Code API to add project to workspace
      if (window.vsCodePortfolio?.addProjectToWorkspace) {
        window.vsCodePortfolio.addProjectToWorkspace(projectPath)
        showNotification(`Added ${project.title} to VS Code workspace`, 'info')
      } else {
        // Fallback to message passing
        window.vsCodePortfolio?.postMessage?.({
          type: 'workspace:addProject',
          project: projectPath
        })
        showNotification(`Adding ${project.title} to workspace...`, 'info')
      }
    } else {
      // Fallback to original behavior for web version
      const projectPath = `D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.id}`
      onProjectClick(project)
    }
  }

  const handleAIAssistant = async (assistant: 'claude' | 'gemini' | 'copilot') => {
    const projectPath = isVSCodeEnvironment() && window.vsCodePortfolio?.portfolioPath 
      ? `${window.vsCodePortfolio.portfolioPath}\\projects\\${project.id}`
      : `D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.id}`

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

  // Build preview URL with proper viewport hints
  const getPreviewUrl = () => {
    if (!actualPort) return null
    
    const baseUrl = `http://localhost:${actualPort}`
    const params = new URLSearchParams()
    
    if (viewMode === 'desktop') {
      // Always force desktop viewport for desktop view
      params.set('viewport', 'desktop')
      params.set('width', '1920')
      params.set('height', '1080')
      params.set('orientation', 'landscape')
    } else {
      // Mobile viewport
      params.set('viewport', 'mobile')
      params.set('width', '375')
      params.set('height', '812')
      params.set('orientation', 'portrait')
    }
    
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl
  }
  
  const previewUrl = getPreviewUrl()

  // Calculate realistic device dimensions and scaling
  const getScaleAndDimensions = () => {
    if (viewMode === 'desktop') {
      // Desktop view - 16:9 aspect ratio (1920x1080)
      const desktopWidth = 1920
      const desktopHeight = 1080
      const containerWidth = 560  // Realistic desktop card width
      const containerHeight = 315 // 16:9 aspect ratio
      
      let scale: number
      let displayMode: string
      
      switch (zoomMode) {
        case '25%':
          scale = 0.25
          displayMode = '25% zoom'
          break
        case '50%':
          scale = 0.5
          displayMode = '50% zoom'
          break
        case '75%':
          scale = 0.75
          displayMode = '75% zoom'
          break
        case '100%':
          scale = 1.0
          displayMode = '100% zoom'
          break
        case 'fit':
        default:
          // Scale to fit container while maintaining aspect ratio
          scale = Math.min(containerWidth / desktopWidth, containerHeight / desktopHeight)
          displayMode = 'fit to container'
          break
      }
      
      return {
        scale,
        width: desktopWidth,
        height: desktopHeight,
        containerWidth,
        containerHeight,
        containerClass: 'desktopDisplay',
        displayMode,
        deviceType: 'desktop'
      }
    } else {
      // Mobile view - iPhone 13/14 proportions (375x812)
      const mobileWidth = 375
      const mobileHeight = 812
      const containerWidth = 220  // Realistic phone card width
      const containerHeight = 476 // 9:19.5 aspect ratio (375:812)
      
      let scale: number
      let displayMode: string
      
      switch (zoomMode) {
        case '25%':
          scale = 0.25
          displayMode = '25% zoom'
          break
        case '50%':
          scale = 0.5
          displayMode = '50% zoom'
          break
        case '75%':
          scale = 0.75
          displayMode = '75% zoom'
          break
        case '100%':
          scale = 1.0
          displayMode = '100% zoom'
          break
        case 'fit':
        default:
          // Scale to fit container while maintaining aspect ratio
          scale = Math.min(containerWidth / mobileWidth, containerHeight / mobileHeight)
          displayMode = 'fit to container'
          break
      }
      
      return {
        scale,
        width: mobileWidth,
        height: mobileHeight,
        containerWidth,
        containerHeight,
        containerClass: 'mobileDisplay',
        displayMode,
        deviceType: 'mobile'
      }
    }
  }

  // Auto-enable live preview when project starts running and global previews are enabled
  useEffect(() => {
    const isVSCode = window.vsCodePortfolio?.isVSCodeWebview
    console.log(`🖼️ LivePreview ${project.id} state check:`, {
      actualIsRunning,
      actualPort,
      showLivePreview,
      livePreviewsEnabled,
      isVSCode,
      willEnable: actualIsRunning && actualPort && !showLivePreview && livePreviewsEnabled
    })
    
    if (actualIsRunning && actualPort && !showLivePreview && livePreviewsEnabled) {
      setIsRefreshing(true)
      console.log(`✅ Enabling live preview for ${project.id} on port ${actualPort}`)
      // Small delay to let the server fully start
      setTimeout(() => {
        setShowLivePreview(true)
        setPreviewLoaded(false)
      }, 2000)
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
        }
      }, 100)
      
      // Timeout fallback - stop spinner after 10 seconds if iframe doesn't load
      const loadTimeout = setTimeout(() => {
        const isVSCode = (window as any).vsCodePortfolio?.isVSCodeWebview
        console.warn(`⚠️ LivePreview ${project.id} timeout - assuming loaded ${isVSCode ? '(VS Code)' : '(Web)'}`)
        setPreviewLoaded(true)
        setIsRefreshing(false)
      }, 10000)
      
      return () => clearTimeout(loadTimeout)
    }
  }, [zoomMode, viewMode, previewUrl, project.id])

  const handleIframeLoad = () => {
    setPreviewLoaded(true)
    setIsRefreshing(false)
    const isVSCode = (window as any).vsCodePortfolio?.isVSCodeWebview
    console.log(`✅ LivePreview ${project.id} iframe loaded successfully ${isVSCode ? '(VS Code)' : '(Web)'}`)
    
    // Inject appropriate viewport meta tag based on device type (skip for same-origin to avoid CORS issues)
    if (iframeRef.current && window.location.origin === previewUrl?.split('?')[0]?.replace(/:\d+/, ':' + actualPort)) {
      try {
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
        if (iframeDoc) {
          // Remove any existing viewport meta tags
          const existingViewport = iframeDoc.querySelector('meta[name="viewport"]')
          if (existingViewport) {
            existingViewport.remove()
          }
          
          // Inject appropriate viewport meta tag
          const viewportMeta = iframeDoc.createElement('meta')
          viewportMeta.name = 'viewport'
          
          if (viewMode === 'desktop') {
            viewportMeta.content = 'width=1920, initial-scale=1.0, user-scalable=yes'
            iframeDoc.body.style.minWidth = '1920px'
          } else {
            viewportMeta.content = 'width=375, initial-scale=1.0, user-scalable=yes'
            iframeDoc.body.style.minWidth = '375px'
          }
          
          iframeDoc.head.appendChild(viewportMeta)
          
          // Trigger window resize event to update responsive design
          if (iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.dispatchEvent(new Event('resize'))
          }
        }
      } catch (error) {
        // Cross-origin restrictions may prevent this, that's okay
        console.log('Could not inject viewport meta (likely cross-origin):', error instanceof Error ? error.message : 'Unknown error')
      }
    }
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

  const toggleZoomMode = () => {
    const modes: Array<'fit' | '25%' | '50%' | '75%' | '100%'> = ['fit', '25%', '50%', '75%', '100%']
    const currentIndex = modes.indexOf(zoomMode)
    const nextIndex = (currentIndex + 1) % modes.length
    const newMode = modes[nextIndex]
    
    // Force iframe reload for all zoom changes to ensure proper rendering
    setIsRefreshing(true)
    setPreviewLoaded(false)
    setZoomMode(newMode)
  }

  const scaleConfig = getScaleAndDimensions()

  return (
    <div className={`${styles.projectCard} ${actualIsRunning ? styles.running : ''}`}>
      <div className={styles.previewContainer} style={{
        width: `${scaleConfig.containerWidth}px`,
        height: `${scaleConfig.containerHeight}px`
      }}>
        {showLivePreview && previewUrl && livePreviewsEnabled ? (
          <div className={`${styles.livePreviewWrapper} ${styles[scaleConfig.containerClass]}`}>
            <div className={styles.deviceViewport} style={{
              width: `${scaleConfig.width * scaleConfig.scale}px`,
              height: `${scaleConfig.height * scaleConfig.scale}px`,
              overflow: 'hidden',
              position: 'relative'
            }}>
              {isVSCodeEnvironment() ? (
                // VS Code fallback UI - no iframe due to CSP restrictions
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
                  padding: '20px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>🖼️</div>
                  <h3 style={{ margin: '0 0 10px 0', color: '#e7e7e7' }}>Live Preview Not Available in VS Code</h3>
                  <p style={{ margin: '0 0 20px 0', opacity: 0.8 }}>Due to security restrictions, live previews cannot be displayed in VS Code webviews</p>
                  <button
                    onClick={() => openInBrowser(previewUrl)}
                    style={{
                      backgroundColor: '#0e639c',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <SvgIcon name="externalLink" size={16} />
                    Open in Browser
                  </button>
                </div>
              ) : (
                // Regular iframe for web mode
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className={`${styles.livePreview} ${previewLoaded ? styles.loaded : ''}`}
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  sandbox="allow-same-origin allow-scripts allow-pointer-lock allow-forms allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation allow-top-navigation-by-user-activation allow-modals allow-orientation-lock allow-presentation"
                  title={`${project.title} Preview`}
                  width={scaleConfig.width}
                  height={scaleConfig.height}
                  style={{
                    width: `${scaleConfig.width}px`,
                    height: `${scaleConfig.height}px`,
                    transform: `scale(${scaleConfig.scale})`,
                    transformOrigin: 'top left',
                    border: 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    minWidth: `${scaleConfig.width}px`,
                    minHeight: `${scaleConfig.height}px`
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
            {zoomMode !== 'fit' && (
              <div className={styles.scaleIndicator}>
                {scaleConfig.deviceType === 'desktop' ? '1920×1080' : '375×812'} ({scaleConfig.displayMode})
              </div>
            )}
          </div>
        ) : (
          <div className={styles.staticPreview}>
            {project.thumbnail && imageLoadStatus !== false ? (
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
          {isRunning && previewUrl && (
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
                onClick={toggleZoomMode}
                className={styles.zoomToggle}
                title={`Zoom: ${zoomMode === 'fit' ? 'Fit to container' : zoomMode}`}
              >
                {zoomMode === 'fit' ? '⊟' : zoomMode}
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
                disabled={!isRunning}
              >
                <SvgIcon name="stop" size={14} />
                Kill
              </button>
              
              <button
                onClick={handleViewInIDE}
                className={`${styles.actionButton} ${styles.ideButton}`}
                title="View project in IDE"
              >
                <SvgIcon name="code" size={14} />
                View in IDE
              </button>
              
              <button
                onClick={handleViewInNewTab}
                className={`${styles.actionButton} ${styles.newTabButton}`}
                title="Open project in new browser tab"
                disabled={!isRunning}
              >
                <SvgIcon name="externalLink" size={14} />
                New Tab
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