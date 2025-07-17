import React, { useState, useEffect } from 'react'
import { usePortfolioStore, Project } from '../store/portfolioStore'
import { getRunningProjects, getProjectPort } from '../utils/portManager'
import styles from './ProjectGrid.module.css'

interface ProjectGridProps {
  onProjectClick: (project: Project) => void
}

export default function ProjectGrid({ onProjectClick }: ProjectGridProps) {
  const { projects, activeFilter, getFilteredProjects } = usePortfolioStore()
  const [imageLoadStatus, setImageLoadStatus] = useState<{ [key: string]: boolean }>({})
  const [runningStatus, setRunningStatus] = useState<{ [key: string]: boolean }>({})
  const [projectPorts, setProjectPorts] = useState<{ [key: string]: number | null }>({})

  // Get filtered projects directly
  const filteredProjects = getFilteredProjects()

  // Check running status every 5 seconds
  useEffect(() => {
    const checkRunningStatus = async () => {
      const running = await getRunningProjects()
      const newRunningStatus: { [key: string]: boolean } = {}
      const newPortStatus: { [key: string]: number | null } = {}
      
      for (const project of projects) {
        if (project.displayType === 'external') {
          const isRunning = running.has(project.id)
          const port = await getProjectPort(project)
          newRunningStatus[project.id] = isRunning
          newPortStatus[project.id] = port
        }
      }
      
      setRunningStatus(newRunningStatus)
      setProjectPorts(newPortStatus)
    }
    
    checkRunningStatus()
    const interval = setInterval(checkRunningStatus, 5000)
    
    return () => clearInterval(interval)
  }, [projects])

  useEffect(() => {
    console.log('Projects in store:', projects)
    console.log('Active filter:', activeFilter)
    console.log('Filtered projects:', filteredProjects)
    console.log('Running status:', runningStatus)
  }, [projects, activeFilter, filteredProjects, runningStatus])

  const handleImageLoad = (projectId: string) => {
    setImageLoadStatus(prev => ({ ...prev, [projectId]: true }))
  }

  const handleImageError = (projectId: string) => {
    setImageLoadStatus(prev => ({ ...prev, [projectId]: false }))
  }

  const getDisplayTypeIcon = (type: string) => {
    switch (type) {
      case 'iframe': return '🖼️'
      case 'external': return '🔗'
      case 'embed': return '🎮'
      default: return '📁'
    }
  }

  return (
    <div className={styles.gridContainer}>
      {filteredProjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
          <p>No projects found. Check the console for debugging info.</p>
          <p>Projects loaded: {projects.length}</p>
          <p>Active filter: {activeFilter}</p>
        </div>
      ) : (
        <div className={styles.projectGrid}>
          {filteredProjects.map(project => (
          <div
            key={project.id}
            className={styles.projectCard}
            onClick={() => onProjectClick(project)}
          >
            <div className={styles.thumbnailContainer}>
              {project.thumbnail && !imageLoadStatus[project.id] === false ? (
                <img
                  src={project.thumbnail}
                  alt={project.title}
                  className={styles.thumbnail}
                  onLoad={() => handleImageLoad(project.id)}
                  onError={() => handleImageError(project.id)}
                  style={{ 
                    display: imageLoadStatus[project.id] === undefined ? 'none' : 'block' 
                  }}
                />
              ) : null}
              
              {(!project.thumbnail || imageLoadStatus[project.id] === false || 
                imageLoadStatus[project.id] === undefined) && (
                <div className={styles.placeholderThumbnail}>
                  <span className={styles.placeholderIcon}>
                    {getDisplayTypeIcon(project.displayType)}
                  </span>
                </div>
              )}
              
              <div className={styles.displayTypeBadge}>
                {project.displayType}
              </div>
            </div>
            
            <div className={styles.projectContent}>
              <h3 className={styles.projectTitle}>{project.title}</h3>
              <p className={styles.projectDescription}>{project.description}</p>
              
              <div className={styles.projectMeta}>
                <div className={styles.techStack}>
                  {project.tech.slice(0, 3).map(tech => (
                    <span key={tech} className={styles.techBadge}>
                      {tech}
                    </span>
                  ))}
                  {project.tech.length > 3 && (
                    <span className={styles.techBadge}>
                      +{project.tech.length - 3}
                    </span>
                  )}
                </div>
                
                <div className={styles.projectStatus}>
                  {project.displayType === 'external' ? (
                    <>
                      <span className={`${styles.statusDot} ${runningStatus[project.id] ? styles.running : styles.stopped}`}></span>
                      {runningStatus[project.id] ? (
                        <span className={styles.runningText}>
                          Running{projectPorts[project.id] && ` :${projectPorts[project.id]}`}
                        </span>
                      ) : (
                        <span className={styles.stoppedText}>Stopped</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className={`${styles.statusDot} ${styles[project.status]}`}></span>
                      {project.status}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className={styles.cardHoverEffect}></div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}