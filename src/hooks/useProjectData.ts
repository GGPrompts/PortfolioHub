import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Project } from '../store/portfolioStore'
import { optimizedPortManager } from '../utils/optimizedPortManager'
import { isVSCodeEnvironment } from '../utils/vsCodeIntegration'
import { environmentBridge } from '../services/environmentBridge'

/**
 * Fetch project data from manifest (unified architecture always uses manifest)
 */
async function fetchProjectData(): Promise<Project[]> {
  console.log('📦 Loading project data from manifest (unified architecture)')
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
 * Prioritizes VS Code WebSocket data when available, falls back to port checking
 */
async function fetchProjectStatus(projects: Project[]): Promise<Map<string, boolean>> {
  if (projects.length === 0) {
    return new Map()
  }

  // Try to get status from VS Code bridge first (most reliable)
  console.log('🔍 Checking if VS Code bridge is available for project status...')
  
  // Wait a moment for VS Code bridge to establish connection if it's still connecting
  if (environmentBridge.getMode() === 'vscode-local' && !environmentBridge.isConnected()) {
    console.log('⏳ VS Code bridge initializing, waiting 500ms...')
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  const vsCodeStatus = await environmentBridge.getAllProjectStatus()
  
  if (vsCodeStatus) {
    console.log(`✅ Using VS Code project status data for ${vsCodeStatus.size} projects`)
    return vsCodeStatus
  }

  // Fallback to local port checking when VS Code not available
  console.log(`📱 VS Code not available, falling back to local port checking for ${projects.length} projects`)
  return await optimizedPortManager.checkProjectPorts(projects)
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
    refetchInterval: 2 * 60 * 1000, // 2 minutes for all environments
    refetchOnWindowFocus: false,
    retry: 2,
  })

  const {
    data: projectStatus = new Map(),
    isLoading: isLoadingStatus,
    isFetching: isFetchingStatus,
    error: statusError,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['projectStatus', projects],
    queryFn: () => fetchProjectStatus(projects),
    enabled: projects.length > 0, // Only run when we have projects
    staleTime: 10 * 1000, // 10 seconds for faster initial updates
    refetchInterval: 10 * 1000, // 10 seconds for status checks  
    refetchOnWindowFocus: false,
    retry: 1,
    initialData: new Map(), // Start with empty map instead of showing false positives
    refetchOnMount: true, // Always fetch fresh data on mount
    refetchIntervalInBackground: false, // Don't fetch when tab is inactive
  })

  /**
   * Force refresh of project data (clears cache and refetches)
   */
  const refreshProjectData = async () => {
    console.log('🔄🔄🔄 REFRESH PROJECT DATA STARTED 🔄🔄🔄')
    console.log('📊 Current project count:', projects.length)
    console.log('📊 Current status map:', projectStatus)
    
    // Clear port cache for fresh data
    optimizedPortManager.clearCache()
    console.log('🧹 Port manager cache cleared')
    
    // Clear React Query cache completely
    await queryClient.clear()
    console.log('🧹 React Query cache cleared')
    
    // Manual refetch to ensure immediate update
    console.log('🔄 Refetching projects...')
    const projectResult = await refetchProjects()
    console.log('📦 Projects refetch result:', projectResult.data?.length, 'projects')
    
    console.log('🔄 Refetching status...')
    const statusResult = await refetchStatus()
    console.log('📊 Status refetch result:', statusResult.data?.size, 'entries')
    
    console.log('✅✅✅ ALL DATA REFRESHED ✅✅✅')
  }

  /**
   * Refresh only project status (lighter operation)
   */
  const refreshProjectStatus = async () => {
    console.log('🔄🔄🔄 REFRESH PROJECT STATUS STARTED 🔄🔄🔄')
    console.log('📊 Current status before refresh:', projectStatus)
    
    // Check if VS Code bridge is available
    if (environmentBridge.isVSCodeAvailable()) {
      console.log('🔗 VS Code bridge available - requesting fresh status data')
      // Give VS Code bridge time to respond before clearing cache
      await new Promise(resolve => setTimeout(resolve, 100))
      // Only clear local cache as backup, don't clear React Query cache
      optimizedPortManager.clearCache()
    } else {
      console.log('📱 Web mode - clearing local port cache')
      optimizedPortManager.clearCache()
    }
    
    // Invalidate only the status query to force fresh fetch without clearing cache completely
    queryClient.invalidateQueries({ queryKey: ['projectStatus'] })
    
    const statusResult = await refetchStatus()
    console.log('📊 Status refresh result:', statusResult.data?.size, 'entries')
    console.log('✅✅✅ PROJECT STATUS REFRESHED ✅✅✅')
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
    isLoadingStatus: isLoadingStatus || isFetchingStatus,
    isLoading: isLoadingProjects || isLoadingStatus || isFetchingStatus,
    
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