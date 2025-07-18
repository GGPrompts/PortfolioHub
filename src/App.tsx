import React, { useEffect, useState, useCallback } from 'react'
import { usePortfolioStore } from './store/portfolioStore'
import PortfolioSidebar from './components/PortfolioSidebar'
import ProjectGrid from './components/ProjectGrid'
import ThreeProjectPreview from './components/ThreeProjectPreview'
import ProjectViewer from './components/ProjectViewer'
import ProjectStatusDashboard from './components/ProjectStatusDashboard'
import GitUpdateButton from './components/GitUpdateButton'
import { getRunningProjects, getProjectPort } from './utils/portManager'
import './App.css'

export default function App() {
  const { projects, setProjects, selectedProject, selectProject, sidebarState } = usePortfolioStore()
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [is3DView, setIs3DView] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastSelectedProjectId, setLastSelectedProjectId] = useState<string | null>(null)
  const [runningStatus, setRunningStatus] = useState<{ [key: string]: boolean }>({})
  const [projectPorts, setProjectPorts] = useState<{ [key: string]: number | null }>({})
  const [sidebarWidth, setSidebarWidth] = useState(0)

  // Load projects from manifest
  useEffect(() => {
    console.log('Loading manifest...')
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

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Check running status for 3D view
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
    // Check if project is running
    const isRunning = runningStatus[project.id]
    if (isRunning && projectPorts[project.id]) {
      // Open running project in new tab
      const url = `http://localhost:${projectPorts[project.id]}`
      window.open(url, '_blank')
    } else {
      // Show project info or start prompt
      selectProject(project)
      setShowGrid(false)
    }
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

  // Use dynamic sidebar width
  const currentMarginLeft = isMobile ? 0 : sidebarWidth

  return (
    <div className="app">
      <PortfolioSidebar 
        onOpenDashboard={() => setIsDashboardOpen(true)}
        onWidthChange={setSidebarWidth}
      />
      
      <main 
        className="main-content"
        style={{ 
          marginLeft: `${currentMarginLeft}px`,
          transition: 'margin-left 0.3s ease'
        }}
      >
        {showGrid ? (
          <>
            <header className="portfolio-header">
              <div className="header-content">
                <div className="header-text">
                  <h1>My Project Portfolio</h1>
                  <p>A collection of creative coding experiments and applications</p>
                </div>
                <div className="header-actions">
                  <GitUpdateButton 
                    type="portfolio" 
                    size="medium" 
                    variant="secondary"
                  />
                  <button 
                    className={`view-toggle-btn ${is3DView ? 'active' : ''}`}
                    onClick={() => setIs3DView(!is3DView)}
                    title={is3DView ? 'Switch to grid view' : 'Switch to 3D view'}
                  >
                    {is3DView ? '📋 Grid View' : '🌐 3D View'}
                  </button>
                  <button 
                    className="status-btn"
                    onClick={() => setIsDashboardOpen(true)}
                    title="View project status and management"
                  >
                    📊 Status Dashboard
                  </button>
                </div>
              </div>
            </header>
            {is3DView ? (
              <ThreeProjectPreview 
                projects={projects}
                runningStatus={runningStatus}
                projectPorts={projectPorts}
                onProjectClick={handleProjectClick}
              />
            ) : (
              <ProjectGrid onProjectClick={handleProjectClick} />
            )}
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
                    className="refresh-btn"
                    onClick={handleRefreshProject}
                    title="Refresh project"
                  >
                    🔄 Refresh
                  </button>
                  {selectedProject.displayType === 'external' && (
                    <button 
                      className="external-btn"
                      onClick={() => {
                        if (selectedProject.demoUrl) {
                          window.open(selectedProject.demoUrl, '_blank', 'noopener,noreferrer')
                        } else if (selectedProject.localPort) {
                          window.open(`http://localhost:${selectedProject.localPort}`, '_blank', 'noopener,noreferrer')
                        }
                      }}
                      title="Open in new tab"
                    >
                      Open in New Tab ↗
                    </button>
                  )}
                  <button 
                    className="back-btn"
                    onClick={handleBackToGrid}
                    title="Back to project grid"
                  >
                    ← Back to Projects
                  </button>
                  <button 
                    className="status-btn"
                    onClick={() => setIsDashboardOpen(true)}
                    title="View project status and management"
                  >
                    📊 Status Dashboard
                  </button>
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