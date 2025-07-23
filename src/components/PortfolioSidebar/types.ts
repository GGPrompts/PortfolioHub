export interface Project {
  id: string
  title: string
  description: string
  path?: string
  localPort?: number
  buildCommand?: string
  repository?: string
  tags: string[]
  devJournal?: string
  requires3D?: boolean
}

export interface Note {
  id: string
  title: string
  date: string
  preview: string
  content: string
  project: string
  saved: boolean
  filePath: string
  claudeInstructions?: string
  folder?: string
}

export interface TabConfig {
  width: number
  icon: string
  title: string
}

export interface TabsConfig {
  [key: string]: TabConfig
}

export type NotesView = 'to-sort' | 'organized'
export type LayoutStrategy = 'push' | 'overlay'
export type SidebarState = 'normal' | 'expanded'
export type JournalMode = 'full-width' | 'with-projects'

// Hook return types for better type safety
export interface PortfolioSidebarState {
  sidebarState: SidebarState
  setSidebarState: (state: SidebarState) => void
  selectedProject: Project | null
  projects: Project[]
  activeFilter: string
  setActiveFilter: (filter: string) => void
  selectProject: (project: Project | null) => void
  expandedProjects: Set<string>
  toggleProjectExpanded: (projectId: string) => void
  collapseAllProjects: () => void
  projectStatus: Record<string, boolean>
  isLoadingStatus: boolean
  refreshProjectStatus: () => void
  getProjectStatus: (projectId: string) => boolean
  runningProjectsCount: number
  totalProjects: number
}

export interface JournalState {
  journalContent: string
  setJournalContent: (content: string) => void
  isLoadingJournal: boolean
  setIsLoadingJournal: (loading: boolean) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  journalMode: JournalMode
  setJournalMode: (mode: JournalMode) => void
}

export interface DevNotesState {
  currentNote: string
  setCurrentNote: (note: string) => void
  claudeInstructions: string
  setClaudeInstructions: (instructions: string) => void
  isEditingNote: boolean
  setIsEditingNote: (editing: boolean) => void
  isSelectingNote: boolean
  setIsSelectingNote: (selecting: boolean) => void
  existingNotes: Note[]
  setExistingNotes: (notes: Note[]) => void
  selectedNoteId: string | null
  setSelectedNoteId: (id: string | null) => void
  selectedNoteProject: string
  setSelectedNoteProject: (project: string) => void
  showNotesList: boolean
  setShowNotesList: (show: boolean) => void
  toSortNotes: Note[]
  setToSortNotes: (notes: Note[]) => void
  organizedNotes: Note[]
  setOrganizedNotes: (notes: Note[]) => void
  currentNotesView: NotesView
  setCurrentNotesView: (view: NotesView) => void
  selectedOrganizedProject: string
  setSelectedOrganizedProject: (project: string) => void
}

export interface ProjectSelectionState {
  selectedProjects: Set<string>
  setSelectedProjects: (projects: Set<string>) => void
  onlineSectionCollapsed: boolean
  setOnlineSectionCollapsed: (collapsed: boolean) => void
  offlineSectionCollapsed: boolean
  setOfflineSectionCollapsed: (collapsed: boolean) => void
  toggleProjectSelection: (projectId: string) => void
}

export interface TabManagementState {
  showProjectWizard: boolean
  setShowProjectWizard: (show: boolean) => void
  activeTabs: string[]
  setActiveTabs: (tabs: string[]) => void
  tabs: TabsConfig
}