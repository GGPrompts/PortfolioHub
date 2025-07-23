import React, { useState, useEffect } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { usePortfolioStore } from '../store/portfolioStore'
import { useProjectData } from '../hooks/useProjectData'
import GitUpdateButton from './GitUpdateButton'
import SvgIcon from './SvgIcon'
import NoteCard from './NoteCard'
import ProjectWizard from './ProjectWizard'
import EnvironmentBadge from './EnvironmentBadge'
import styles from './PortfolioSidebar.module.css'
import { isVSCodeEnvironment, executeCommand, showNotification, copyToClipboard, launchAllProjects, launchSelectedProjects, launchProjectsEnhanced, executeScript } from '../utils/vsCodeIntegration'

interface PortfolioSidebarProps {
  onOpenDashboard?: () => void
  onWidthChange?: (width: number) => void
  layoutStrategy?: 'push' | 'overlay'
}

// Helper function to check if we're in VS Code and execute commands directly
const executeOrCopyCommand = async (command: string, successMessage: string, commandName?: string) => {
  if (isVSCodeEnvironment()) {
    // Execute directly in VS Code terminal
    await executeCommand(command, commandName || 'Portfolio Command')
    showNotification(successMessage)
  } else {
    // Fallback to clipboard for web version
    try {
      await copyToClipboard(command)
      alert(successMessage + ' (copied to clipboard)')
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      alert('Command ready, but clipboard copy failed.')
    }
  }
}

export default function PortfolioSidebar({ onOpenDashboard, onWidthChange, layoutStrategy = 'push' }: PortfolioSidebarProps) {
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

  
  const [journalContent, setJournalContent] = useState<string>('')
  const [isLoadingJournal, setIsLoadingJournal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [journalMode, setJournalMode] = useState<'full-width' | 'with-projects'>('with-projects')
  
  // Dev Notes state
  const [currentNote, setCurrentNote] = useState<string>('')
  const [claudeInstructions, setClaudeInstructions] = useState<string>('')
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [isSelectingNote, setIsSelectingNote] = useState(false)
  const [existingNotes, setExistingNotes] = useState<any[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [selectedNoteProject, setSelectedNoteProject] = useState<string>('')
  
  // Selected projects for launch/kill operations
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  
  // Section collapse state
  const [onlineSectionCollapsed, setOnlineSectionCollapsed] = useState(false)
  const [offlineSectionCollapsed, setOfflineSectionCollapsed] = useState(false)
  
  // Notes display state
  const [showNotesList, setShowNotesList] = useState(true)
  const [toSortNotes, setToSortNotes] = useState<any[]>([])
  const [organizedNotes, setOrganizedNotes] = useState<any[]>([])
  const [currentNotesView, setCurrentNotesView] = useState<'to-sort' | 'organized'>('to-sort')
  const [selectedOrganizedProject, setSelectedOrganizedProject] = useState<string>('all')
  
  
  // Project wizard state
  const [showProjectWizard, setShowProjectWizard] = useState(false)
  
  // Tab-based state management - Array to maintain order
  const [activeTabs, setActiveTabs] = useState<string[]>([])
  
  // Define tab configurations
  const tabs = {
    projects: { width: 320, icon: 'sidebarSmall', title: 'Projects' },
    journals: { width: 600, icon: 'sidebarLarge', title: 'Dev Notes' },
    // Future tabs can be added here: settings, git, etc.
  }

  // Calculate position for each tab based on fixed order and active tabs
  const getTabPosition = (tabId: string) => {
    if (!activeTabs.includes(tabId)) return 0 // Tab not active
    
    // Fixed order: projects -> journals (left to right)
    const fixedOrder = ['projects', 'journals']
    
    // Calculate cumulative width up to and including this tab's panel
    let cumulativeWidth = 0
    for (const orderedTabId of fixedOrder) {
      if (activeTabs.includes(orderedTabId)) {
        if (tabs[orderedTabId as keyof typeof tabs]) {
          cumulativeWidth += tabs[orderedTabId as keyof typeof tabs].width
        }
      }
      // Stop when we reach the current tab
      if (orderedTabId === tabId) {
        break
      }
    }
    return cumulativeWidth // Position at the right edge of this panel
  }
  
  // Calculate total width based on active tabs only
  const calculateWidth = () => {
    if (activeTabs.length === 0) {
      return 0 // No width when no panels are open
    }
    
    let totalWidth = 0
    activeTabs.forEach(tabId => {
      if (tabs[tabId as keyof typeof tabs]) {
        totalWidth += tabs[tabId as keyof typeof tabs].width
      }
    })
    return totalWidth
  }
  
  // Toggle tab function - maintains order
  const toggleTab = (tabId: string) => {
    setActiveTabs(prev => {
      if (prev.includes(tabId)) {
        // Remove tab if it exists
        return prev.filter(id => id !== tabId)
      } else {
        // Add tab to the end (rightmost position)
        return [...prev, tabId]
      }
    })
  }
  
  // Spring animation for smooth transitions
  const springProps = useSpring({
    width: calculateWidth(),
    config: {
      tension: 280,
      friction: 32,
      clamp: true
    }
  })

  // Individual panel animations
  const projectsSpring = useSpring({
    opacity: activeTabs.includes('projects') ? 1 : 0,
    transform: activeTabs.includes('projects') ? 'translateX(0px)' : 'translateX(-20px)',
    pointerEvents: activeTabs.includes('projects') ? 'auto' : 'none',
    config: { tension: 280, friction: 32, clamp: true }
  })
  
  const journalSpring = useSpring({
    opacity: activeTabs.includes('journals') ? 1 : 0,
    transform: activeTabs.includes('journals') ? 'translateX(0px)' : 'translateX(-20px)',
    pointerEvents: activeTabs.includes('journals') ? 'auto' : 'none',
    config: { tension: 280, friction: 32, clamp: true }
  })
  
  
  // Get unique tags for filtering
  const allTags = Array.from(new Set(projects.flatMap(p => p.tags)))

  // Notify parent of width changes
  useEffect(() => {
    const currentWidth = calculateWidth()
    onWidthChange?.(currentWidth)
  }, [activeTabs, onWidthChange])
  
  // Filter projects based on search query
  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchQuery === '' || 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = activeFilter === 'all' || project.tags.includes(activeFilter)
    return matchesSearch && matchesFilter
  })
  
  // Handle navigation to portfolio home
  const handlePortfolioHome = () => {
    selectProject(null)
    setSidebarState('normal')
    // This will trigger the App component to show the grid
  }
  
  // Load dev journal when in expanded view and project selected
  useEffect(() => {
    if (sidebarState === 'expanded' && selectedProject?.devJournal) {
      setIsLoadingJournal(true)
      fetch(selectedProject.devJournal)
        .then(res => res.text())
        .then(content => {
          setJournalContent(content)
          setIsLoadingJournal(false)
        })
        .catch(err => {
          console.error('Failed to load dev journal:', err)
          setJournalContent('# Dev Journal\n\nFailed to load journal content.')
          setIsLoadingJournal(false)
        })
    }
  }, [sidebarState, selectedProject])
  


  
  // Helper functions for DEV NOTES system
  const handleSaveToToSort = async () => {
    if (!currentNote.trim()) return
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `note-${timestamp}.md`
    
    const targetProject = projects.find(p => p.id === selectedNoteProject)
    
    let content = `# Quick Note - ${new Date().toLocaleDateString()}\n\n`
    
    // Add Claude instructions if provided
    if (claudeInstructions.trim()) {
      content += `### Claude Instructions\n${claudeInstructions.trim()}\n\n`
    }
    
    // Add context metadata
    content += `**Project:** ${targetProject ? targetProject.title : 'General (No Project)'}\n`
    if (targetProject) {
      const projectPath = targetProject.path || targetProject.id
      content += `**Project Path:** D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${projectPath}\n`
    }
    content += `**Timestamp:** ${new Date().toISOString()}\n\n`
    
    // Add main note content
    content += `## Note\n\n${currentNote.trim()}\n\n`
    
    // Add footer
    content += `---\n*Note saved to to-sort folder for later organization*\n`
    
    try {
      // Check if we're in VS Code and use the VS Code API
      if (typeof window !== 'undefined' && (window as any).vsCodePortfolio?.isVSCodeWebview) {
        const filePath = `notes/to-sort/${fileName}`
        ;(window as any).vsCodePortfolio.saveFile(filePath, content)
        
        // Add the note to local state
        const newNote = {
          id: `note-${Date.now()}`,
          title: currentNote.split('\n')[0].slice(0, 50) + (currentNote.length > 50 ? '...' : ''),
          date: new Date().toLocaleDateString(),
          preview: currentNote.slice(0, 150) + (currentNote.length > 150 ? '...' : ''),
          content: content,
          project: targetProject ? targetProject.id : 'General',
          saved: true,
          filePath: fileName
        }
        
        setToSortNotes(prev => [newNote, ...prev])
        setCurrentNote('')
        setClaudeInstructions('')
        setSelectedNoteProject('')
        
        return
      }
      
      // Try to save the file directly using File System Access API for web version
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'Markdown files',
              accept: { 'text/markdown': ['.md'] }
            }]
          })
          
          const writable = await fileHandle.createWritable()
          await writable.write(content)
          await writable.close()
          
          // Add the note to local state
          const newNote = {
            id: `note-${Date.now()}`,
            title: currentNote.split('\n')[0].slice(0, 50) + (currentNote.length > 50 ? '...' : ''),
            date: new Date().toLocaleDateString(),
            preview: currentNote.slice(0, 150) + (currentNote.length > 150 ? '...' : ''),
            content: content,
            project: targetProject ? targetProject.id : 'General',
            saved: true,
            filePath: fileHandle.name
          }
          
          setToSortNotes(prev => [newNote, ...prev])
          
          alert(`Note saved successfully as ${fileHandle.name}!`)
          setCurrentNote('')
          setClaudeInstructions('')
          setSelectedNoteProject('')
          setIsEditingNote(false)
          setShowNotesList(true)
          
        } catch (fileError) {
          if (fileError.name === 'AbortError') {
            // User cancelled file save dialog
            return
          }
          throw fileError
        }
      } else {
        // Fallback: Download the file
        const blob = new Blob([content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        // Add the note to local state
        const newNote = {
          id: `note-${Date.now()}`,
          title: currentNote.split('\n')[0].slice(0, 50) + (currentNote.length > 50 ? '...' : ''),
          date: new Date().toLocaleDateString(),
          preview: currentNote.slice(0, 150) + (currentNote.length > 150 ? '...' : ''),
          content: content,
          project: targetProject ? targetProject.id : 'General',
          saved: true,
          filePath: fileName
        }
        
        setToSortNotes(prev => [newNote, ...prev])
        
        alert(`Note downloaded as ${fileName}! Move it to your to-sort folder: D:\\ClaudeWindows\\claude-dev-portfolio\\notes\\to-sort\\`)
        setCurrentNote('')
        setClaudeInstructions('')
        setSelectedNoteProject('')
        setIsEditingNote(false)
        setShowNotesList(true)
      }
      
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Failed to save file. Please try again.')
    }
  }

  const handleOrganizeNotes = async () => {
    const savedNotes = toSortNotes.filter(note => note.saved)
    const unsavedNotes = toSortNotes.filter(note => !note.saved)
    
    let promptText = `Please help me organize my notes:\n\n`
    
    // Include saved notes (in file system)
    if (savedNotes.length > 0) {
      promptText += `## SAVED NOTES (check file system)\n`
      promptText += `Check the to-sort folder at D:\\ClaudeWindows\\claude-dev-portfolio\\notes\\to-sort\\ for these saved files:\n`
      savedNotes.forEach(note => {
        promptText += `- ${note.filePath} (${note.project}): ${note.preview}\n`
      })
      promptText += `\n`
    }
    
    // Include unsaved notes (in memory)
    if (unsavedNotes.length > 0) {
      promptText += `## UNSAVED NOTES (create files)\n`
      promptText += `Create files for these notes and add them to the to-sort folder:\n\n`
      unsavedNotes.forEach(note => {
        const fileName = `note-${note.id.replace('note-', '')}.md`
        promptText += `**File:** ${fileName}\n`
        promptText += `**Content:**\n\`\`\`markdown\n${note.content}\n\`\`\`\n\n`
      })
    }
    
    promptText += `## ORGANIZATION TASKS\n`
    promptText += `Please:\n`
    promptText += `1. Create any missing files for unsaved notes\n`
    promptText += `2. Review all notes and identify their project/topic\n`
    promptText += `3. Extract Claude instructions (marked with ###)\n`
    promptText += `4. Move notes to appropriate project dev journals\n`
    promptText += `5. Create topic-based folders for general notes\n`
    promptText += `6. Update CLAUDE.md files with relevant instructions\n\n`
    promptText += `Provide a plan and execute the organization.`
    
    if (isVSCodeEnvironment()) {
      // In VS Code, copy to clipboard and show notification
      await copyToClipboard(promptText)
      const totalNotes = toSortNotes.length
      const savedCount = savedNotes.length
      const unsavedCount = unsavedNotes.length
      showNotification(`Organization prompt copied! Includes ${totalNotes} notes (${savedCount} saved, ${unsavedCount} unsaved)`)
    } else {
      try {
        await copyToClipboard(promptText)
        const totalNotes = toSortNotes.length
        const savedCount = savedNotes.length
        const unsavedCount = unsavedNotes.length
        alert(`Organization prompt copied! Includes ${totalNotes} notes (${savedCount} saved, ${unsavedCount} unsaved)`)
      } catch (err) {
        console.error('Failed to copy to clipboard:', err)
        alert('Organization prompt ready, but clipboard copy failed.')
      }
    }
  }

  const handleNewNote = () => {
    setCurrentNote('')
    setClaudeInstructions('')
    setSelectedNoteId(null)
    setSelectedNoteProject(selectedProject?.id || '')
    setIsEditingNote(true)
    setIsSelectingNote(false)
  }

  const handleEditExistingNote = () => {
    setIsSelectingNote(true)
    setIsEditingNote(false)
    // In a real implementation, this would fetch existing notes
    // For now, we'll simulate some notes
    setExistingNotes([
      {
        id: '1',
        title: 'Feature idea for Matrix Cards',
        date: '2025-01-18',
        preview: 'Add a new card type that displays code snippets with syntax highlighting...',
        content: 'Add a new card type that displays code snippets with syntax highlighting. This would be great for showcasing code examples.',
        claudeInstructions: 'Help me implement this in the Matrix Cards project'
      },
      {
        id: '2',
        title: 'Portfolio improvement ideas',
        date: '2025-01-17',
        preview: 'The sidebar could use better responsive behavior on mobile devices...',
        content: 'The sidebar could use better responsive behavior on mobile devices. Maybe add a hamburger menu?',
        claudeInstructions: ''
      }
    ])
  }

  const handleSelectNote = (note: any) => {
    setCurrentNote(note.content)
    setClaudeInstructions(note.claudeInstructions)
    setSelectedNoteId(note.id)
    setIsEditingNote(true)
    setIsSelectingNote(false)
  }

  const handleCancelNoteSelection = () => {
    setIsSelectingNote(false)
    setIsEditingNote(false)
  }

  // Load notes from TO-SORT folder
  const loadToSortNotes = async () => {
    try {
      if (isVSCodeEnvironment()) {
        // In VS Code environment, request file listing from extension
        (window as any).vsCodePortfolio?.postMessage?.({
          type: 'notes:loadToSort'
        });
        
        // The extension will handle loading and injecting the notes data
        // For now, start with empty array and let the extension populate it
        setToSortNotes([]);
      } else {
        // In web environment, we can't access the file system directly
        // Show a message about VS Code integration being needed for full functionality
        setToSortNotes([]);
        console.log('📝 DEV NOTES: File system access requires VS Code environment for full functionality');
      }
    } catch (error) {
      console.error('Failed to load to-sort notes:', error);
      setToSortNotes([]);
    }
  }

  // Load organized notes from main or project-specific organized folder
  const loadOrganizedNotes = async (projectId: string = 'all') => {
    try {
      if (isVSCodeEnvironment()) {
        // In VS Code environment, request organized notes from extension
        (window as any).vsCodePortfolio?.postMessage?.({
          type: 'notes:loadOrganized',
          projectId
        });
        
        // The extension will handle loading and sending back the notes
        setOrganizedNotes([]);
      } else {
        // In web environment, we can't access the file system directly
        setOrganizedNotes([]);
        console.log('📝 ORGANIZED NOTES: File system access requires VS Code environment');
      }
    } catch (error) {
      console.error('Failed to load organized notes:', error);
      setOrganizedNotes([]);
    }
  }

  // Load notes when DEV NOTES tab is opened
  useEffect(() => {
    if (activeTabs.includes('journals')) {
      loadToSortNotes()
      loadOrganizedNotes(selectedOrganizedProject)
    }
  }, [activeTabs, selectedOrganizedProject])

  // Listen for notes data from VS Code extension
  useEffect(() => {
    if (isVSCodeEnvironment()) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'notes:toSortLoaded') {
          console.log('📝 Received to-sort notes from VS Code extension:', event.data.notes);
          setToSortNotes(event.data.notes);
        } else if (event.data?.type === 'notes:organizedLoaded') {
          console.log('📝 Received organized notes from VS Code extension:', event.data.notes);
          setOrganizedNotes(event.data.notes);
        }
      };
      
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [isVSCodeEnvironment()])

  const handleCreateNewNote = () => {
    setShowNotesList(false)
    setIsEditingNote(true)
    setCurrentNote('')
    setClaudeInstructions('')
    setSelectedNoteProject('')
  }

  const handleBackToNotesList = () => {
    setShowNotesList(true)
    setIsEditingNote(false)
    setIsSelectingNote(false)
    setCurrentNote('')
    setClaudeInstructions('')
  }

  const handleEditToSortNote = (note: any) => {
    setCurrentNote(note.content)
    setClaudeInstructions('')
    setSelectedNoteProject(note.project)
    setShowNotesList(false)
    setIsEditingNote(true)
  }

  const handleDeleteNote = async (noteId: string, noteTitle: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the note "${noteTitle}"?\n\nThis action cannot be undone.`)
    if (confirmDelete) {
      // Find the note to get its file path
      const noteToDelete = toSortNotes.find(note => note.id === noteId)
      if (noteToDelete) {
        try {
          // Import deleteFile from VS Code integration
          const { deleteFile, isVSCodeEnvironment } = await import('../utils/vsCodeIntegration')
          
          if (isVSCodeEnvironment()) {
            // In VS Code, delete the actual file
            await deleteFile(noteToDelete.filePath)
          } else {
            // In web version, just warn user (file system access limited)
            console.warn('File deletion in web version - file will remain on disk')
          }
          
          // Remove from UI state regardless of environment
          setToSortNotes(prev => prev.filter(note => note.id !== noteId))
          console.log(`Note "${noteTitle}" deleted from TO-SORT folder`)
        } catch (error) {
          console.error('Failed to delete note file:', error)
          // Still remove from UI even if file deletion failed
          setToSortNotes(prev => prev.filter(note => note.id !== noteId))
        }
      }
    }
  }

  // Project wizard handlers
  const handleNewProject = () => {
    setShowProjectWizard(true)
    setShowNotesList(false)
    setIsEditingNote(false)
    setIsSelectingNote(false)
    // Ensure the journals tab is open to show the wizard
    if (!activeTabs.includes('journals')) {
      toggleTab('journals')
    }
  }

  const handleWizardCancel = () => {
    setShowProjectWizard(false)
    setShowNotesList(true)
  }

  const handleWizardSuccess = (projectId: string) => {
    setShowProjectWizard(false)
    setShowNotesList(true)
    // Optionally, you could trigger a project list refresh here
    console.log(`Project ${projectId} created successfully!`)
  }

  // Project selection management
  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  const selectAllProjects = () => {
    setSelectedProjects(new Set(projects.map(p => p.id)))
  }

  const deselectAllProjects = () => {
    setSelectedProjects(new Set())
  }

  // Helper function to get correct project path for scripts
  const getProjectPath = (project: any): string => {
    if (isVSCodeEnvironment() && (window as any).vsCodePortfolio?.portfolioPath) {
      // In VS Code, use proper path resolution
      const portfolioPath = (window as any).vsCodePortfolio.portfolioPath
      if (project.path) {
        if (project.path.startsWith('../Projects/')) {
          // New structure: ../Projects/project-name -> D:\ClaudeWindows\Projects\project-name
          return project.path.replace('../', portfolioPath.replace('claude-dev-portfolio', ''))
        } else if (project.path.startsWith('projects/')) {
          // Legacy structure: projects/project-name
          return `${portfolioPath}\\${project.path}`
        } else {
          // Other relative paths
          return `${portfolioPath}\\${project.path}`
        }
      } else {
        // Fallback to project ID
        return `${portfolioPath}\\projects\\${project.id}`
      }
    } else {
      // Web fallback - construct based on project path
      if (project.path && project.path.startsWith('../Projects/')) {
        return `D:\\ClaudeWindows\\${project.path.replace('../', '')}`
      } else {
        return `D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.id}`
      }
    }
  }

  const generateLaunchScript = (selectedProjectIds: string[]) => {
    if (selectedProjectIds.length === 0) return ''
    
    const selectedProjectsList = projects.filter(p => selectedProjectIds.includes(p.id))
    
    let script = `# Launch Selected Projects\n# Generated on ${new Date().toLocaleString()}\n\n`
    script += `# Portfolio\nStart-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd 'D:\\ClaudeWindows\\claude-dev-portfolio'; npm run dev" -WindowStyle Normal\n\n`
    
    selectedProjectsList.forEach(project => {
      const projectPath = getProjectPath(project)
      script += `# ${project.title}\n`
      script += `Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd '${projectPath}'; ${project.buildCommand || 'npm run dev'}" -WindowStyle Normal\n\n`
    })
    
    return script
  }

  const generateKillScript = (selectedProjectIds: string[]) => {
    if (selectedProjectIds.length === 0) return ''
    
    const selectedProjectsList = projects.filter(p => selectedProjectIds.includes(p.id))
    const ports = [5173] // Portfolio port
    
    selectedProjectsList.forEach(project => {
      if (project.localPort) {
        ports.push(project.localPort)
      }
    })
    
    let script = `# Kill Selected Projects\n# Generated on ${new Date().toLocaleString()}\n\n`
    script += `$ports = @(${ports.join(', ')})\n\n`
    script += `foreach ($port in $ports) {\n`
    script += `    Write-Host "Checking port $port..."\n`
    script += `    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1\n`
    script += `    if ($process) {\n`
    script += `        $processId = (Get-Process -Id $process.OwningProcess -ErrorAction SilentlyContinue).Id\n`
    script += `        if ($processId) {\n`
    script += `            Write-Host "Killing process $processId on port $port"\n`
    script += `            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue\n`
    script += `        }\n`
    script += `    }\n`
    script += `}\n\n`
    script += `Write-Host "Done killing selected project servers."\n`
    
    return script
  }

  const copyScriptToClipboard = async (script: string, type: 'launch' | 'kill') => {
    const commandName = type === 'launch' ? 'Launch Selected Projects' : 'Kill Selected Projects'
    await executeOrCopyCommand(script, `${type} script ready!`, commandName)
  }
  
  
  return (
    <animated.div 
      className={styles.sidebar}
      style={{ width: springProps.width }}
    >
      <div className={styles.sidebarContainer}>
        {/* Environment Badge */}
        <div className={styles.environmentBadgeContainer}>
          <EnvironmentBadge size="small" showDescription={false} />
        </div>
        
        {/* Responsive mode indicator */}
        {layoutStrategy === 'overlay' && activeTabs.length > 0 && (
          <div className={styles.responsiveIndicator} title="Overlay mode - content protected from cutoff">
            📱
          </div>
        )}
        {/* Notebook-style Tabs - Positioned at screen edge */}
        {Object.entries(tabs).map(([tabId, config]) => (
          <div 
            key={tabId}
            className={`${styles.notebookTab} ${activeTabs.includes(tabId) ? styles.active : ''}`}
            title={config.title}
            onClick={() => toggleTab(tabId)}
            style={{
              position: 'fixed',
              left: `${getTabPosition(tabId)}px`,
              top: `${20 + (Object.keys(tabs).indexOf(tabId) * 40)}px`,
              zIndex: activeTabs.includes(tabId) ? 10 : 5,
              transition: 'left 0.3s ease, background 0.3s ease'
            }}
          >
            <div className={styles.tabIcon}>
              <SvgIcon name={config.icon} size={18} color="currentColor" />
            </div>
          </div>
        ))}

      
        {/* Projects Panel - Visible when projects tab is active */}
        {activeTabs.includes('projects') && (
        <animated.div 
          className={styles.projectsPanel}
          style={projectsSpring}
        >
          <h3 className={styles.title}>PROJECTS</h3>
          
          {/* New Project Button */}
          <div className={styles.newProjectSection}>
            <button 
              className={styles.newProjectBtn}
              onClick={handleNewProject}
              title="Create a new project with guided setup"
            >
              <SvgIcon name="plus" size={18} />
              <span>New Project</span>
            </button>
          </div>
          
          {/* Search Bar */}
          <div className={styles.searchSection}>
            <input 
              type="text" 
              placeholder="Search projects..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Header */}
          <div className={styles.statusHeader}>
            <div className={styles.statusInfo}>
              <span className={styles.statusText}>
                {runningProjectsCount} / {totalProjects} projects running
              </span>
              <span className={styles.lastUpdated}>
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
            <button 
              className={styles.refreshBtn}
              onClick={(e) => {
                e.stopPropagation()
                refreshProjectStatus()
              }}
              title="Refresh project status"
            >
              <SvgIcon name="refreshCw" size={14} />
            </button>
          </div>

          {/* Selection Controls */}
          <div className={styles.selectionControls}>
            <div className={styles.selectionHeader}>
              <span className={styles.selectionTitle}>Launch Selection ({selectedProjects.size})</span>
              <div className={styles.selectionButtons}>
                <button 
                  className={styles.selectAllBtn}
                  onClick={selectAllProjects}
                  title="Select all projects"
                >
                  All
                </button>
                <button 
                  className={styles.deselectAllBtn}
                  onClick={deselectAllProjects}
                  title="Deselect all projects"
                >
                  None
                </button>
              </div>
            </div>
          </div>
          
          {/* Project List with Collapsible Dropdowns - Separated by Status */}
          <div className={styles.projectList}>
            {/* Online Projects Section */}
            {filteredProjects.some(p => getProjectStatus(p.id)) && (
              <>
                <div className={styles.statusSectionHeader} onClick={() => setOnlineSectionCollapsed(!onlineSectionCollapsed)}>
                  <button className={`${styles.sectionCollapseToggle} ${onlineSectionCollapsed ? styles.collapsed : ''}`}>
                    ▼
                  </button>
                  <span className={styles.statusIndicator}>🟢</span>
                  <span className={styles.statusLabel}>ONLINE</span>
                  <span className={styles.projectCount}>
                    ({filteredProjects.filter(p => getProjectStatus(p.id)).length})
                  </span>
                </div>
                {!onlineSectionCollapsed && filteredProjects.filter(p => getProjectStatus(p.id)).map(project => {
                  const isRunning = getProjectStatus(project.id)
                  const isExpanded = expandedProjects.has(project.id)
                  
                  return (
                    <div key={project.id} className={styles.projectContainer}>
                      <div 
                        className={`${styles.projectItem} ${selectedProject?.id === project.id ? styles.selected : ''}`}
                      >
                        <button
                          className={`${styles.expandToggle} ${isExpanded ? styles.expanded : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleProjectExpanded(project.id)
                          }}
                        >
                          ▶
                        </button>
                        <input
                          type="checkbox"
                          className={styles.projectCheckbox}
                          checked={selectedProjects.has(project.id)}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleProjectSelection(project.id)
                          }}
                          title="Select for launch/kill operations"
                        />
                        <span 
                          className={styles.projectTitle}
                          onClick={async (e) => {
                            e.stopPropagation()
                            const isRunning = getProjectStatus(project.id)
                            if (isRunning && project.localPort) {
                              // Open in new tab/browser if project is running
                              const url = `http://localhost:${project.localPort}`
                              console.log(`🔗 Opening ${project.title} from sidebar:`, url)
                              if (isVSCodeEnvironment()) {
                                const { openInBrowser, showNotification } = await import('../utils/vsCodeIntegration')
                                openInBrowser(url)
                                showNotification(`Opening ${project.title} in browser`, 'info')
                              } else {
                                window.open(url, '_blank')
                              }
                            } else {
                              // Fallback to showing project info if not running
                              selectProject(project)
                            }
                          }}
                        >
                          {project.title}
                        </span>
                        {project.localPort && (
                          <span className={`${styles.statusDot} ${isRunning ? styles.running : styles.stopped}`}>
                            {isRunning ? '🟢' : '🔴'}
                          </span>
                        )}
                      </div>
                  
                  {isExpanded && (
                    <div className={styles.projectDropdown}>
                      {project.localPort && (
                        <>
                          <button
                            className={styles.dropdownItem}
                            onClick={async (e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              const url = `http://localhost:${project.localPort}`
                              console.log(`🔗 Opening ${project.title} in new tab:`, url)
                              if (isVSCodeEnvironment()) {
                                const { openInBrowser, showNotification } = await import('../utils/vsCodeIntegration')
                                openInBrowser(url)
                                showNotification(`Opening ${project.title} in browser`, 'info')
                              } else {
                                window.open(url, '_blank')
                              }
                            }}
                            disabled={!isRunning}
                          >
                            🔗 Open in new tab
                          </button>
                          <button
                            className={styles.dropdownItem}
                            onClick={async (e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              const command = `cd D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.path || project.id}; ${project.buildCommand || 'npm run dev'}`
                              await executeOrCopyCommand(command, `${project.title} start command ready!`, `Start ${project.title}`)
                            }}
                            disabled={isRunning}
                          >
                            ▶️ Start server
                          </button>
                          <button
                            className={styles.dropdownItem}
                            onClick={async (e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              if (project.localPort) {
                                const command = `taskkill /F /FI "PID eq (Get-NetTCPConnection -LocalPort ${project.localPort} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)"`
                                await executeOrCopyCommand(command, `${project.title} kill command ready!`, `Kill ${project.title}`)
                              } else {
                                if (isVSCodeEnvironment()) {
                                  const { showNotification } = await import('../utils/vsCodeIntegration')
                                  showNotification(`${project.title} has no port configured`, 'warning')
                                } else {
                                  alert(`${project.title} has no port configured`)
                                }
                              }
                            }}
                            disabled={!isRunning}
                          >
                            ⏹️ Kill server
                          </button>
                        </>
                      )}
                      <div style={{ padding: '4px' }}>
                        <GitUpdateButton 
                          type="project" 
                          projectId={project.id}
                          projectName={project.title}
                          size="small" 
                          variant="minimal"
                        />
                      </div>
                      {project.repository && (
                        <button
                          className={styles.dropdownItem}
                          onClick={() => window.open(project.repository, '_blank')}
                        >
                          <SvgIcon name="github" size={16} /> View on GitHub
                        </button>
                      )}
                      <div className={styles.dropdownTags}>
                        {project.tags.map(tag => (
                          <span key={tag} className={styles.tag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            </>
            )}

            {/* Offline Projects Section */}
            {filteredProjects.some(p => !getProjectStatus(p.id)) && (
              <>
                <div className={`${styles.statusSectionHeader} ${styles.offlineSection}`} onClick={() => setOfflineSectionCollapsed(!offlineSectionCollapsed)}>
                  <button className={`${styles.sectionCollapseToggle} ${offlineSectionCollapsed ? styles.collapsed : ''}`}>
                    ▼
                  </button>
                  <span className={styles.statusIndicator}>🔴</span>
                  <span className={styles.statusLabel}>OFFLINE</span>
                  <span className={styles.projectCount}>
                    ({filteredProjects.filter(p => !getProjectStatus(p.id)).length})
                  </span>
                </div>
                {!offlineSectionCollapsed && filteredProjects.filter(p => !getProjectStatus(p.id)).map(project => {
                  const isRunning = getProjectStatus(project.id)
                  const isExpanded = expandedProjects.has(project.id)
                  
                  return (
                    <div key={project.id} className={styles.projectContainer}>
                      <div 
                        className={`${styles.projectItem} ${selectedProject?.id === project.id ? styles.selected : ''}`}
                      >
                        <button
                          className={`${styles.expandToggle} ${isExpanded ? styles.expanded : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleProjectExpanded(project.id)
                          }}
                        >
                          ▶
                        </button>
                        <input
                          type="checkbox"
                          className={styles.projectCheckbox}
                          checked={selectedProjects.has(project.id)}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleProjectSelection(project.id)
                          }}
                          title="Select for launch/kill operations"
                        />
                        <span 
                          className={styles.projectTitle}
                          onClick={async (e) => {
                            e.stopPropagation()
                            const isRunning = getProjectStatus(project.id)
                            if (isRunning && project.localPort) {
                              // Open in new tab/browser if project is running
                              const url = `http://localhost:${project.localPort}`
                              console.log(`🔗 Opening ${project.title} from sidebar:`, url)
                              if (isVSCodeEnvironment()) {
                                const { openInBrowser, showNotification } = await import('../utils/vsCodeIntegration')
                                openInBrowser(url)
                                showNotification(`Opening ${project.title} in browser`, 'info')
                              } else {
                                window.open(url, '_blank')
                              }
                            } else {
                              // Fallback to showing project info if not running
                              selectProject(project)
                            }
                          }}
                        >
                          {project.title}
                        </span>
                        {project.localPort && (
                          <span className={`${styles.statusDot} ${isRunning ? styles.running : styles.stopped}`}>
                            {isRunning ? '🟢' : '🔴'}
                          </span>
                        )}
                      </div>
                  
                      {isExpanded && (
                        <div className={styles.projectDropdown}>
                          {project.localPort && (
                            <>
                              <button
                                className={styles.dropdownItem}
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  const url = `http://localhost:${project.localPort}`
                                  console.log(`🔗 Opening ${project.title} in new tab:`, url)
                                  if (isVSCodeEnvironment()) {
                                    const { openInBrowser, showNotification } = await import('../utils/vsCodeIntegration')
                                    openInBrowser(url)
                                    showNotification(`Opening ${project.title} in browser`, 'info')
                                  } else {
                                    window.open(url, '_blank')
                                  }
                                }}
                                disabled={!isRunning}
                              >
                                🔗 Open in new tab
                              </button>
                              <button
                                className={styles.dropdownItem}
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  const command = `cd D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.path || project.id}; ${project.buildCommand || 'npm run dev'}`
                                  await executeOrCopyCommand(command, `${project.title} start command ready!`, `Start ${project.title}`)
                                }}
                                disabled={isRunning}
                              >
                                ▶️ Start server
                              </button>
                              <button
                                className={styles.dropdownItem}
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  if (project.localPort) {
                                    const command = `taskkill /F /FI "PID eq (Get-NetTCPConnection -LocalPort ${project.localPort} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)"`
                                    await executeOrCopyCommand(command, `${project.title} kill command ready!`, `Kill ${project.title}`)
                                  } else {
                                    if (isVSCodeEnvironment()) {
                                      const { showNotification } = await import('../utils/vsCodeIntegration')
                                      showNotification(`${project.title} has no port configured`, 'warning')
                                    } else {
                                      alert(`${project.title} has no port configured`)
                                    }
                                  }
                                }}
                                disabled={!isRunning}
                              >
                                ⏹️ Kill server
                              </button>
                            </>
                          )}
                          <div style={{ padding: '4px' }}>
                            <GitUpdateButton 
                              type="project" 
                              projectId={project.id}
                              projectName={project.title}
                              size="small" 
                              variant="minimal"
                            />
                          </div>
                          {project.repository && (
                            <button
                              className={styles.dropdownItem}
                              onClick={() => window.open(project.repository, '_blank')}
                            >
                              <SvgIcon name="github" size={16} /> View on GitHub
                            </button>
                          )}
                          <div className={styles.dropdownTags}>
                            {project.tags.map(tag => (
                              <span key={tag} className={styles.tag}>{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
          
          {/* Quick Actions Footer */}
          <div className={styles.quickActions}>
            <button 
              className={styles.actionBtn}
              onClick={() => onOpenDashboard?.()}
              title="Open project status dashboard"
            >
              <SvgIcon name="settings" size={16} /> Dashboard
            </button>
            
            {/* Run Commands Group */}
            <div className={styles.buttonGroup}>
              <span className={styles.groupLabel}>Run</span>
              <button 
                className={styles.actionBtn}
                onClick={async () => {
                  if (isVSCodeEnvironment()) {
                    await launchAllProjects()
                  } else {
                    const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\start-all-enhanced.ps1'
                    await executeOrCopyCommand(command, 'Start all projects command ready!', 'Start All Projects')
                  }
                }}
                title={isVSCodeEnvironment() ? "Launch all projects in VS Code terminals" : "Copy command to start all projects"}
              >
                <SvgIcon name="play" size={16} /> All
              </button>
              
              {/* Enhanced Script Button - Only show in VS Code */}
              {isVSCodeEnvironment() && (
                <button
                  className={`${styles.actionBtn} ${styles.scriptBtn}`}
                  onClick={async () => {
                    await executeScript('scripts\\start-all-enhanced.ps1')
                  }}
                  title="Run the full enhanced PowerShell script with comprehensive port checking"
                >
                  <SvgIcon name="terminal" size={16} /> Script
                </button>
              )}
              <button 
                className={styles.actionBtn}
                onClick={async () => {
                  if (isVSCodeEnvironment()) {
                    await launchSelectedProjects(Array.from(selectedProjects))
                  } else {
                    copyScriptToClipboard(generateLaunchScript(Array.from(selectedProjects)), 'launch')
                  }
                }}
                disabled={selectedProjects.size === 0}
                title={isVSCodeEnvironment() ? "Launch selected projects in VS Code terminals" : "Copy command to start selected projects"}
              >
                <SvgIcon name="play" size={16} /> Selected ({selectedProjects.size})
              </button>
              
              {/* Enhanced Launch Button - Only show in VS Code */}
              {isVSCodeEnvironment() && (
                <button 
                  className={`${styles.actionBtn} ${styles.enhancedBtn}`}
                  onClick={async () => {
                    await launchProjectsEnhanced(Array.from(selectedProjects), false)
                  }}
                  disabled={selectedProjects.size === 0}
                  title="Launch selected projects with enhanced port checking and smart restart detection"
                >
                  <SvgIcon name="zap" size={16} /> Enhanced ({selectedProjects.size})
                </button>
              )}
              
              {/* Force Enhanced Launch Button - Only show in VS Code */}
              {isVSCodeEnvironment() && (
                <button 
                  className={`${styles.actionBtn} ${styles.forceBtn}`}
                  onClick={async () => {
                    await launchProjectsEnhanced(Array.from(selectedProjects), true)
                  }}
                  disabled={selectedProjects.size === 0}
                  title="Force restart all selected projects (stops existing servers first)"
                >
                  <SvgIcon name="rotateCcw" size={16} /> Force ({selectedProjects.size})
                </button>
              )}
            </div>
            
            {/* Kill Commands Group */}
            <div className={`${styles.buttonGroup} ${styles.killGroup}`}>
              <span className={styles.groupLabel}>Kill</span>
              <button 
                className={styles.actionBtn}
                onClick={async () => {
                  const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\kill-all-servers.ps1'
                  await executeOrCopyCommand(command, 'Kill all servers command ready!', 'Kill All Servers')
                }}
                title="Copy command to kill all projects"
              >
                <SvgIcon name="stop" size={16} /> All
              </button>
              <button 
                className={styles.actionBtn}
                onClick={() => {
                  copyScriptToClipboard(generateKillScript(Array.from(selectedProjects)), 'kill')
                }}
                disabled={selectedProjects.size === 0}
                title="Copy command to kill selected projects"
              >
                <SvgIcon name="stop" size={16} /> Selected ({selectedProjects.size})
              </button>
            </div>
            <button
              className={styles.actionBtn}
              onClick={() => {
                setActiveFilter('all')
                collapseAllProjects()
                setSearchQuery('')
              }}
              title="Clear filters and collapse all projects"
            >
              <SvgIcon name="refresh" size={16} /> Clear
            </button>
          </div>
        </animated.div>
        )}
        
        {/* Journal Panel - Visible when journals tab is active */}
        {activeTabs.includes('journals') && (
        <animated.div 
          className={styles.expandedContent}
          style={journalSpring}
        >
          <div className={styles.expandedHeader}>
            <div className={styles.journalHeaderTop}>
              <h3 className={styles.journalTitle}>DEV NOTES{selectedProject ? ` - ${selectedProject.title.toUpperCase()}` : ''}</h3>
            </div>
            
            <div className={styles.noteControls}>
              <div className={styles.quickNoteActions}>
              </div>
              <div className={styles.quickNoteActions}>
                {showNotesList ? (
                  <>
                    <button 
                      className={styles.editToggleBtn}
                      onClick={handleCreateNewNote}
                      title="Create new note"
                    >
                      ➕ New Note
                    </button>
                    
                    {/* View switcher for to-sort vs organized notes */}
                    <div className={styles.viewSwitcher}>
                      <button 
                        className={`${styles.viewBtn} ${currentNotesView === 'to-sort' ? styles.active : ''}`}
                        onClick={() => setCurrentNotesView('to-sort')}
                        title="View notes waiting to be organized"
                      >
                        📥 To-Sort ({toSortNotes.length})
                      </button>
                      <button 
                        className={`${styles.viewBtn} ${currentNotesView === 'organized' ? styles.active : ''}`}
                        onClick={() => setCurrentNotesView('organized')}
                        title="View organized notes"
                      >
                        📂 Organized ({organizedNotes.length})
                      </button>
                    </div>
                    
                    {/* Project filter for organized notes */}
                    {currentNotesView === 'organized' && (
                      <div className={styles.projectFilter}>
                        <select 
                          value={selectedOrganizedProject}
                          onChange={(e) => setSelectedOrganizedProject(e.target.value)}
                          className={styles.projectSelect}
                          title="Filter organized notes by project"
                        >
                          <option value="all">All Projects</option>
                          <option value="general">General</option>
                          {projects.map(project => (
                            <option key={project.id} value={project.id}>
                              {project.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <button 
                    className={styles.editToggleBtn}
                    onClick={handleBackToNotesList}
                    title="Back to notes list"
                  >
                    ← Back to Notes
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className={styles.expandedBody}>
            {showProjectWizard ? (
              <ProjectWizard
                onCancel={handleWizardCancel}
                onSuccess={handleWizardSuccess}
              />
            ) : isEditingNote ? (
              <NoteCard
                claudeInstructions={claudeInstructions}
                noteContent={currentNote}
                onSave={handleSaveToToSort}
                onCancel={() => {
                  setCurrentNote('')
                  setClaudeInstructions('')
                  setSelectedNoteProject('')
                  setIsEditingNote(false)
                }}
                onClaudeInstructionsChange={setClaudeInstructions}
                onNoteContentChange={setCurrentNote}
                isEditing={isEditingNote}
                context={selectedProject ? selectedProject.title : 'General'}
                selectedProject={selectedNoteProject}
                onProjectChange={setSelectedNoteProject}
                projects={projects}
              />
            ) : isSelectingNote ? (
              <div className={styles.noteSelectionContainer}>
                <div className={styles.noteSelectionHeader}>
                  <h4 className={styles.noteSelectionTitle}>Select Note to Edit</h4>
                  <button 
                    className={styles.editToggleBtn}
                    onClick={handleCancelNoteSelection}
                    title="Cancel note selection"
                  >
                    ❌ Cancel
                  </button>
                </div>
                <div className={styles.notesList}>
                  {existingNotes.map((note) => (
                    <div 
                      key={note.id}
                      className={styles.noteItem}
                      onClick={() => handleSelectNote(note)}
                    >
                      <div className={styles.noteItemHeader}>
                        <span className={styles.noteItemTitle}>{note.title}</span>
                        <span className={styles.noteItemDate}>{note.date}</span>
                      </div>
                      <div className={styles.noteItemPreview}>
                        {note.preview}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : showNotesList ? (
              // Default to showing notes list
              <div className={styles.toSortCard}>
                <div className={styles.toSortHeader}>
                  <h3 className={styles.toSortTitle}>📁 TO-SORT FOLDER</h3>
                  <div className={styles.toSortMeta}>
                    <span className={styles.toSortCount}>{toSortNotes.length} notes</span>
                  </div>
                </div>
                
                <div className={styles.notesContent}>
                  {currentNotesView === 'to-sort' ? (
                    <div className={styles.toSortContent}>
                      <div className={styles.toSortDescription}>
                        <p>Notes are saved here for quick capture. Use the organize button to generate a Claude prompt for sorting them into project folders.</p>
                      </div>
                      
                      <div className={styles.organizeButtonContainer}>
                        <button 
                          className={styles.organizeBtn}
                          onClick={handleOrganizeNotes}
                          title="Generate Claude prompt to organize all unsorted notes"
                        >
                          🗂️ Copy Organize Prompt
                        </button>
                      </div>
                      
                      <div className={styles.notesList}>
                        {toSortNotes.length === 0 ? (
                          <div className={styles.emptyState}>
                            <div className={styles.emptyStateIcon}>📝</div>
                            <p className={styles.emptyStateText}>No notes in TO-SORT folder</p>
                            <p className={styles.emptyStateSubtext}>Click "New Note" to create your first note</p>
                          </div>
                        ) : (
                          toSortNotes.map((note) => (
                      <div 
                        key={note.id}
                        className={styles.noteItem}
                      >
                        <div className={styles.noteItemHeader}>
                          <span 
                            className={styles.noteItemTitle}
                            onClick={() => handleEditToSortNote(note)}
                          >
                            {note.saved ? '💾' : '⚠️'} {note.title}
                          </span>
                          <div className={styles.noteItemActions}>
                            <span className={styles.noteItemDate}>{note.date}</span>
                            <span 
                              className={styles.saveStatus}
                              title={note.saved ? 'Saved to file' : 'In memory only - will be lost on refresh'}
                            >
                              {note.saved ? '✅' : '🟡'}
                            </span>
                            <button
                              className={styles.deleteNoteBtn}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteNote(note.id, note.title)
                              }}
                              title="Delete this note"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div 
                          className={styles.noteItemPreview}
                          onClick={() => handleEditToSortNote(note)}
                        >
                          {note.preview}
                        </div>
                        <div className={styles.noteItemProject}>
                          <span className={styles.noteProjectTag}>
                            {note.project === 'General' ? '🌐 General' : `📁 ${note.project}`}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                </div>
                    ) : (
                      <div className={styles.organizedContent}>
                        <div className={styles.organizedDescription}>
                          <p>Notes that have been organized and moved to project-specific folders. These are finalized notes ready for reference.</p>
                        </div>
                        
                        <div className={styles.notesList}>
                          {organizedNotes.length === 0 ? (
                            <div className={styles.emptyState}>
                              <div className={styles.emptyStateIcon}>🗂️</div>
                              <p className={styles.emptyStateText}>
                                {selectedOrganizedProject === 'all' 
                                  ? 'No organized notes found' 
                                  : `No organized notes for ${projects.find(p => p.id === selectedOrganizedProject)?.title || 'selected project'}`
                                }
                              </p>
                              <p className={styles.emptyStateSubtext}>
                                {selectedOrganizedProject === 'all'
                                  ? 'Organize notes from the TO-SORT folder to see them here'
                                  : 'Change project filter or organize notes for this project'
                                }
                              </p>
                            </div>
                          ) : (
                            organizedNotes.map((note) => (
                              <div 
                                key={note.id}
                                className={styles.noteItem}
                              >
                                <div className={styles.noteItemHeader}>
                                  <span className={styles.noteItemTitle}>
                                    📋 {note.title}
                                  </span>
                                  <div className={styles.noteItemActions}>
                                    <span className={styles.noteItemDate}>{note.date}</span>
                                    <span className={styles.noteItemPath} title={`File: ${note.filePath}`}>
                                      📁 {note.folder}
                                    </span>
                                  </div>
                                </div>
                                <div className={styles.noteItemPreview}>
                                  {note.preview}
                                </div>
                                <div className={styles.noteItemProject}>
                                  <span className={styles.noteProjectTag}>
                                    {note.project === 'General' ? '🌐 General' : `📁 ${note.project}`}
                                  </span>
                                  {note.folder && (
                                    <span className={styles.noteFolderTag}>
                                      🗂️ {note.folder}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
              </div>
            ) : (
              // Note editing interface
              <NoteCard
                claudeInstructions={claudeInstructions}
                noteContent={currentNote}
                onSave={() => {
                  handleSaveToToSort()
                  handleBackToNotesList()
                  loadToSortNotes() // Refresh the list
                }}
                onCancel={handleBackToNotesList}
                onClaudeInstructionsChange={setClaudeInstructions}
                onNoteContentChange={setCurrentNote}
                isEditing={true}
                context={selectedProject ? selectedProject.title : 'General'}
                selectedProject={selectedNoteProject}
                onProjectChange={setSelectedNoteProject}
                projects={projects}
              />
            )}
          </div>
        </animated.div>
        )}
        
      </div>
    </animated.div>
  )
}