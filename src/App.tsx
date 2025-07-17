import React, { useEffect, useState } from 'react'
import { usePortfolioStore } from './store/portfolioStore'
import PortfolioSidebar from './components/PortfolioSidebar'
import ProjectGrid from './components/ProjectGrid'
import ProjectViewer from './components/ProjectViewer'
import ProjectStatusDashboard from './components/ProjectStatusDashboard'
import './App.css'

export default function App() {
  const { setProjects, selectedProject, selectProject, sidebarState } = usePortfolioStore()
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [refreshKey, setRefreshKey] = useState(0)

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

  const handleProjectClick = async (project: any) => {
    selectProject(project)
    
    // For iframe/embed projects, always show inline
    if (project.displayType === 'iframe' || project.displayType === 'embed') {
      setShowGrid(false)
      return
    }
    
    // For external projects, check if they're running before showing inline
    if (project.displayType === 'external' && project.localPort) {
      const { getProjectPort } = await import('./utils/portManager')
      const port = await getProjectPort(project)
      if (port) {
        setShowGrid(false)
        return
      }
    }
    
    // Otherwise show in modal
    setIsViewerOpen(true)
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

  // Define widths for sidebar states (matching PortfolioSidebar)
  const sidebarWidths = {
    collapsed: 48,
    normal: 256,
    expanded: 816
  }

  // Use collapsed width on mobile regardless of sidebar state
  const currentMarginLeft = isMobile ? sidebarWidths.collapsed : sidebarWidths[sidebarState]

  return (
    <div className="app">
      <PortfolioSidebar />
      
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
            <ProjectGrid onProjectClick={handleProjectClick} />
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