import React, { useEffect } from 'react'
import { animated } from '@react-spring/web'
import NoteCard from '../NoteCard'
import ProjectWizard from '../ProjectWizard'
import styles from '../PortfolioSidebar.module.css'
import { isVSCodeEnvironment, copyToClipboard, showNotification, saveFile, deleteFile } from '../../utils/vsCodeIntegration'

interface Project {
  id: string
  title: string
  path?: string
}

interface DevNotesProps {
  isActive: boolean
  journalSpring: any
  selectedProject: Project | null
  projects: Project[]
  // Dev Notes state from hooks
  currentNote: string
  setCurrentNote: (note: string) => void
  claudeInstructions: string
  setClaudeInstructions: (instructions: string) => void
  isEditingNote: boolean
  setIsEditingNote: (editing: boolean) => void
  isSelectingNote: boolean
  setIsSelectingNote: (selecting: boolean) => void
  existingNotes: any[]
  setExistingNotes: (notes: any[]) => void
  selectedNoteId: string | null
  setSelectedNoteId: (id: string | null) => void
  selectedNoteProject: string
  setSelectedNoteProject: (project: string) => void
  showNotesList: boolean
  setShowNotesList: (show: boolean) => void
  toSortNotes: any[]
  setToSortNotes: (notes: any[]) => void
  organizedNotes: any[]
  setOrganizedNotes: (notes: any[]) => void
  currentNotesView: 'to-sort' | 'organized'
  setCurrentNotesView: (view: 'to-sort' | 'organized') => void
  selectedOrganizedProject: string
  setSelectedOrganizedProject: (project: string) => void
  // Project wizard state
  showProjectWizard: boolean
  setShowProjectWizard: (show: boolean) => void
}

export default function DevNotes({
  isActive,
  journalSpring,
  selectedProject,
  projects,
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
  setSelectedOrganizedProject,
  showProjectWizard,
  setShowProjectWizard
}: DevNotesProps) {

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
      // Check if we're in VS Code and use the unified architecture
      if (isVSCodeEnvironment()) {
        const filePath = `notes/to-sort/${fileName}`
        await saveFile(filePath, content)
        
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
        // TODO: Implement file listing through environment bridge
        // For now, start with empty array - this will be enhanced in unified architecture
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
        // TODO: Implement organized notes loading through environment bridge
        // For now, start with empty array - this will be enhanced in unified architecture
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
    if (isActive) {
      loadToSortNotes()
      loadOrganizedNotes(selectedOrganizedProject)
    }
  }, [isActive, selectedOrganizedProject])

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

  if (!isActive) return null

  return (
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
  )
}