import React from 'react'
import GitUpdateButton from '../GitUpdateButton'
import SvgIcon from '../SvgIcon'
import styles from '../PortfolioSidebar.module.css'
import { isVSCodeEnvironment } from '../../utils/vsCodeIntegration'

interface Project {
  id: string
  title: string
  localPort?: number
  buildCommand?: string
  path?: string
  repository?: string
  tags: string[]
}

interface ProjectActionsProps {
  project: Project
  isRunning: boolean
  isExpanded: boolean
  isSelected: boolean
  selectedProjects: Set<string>
  onToggleExpanded: (projectId: string) => void
  onToggleSelection: (projectId: string) => void
  onSelectProject: (project: Project) => void
  executeOrCopyCommand: (command: string, successMessage: string, commandName?: string) => Promise<void>
}

export default function ProjectActions({
  project,
  isRunning,
  isExpanded,
  isSelected,
  selectedProjects,
  onToggleExpanded,
  onToggleSelection,
  onSelectProject,
  executeOrCopyCommand
}: ProjectActionsProps) {
  
  const handleProjectClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    // Always go to landing page when clicking project title
    onSelectProject(project)
  }

  const handleStartServer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const command = `cd D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.path || project.id}; ${project.buildCommand || 'npm run dev'}`
    await executeOrCopyCommand(command, `${project.title} start command ready!`, `Start ${project.title}`)
  }

  const handleKillServer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (project.localPort) {
      const command = `taskkill /F /FI "PID eq (Get-NetTCPConnection -LocalPort ${project.localPort} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)"`
      await executeOrCopyCommand(command, `${project.title} kill command ready!`, `Kill ${project.title}`)
    } else {
      if (isVSCodeEnvironment()) {
        const { showNotification } = await import('../../utils/vsCodeIntegration')
        showNotification(`${project.title} has no port configured`, 'warning')
      } else {
        alert(`${project.title} has no port configured`)
      }
    }
  }

  const handleOpenInNewTab = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const url = `http://localhost:${project.localPort}`
    console.log(`🔗 Opening ${project.title} in new tab:`, url)
    if (isVSCodeEnvironment()) {
      const { openInBrowser, showNotification } = await import('../../utils/vsCodeIntegration')
      openInBrowser(url)
      showNotification(`Opening ${project.title} in browser`, 'info')
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div className={styles.projectContainer}>
      <div 
        className={`${styles.projectItem} ${isSelected ? styles.selected : ''}`}
      >
        <button
          className={`${styles.expandToggle} ${isExpanded ? styles.expanded : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpanded(project.id)
          }}
        >
          ▶
        </button>
        <input
          type="checkbox"
          className={styles.projectCheckbox}
          checked={selectedProjects.has(project.id)}
          onChange={(e) => {
            e.stopPropagation()
            onToggleSelection(project.id)
          }}
          title="Select for launch/kill operations"
        />
        <span 
          className={styles.projectTitle}
          onClick={handleProjectClick}
        >
          {project.title}
        </span>
        {project.localPort && (
          <span className={`${styles.statusDot} ${isRunning ? styles.running : styles.stopped}`}>
            {isRunning ? '🟢' : '🔴'}
          </span>
        )}
      </div>
  
      {isExpanded && (
        <div className={styles.projectDropdown}>
          {project.localPort && (
            <>
              <button
                className={styles.dropdownItem}
                onClick={handleOpenInNewTab}
                disabled={!isRunning}
              >
                🔗 Open in new tab
              </button>
              <button
                className={styles.dropdownItem}
                onClick={handleStartServer}
                disabled={isRunning}
              >
                ▶️ Start server
              </button>
              <button
                className={styles.dropdownItem}
                onClick={handleKillServer}
                disabled={!isRunning}
              >
                ⏹️ Kill server
              </button>
            </>
          )}
          <div style={{ padding: '4px' }}>
            <GitUpdateButton 
              type="project" 
              projectId={project.id}
              projectName={project.title}
              size="small" 
              variant="minimal"
            />
          </div>
          {project.repository && (
            <button
              className={styles.dropdownItem}
              onClick={() => window.open(project.repository, '_blank')}
            >
              <SvgIcon name="github" size={16} /> View on GitHub
            </button>
          )}
          <div className={styles.dropdownTags}>
            {project.tags.map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}