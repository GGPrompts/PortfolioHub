import React, { useState, useEffect, useRef } from 'react'
import { Project } from '../store/portfolioStore'
import GitUpdateButton from './GitUpdateButton'
import SvgIcon from './SvgIcon'
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
  const [showLivePreview, setShowLivePreview] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [imageLoadStatus, setImageLoadStatus] = useState<boolean | undefined>(undefined)
  const [localViewMode, setLocalViewMode] = useState<'mobile' | 'desktop'>('desktop')
  const [zoomMode, setZoomMode] = useState<'fit' | '25%' | '50%' | '75%' | '100%'>('fit')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  // Use global view mode if provided, otherwise use local view mode
  const viewMode = globalViewMode || localViewMode

  // Build preview URL with proper viewport hints
  const getPreviewUrl = () => {
    if (!port) return null
    
    const baseUrl = `http://localhost:${port}`
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
    if (isRunning && port && !showLivePreview && livePreviewsEnabled) {
      setIsRefreshing(true)
      // Small delay to let the server fully start
      setTimeout(() => {
        setShowLivePreview(true)
        setPreviewLoaded(false)
      }, 2000)
    }
    if (!isRunning || !livePreviewsEnabled) {
      setShowLivePreview(false)
      setPreviewLoaded(false)
      setIsRefreshing(false)
    }
  }, [isRunning, port, livePreviewsEnabled])

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
    }
  }, [zoomMode, viewMode, previewUrl])

  const handleIframeLoad = () => {
    setPreviewLoaded(true)
    setIsRefreshing(false)
    
    // Inject appropriate viewport meta tag based on device type
    if (iframeRef.current) {
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
    <div className={`${styles.projectCard} ${isRunning ? styles.running : ''}`}>
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
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className={`${styles.livePreview} ${previewLoaded ? styles.loaded : ''}`}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                sandbox="allow-same-origin allow-scripts allow-pointer-lock"
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
          <span className={`${styles.statusDot} ${isRunning ? styles.running : styles.stopped}`}></span>
          <span className={styles.statusText}>
            {isRunning ? `SERVER :${port}` : 'OFFLINE'}
          </span>
          {/* Refresh indicator */}
          {isRefreshing && (
            <div className={styles.refreshIndicator} title="Refreshing preview">
              <SvgIcon name="eye" size={14} />
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
            <button
              onClick={() => onProjectClick(project)}
              className={styles.viewButton}
            >
              View Project
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}