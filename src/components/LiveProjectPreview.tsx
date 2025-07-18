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
  const [localViewMode, setLocalViewMode] = useState<'mobile' | 'desktop'>('mobile')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  // Use global view mode if provided, otherwise use local view mode
  const viewMode = globalViewMode || localViewMode

  const previewUrl = port ? `http://localhost:${port}${viewMode === 'desktop' ? '?viewport=desktop&orientation=landscape' : ''}` : null

  // Auto-enable live preview when project starts running and global previews are enabled
  useEffect(() => {
    if (isRunning && port && !showLivePreview && livePreviewsEnabled) {
      // Small delay to let the server fully start
      setTimeout(() => {
        setShowLivePreview(true)
      }, 2000)
    }
    if (!isRunning || !livePreviewsEnabled) {
      setShowLivePreview(false)
      setPreviewLoaded(false)
    }
  }, [isRunning, port, livePreviewsEnabled])

  const handleIframeLoad = () => {
    setPreviewLoaded(true)
  }

  const handleIframeError = () => {
    setPreviewLoaded(false)
    setShowLivePreview(false)
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
      setShowLivePreview(!showLivePreview)
    }
  }

  const toggleViewMode = () => {
    // Only allow local toggle if no global view mode is set
    if (!globalViewMode) {
      setLocalViewMode(localViewMode === 'mobile' ? 'desktop' : 'mobile')
    }
  }

  return (
    <div className={`${styles.projectCard} ${isRunning ? styles.running : ''}`}>
      <div className={styles.previewContainer}>
        {showLivePreview && previewUrl && livePreviewsEnabled ? (
          <div className={`${styles.livePreviewWrapper} ${styles[viewMode]}`}>
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className={`${styles.livePreview} ${previewLoaded ? styles.loaded : ''}`}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-same-origin allow-scripts allow-pointer-lock"
              title={`${project.title} Preview`}
            />
            {!previewLoaded && (
              <div className={styles.previewLoading}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading {project.title}...</p>
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
                  <SvgIcon name={viewMode === 'mobile' ? 'monitor' : 'smartphone'} size={12} />
                </button>
              )}
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
          <div className={styles.techStack}>
            {project.tech.slice(0, 3).map(tech => (
              <span key={tech} className={styles.techBadge}>{tech}</span>
            ))}
            {project.tech.length > 3 && (
              <span className={styles.techBadge}>+{project.tech.length - 3}</span>
            )}
          </div>
          
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