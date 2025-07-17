import React, { useState, useEffect } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { usePortfolioStore } from '../store/portfolioStore'
import styles from './PortfolioSidebar.module.css'

export default function PortfolioSidebar() {
  const { 
    sidebarState, 
    setSidebarState, 
    selectedProject,
    projects,
    activeFilter,
    setActiveFilter
  } = usePortfolioStore()
  
  const [journalContent, setJournalContent] = useState<string>('')
  const [isLoadingJournal, setIsLoadingJournal] = useState(false)
  
  // Define widths for each state
  const widths = {
    collapsed: 48,    // Icon bar only
    normal: 256,      // Sidebar width
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
  
  return (
    <animated.div 
      className={styles.sidebar}
      style={{ width: springProps.width }}
    >
      {/* Toggle Buttons */}
      <div className={styles.toggleButtons}>
        {(sidebarState === 'normal' || sidebarState === 'expanded') && (
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
            onClick={() => setSidebarState('normal')}
            title="Expand sidebar"
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
          <div className={styles.icon} title="Projects">📁</div>
          <div className={styles.icon} title="Filter">🔍</div>
          <div className={styles.icon} title="Info">ℹ️</div>
        </div>
      )}
      
      {/* Normal State - Project Info Sidebar */}
      {sidebarState === 'normal' && (
        <div className={styles.normalContent}>
          <h3 className={styles.title}>Project Portfolio</h3>
          
          {/* Quick Actions */}
          <div className={styles.quickActions}>
            <button 
              className={styles.startAllBtn}
              onClick={() => {
                const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio && .\\scripts\\start-all-improved.ps1'
                navigator.clipboard.writeText(command).then(() => {
                  alert(
                    '✅ Command copied to clipboard!\n\n' +
                    'To start all projects:\n' +
                    '1. Open PowerShell (Win+X, then A)\n' +
                    '2. Paste the command (Ctrl+V)\n' +
                    '3. Press Enter\n\n' +
                    'Features:\n' +
                    '• No auto-opening browsers\n' +
                    '• Smart port detection\n' +
                    '• Proper port assignments\n' +
                    '• All projects in separate terminals'
                  )
                }).catch(() => {
                  alert(
                    'To start all projects, run this in PowerShell:\n\n' +
                    command + '\n\n' +
                    'This will launch all projects without auto-opening browsers!'
                  )
                })
              }}
              title="Copy improved command to start all projects"
            >
              🚀 Start All Projects
            </button>
          </div>
          
          {/* Filter Section */}
          <div className={styles.section}>
            <h4>Filter Projects</h4>
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
          
          {/* Selected Project Info */}
          <div className={styles.section}>
            <h4>Selected Project</h4>
            <div className={styles.projectInfo}>
              {selectedProject ? (
                <>
                  <p className={styles.projectName}>{selectedProject.title}</p>
                  <p className={styles.projectDesc}>{selectedProject.description}</p>
                  <div className={styles.projectTech}>
                    {selectedProject.tech.map(tech => (
                      <span key={tech} className={styles.techBadge}>{tech}</span>
                    ))}
                  </div>
                  <div className={styles.projectActions}>
                    {selectedProject.repository && (
                      <a href={selectedProject.repository} target="_blank" rel="noopener noreferrer" 
                         className={styles.actionLink}>
                        View Repository
                      </a>
                    )}
                    {selectedProject.demoUrl && (
                      <a href={selectedProject.demoUrl} target="_blank" rel="noopener noreferrer"
                         className={styles.actionLink}>
                        Live Demo
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className={styles.noSelection}>Click a project to view details</p>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className={styles.section}>
            <h4>Portfolio Stats</h4>
            <div className={styles.stats}>
              <p>Total Projects: {projects.length}</p>
              <p>Active: {projects.filter(p => p.status === 'active').length}</p>
              <p>Technologies: {Array.from(new Set(projects.flatMap(p => p.tech))).length}</p>
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