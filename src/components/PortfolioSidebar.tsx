import React, { useState, useEffect } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { usePortfolioStore } from '../store/portfolioStore'
import { checkPort } from '../utils/portManager'
import GitUpdateButton from './GitUpdateButton'
import SvgIcon from './SvgIcon'
import NoteCard from './NoteCard'
import styles from './PortfolioSidebar.module.css'

interface PortfolioSidebarProps {
  onOpenDashboard?: () => void
  onWidthChange?: (width: number) => void
  layoutStrategy?: 'push' | 'overlay'
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
  
  const [journalContent, setJournalContent] = useState<string>('')
  const [isLoadingJournal, setIsLoadingJournal] = useState(false)
  const [projectStatuses, setProjectStatuses] = useState<Map<string, boolean>>(new Map())
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
  
  // Tab-based state management - Array to maintain order
  const [activeTabs, setActiveTabs] = useState<string[]>([])
  
  // Define tab configurations
  const tabs = {
    projects: { width: 320, icon: 'fileText', title: 'Projects' },
    journals: { width: 600, icon: 'edit', title: 'Dev Notes' },
    // Future tabs can be added here: settings, git, etc.
  }

  // All tabs stay attached to the right edge of the total sidebar width (simpler approach)
  const getTabPosition = () => {
    const totalWidth = calculateWidth()
    return totalWidth === 0 ? 0 : totalWidth // All tabs sit at the right edge of the sidebar
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
  
  // Check project statuses
  useEffect(() => {
    const checkStatuses = async () => {
      const statuses = new Map<string, boolean>()
      for (const project of projects) {
        if (project.localPort) {
          const isRunning = await checkPort(project.localPort)
          statuses.set(project.id, isRunning)
        }
      }
      setProjectStatuses(statuses)
    }
    checkStatuses()
    const interval = setInterval(checkStatuses, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [projects])
  
  // Helper functions for DEV NOTES system
  const handleSaveToToSort = () => {
    if (!currentNote.trim()) return
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `note-${timestamp}.md`
    const filePath = `D:\\ClaudeWindows\\claude-dev-portfolio\\notes\\to-sort\\${fileName}`
    
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
    
    let promptText = `Please create a note file at ${filePath} with this content:\n\n${content}`
    
    // If there's a project selected, add project-specific context to the prompt
    if (targetProject) {
      promptText += `\n\nNote: This note is related to the "${targetProject.title}" project located at D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${targetProject.path || targetProject.id}. When organizing this note, you can move it to the project's dev journal or use it to update the project's CLAUDE.md file.`
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(promptText).then(() => {
      alert('Note saved! Claude prompt copied to clipboard.')
      setCurrentNote('')
      setClaudeInstructions('')
      setSelectedNoteProject('')
      setIsEditingNote(false)
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err)
      alert('Note content ready, but clipboard copy failed.')
    })
  }

  const handleOrganizeNotes = () => {
    const promptText = `Please help me organize all the notes in the to-sort folder at D:\\ClaudeWindows\\claude-dev-portfolio\\notes\\to-sort\\

Review each note and:
1. Identify the project or topic it relates to
2. Extract any Claude instructions (marked with ###)
3. Organize notes by project or topic
4. Move relevant notes to appropriate project dev journals
5. Create topic-based folders for general notes
6. Update any CLAUDE.md files with relevant instructions

Please provide a plan for organizing these notes and then execute it.`
    
    navigator.clipboard.writeText(promptText).then(() => {
      alert('Organization prompt copied to clipboard! Paste it in Claude to organize all unsorted notes.')
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err)
      alert('Organization prompt ready, but clipboard copy failed.')
    })
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
  
  
  return (
    <animated.div 
      className={styles.sidebar}
      style={{ width: springProps.width }}
    >
      <div className={styles.sidebarContainer}>
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
              left: `${getTabPosition()}px`,
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
          
          {/* Project List with Collapsible Dropdowns - Separated by Status */}
          <div className={styles.projectList}>
            {/* Online Projects Section */}
            {filteredProjects.some(p => projectStatuses.get(p.id) || false) && (
              <>
                <div className={styles.statusSectionHeader}>
                  <span className={styles.statusIndicator}>🟢</span>
                  <span className={styles.statusLabel}>ONLINE</span>
                </div>
                {filteredProjects.filter(p => projectStatuses.get(p.id) || false).map(project => {
                  const isRunning = projectStatuses.get(project.id) || false
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
                        <span 
                          className={styles.projectTitle}
                          onClick={() => {
                            selectProject(project)
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
                            onClick={() => window.open(`http://localhost:${project.localPort}`, '_blank')}
                            disabled={!isRunning}
                          >
                            🔗 Open in new tab
                          </button>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => {
                              const command = `cd D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.path || project.id}; ${project.buildCommand || 'npm run dev'}`
                              navigator.clipboard.writeText(command)
                              alert(`Start command copied!`)
                            }}
                            disabled={isRunning}
                          >
                            ▶️ Start server
                          </button>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => alert(`To kill ${project.title}, close its terminal window`)}
                            disabled={!isRunning}
                          >
                            ⏹️ Kill server
                          </button>
                        </>
                      )}
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          setSidebarState('expanded')
                          selectProject(project)
                        }}
                      >
                        📓 View journal
                      </button>
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
                          🐙 View on GitHub
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
            {filteredProjects.some(p => !(projectStatuses.get(p.id) || false)) && (
              <>
                <div className={styles.statusSectionHeader}>
                  <span className={styles.statusIndicator}>🔴</span>
                  <span className={styles.statusLabel}>OFFLINE</span>
                </div>
                {filteredProjects.filter(p => !(projectStatuses.get(p.id) || false)).map(project => {
                  const isRunning = projectStatuses.get(project.id) || false
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
                        <span 
                          className={styles.projectTitle}
                          onClick={() => {
                            selectProject(project)
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
                                onClick={() => window.open(`http://localhost:${project.localPort}`, '_blank')}
                                disabled={!isRunning}
                              >
                                🔗 Open in new tab
                              </button>
                              <button
                                className={styles.dropdownItem}
                                onClick={() => {
                                  const command = `cd D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.path || project.id}; ${project.buildCommand || 'npm run dev'}`
                                  navigator.clipboard.writeText(command)
                                  alert(`Start command copied!`)
                                }}
                                disabled={isRunning}
                              >
                                ▶️ Start server
                              </button>
                              <button
                                className={styles.dropdownItem}
                                onClick={() => alert(`To kill ${project.title}, close its terminal window`)}
                                disabled={!isRunning}
                              >
                                ⏹️ Kill server
                              </button>
                            </>
                          )}
                          <button
                            className={styles.dropdownItem}
                            onClick={() => {
                              setSidebarState('expanded')
                              selectProject(project)
                            }}
                          >
                            📓 View journal
                          </button>
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
                              🐙 View on GitHub
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
            <button 
              className={styles.actionBtn}
              onClick={() => {
                const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\start-all-tabbed.ps1'
                navigator.clipboard.writeText(command)
                alert('Start all command copied!')
              }}
              title="Start all projects"
            >
              <SvgIcon name="play" size={16} /> All
            </button>
            <button 
              className={styles.actionBtn}
              onClick={() => {
                const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\kill-all-servers.ps1'
                navigator.clipboard.writeText(command)
                alert('Kill all command copied!')
              }}
              title="Kill all projects"
            >
              <SvgIcon name="stop" size={16} /> Kill
            </button>
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
                <button 
                  className={styles.organizeBtn}
                  onClick={handleOrganizeNotes}
                  title="Generate Claude prompt to organize all unsorted notes"
                >
                  🗂️ Organize Notes
                </button>
              </div>
              <div className={styles.quickNoteActions}>
                <button 
                  className={styles.editToggleBtn}
                  onClick={handleEditExistingNote}
                  title="Edit existing unsorted note"
                >
                  ✏️ Edit Note
                </button>
              </div>
            </div>
          </div>
          
          <div className={styles.expandedBody}>
            {isEditingNote ? (
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
            ) : (
              // Default to new note interface instead of preview
              <NoteCard
                claudeInstructions={claudeInstructions}
                noteContent={currentNote}
                onSave={handleSaveToToSort}
                onCancel={() => {
                  setCurrentNote('')
                  setClaudeInstructions('')
                  setSelectedNoteProject('')
                }}
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