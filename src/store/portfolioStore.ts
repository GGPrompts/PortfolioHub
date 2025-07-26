import { create } from 'zustand'

export type SidebarState = 'collapsed' | 'normal' | 'expanded'
export type ProjectDisplayType = 'iframe' | 'external' | 'embed'

export interface Project {
  id: string
  title: string
  description: string
  displayType: ProjectDisplayType
  path?: string
  demoUrl?: string
  repository?: string
  localPort?: number
  buildCommand?: string
  permissions?: string[]
  thumbnail?: string
  tags: string[]
  tech: string[]
  status: 'active' | 'archived' | 'experimental'
  devJournal?: string
  requires3D?: boolean  // New property for projects needing pointer lock
  disableLivePreview?: boolean  // Disable live preview for projects like terminal systems
}

interface PortfolioStore {
  // Sidebar state
  sidebarState: SidebarState
  setSidebarState: (state: SidebarState) => void
  toggleSidebar: () => void
  
  // Project state
  projects: Project[]
  selectedProject: Project | null
  activeFilter: string
  isProjectLoading: boolean
  expandedProjects: Set<string>
  
  // Actions
  setProjects: (projects: Project[]) => void
  selectProject: (project: Project | null) => void
  setActiveFilter: (filter: string) => void
  setProjectLoading: (loading: boolean) => void
  toggleProjectExpanded: (projectId: string) => void
  collapseAllProjects: () => void
  
  // Filtered projects getter
  getFilteredProjects: () => Project[]
}

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  // Sidebar state
  sidebarState: 'normal',
  setSidebarState: (state) => set({ sidebarState: state }),
  toggleSidebar: () => {
    const current = get().sidebarState
    const nextState = 
      current === 'collapsed' ? 'normal' :
      current === 'normal' ? 'expanded' :
      'collapsed'
    set({ sidebarState: nextState })
  },
  
  // Project state
  projects: [],
  selectedProject: null,
  activeFilter: 'all',
  isProjectLoading: false,
  expandedProjects: new Set(),
  
  // Actions
  setProjects: (projects) => set({ projects }),
  selectProject: (project) => set({ selectedProject: project }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setProjectLoading: (loading) => set({ isProjectLoading: loading }),
  toggleProjectExpanded: (projectId) => set((state) => {
    const expanded = new Set(state.expandedProjects)
    if (expanded.has(projectId)) {
      expanded.delete(projectId)
    } else {
      expanded.add(projectId)
    }
    return { expandedProjects: expanded }
  }),
  collapseAllProjects: () => set({ expandedProjects: new Set() }),
  
  // Filtered projects
  getFilteredProjects: () => {
    const { projects, activeFilter } = get()
    if (activeFilter === 'all') return projects
    return projects.filter(p => p.tags.includes(activeFilter))
  }
}))