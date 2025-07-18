import React, { useState, useEffect } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { usePortfolioStore } from '../store/portfolioStore'
import { checkPort } from '../utils/portManager'
import GitUpdateButton from './GitUpdateButton'
import SvgIcon from './SvgIcon'
import styles from './PortfolioSidebar.module.css'

interface PortfolioSidebarProps {
  onOpenDashboard?: () => void
  onWidthChange?: (width: number) => void
}

export default function PortfolioSidebar({ onOpenDashboard, onWidthChange }: PortfolioSidebarProps) {
  const { 
    sidebarState, 
    setSidebarState, 
    selectedProject,
    projects,
    activeFilter,
    setActiveFilter,
    selectProject,
    expandedProjects,
    toggleProjectExpanded,
    collapseAllProjects
  } = usePortfolioStore()
  
  const [journalContent, setJournalContent] = useState<string>('')
  const [isLoadingJournal, setIsLoadingJournal] = useState(false)
  const [projectStatuses, setProjectStatuses] = useState<Map<string, boolean>>(new Map())
  const [searchQuery, setSearchQuery] = useState('')
  const [journalMode, setJournalMode] = useState<'full-width' | 'with-projects'>('with-projects')
  
  // Tab-based state management - Array to maintain order
  const [activeTabs, setActiveTabs] = useState<string[]>([])
  
  // Define tab configurations
  const tabs = {
    projects: { width: 320, icon: 'fileText', title: 'Projects' },
    journals: { width: 600, icon: 'edit', title: 'Dev Journals' },
    // Future tabs can be added here: settings, git, etc.
  }

  // All tabs stay attached to the right edge of the total sidebar width
  const getTabPosition = () => {
    // Calculate total sidebar width and position tabs at the right edge
    const totalWidth = calculateWidth()
    return totalWidth === 0 ? 0 : totalWidth // Tabs sit exactly at the right edge
  }
  
  // Calculate total width based on active tabs only
  const calculateWidth = () => {
    if (activeTabs.length === 0) {
      return 0 // No width when no panels are open
    }
    
    let totalWidth = 0
    activeTabs.forEach(tabId => {
      if (tabs[tabId as keyof typeof tabs]) {
        totalWidth += tabs[tabId as keyof typeof tabs].width
      }
    })
    return totalWidth
  }
  
  // Toggle tab function - maintains order
  const toggleTab = (tabId: string) => {
    setActiveTabs(prev => {
      if (prev.includes(tabId)) {
        // Remove tab if it exists
        return prev.filter(id => id !== tabId)
      } else {
        // Add tab to the end (rightmost position)
        return [...prev, tabId]
      }
    })
  }
  
  // Spring animation for smooth transitions
  const springProps = useSpring({
    width: calculateWidth(),
    config: {
      tension: 280,
      friction: 32,
      clamp: true
    }
  })

  // Individual panel animations
  const projectsSpring = useSpring({
    opacity: activeTabs.includes('projects') ? 1 : 0,
    transform: activeTabs.includes('projects') ? 'translateX(0px)' : 'translateX(-20px)',
    pointerEvents: activeTabs.includes('projects') ? 'auto' : 'none',
    config: { tension: 280, friction: 32, clamp: true }
  })
  
  const journalSpring = useSpring({
    opacity: activeTabs.includes('journals') ? 1 : 0,
    transform: activeTabs.includes('journals') ? 'translateX(0px)' : 'translateX(-20px)',
    pointerEvents: activeTabs.includes('journals') ? 'auto' : 'none',
    config: { tension: 280, friction: 32, clamp: true }
  })
  
  // Get unique tags for filtering
  const allTags = Array.from(new Set(projects.flatMap(p => p.tags)))

  // Notify parent of width changes
  useEffect(() => {
    const currentWidth = calculateWidth()
    onWidthChange?.(currentWidth)
  }, [activeTabs, onWidthChange])
  
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
        {/* Notebook-style Tabs - Positioned at screen edge */}
        {Object.entries(tabs).map(([tabId, config]) => (
          <div 
            key={tabId}
            className={`${styles.notebookTab} ${activeTabs.includes(tabId) ? styles.active : ''}`}
            title={config.title}
            onClick={() => toggleTab(tabId)}
            style={{
              position: 'fixed',
              left: `${getTabPosition()}px`,
              top: `${20 + (Object.keys(tabs).indexOf(tabId) * 40)}px`,
              zIndex: activeTabs.includes(tabId) ? 10 : 5,
              transition: 'left 0.3s ease, background 0.3s ease'
            }}
          >
            <div className={styles.tabIcon}>
              <SvgIcon name={config.icon} size={18} color="currentColor" />
            </div>
          </div>
        ))}

      
        {/* Projects Panel - Visible when projects tab is active */}
        {activeTabs.includes('projects') && (
        <animated.div 
          className={styles.projectsPanel}
          style={projectsSpring}
        >
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
              onClick={() => onOpenDashboard?.()}
              title="Open project status dashboard"
            >
              <SvgIcon name="settings" size={16} /> Dashboard
            </button>
            <button 
              className={styles.actionBtn}
              onClick={() => {
                const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\start-all-enhanced.ps1'
                navigator.clipboard.writeText(command)
                alert('Start all command copied!')
              }}
              title="Start all projects"
            >
              <SvgIcon name="play" size={16} /> All
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
              <SvgIcon name="stop" size={16} /> Kill
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => {
                setActiveFilter('all')
                collapseAllProjects()
                setSearchQuery('')
              }}
              title="Clear filters and collapse all projects"
            >
              <SvgIcon name="refresh" size={16} /> Clear
            </button>
          </div>
        </animated.div>
        )}
        
        {/* Journal Panel - Visible when journals tab is active */}
        {activeTabs.includes('journals') && (
        <animated.div 
          className={styles.expandedContent}
          style={journalSpring}
        >
          <div className={styles.expandedHeader}>
            <div className={styles.journalHeaderTop}>
              <h3>📓 Dev Journal - {selectedProject?.title || 'Select a Project'}</h3>
              
              {/* Mode Toggle */}
              <button 
                className={styles.modeToggle}
                onClick={() => setJournalMode(journalMode === 'full-width' ? 'with-projects' : 'full-width')}
                title={journalMode === 'full-width' ? 'Show with projects' : 'Full width view'}
              >
                {journalMode === 'full-width' ? '📑' : '📄'}
              </button>
            </div>
            
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
        )}
      </div>
    </animated.div>
  )
}