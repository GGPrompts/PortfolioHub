import React, { useState, useEffect } from 'react'
import { usePortfolioStore, Project } from '../store/portfolioStore'
import { getRunningProjects, getProjectPort } from '../utils/portManager'
import LiveProjectPreview from './LiveProjectPreview'
import styles from './ProjectGrid.module.css'

interface ProjectGridProps {
  onProjectClick: (project: Project) => void
}

export default function ProjectGrid({ onProjectClick }: ProjectGridProps) {
  const { projects, activeFilter, getFilteredProjects } = usePortfolioStore()
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
            <LiveProjectPreview
              key={project.id}
              project={project}
              isRunning={runningStatus[project.id] || false}
              port={projectPorts[project.id]}
              onProjectClick={onProjectClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}