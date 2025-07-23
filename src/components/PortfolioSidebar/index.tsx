import React, { useEffect } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { 
  usePortfolioSidebarState,
  useJournalState,
  useDevNotesState,
  useProjectSelectionState,
  useTabManagement
} from './hooks'
import Navigation from './Navigation'
import ProjectActions from './ProjectActions'
import BatchCommands from './BatchCommands'
import DevNotes from './DevNotes'
import SvgIcon from '../SvgIcon'
import styles from '../PortfolioSidebar.module.css'
import { executeOrCopyCommand } from './utils'

interface PortfolioSidebarProps {
  onOpenDashboard?: () => void
  onWidthChange?: (width: number) => void
  layoutStrategy?: 'push' | 'overlay'
}

export default function PortfolioSidebar({ 
  onOpenDashboard, 
  onWidthChange, 
  layoutStrategy = 'push' 
}: PortfolioSidebarProps) {
  // Custom hooks for state management
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
    collapseAllProjects,
    projectStatus,
    isLoadingStatus,
    refreshProjectStatus,
    getProjectStatus,
    runningProjectsCount,
    totalProjects
  } = usePortfolioSidebarState()

  const {
    journalContent,
    setJournalContent,
    isLoadingJournal,
    setIsLoadingJournal,
    searchQuery,
    setSearchQuery,
    journalMode,
    setJournalMode
  } = useJournalState()

  const devNotesState = useDevNotesState()
  
  const {
    selectedProjects,
    setSelectedProjects,
    onlineSectionCollapsed,
    setOnlineSectionCollapsed,
    offlineSectionCollapsed,
    setOfflineSectionCollapsed,
    toggleProjectSelection
  } = useProjectSelectionState()

  const {
    showProjectWizard,
    setShowProjectWizard,
    activeTabs,
    setActiveTabs,
    tabs
  } = useTabManagement()

  // Calculate position for each tab based on fixed order and active tabs
  const getTabPosition = (tabId: string) => {
    // Fixed order: projects -> journals (left to right)
    const fixedOrder = ['projects', 'journals']
    
    // Calculate cumulative width up to this tab's position
    let cumulativeWidth = 0
    for (const orderedTabId of fixedOrder) {
      // Stop when we reach the current tab
      if (orderedTabId === tabId) {
        break
      }
      // Add width if the tab is active
      if (activeTabs.includes(orderedTabId)) {
        if (tabs[orderedTabId as keyof typeof tabs]) {
          cumulativeWidth += tabs[orderedTabId as keyof typeof tabs].width
        }
      }
    }
    return cumulativeWidth // Position at the left edge of where this tab should be
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

  // Project selection helpers
  const selectAllProjects = () => {
    setSelectedProjects(new Set(projects.map(p => p.id)))
  }

  const deselectAllProjects = () => {
    setSelectedProjects(new Set())
  }

  // New project handler
  const handleNewProject = () => {
    setShowProjectWizard(true)
    devNotesState.setShowNotesList(false)
    devNotesState.setIsEditingNote(false)
    devNotesState.setIsSelectingNote(false)
    // Ensure the journals tab is open to show the wizard
    if (!activeTabs.includes('journals')) {
      toggleTab('journals')
    }
  }

  // Clear filters handler
  const handleClearFilters = () => {
    setActiveFilter('all')
    collapseAllProjects()
    setSearchQuery('')
  }

  return (
    <animated.div 
      className={styles.sidebar}
      style={{ width: springProps.width }}
    >
      <div className={styles.sidebarContainer}>
        <Navigation
          activeTabs={activeTabs}
          toggleTab={toggleTab}
          tabs={tabs}
          getTabPosition={getTabPosition}
          layoutStrategy={layoutStrategy}
        />

        {/* Projects Panel - Visible when projects tab is active */}
        {activeTabs.includes('projects') && (
          <animated.div 
            className={styles.projectsPanel}
            style={projectsSpring}
          >
            <h3 className={styles.title}>PROJECTS</h3>
            
            {/* New Project Button */}
            <div className={styles.newProjectSection}>
              <button 
                className={styles.newProjectBtn}
                onClick={handleNewProject}
                title="Create a new project with guided setup"
              >
                <SvgIcon name="plus" size={18} />
                <span>New Project</span>
              </button>
            </div>
            
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

            {/* Status Header */}
            <div className={styles.statusHeader}>
              <div className={styles.statusInfo}>
                <span className={styles.statusText}>
                  {runningProjectsCount} / {totalProjects} projects running
                </span>
                <span className={styles.lastUpdated}>
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
              <button 
                className={styles.refreshBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  refreshProjectStatus()
                }}
                title="Refresh project status"
              >
                <SvgIcon name="refreshCw" size={14} />
              </button>
            </div>

            {/* Selection Controls */}
            <div className={styles.selectionControls}>
              <div className={styles.selectionHeader}>
                <span className={styles.selectionTitle}>Launch Selection ({selectedProjects.size})</span>
                <div className={styles.selectionButtons}>
                  <button 
                    className={styles.selectAllBtn}
                    onClick={selectAllProjects}
                    title="Select all projects"
                  >
                    All
                  </button>
                  <button 
                    className={styles.deselectAllBtn}
                    onClick={deselectAllProjects}
                    title="Deselect all projects"
                  >
                    None
                  </button>
                </div>
              </div>
            </div>
            
            {/* Project List with Collapsible Dropdowns - Separated by Status */}
            <div className={styles.projectList}>
              {/* Online Projects Section */}
              {filteredProjects.some(p => getProjectStatus(p.id)) && (
                <>
                  <div className={styles.statusSectionHeader} onClick={() => setOnlineSectionCollapsed(!onlineSectionCollapsed)}>
                    <button className={`${styles.sectionCollapseToggle} ${onlineSectionCollapsed ? styles.collapsed : ''}`}>
                      ▼
                    </button>
                    <span className={styles.statusIndicator}>🟢</span>
                    <span className={styles.statusLabel}>ONLINE</span>
                    <span className={styles.projectCount}>
                      ({filteredProjects.filter(p => getProjectStatus(p.id)).length})
                    </span>
                  </div>
                  {!onlineSectionCollapsed && filteredProjects.filter(p => getProjectStatus(p.id)).map(project => (
                    <ProjectActions
                      key={project.id}
                      project={project}
                      isRunning={getProjectStatus(project.id)}
                      isExpanded={expandedProjects.has(project.id)}
                      isSelected={selectedProject?.id === project.id}
                      selectedProjects={selectedProjects}
                      onToggleExpanded={toggleProjectExpanded}
                      onToggleSelection={toggleProjectSelection}
                      onSelectProject={selectProject}
                      executeOrCopyCommand={executeOrCopyCommand}
                    />
                  ))}
                </>
              )}

              {/* Offline Projects Section */}
              {filteredProjects.some(p => !getProjectStatus(p.id)) && (
                <>
                  <div className={`${styles.statusSectionHeader} ${styles.offlineSection}`} onClick={() => setOfflineSectionCollapsed(!offlineSectionCollapsed)}>
                    <button className={`${styles.sectionCollapseToggle} ${offlineSectionCollapsed ? styles.collapsed : ''}`}>
                      ▼
                    </button>
                    <span className={styles.statusIndicator}>🔴</span>
                    <span className={styles.statusLabel}>OFFLINE</span>
                    <span className={styles.projectCount}>
                      ({filteredProjects.filter(p => !getProjectStatus(p.id)).length})
                    </span>
                  </div>
                  {!offlineSectionCollapsed && filteredProjects.filter(p => !getProjectStatus(p.id)).map(project => (
                    <ProjectActions
                      key={project.id}
                      project={project}
                      isRunning={getProjectStatus(project.id)}
                      isExpanded={expandedProjects.has(project.id)}
                      isSelected={selectedProject?.id === project.id}
                      selectedProjects={selectedProjects}
                      onToggleExpanded={toggleProjectExpanded}
                      onToggleSelection={toggleProjectSelection}
                      onSelectProject={selectProject}
                      executeOrCopyCommand={executeOrCopyCommand}
                    />
                  ))}
                </>
              )}
            </div>
            
            <BatchCommands
              projects={projects}
              selectedProjects={selectedProjects}
              onOpenDashboard={onOpenDashboard}
              onClearFilters={handleClearFilters}
              executeOrCopyCommand={executeOrCopyCommand}
            />
          </animated.div>
        )}
        
        {/* Dev Notes Panel - Visible when journals tab is active */}
        <DevNotes
          isActive={activeTabs.includes('journals')}
          journalSpring={journalSpring}
          selectedProject={selectedProject}
          projects={projects}
          {...devNotesState}
          showProjectWizard={showProjectWizard}
          setShowProjectWizard={setShowProjectWizard}
        />
      </div>
    </animated.div>
  )
}