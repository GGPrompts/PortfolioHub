import { create } from 'zustand'

export type SidebarState = 'collapsed' | 'search' | 'normal' | 'expanded'
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
  
  // Actions
  setProjects: (projects: Project[]) => void
  selectProject: (project: Project | null) => void
  setActiveFilter: (filter: string) => void
  setProjectLoading: (loading: boolean) => void
  
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
      current === 'collapsed' ? 'search' :
      current === 'search' ? 'normal' :
      current === 'normal' ? 'expanded' :
      'collapsed'
    set({ sidebarState: nextState })
  },
  
  // Project state
  projects: [],
  selectedProject: null,
  activeFilter: 'all',
  isProjectLoading: false,
  
  // Actions
  setProjects: (projects) => set({ projects }),
  selectProject: (project) => set({ selectedProject: project }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setProjectLoading: (loading) => set({ isProjectLoading: loading }),
  
  // Filtered projects
  getFilteredProjects: () => {
    const { projects, activeFilter } = get()
    if (activeFilter === 'all') return projects
    return projects.filter(p => p.tags.includes(activeFilter))
  }
}))