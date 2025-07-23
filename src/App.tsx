import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useCallback, useEffect, useState } from 'react'
import './App.css'
import EnhancedProjectViewer from './components/EnhancedProjectViewer'
import GitUpdateButton from './components/GitUpdateButton'
import PortfolioSidebar from './components/PortfolioSidebar'
import ProjectGrid from './components/ProjectGrid'
import ProjectStatusDashboard from './components/ProjectStatusDashboard'
import ProjectViewer from './components/ProjectViewer'
import { RightSidebar } from './components/RightSidebar'
import ServerToolbar from './components/ServerToolbar'
import SvgIcon from './components/SvgIcon'
import { useProjectData } from './hooks/useProjectData'
import { usePortfolioStore } from './store/portfolioStore'
import { getProjectPort, setPortCheckingEnabled } from './utils/portManager'
import { copyToClipboard, executeCommand, isVSCodeEnvironment, showNotification } from './utils/vsCodeIntegration'

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

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // 1 minute background refresh
      retry: 1, // Only retry once on failure
      refetchOnWindowFocus: false, // Don't refetch on window focus
    },
  },
})

function PortfolioApp() {
  const { projects, setProjects, selectedProject, selectProject, sidebarState } = usePortfolioStore()
  
  // Use React Query for project data management
  const { 
    projects: queryProjects, 
    projectStatus,
    isLoading: isLoadingProjects,
    refreshProjectData,
    getProjectStatus,
    getRunningProjects
  } = useProjectData()
  
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [isNarrowScreen, setIsNarrowScreen] = useState(window.innerWidth <= 1400)
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastSelectedProjectId, setLastSelectedProjectId] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(0)
  const [rightSidebarWidth, setRightSidebarWidth] = useState(0)
  const [globalViewMode, setGlobalViewMode] = useState<'mobile' | 'desktop'>('desktop')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [livePreviewsEnabled, setLivePreviewsEnabled] = useState(true)
  const [portCheckingDisabled, setPortCheckingDisabled] = useState(false)
  const [vsCodeServerStatus, setVsCodeServerStatus] = useState<'checking' | 'running' | 'stopped'>('checking')
  const [runningStatus, setRunningStatus] = useState<{[key: string]: boolean}>({})
  const [projectPorts, setProjectPorts] = useState<{[key: string]: number | null}>({})

  // Sync React Query projects with portfolio store
  useEffect(() => {
    if (queryProjects.length > 0) {
      setProjects(queryProjects)
      console.log(`📦 Synced ${queryProjects.length} projects from React Query to store`)
    }
  }, [queryProjects, setProjects])

  // Handle port checking toggle
  useEffect(() => {
    setPortCheckingEnabled(!portCheckingDisabled)
  }, [portCheckingDisabled])

  // Check VS Code Server status
  useEffect(() => {
    const checkVSCodeServerStatus = async () => {
      try {
        const response = await fetch('http://localhost:8080', { method: 'HEAD' });
        setVsCodeServerStatus('running');
      } catch {
        setVsCodeServerStatus('stopped');
      }
    };
    
    checkVSCodeServerStatus();
    const interval = setInterval(checkVSCodeServerStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [])

  // Handle window resize for responsive detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
      setIsNarrowScreen(window.innerWidth <= 1400)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // VS Code message listener for project status updates
  useEffect(() => {
    const handleVSCodeMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'projectStatusUpdate') {
        console.log('🔄 Received VS Code project status update:', event.data)
        // Force refresh of project data
        refreshProjectData()
      }
    }

    // Listen for messages from VS Code extension
    if (window.vsCodePortfolio?.isVSCodeWebview) {
      window.addEventListener('message', handleVSCodeMessage)
      return () => window.removeEventListener('message', handleVSCodeMessage)
    }
  }, [refreshProjectData])

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
    const newRunningStatus: { [key: string]: boolean } = {}
    const newPortStatus: { [key: string]: number | null } = {}
    
    // Use VS Code project data when available
    if (window.vsCodePortfolio?.isVSCodeWebview && window.vsCodePortfolio.projectData?.projects) {
      const vsCodeProjects = window.vsCodePortfolio.projectData.projects
      for (const project of projects) {
        if (project.displayType === 'external') {
          const vsCodeProject = vsCodeProjects.find((p: any) => p.id === project.id)
          newRunningStatus[project.id] = vsCodeProject?.status === 'active' || false
          newPortStatus[project.id] = vsCodeProject?.localPort || project.localPort || null
        }
      }
    } else {
      // Use traditional port checking for web version
      const running = await getRunningProjects()
      for (const project of projects) {
        if (project.displayType === 'external') {
          const isRunning = running.has(project.id)
          const port = await getProjectPort(project)
          newRunningStatus[project.id] = isRunning
          newPortStatus[project.id] = port
        }
      }
    }
    
    setRunningStatus(newRunningStatus)
    setProjectPorts(newPortStatus)
  }

  const startVSCodeServer = async () => {
    // Security-compliant VS Code Server startup
    const commands = [
      'Stop-Process -Name "code-tunnel" -Force -ErrorAction SilentlyContinue',
      'Set-Location "D:\\ClaudeWindows\\claude-dev-portfolio"',
      'code serve-web --port 8080 --host 0.0.0.0 --without-connection-token --accept-server-license-terms'
    ];
    
    if (isVSCodeEnvironment()) {
      // Execute commands one by one for security compliance
      for (const command of commands) {
        try {
          await executeCommand(command, 'VS Code Server Setup');
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Failed to execute command:', command, error);
          showNotification(`Failed to execute: ${command}`, 'error');
          return;
        }
      }
      showNotification('VS Code Server starting...');
      // Update status after a delay
      setTimeout(() => setVsCodeServerStatus('checking'), 2000);
    } else {
      const fullCommand = commands.join('\n');
      try {
        await copyToClipboard(fullCommand);
        alert(`VS Code Server commands copied!\n\n💡 Instructions:\n1. Open PowerShell as Administrator\n2. Paste and run the commands\n3. VS Code Server will start on http://localhost:8080`);
      } catch (error) {
        console.error('Failed to copy commands:', error);
        alert(`VS Code Server commands:\n\n${fullCommand}`);
      }
    }
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
                  {/* VS Code Server Control */}
                  {vsCodeServerStatus === 'stopped' && (
                    <button 
                      className="refresh-icon-btn vscode-server-btn"
                      onClick={startVSCodeServer}
                      title="Start VS Code Server (port 8080)"
                    >
                      <SvgIcon name="code" size={16} />
                    </button>
                  )}
                  {vsCodeServerStatus === 'running' && (
                    <div className="vscode-server-status" title="VS Code Server running on port 8080">
                      <SvgIcon name="code" size={16} />
                      <span className="status-dot running"></span>
                    </div>
                  )}
                  {/* Unified preview/port toggle - consolidates live preview and port checking */}
                  <button 
                    className={`refresh-icon-btn ${!livePreviewsEnabled ? 'disabled' : ''}`}
                    onClick={() => {
                      // Both versions toggle live previews (eye icon)
                      setLivePreviewsEnabled(!livePreviewsEnabled)
                      // Also toggle port checking in sync for consistency
                      setPortCheckingDisabled(livePreviewsEnabled) // Inverse relationship
                    }}
                    title={livePreviewsEnabled ? "Disable live previews" : "Enable live previews"}
                  >
                    <SvgIcon 
                      name={livePreviewsEnabled ? "eye" : "eyeOff"}
                      size={16} 
                    />
                  </button>
                  <button 
                    className="refresh-icon-btn"
                    onClick={handleRefreshPortfolio}
                    title="Refresh project status"
                  >
                    <SvgIcon name="refreshCw" size={16} />
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
            <ServerToolbar globalViewMode={globalViewMode} />
            <ProjectGrid onProjectClick={handleProjectClick} globalViewMode={globalViewMode} livePreviewsEnabled={livePreviewsEnabled} />
          </>
        ) : selectedProject ? (
          <EnhancedProjectViewer 
            project={selectedProject} 
            onClose={handleBackToGrid}
          />
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

// Export App with React Query provider
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PortfolioApp />
    </QueryClientProvider>
  )
}