import React, { useState, useEffect } from 'react'
import { usePortfolioStore } from '../store/portfolioStore'
import { useProjectData } from '../hooks/useProjectData'
import { getAllPortStatuses, getRunningProjects, getProjectPort } from '../utils/portManager'
import { isVSCodeEnvironment, executeCommand, showNotification } from '../utils/vsCodeIntegration'
import GitUpdateButton from './GitUpdateButton'
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
  const { projects: allProjects } = useProjectData()
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const updateProjectStatuses = async () => {
    setLoading(true)
    const statuses: ProjectStatus[] = []
    
    // Check if we're in VS Code environment and use project data
    if (isVSCodeEnvironment() && allProjects.length > 0) {
      console.log('🖥️ Dashboard: Using VS Code project data')
      const vsCodeProjects = allProjects || []
      
      for (const project of projects) {
        if (project.displayType === 'external') {
          const vsCodeProject = vsCodeProjects.find((p: any) => p.id === project.id)
          const isRunning = vsCodeProject?.status === 'active' || false
          const actualPort = isRunning ? (vsCodeProject?.localPort || project.localPort) : null
          
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
    } else {
      // Fallback to web-based port checking
      console.log('🌐 Dashboard: Using web-based port checking')
      const runningProjects = await getRunningProjects()
      const portStatuses = await getAllPortStatuses()
      
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
    }
    
    setProjectStatuses(statuses)
    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => {
    updateProjectStatuses()
    
    // Only set up interval in web context - VS Code extension handles refreshing
    let interval: NodeJS.Timeout | null = null
    if (!isVSCodeEnvironment()) {
      interval = setInterval(updateProjectStatuses, 5000) // Update every 5 seconds
      console.log('⏰ Dashboard: Status check interval created (WEB MODE)')
    } else {
      console.log('🖥️ Dashboard: VS Code mode - using extension refresh cycle (NO INTERVAL)')
    }
    
    return () => {
      if (interval) {
        clearInterval(interval)
        console.log('🛑 Dashboard: Status check interval cleared')
      }
    }
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
    const project = projects.find(p => p.id === projectId)
    if (!project || !project.localPort) return
    
    // Use VS Code API if available
    if (isVSCodeEnvironment()) {
      const command = `$proc = Get-NetTCPConnection -LocalPort ${project.localPort} -ErrorAction SilentlyContinue | Select-Object -First 1; if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }`
      await executeCommand(command, `Kill ${project.title}`)
      showNotification(`Stopping ${project.title}...`, 'info')
    } else {
      // Fallback to clipboard
      const command = `taskkill /F /PID (Get-NetTCPConnection -LocalPort ${project.localPort} | Select-Object -ExpandProperty OwningProcess)`
      await navigator.clipboard.writeText(command)
      alert(`Kill command copied to clipboard for ${project.title}`)
    }
    
    // Refresh status after a delay
    setTimeout(() => updateProjectStatuses(), 2000)
  }

  const startProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return
    
    const portfolioPath = 'D:\\ClaudeWindows\\claude-dev-portfolio'
    const projectPath = isVSCodeEnvironment()
      ? `${portfolioPath}\\projects\\${project.id}`
      : `D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.id}`
    
    const command = `cd "${projectPath}" && ${project.buildCommand || 'npm run dev'}`
    
    // Use VS Code API if available
    if (isVSCodeEnvironment()) {
      await executeCommand(command, `Start ${project.title}`)
      showNotification(`Starting ${project.title}...`, 'info')
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(command)
      alert(`Start command copied to clipboard for ${project.title}`)
    }
    
    // Refresh status after a delay
    setTimeout(() => updateProjectStatuses(), 3000)
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
            <GitUpdateButton 
              type="all" 
              size="medium" 
              variant="primary"
            />
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