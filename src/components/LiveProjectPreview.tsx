import React, { useState, useEffect, useRef } from 'react'
import { Project } from '../store/portfolioStore'
import GitUpdateButton from './GitUpdateButton'
import styles from './LiveProjectPreview.module.css'

interface LiveProjectPreviewProps {
  project: Project
  isRunning: boolean
  port: number | null
  onProjectClick: (project: Project) => void
}

export default function LiveProjectPreview({ 
  project, 
  isRunning, 
  port, 
  onProjectClick 
}: LiveProjectPreviewProps) {
  const [showLivePreview, setShowLivePreview] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [imageLoadStatus, setImageLoadStatus] = useState<boolean | undefined>(undefined)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const previewUrl = port ? `http://localhost:${port}` : null

  // Auto-enable live preview when project starts running
  useEffect(() => {
    if (isRunning && port && !showLivePreview) {
      // Small delay to let the server fully start
      setTimeout(() => {
        setShowLivePreview(true)
      }, 2000)
    }
    if (!isRunning) {
      setShowLivePreview(false)
      setPreviewLoaded(false)
    }
  }, [isRunning, port])

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
    setShowLivePreview(!showLivePreview)
  }

  return (
    <div className={`${styles.projectCard} ${isRunning ? styles.running : ''}`}>
      <div className={styles.previewContainer}>
        {showLivePreview && previewUrl ? (
          <div className={styles.livePreviewWrapper}>
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className={`${styles.livePreview} ${previewLoaded ? styles.loaded : ''}`}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-same-origin allow-scripts"
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