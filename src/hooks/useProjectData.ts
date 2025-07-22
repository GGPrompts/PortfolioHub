import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Project } from '../store/portfolioStore'
import { optimizedPortManager } from '../utils/optimizedPortManager'

// Check if running in VS Code environment
const isVSCodeEnvironment = (): boolean => {
  return !!(window as any).vsCodePortfolio?.postMessage
}

/**
 * Fetch project data from manifest or VS Code injection
 */
async function fetchProjectData(): Promise<Project[]> {
  // Check if running in VS Code webview with injected data
  if (isVSCodeEnvironment() && (window as any).vsCodePortfolio?.projectData) {
    console.log('📦 Using VS Code injected project data')
    const injectedData = (window as any).vsCodePortfolio.projectData
    
    if (injectedData && injectedData.projects && Array.isArray(injectedData.projects)) {
      return injectedData.projects
    }
  }
  
  // Fallback to manifest file
  console.log('📦 Loading from manifest file')
  try {
    const response = await fetch('/projects/manifest.json')
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.projects || !Array.isArray(data.projects)) {
      throw new Error('Invalid manifest format: missing projects array')
    }
    
    console.log(`📦 Loaded ${data.projects.length} projects from manifest`)
    return data.projects
  } catch (error) {
    console.error('📦 Failed to load project data:', error)
    throw error
  }
}

/**
 * Fetch project status (running/stopped) for all projects
 */
async function fetchProjectStatus(projects: Project[]): Promise<Map<string, boolean>> {
  if (projects.length === 0) {
    return new Map()
  }

  // Check if we're in VS Code webview and use injected data
  if (isVSCodeEnvironment() && (window as any).vsCodePortfolio?.projectData) {
    const vsCodeProjects = (window as any).vsCodePortfolio.projectData.projects || []
    const statusMap = new Map<string, boolean>()
    
    for (const project of projects) {
      const vsCodeProject = vsCodeProjects.find((p: any) => p.id === project.id)
      const isRunning = vsCodeProject?.status === 'active' || false
      statusMap.set(project.id, isRunning)
    }
    
    return statusMap
  } else {
    // Fallback to optimized batch port checking
    return await optimizedPortManager.checkProjectPorts(projects)
  }
}

/**
 * Custom hook to fetch and manage project data with React Query
 */
export function useProjectData() {
  const queryClient = useQueryClient()

  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    error: projectError,
    refetch: refetchProjects
  } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjectData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: isVSCodeEnvironment() ? false : 3 * 60 * 1000, // 3 minutes for web, disabled for VS Code
    refetchOnWindowFocus: false,
    retry: 2,
  })

  const {
    data: projectStatus = new Map(),
    isLoading: isLoadingStatus,
    error: statusError,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['projectStatus', projects],
    queryFn: () => fetchProjectStatus(projects),
    enabled: projects.length > 0, // Only run when we have projects
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: isVSCodeEnvironment() ? false : 5 * 1000, // 5 seconds for web, disabled for VS Code
    refetchOnWindowFocus: false,
    retry: 1,
  })

  /**
   * Force refresh of project data (clears cache and refetches)
   */
  const refreshProjectData = async () => {
    // Clear port cache for fresh data
    optimizedPortManager.clearCache()
    
    // Invalidate and refetch both queries
    await queryClient.invalidateQueries({ queryKey: ['projects'] })
    await queryClient.invalidateQueries({ queryKey: ['projectStatus'] })
  }

  /**
   * Refresh only project status (lighter operation)
   */
  const refreshProjectStatus = async () => {
    optimizedPortManager.clearCache()
    await refetchStatus()
  }

  /**
   * Get running status for a specific project
   */
  const getProjectStatus = (projectId: string): boolean => {
    return projectStatus.get(projectId) || false
  }

  /**
   * Get all running projects
   */
  const getRunningProjects = (): Project[] => {
    return projects.filter(project => projectStatus.get(project.id))
  }

  /**
   * Get projects by status
   */
  const getProjectsByStatus = (running: boolean): Project[] => {
    return projects.filter(project => {
      const isRunning = projectStatus.get(project.id) || false
      return running ? isRunning : !isRunning
    })
  }

  /**
   * Update project status for a specific project (optimistic update)
   */
  const updateProjectStatus = (projectId: string, isRunning: boolean) => {
    queryClient.setQueryData(['projectStatus', projects], (oldStatus: Map<string, boolean> | undefined) => {
      const newStatus = new Map(oldStatus || [])
      newStatus.set(projectId, isRunning)
      return newStatus
    })
  }

  return {
    // Data
    projects,
    projectStatus,
    
    // Loading states
    isLoadingProjects,
    isLoadingStatus,
    isLoading: isLoadingProjects || isLoadingStatus,
    
    // Errors
    projectError,
    statusError,
    hasError: !!projectError || !!statusError,
    
    // Actions
    refreshProjectData,
    refreshProjectStatus,
    refetchProjects,
    refetchStatus,
    
    // Utilities
    getProjectStatus,
    getRunningProjects,
    getProjectsByStatus,
    updateProjectStatus,
    
    // Counts
    totalProjects: projects.length,
    runningProjectsCount: Array.from(projectStatus.values()).filter(Boolean).length,
    stoppedProjectsCount: projects.length - Array.from(projectStatus.values()).filter(Boolean).length
  }
}

/**
 * Custom hook for individual project data
 */
export function useProject(projectId: string) {
  const { projects, getProjectStatus } = useProjectData()
  
  const project = projects.find(p => p.id === projectId)
  const isRunning = project ? getProjectStatus(projectId) : false
  
  return {
    project,
    isRunning,
    exists: !!project
  }
}

/**
 * Hook for project statistics
 */
export function useProjectStats() {
  const { projects, projectStatus } = useProjectData()
  
  const stats = {
    total: projects.length,
    running: Array.from(projectStatus.values()).filter(Boolean).length,
    stopped: 0,
    byType: {} as Record<string, number>,
    byTag: {} as Record<string, number>
  }
  
  stats.stopped = stats.total - stats.running
  
  // Count by display type
  projects.forEach(project => {
    const type = project.displayType || 'iframe'
    stats.byType[type] = (stats.byType[type] || 0) + 1
  })
  
  // Count by tags
  projects.forEach(project => {
    project.tags?.forEach(tag => {
      stats.byTag[tag] = (stats.byTag[tag] || 0) + 1
    })
  })
  
  return stats
}