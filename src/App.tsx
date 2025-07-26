import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useCallback, useEffect, useState } from 'react'
import './App.css'
import './utils/consoleHelper' // Import console helper for development
import './services/environmentBridge' // Import environment bridge for initialization
import EnhancedProjectViewer from './components/EnhancedProjectViewer'
import EnvironmentBadge from './components/EnvironmentBadge'
import GitUpdateButton from './components/GitUpdateButton'
import PortfolioSidebar from './components/PortfolioSidebar'
import ProjectGrid from './components/ProjectGrid'
import ProjectViewer from './components/ProjectViewer'
import { RightSidebar } from './components/RightSidebar'
import SvgIcon from './components/SvgIcon'
import { useProjectData } from './hooks/useProjectData'
import { usePortfolioStore } from './store/portfolioStore'
import { getProjectPort, setPortCheckingEnabled } from './utils/portManager'
import { optimizedPortManager } from './utils/optimizedPortManager'
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
    refreshProjectStatus,
    getProjectStatus,
    getRunningProjects
  } = useProjectData()
  
  const [isViewerOpen, setIsViewerOpen] = useState(false)
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

  // Clear port cache on app startup for fresh status detection
  useEffect(() => {
    console.log('🧹 Clearing port cache on app startup for fresh status detection')
    optimizedPortManager.clearCache()
  }, [])

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

  // Check VS Code Server status (remote mode on port 8080)
  useEffect(() => {
    const checkVSCodeServerStatus = async () => {
      try {
        // Use fetch with no-cors mode to avoid CORS issues
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch('http://localhost:8080', { 
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal
        });
        setVsCodeServerStatus('running');
      } catch (error) {
        // Silently handle connection errors - this is expected when VS Code Server isn't running
        setVsCodeServerStatus('stopped');
      }
    };
    
    checkVSCodeServerStatus();
    const interval = setInterval(checkVSCodeServerStatus, 15000); // Check every 15 seconds (less frequent)
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
    if (isVSCodeEnvironment()) {
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
    console.log('🔄🔄🔄 HEADER REFRESH BUTTON CLICKED 🔄🔄🔄')
    console.log('🔄 Manual portfolio refresh triggered')
    
    try {
      // Use refreshProjectStatus instead of refreshProjectData to preserve VS Code data
      console.log('🔄 Refreshing project status only (preserving project data)...')
      await refreshProjectStatus()
      console.log('✅ refreshProjectStatus completed')
      
      console.log('✅ Header refresh completed using React Query')
    } catch (error) {
      console.error('❌ Portfolio refresh failed:', error)
    }
  }

  const startVSCodeServer = async () => {
    // Use the dedicated PowerShell script for better experience
    const scriptCommand = 'powershell -File "D:\\ClaudeWindows\\claude-dev-portfolio\\scripts\\start-vscode-server.ps1"';
    
    if (isVSCodeEnvironment()) {
      try {
        await executeCommand(scriptCommand, 'Start VS Code Server');
        showNotification('VS Code Server starting... Check terminal for details and server URL.');
        // Update status after a delay
        setTimeout(() => setVsCodeServerStatus('checking'), 3000);
      } catch (error) {
        console.error('Failed to start VS Code server:', error);
        showNotification('Failed to start VS Code server. Try manual setup using clipboard commands.', 'error');
        
        // Fallback to clipboard method
        const fallbackCommands = [
          'Stop-Process -Name "code-tunnel" -Force -ErrorAction SilentlyContinue',
          'Set-Location "D:\\ClaudeWindows\\claude-dev-portfolio"',
          'code serve-web --port 8080 --host 0.0.0.0 --without-connection-token --accept-server-license-terms'
        ];
        const fullCommand = fallbackCommands.join('\n');
        try {
          await copyToClipboard(fullCommand);
          alert(`VS Code Server commands copied!\n\n💡 Setup Instructions:\n1. Open PowerShell as Administrator\n2. Paste and run the commands\n3. VS Code will be available at http://localhost:8080`);
        } catch (clipboardError) {
          alert(`VS Code Server commands:\n\n${fullCommand}\n\n💡 Run in PowerShell to start server`);
        }
      }
    } else {
      // Web mode - copy script command to clipboard
      try {
        await copyToClipboard(scriptCommand);
        alert(`VS Code Server script command copied!\n\n💡 Setup Instructions:\n1. Open PowerShell in the portfolio directory\n2. Paste and run: ${scriptCommand}\n3. Follow the script prompts\n4. VS Code will be available at http://localhost:8080\n\n🎯 The script includes error checking and helpful messages!`);
      } catch (error) {
        console.error('Failed to copy script command:', error);
        alert(`Run this command in PowerShell:\n\n${scriptCommand}\n\n💡 This will start VS Code Server with proper error handling`);
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
        onWidthChange={setSidebarWidth}
        layoutStrategy={layout.contentStrategy}
      />
      
      <RightSidebar onWidthChange={setRightSidebarWidth} />
      
      {/* Backdrop for overlay mode */}
      {layout.contentStrategy === 'overlay' && (sidebarWidth > 0 || rightSidebarWidth > 0) && (
        <div 
          className="sidebar-backdrop"
          onClick={() => {
            // Close sidebars when clicking backdrop
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
            {/* Portfolio Header */}
            <header className="portfolio-header">
                <div className="header-content">
                  <div className="header-text">
                    <div className="header-title-row">
                      <h1>My Project Portfolio</h1>
                    </div>
                    <p>A collection of creative coding experiments and applications</p>
                  </div>
                  <div className="header-actions">
                  {/* Environment Status Badge */}
                  <EnvironmentBadge size="small" />
                  
                  {/* VS Code Server Control */}
                  {vsCodeServerStatus === 'stopped' && (
                    <button 
                      className="refresh-icon-btn vscode-server-btn"
                      onClick={startVSCodeServer}
                      title="Launch VS Code Server in Browser (port 8080)"
                    >
                      <SvgIcon name="code" size={16} />
                    </button>
                  )}
                  {vsCodeServerStatus === 'running' && (
                    <div className="vscode-server-status" title="VS Code Server running on port 8080 - Click to open in new window"
                         onClick={() => window.open('http://localhost:8080', '_blank')}
                         style={{ cursor: 'pointer' }}>
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
                  {/* Interface Mode Toggle */}
                  <div className="view-mode-toggle">
                  </div>
                  
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