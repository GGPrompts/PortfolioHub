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
    selectProject,
    expandedProjects,
    toggleProjectExpanded
  } = usePortfolioStore()
  
  const [journalContent, setJournalContent] = useState<string>('')
  const [isLoadingJournal, setIsLoadingJournal] = useState(false)
  const [projectStatuses, setProjectStatuses] = useState<Map<string, boolean>>(new Map())
  const [searchQuery, setSearchQuery] = useState('')
  
  // Define widths for each state - now cumulative
  const widths = {
    collapsed: 48,     // Icon bar only
    normal: 48 + 320,  // Icon bar + projects panel
    expanded: 48 + 320 + 500  // Icon bar + projects + journal
  }
  
  // Spring animation for smooth transitions
  const springProps = useSpring({
    width: widths[sidebarState],
    config: {
      tension: 280,
      friction: 32,
      clamp: true
    }
  })

  // Journal panel animation
  const journalSpring = useSpring({
    opacity: sidebarState === 'expanded' ? 1 : 0,
    transform: sidebarState === 'expanded' ? 'translateX(0px)' : 'translateX(-20px)',
    config: {
      tension: 280,
      friction: 32
    }
  })
  
  // Get unique tags for filtering
  const allTags = Array.from(new Set(projects.flatMap(p => p.tags)))
  
  // Filter projects based on search query
  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchQuery === '' || 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = activeFilter === 'all' || project.tags.includes(activeFilter)
    return matchesSearch && matchesFilter
  })
  
  // Handle navigation to portfolio home
  const handlePortfolioHome = () => {
    selectProject(null)
    setSidebarState('normal')
    // This will trigger the App component to show the grid
  }
  
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
      <div className={styles.sidebarContainer}>
        {/* Toggle Arrows - positioned on each panel edge */}
        {sidebarState === 'collapsed' && (
          <button 
            className={`${styles.arrowButton} ${styles.expandProjects}`}
            onClick={() => setSidebarState('normal')}
            title="Show projects panel"
          >
            ▶
          </button>
        )}
        {sidebarState === 'normal' && (
          <>
            <button 
              className={`${styles.arrowButton} ${styles.collapseProjects}`}
              onClick={() => setSidebarState('collapsed')}
              title="Hide projects panel"
            >
              ◀
            </button>
            <button 
              className={`${styles.arrowButton} ${styles.expandJournal}`}
              onClick={() => setSidebarState('expanded')}
              title="Show dev journal"
            >
              ▶
            </button>
          </>
        )}
        {sidebarState === 'expanded' && (
          <button 
            className={`${styles.arrowButton} ${styles.collapseJournal}`}
            onClick={() => setSidebarState('normal')}
            title="Hide dev journal"
          >
            ◀
          </button>
        )}
      
        {/* Icon Bar - Always Visible */}
        <div className={styles.iconBar}>
          <div 
            className={`${styles.icon} ${sidebarState === 'normal' || sidebarState === 'expanded' ? styles.active : ''}`}
            title="Portfolio Home"
            onClick={handlePortfolioHome}
          >
            📁
          </div>
          <div 
            className={`${styles.icon} ${sidebarState === 'expanded' ? styles.active : ''}`}
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
              const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\start-all-enhanced.ps1'
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
              const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\kill-all-servers.ps1'
              navigator.clipboard.writeText(command)
              alert('Kill command copied to clipboard!')
            }}
          >
            🛑
          </div>
        </div>
      
        {/* Projects Panel - Visible in normal and expanded states */}
        {(sidebarState === 'normal' || sidebarState === 'expanded') && (
        <div className={styles.projectsPanel}>
          <h3 className={styles.title}>PROJECTS</h3>
          
          {/* Search Bar */}
          <div className={styles.searchSection}>
            <input 
              type="text" 
              placeholder="Search projects..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Project List with Collapsible Dropdowns */}
          <div className={styles.projectList}>
            {filteredProjects.map(project => {
              const isRunning = projectStatuses.get(project.id) || false
              const isExpanded = expandedProjects.has(project.id)
              
              return (
                <div key={project.id} className={styles.projectContainer}>
                  <div 
                    className={`${styles.projectItem} ${selectedProject?.id === project.id ? styles.selected : ''}`}
                  >
                    <button
                      className={`${styles.expandToggle} ${isExpanded ? styles.expanded : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleProjectExpanded(project.id)
                      }}
                    >
                      ▶
                    </button>
                    <span 
                      className={styles.projectTitle}
                      onClick={() => {
                        selectProject(project)
                      }}
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
                            onClick={() => window.open(`http://localhost:${project.localPort}`, '_blank')}
                            disabled={!isRunning}
                          >
                            🔗 Open in new tab
                          </button>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => {
                              const command = `cd D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.path || project.id}; ${project.buildCommand || 'npm run dev'}`
                              navigator.clipboard.writeText(command)
                              alert(`Start command copied!`)
                            }}
                            disabled={isRunning}
                          >
                            ▶️ Start server
                          </button>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => alert(`To kill ${project.title}, close its terminal window`)}
                            disabled={!isRunning}
                          >
                            ⏹️ Kill server
                          </button>
                        </>
                      )}
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          setSidebarState('expanded')
                          selectProject(project)
                        }}
                      >
                        📓 View journal
                      </button>
                      {project.repository && (
                        <button
                          className={styles.dropdownItem}
                          onClick={() => window.open(project.repository, '_blank')}
                        >
                          🐙 View on GitHub
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
            })}
          </div>
          
          {/* Quick Actions Footer */}
          <div className={styles.quickActions}>
            <button 
              className={styles.actionBtn}
              onClick={() => {
                const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\start-all-enhanced.ps1'
                navigator.clipboard.writeText(command)
                alert('Start all command copied!')
              }}
              title="Start all projects"
            >
              🚀 All
            </button>
            <button 
              className={styles.actionBtn}
              onClick={() => {
                const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\kill-all-servers.ps1'
                navigator.clipboard.writeText(command)
                alert('Kill all command copied!')
              }}
              title="Kill all projects"
            >
              🛑 Kill
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => setActiveFilter('all')}
              title="Clear filters"
            >
              🔄 Clear
            </button>
          </div>
        </div>
        )}
        
        {/* Dev Journal - Always rendered, animated visibility */}
        <animated.div 
          className={styles.expandedContent}
          style={journalSpring}
        >
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
        </animated.div>
      </div>
    </animated.div>
  )
}