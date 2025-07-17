import React, { useState, useEffect } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { usePortfolioStore } from '../store/portfolioStore'
import { checkPort } from '../utils/portManager'
import styles from './PortfolioSidebar.module.css'

export default function PortfolioSidebar() {
  const { 
    sidebarState, 
    setSidebarState, 
    selectedProject,
    projects,
    activeFilter,
    setActiveFilter,
    selectProject
  } = usePortfolioStore()
  
  const [journalContent, setJournalContent] = useState<string>('')
  const [isLoadingJournal, setIsLoadingJournal] = useState(false)
  const [projectStatuses, setProjectStatuses] = useState<Map<string, boolean>>(new Map())
  
  // Define widths for each state
  const widths = {
    collapsed: 48,    // Icon bar only
    search: 200,      // Search/filter bar
    normal: 320,      // Project controls
    expanded: 816     // Wide view
  }
  
  // Spring animation for smooth transitions
  const springProps = useSpring({
    width: widths[sidebarState],
    config: {
      tension: 260,
      friction: 24,
    }
  })
  
  // Get unique tags for filtering
  const allTags = Array.from(new Set(projects.flatMap(p => p.tags)))
  
  // Load dev journal when in expanded view and project selected
  useEffect(() => {
    if (sidebarState === 'expanded' && selectedProject?.devJournal) {
      setIsLoadingJournal(true)
      fetch(selectedProject.devJournal)
        .then(res => res.text())
        .then(content => {
          setJournalContent(content)
          setIsLoadingJournal(false)
        })
        .catch(err => {
          console.error('Failed to load dev journal:', err)
          setJournalContent('# Dev Journal\n\nFailed to load journal content.')
          setIsLoadingJournal(false)
        })
    }
  }, [sidebarState, selectedProject])
  
  // Check project statuses
  useEffect(() => {
    const checkStatuses = async () => {
      const statuses = new Map<string, boolean>()
      for (const project of projects) {
        if (project.localPort) {
          const isRunning = await checkPort(project.localPort)
          statuses.set(project.id, isRunning)
        }
      }
      setProjectStatuses(statuses)
    }
    checkStatuses()
    const interval = setInterval(checkStatuses, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [projects])
  
  return (
    <animated.div 
      className={styles.sidebar}
      style={{ width: springProps.width }}
    >
      {/* Toggle Buttons */}
      <div className={styles.toggleButtons}>
        {sidebarState !== 'collapsed' && (
          <button 
            className={`${styles.toggleButton} ${styles.collapseButton}`}
            onClick={() => setSidebarState('collapsed')}
            title="Collapse to icons"
          >
            ◀
          </button>
        )}
        {sidebarState === 'collapsed' && (
          <button 
            className={styles.toggleButton}
            onClick={() => setSidebarState('search')}
            title="Show search/filters"
          >
            ▶
          </button>
        )}
        {sidebarState === 'search' && (
          <button 
            className={`${styles.toggleButton}`}
            onClick={() => setSidebarState('normal')}
            title="Show project controls"
          >
            ▶
          </button>
        )}
        {sidebarState === 'normal' && (
          <button 
            className={`${styles.toggleButton} ${styles.expandButton}`}
            onClick={() => setSidebarState('expanded')}
            title="Expand to wide view"
          >
            ▶▶
          </button>
        )}
        {sidebarState === 'expanded' && (
          <button 
            className={`${styles.toggleButton} ${styles.shrinkButton}`}
            onClick={() => setSidebarState('normal')}
            title="Shrink to sidebar"
          >
            ◀◀
          </button>
        )}
      </div>
      
      {/* Collapsed State - Icon Bar */}
      {sidebarState === 'collapsed' && (
        <div className={styles.iconBar}>
          <div 
            className={styles.icon} 
            title="Projects"
            onClick={() => setSidebarState('normal')}
          >
            📁
          </div>
          <div 
            className={styles.icon} 
            title="Filter/Search"
            onClick={() => setSidebarState('search')}
          >
            🔍
          </div>
          <div 
            className={styles.icon} 
            title="Dev Journals"
            onClick={() => setSidebarState('expanded')}
          >
            📓
          </div>
          <div className={styles.iconDivider}></div>
          <div 
            className={styles.icon} 
            title="Start All Projects"
            onClick={() => {
              const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio && .\\scripts\\start-all-enhanced.ps1'
              navigator.clipboard.writeText(command)
              alert('Start command copied to clipboard!')
            }}
          >
            🚀
          </div>
          <div 
            className={styles.icon} 
            title="Kill All Projects"
            onClick={() => {
              const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio && .\\scripts\\kill-all-servers.ps1'
              navigator.clipboard.writeText(command)
              alert('Kill command copied to clipboard!')
            }}
          >
            🛑
          </div>
        </div>
      )}
      
      {/* Search State - Filter Sidebar */}
      {sidebarState === 'search' && (
        <div className={styles.searchContent}>
          <h3 className={styles.title}>🔍 Search & Filter</h3>
          
          {/* Search Input */}
          <div className={styles.searchSection}>
            <input 
              type="text" 
              placeholder="Search projects..."
              className={styles.searchInput}
            />
          </div>
          
          {/* Filter Section */}
          <div className={styles.section}>
            <h4>Filter by Tag</h4>
            <div className={styles.filterTags}>
              <button
                className={`${styles.filterTag} ${activeFilter === 'all' ? styles.active : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All ({projects.length})
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`${styles.filterTag} ${activeFilter === tag ? styles.active : ''}`}
                  onClick={() => setActiveFilter(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className={styles.section}>
            <h4>Quick Stats</h4>
            <div className={styles.stats}>
              <p>Total: {projects.length}</p>
              <p>Running: {Array.from(projectStatuses.values()).filter(Boolean).length}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Normal State - Project Controls */}
      {sidebarState === 'normal' && (
        <div className={styles.normalContent}>
          <h3 className={styles.title}>📁 Project Controls</h3>
          
          {/* Quick Actions */}
          <div className={styles.quickActions}>
            <button 
              className={styles.startAllBtn}
              onClick={() => {
                const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio && .\\scripts\\start-all-enhanced.ps1'
                navigator.clipboard.writeText(command)
                alert('Start all command copied!')
              }}
              title="Copy command to start all projects"
            >
              🚀 Start All
            </button>
            <button 
              className={styles.killAllBtn}
              onClick={() => {
                const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio && .\\scripts\\kill-all-servers.ps1'
                navigator.clipboard.writeText(command)
                alert('Kill all command copied!')
              }}
              title="Copy command to kill all projects"
            >
              🛑 Kill All
            </button>
          </div>
          
          {/* Project List with Controls */}
          <div className={styles.section}>
            <h4>Projects</h4>
            <div className={styles.projectList}>
              {projects.map(project => {
                const isRunning = projectStatuses.get(project.id) || false
                return (
                  <div 
                    key={project.id} 
                    className={`${styles.projectItem} ${selectedProject?.id === project.id ? styles.selected : ''}`}
                    onClick={() => selectProject(project)}
                  >
                    <div className={styles.projectHeader}>
                      <span className={styles.projectTitle}>{project.title}</span>
                      <span className={`${styles.statusDot} ${isRunning ? styles.running : styles.stopped}`}>
                        {isRunning ? '🟢' : '🔴'}
                      </span>
                    </div>
                    <div className={styles.projectControls}>
                      {project.localPort && (
                        <>
                          <button
                            className={styles.controlBtn}
                            onClick={(e) => {
                              e.stopPropagation()
                              const command = `cd D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.path || project.id} && ${project.buildCommand || 'npm run dev'}`
                              navigator.clipboard.writeText(command)
                              alert(`Start command for ${project.title} copied!`)
                            }}
                            disabled={isRunning}
                            title="Start this project"
                          >
                            ▶️
                          </button>
                          <button
                            className={styles.controlBtn}
                            onClick={(e) => {
                              e.stopPropagation()
                              alert(`To kill ${project.title}, close its terminal window or use Task Manager`)
                            }}
                            disabled={!isRunning}
                            title="Kill this project"
                          >
                            ⏹️
                          </button>
                          <a
                            href={`http://localhost:${project.localPort}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.controlBtn}
                            onClick={(e) => e.stopPropagation()}
                            title="Open in new tab"
                          >
                            🔗
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Expanded State - Dev Journal View */}
      {sidebarState === 'expanded' && (
        <div className={styles.expandedContent}>
          <div className={styles.expandedHeader}>
            <h3>📓 Dev Journal - {selectedProject?.title || 'Select a Project'}</h3>
            {selectedProject?.devJournal && (
              <button 
                className={styles.editJournalBtn}
                onClick={() => {
                  // Open journal file in default editor
                  const journalPath = selectedProject.devJournal?.replace(/\//g, '\\')
                  navigator.clipboard.writeText(`code ${journalPath}`).then(() => {
                    alert('Command copied! Paste in terminal to edit journal.')
                  })
                }}
                title="Copy edit command"
              >
                ✏️ Edit
              </button>
            )}
          </div>
          
          {selectedProject ? (
            <div className={styles.expandedBody}>
              {isLoadingJournal ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner}></div>
                  <p>Loading journal...</p>
                </div>
              ) : (
                <div className={styles.journalContent}>
                  <pre className={styles.journalMarkdown}>
                    {journalContent || '# Dev Journal\n\nNo journal entries yet.\n\nStart documenting your journey!'}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>Select a project to view its development journal</p>
              <p className={styles.hint}>💡 Tip: Journals are markdown files you can edit directly!</p>
            </div>
          )}
        </div>
      )}
    </animated.div>
  )
}