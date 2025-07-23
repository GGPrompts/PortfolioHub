import { useState, useEffect } from 'react'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useProjectData } from '../../hooks/useProjectData'

export const usePortfolioSidebarState = () => {
  const { 
    sidebarState, 
    setSidebarState, 
    selectedProject,
    projects,
    activeFilter,
    setActiveFilter,
    selectProject,
    expandedProjects,
    toggleProjectExpanded,
    collapseAllProjects
  } = usePortfolioStore()
  
  // Use React Query for project data management
  const { 
    projectStatus, 
    isLoadingStatus,
    refreshProjectStatus,
    getProjectStatus,
    runningProjectsCount,
    totalProjects
  } = useProjectData()

  return {
    sidebarState,
    setSidebarState,
    selectedProject,
    projects,
    activeFilter,
    setActiveFilter,
    selectProject,
    expandedProjects,
    toggleProjectExpanded,
    collapseAllProjects,
    projectStatus,
    isLoadingStatus,
    refreshProjectStatus,
    getProjectStatus,
    runningProjectsCount,
    totalProjects
  }
}

export const useJournalState = () => {
  const [journalContent, setJournalContent] = useState<string>('')
  const [isLoadingJournal, setIsLoadingJournal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [journalMode, setJournalMode] = useState<'full-width' | 'with-projects'>('with-projects')

  return {
    journalContent,
    setJournalContent,
    isLoadingJournal,
    setIsLoadingJournal,
    searchQuery,
    setSearchQuery,
    journalMode,
    setJournalMode
  }
}

export const useDevNotesState = () => {
  const [currentNote, setCurrentNote] = useState<string>('')
  const [claudeInstructions, setClaudeInstructions] = useState<string>('')
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [isSelectingNote, setIsSelectingNote] = useState(false)
  const [existingNotes, setExistingNotes] = useState<any[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [selectedNoteProject, setSelectedNoteProject] = useState<string>('')
  const [showNotesList, setShowNotesList] = useState(true)
  const [toSortNotes, setToSortNotes] = useState<any[]>([])
  const [organizedNotes, setOrganizedNotes] = useState<any[]>([])
  const [currentNotesView, setCurrentNotesView] = useState<'to-sort' | 'organized'>('to-sort')
  const [selectedOrganizedProject, setSelectedOrganizedProject] = useState<string>('all')

  return {
    currentNote,
    setCurrentNote,
    claudeInstructions,
    setClaudeInstructions,
    isEditingNote,
    setIsEditingNote,
    isSelectingNote,
    setIsSelectingNote,
    existingNotes,
    setExistingNotes,
    selectedNoteId,
    setSelectedNoteId,
    selectedNoteProject,
    setSelectedNoteProject,
    showNotesList,
    setShowNotesList,
    toSortNotes,
    setToSortNotes,
    organizedNotes,
    setOrganizedNotes,
    currentNotesView,
    setCurrentNotesView,
    selectedOrganizedProject,
    setSelectedOrganizedProject
  }
}

export const useProjectSelectionState = () => {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [onlineSectionCollapsed, setOnlineSectionCollapsed] = useState(false)
  const [offlineSectionCollapsed, setOfflineSectionCollapsed] = useState(false)

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(projectId)) {
        newSelection.delete(projectId)
      } else {
        newSelection.add(projectId)
      }
      return newSelection
    })
  }

  return {
    selectedProjects,
    setSelectedProjects,
    onlineSectionCollapsed,
    setOnlineSectionCollapsed,
    offlineSectionCollapsed,
    setOfflineSectionCollapsed,
    toggleProjectSelection
  }
}

export const useTabManagement = () => {
  const [showProjectWizard, setShowProjectWizard] = useState(false)
  const [activeTabs, setActiveTabs] = useState<string[]>([])

  // Define tab configurations
  const tabs = {
    projects: { width: 320, icon: 'sidebarSmall', title: 'Projects' },
    journals: { width: 600, icon: 'sidebarLarge', title: 'Dev Notes' },
  }

  return {
    showProjectWizard,
    setShowProjectWizard,
    activeTabs,
    setActiveTabs,
    tabs
  }
}