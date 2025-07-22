import React, { useEffect, useState, useCallback } from 'react'
import { usePortfolioStore } from './store/portfolioStore'
import { setPortCheckingEnabled } from './utils/portManager'

// TypeScript declaration for VS Code integration
declare global {
  interface Window {
    vsCodePortfolio?: {
      projectData?: { projects: any[] }
      isVSCodeWebview?: boolean
      portfolioPath?: string
      [key: string]: any
    }
  }
}
import PortfolioSidebar from './components/PortfolioSidebar'
import { RightSidebar } from './components/RightSidebar'
import ProjectGrid from './components/ProjectGrid'
import ProjectViewer from './components/ProjectViewer'
import ProjectStatusDashboard from './components/ProjectStatusDashboard'
import GitUpdateButton from './components/GitUpdateButton'
import SvgIcon from './components/SvgIcon'
import ThreeDEye from './components/ThreeDEye'
import { getRunningProjects, getProjectPort } from './utils/portManager'
import './App.css'

export default function App() {
  const { projects, setProjects, selectedProject, selectProject, sidebarState } = usePortfolioStore()
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [isNarrowScreen, setIsNarrowScreen] = useState(window.innerWidth <= 1400)
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastSelectedProjectId, setLastSelectedProjectId] = useState<string | null>(null)
  const [runningStatus, setRunningStatus] = useState<{ [key: string]: boolean }>({})
  const [projectPorts, setProjectPorts] = useState<{ [key: string]: number | null }>({})
  const [sidebarWidth, setSidebarWidth] = useState(0)
  const [rightSidebarWidth, setRightSidebarWidth] = useState(0)
  const [globalViewMode, setGlobalViewMode] = useState<'mobile' | 'desktop'>('desktop')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [livePreviewsEnabled, setLivePreviewsEnabled] = useState(true)
  const [portCheckingDisabled, setPortCheckingDisabled] = useState(false)

  // Load projects from manifest
  useEffect(() => {
    console.log('Loading manifest...')
    
    // Check if running in VS Code webview with injected data
    if (window.vsCodePortfolio?.projectData) {
      console.log('Using VS Code injected data:', window.vsCodePortfolio.projectData)
      const data = window.vsCodePortfolio.projectData
      if (data.projects) {
        setProjects(data.projects)
        console.log('Projects set from VS Code:', data.projects.length)
      } else {
        console.error('No projects array in VS Code injected data')
      }
      return
    }
    
    // Fallback to fetching manifest.json for web version
    fetch('/projects/manifest.json')
      .then(res => {
        console.log('Manifest response:', res.status)
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then(data => {
        console.log('Manifest data:', data)
        if (data.projects) {
          setProjects(data.projects)
          console.log('Projects set:', data.projects.length)
        } else {
          console.error('No projects array in manifest')
        }
      })
      .catch(err => console.error('Failed to load projects:', err))
  }, [setProjects])

  // Handle port checking toggle
  useEffect(() => {
    setPortCheckingEnabled(!portCheckingDisabled)
  }, [portCheckingDisabled])

  // Handle window resize for responsive detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
      setIsNarrowScreen(window.innerWidth <= 1400)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen && !(event.target as Element).closest('.header-dropdown')) {
        setIsDropdownOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  // Check running status for projects
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
    
    if (projects.length > 0) {
      checkRunningStatus()
      const interval = setInterval(checkRunningStatus, 5000)
      return () => clearInterval(interval)
    }
  }, [projects])
  
  // Core project display logic
  const showProject = useCallback(async (project: any) => {
    // Always show projects inline, never in modal
    setShowGrid(false)
  }, [])

  // Watch for portfolio home navigation and project selection from sidebar
  useEffect(() => {
    if (!selectedProject) {
      setShowGrid(true)
      setLastSelectedProjectId(null)
    } else if (selectedProject.id !== lastSelectedProjectId) {
      // Only show project if it's actually a different project
      setLastSelectedProjectId(selectedProject.id)
      showProject(selectedProject)
    }
  }, [selectedProject, showProject, lastSelectedProjectId])

  const handleProjectClick = async (project: any) => {
    // Always open project within the portfolio
    selectProject(project)
    setShowGrid(false)
  }

  const handleCloseViewer = () => {
    setIsViewerOpen(false)
  }

  const handleBackToGrid = () => {
    setShowGrid(true)
    selectProject(null)
  }

  const handleRefreshProject = () => {
    // Increment key to force iframe reload
    setRefreshKey(prev => prev + 1)
  }

  const handleRefreshPortfolio = async (event: React.MouseEvent) => {
    event.stopPropagation()
    // Just refresh the project status without reloading the page
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

  // Smart responsive layout strategy
  const getLayoutStrategy = () => {
    if (isMobile) {
      // Mobile: sidebar overlays content
      return { marginLeft: 0, contentStrategy: 'overlay' }
    } else if (isNarrowScreen && sidebarWidth > 320) {
      // Narrow screens with wide sidebar: overlay mode to prevent content cutoff
      return { marginLeft: 0, contentStrategy: 'overlay' }
    } else {
      // Wide screens: sidebar pushes content
      return { marginLeft: sidebarWidth, contentStrategy: 'push' }
    }
  }
  
  const layout = getLayoutStrategy()
  const currentMarginLeft = layout.marginLeft

  return (
    <div className="app">
      <PortfolioSidebar 
        onOpenDashboard={() => setIsDashboardOpen(true)}
        onWidthChange={setSidebarWidth}
        layoutStrategy={layout.contentStrategy}
      />
      
      <RightSidebar onWidthChange={setRightSidebarWidth} />
      
      {/* Backdrop for overlay mode */}
      {layout.contentStrategy === 'overlay' && sidebarWidth > 0 && (
        <div 
          className="sidebar-backdrop"
          onClick={() => {
            // Close sidebar when clicking backdrop - you can implement this if needed
          }}
        />
      )}
      
      <main 
        className="main-content"
        style={{ 
          marginLeft: `${currentMarginLeft}px`,
          marginRight: `${rightSidebarWidth}px`,
          transition: 'margin-left 0.3s ease, margin-right 0.3s ease'
        }}
      >
        {showGrid ? (
          <>
            <header className="portfolio-header">
              <div className="header-content">
                <div className="header-text">
                  <div className="header-title-row">
                    <h1>My Project Portfolio</h1>
                  </div>
                  <p>A collection of creative coding experiments and applications</p>
                </div>
                <div className="header-actions">
                  <ThreeDEye 
                    isOpen={livePreviewsEnabled}
                    onClick={() => setLivePreviewsEnabled(!livePreviewsEnabled)}
                    className="eye-toggle-btn"
                  />
                  <button 
                    className="refresh-icon-btn"
                    onClick={handleRefreshPortfolio}
                    title="Refresh project status"
                  >
                    <SvgIcon name="refreshCw" size={16} />
                  </button>
                  <button 
                    className={`refresh-icon-btn ${portCheckingDisabled ? 'disabled' : ''}`}
                    onClick={() => setPortCheckingDisabled(!portCheckingDisabled)}
                    title={
                      window.vsCodePortfolio?.isVSCodeWebview 
                        ? (portCheckingDisabled ? "Enable live previews" : "Disable live previews")
                        : (portCheckingDisabled ? "Enable port checking" : "Disable port checking")
                    }
                  >
                    <SvgIcon 
                      name={
                        window.vsCodePortfolio?.isVSCodeWebview 
                          ? (portCheckingDisabled ? "eyeOff" : "eye")
                          : (portCheckingDisabled ? "wifiOff" : "wifi")
                      } 
                      size={16} 
                    />
                  </button>
                  {/* View Mode Toggle Buttons */}
                  <div className="view-mode-toggle">
                    <button 
                      className={`view-toggle-btn ${globalViewMode === 'mobile' ? 'active' : ''}`}
                      onClick={() => setGlobalViewMode('mobile')}
                      title="Mobile View"
                    >
                      <SvgIcon name="smartphone" size={16} />
                    </button>
                    <button 
                      className={`view-toggle-btn ${globalViewMode === 'desktop' ? 'active' : ''}`}
                      onClick={() => setGlobalViewMode('desktop')}
                      title="Desktop View"
                    >
                      <SvgIcon name="monitor" size={16} />
                    </button>
                  </div>
                  
                  {/* Git Update Button */}
                  <div className="header-dropdown">
                    <button 
                      className="dropdown-toggle"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      title="Git operations"
                    >
                      <SvgIcon name="moreHorizontal" size={16} />
                    </button>
                    {isDropdownOpen && (
                      <div className="dropdown-menu">
                        <div className="dropdown-item git-update-wrapper">
                          <GitUpdateButton 
                            type="portfolio" 
                            size="small" 
                            variant="secondary"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </header>
            <ProjectGrid onProjectClick={handleProjectClick} globalViewMode={globalViewMode} livePreviewsEnabled={livePreviewsEnabled} />
          </>
        ) : selectedProject ? (
          <div className="project-view-container">
            <div className="project-header">
              <div className="project-header-content">
                <div className="project-info">
                  <h2>{selectedProject.title}</h2>
                  <span className="project-type">{selectedProject.displayType}</span>
                </div>
                <div className="project-actions">
                  <button 
                    className="refresh-icon-btn"
                    onClick={handleRefreshProject}
                    title="Refresh project"
                  >
                    <SvgIcon name="refresh" size={16} />
                  </button>
                  <div className="header-dropdown">
                    <button 
                      className="dropdown-toggle"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      title="More options"
                    >
                      <SvgIcon name="moreHorizontal" size={16} />
                    </button>
                    {isDropdownOpen && (
                      <div className="dropdown-menu">
                        <button 
                          className="dropdown-item"
                          onClick={() => {
                            handleBackToGrid()
                            setIsDropdownOpen(false)
                          }}
                        >
                          ← Back to Projects
                        </button>
                        {selectedProject.displayType === 'external' && (
                          <button 
                            className="dropdown-item"
                            onClick={() => {
                              if (selectedProject.demoUrl) {
                                window.open(selectedProject.demoUrl, '_blank', 'noopener,noreferrer')
                              } else if (selectedProject.localPort) {
                                window.open(`http://localhost:${selectedProject.localPort}`, '_blank', 'noopener,noreferrer')
                              }
                              setIsDropdownOpen(false)
                            }}
                          >
                            Open in New Tab ↗
                          </button>
                        )}
                        <button 
                          className="dropdown-item"
                          onClick={() => {
                            setIsDashboardOpen(true)
                            setIsDropdownOpen(false)
                          }}
                        >
                          📊 Status Dashboard
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <ProjectViewer 
              project={selectedProject} 
              onClose={handleBackToGrid}
              isInline={true}
              key={refreshKey}
            />
          </div>
        ) : null}
      </main>

      {isViewerOpen && selectedProject && (
        <ProjectViewer 
          project={selectedProject} 
          onClose={handleCloseViewer}
        />
      )}

      {isDashboardOpen && (
        <ProjectStatusDashboard 
          onClose={() => setIsDashboardOpen(false)}
        />
      )}
    </div>
  )
}