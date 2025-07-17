import React, { useState, useEffect } from 'react'
import { usePortfolioStore } from '../store/portfolioStore'
import { getAllPortStatuses, getRunningProjects, getProjectPort } from '../utils/portManager'
import styles from './ProjectStatusDashboard.module.css'

interface ProjectStatusDashboardProps {
  onClose: () => void
}

interface ProjectStatus {
  id: string
  title: string
  isRunning: boolean
  port: number | null
  defaultPort: number | null
  buildCommand: string
  displayType: string
}

export default function ProjectStatusDashboard({ onClose }: ProjectStatusDashboardProps) {
  const { projects } = usePortfolioStore()
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const updateProjectStatuses = async () => {
    setLoading(true)
    const runningProjects = await getRunningProjects()
    const portStatuses = await getAllPortStatuses()
    
    const statuses: ProjectStatus[] = []
    
    for (const project of projects) {
      if (project.displayType === 'external') {
        const actualPort = await getProjectPort(project)
        const isRunning = runningProjects.has(project.id)
        
        statuses.push({
          id: project.id,
          title: project.title,
          isRunning,
          port: actualPort,
          defaultPort: project.localPort || null,
          buildCommand: project.buildCommand || 'npm run dev',
          displayType: project.displayType
        })
      } else {
        statuses.push({
          id: project.id,
          title: project.title,
          isRunning: true, // iframe projects are always "running"
          port: null,
          defaultPort: null,
          buildCommand: 'N/A',
          displayType: project.displayType
        })
      }
    }
    
    setProjectStatuses(statuses)
    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => {
    updateProjectStatuses()
    
    // Update every 5 seconds
    const interval = setInterval(updateProjectStatuses, 5000)
    
    return () => clearInterval(interval)
  }, [projects])

  const runningCount = projectStatuses.filter(p => p.isRunning).length
  const totalCount = projectStatuses.length

  const openProject = (project: ProjectStatus) => {
    if (project.displayType === 'external' && project.port) {
      window.open(`http://localhost:${project.port}`, '_blank')
    } else if (project.displayType === 'iframe') {
      // Close dashboard and let user interact with project grid
      onClose()
    }
  }

  const killProject = async (projectId: string) => {
    // This would integrate with the project launcher to kill processes
    console.log(`Killing project ${projectId}`)
    // For now, just refresh the status
    await updateProjectStatuses()
  }

  const startProject = async (projectId: string) => {
    // This would integrate with the project launcher to start processes
    console.log(`Starting project ${projectId}`)
    // For now, just refresh the status
    await updateProjectStatuses()
  }

  const startAllProjects = async () => {
    console.log('Starting all projects')
    // This would start all external projects
    await updateProjectStatuses()
  }

  const killAllProjects = async () => {
    console.log('Killing all projects')
    // This would kill all running projects
    await updateProjectStatuses()
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h2>Project Status Dashboard</h2>
          <div className={styles.controls}>
            <div className={styles.summary}>
              <span className={styles.running}>{runningCount}</span>
              <span>/</span>
              <span className={styles.total}>{totalCount}</span>
              <span>projects running</span>
            </div>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.lastUpdated}>
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        {loading && <span className={styles.loading}>Refreshing...</span>}
      </div>

      <div className={styles.projectList}>
        {projectStatuses.map(project => (
          <div
            key={project.id}
            className={`${styles.projectItem} ${project.isRunning ? styles.running : styles.stopped}`}
          >
            <div className={styles.projectInfo}>
              <div className={styles.projectHeader}>
                <h3>{project.title}</h3>
                <div className={styles.statusIndicator}>
                  <div className={`${styles.statusDot} ${project.isRunning ? styles.runningDot : styles.stoppedDot}`}></div>
                  <span className={styles.statusText}>
                    {project.isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>
              
              <div className={styles.projectDetails}>
                <span className={styles.defaultPort}>
                  Type: {project.displayType}
                </span>
                {project.defaultPort && (
                  <span className={styles.defaultPort}>
                    Default: :{project.defaultPort}
                  </span>
                )}
                {project.port && (
                  <span className={styles.actualPort}>
                    Running: :{project.port}
                  </span>
                )}
                <span className={styles.buildCommand}>
                  {project.buildCommand}
                </span>
              </div>
            </div>

            <div className={styles.projectActions}>
              {project.displayType === 'external' ? (
                <>
                  {project.isRunning ? (
                    <>
                      <button 
                        className={styles.openBtn}
                        onClick={() => openProject(project)}
                      >
                        Open
                      </button>
                      <button 
                        className={styles.killBtn}
                        onClick={() => killProject(project.id)}
                      >
                        Kill
                      </button>
                    </>
                  ) : (
                    <button 
                      className={styles.startBtn}
                      onClick={() => startProject(project.id)}
                    >
                      Start
                    </button>
                  )}
                </>
              ) : (
                <button 
                  className={styles.openBtn}
                  onClick={() => openProject(project)}
                >
                  View
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.actions}>
          <button 
            className={styles.startAllBtn}
            onClick={startAllProjects}
          >
            🚀 Start All External Projects
          </button>
          <button 
            className={styles.killAllBtn}
            onClick={killAllProjects}
          >
            🛑 Kill All Projects
          </button>
        </div>
      </div>
    </div>
  )
}