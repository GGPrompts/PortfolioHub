import React, { useState, useEffect, useRef } from 'react'
import styles from './NoteCard.module.css'
import SvgIcon from './SvgIcon'
import { copyToClipboard as copyText } from '../utils/vsCodeIntegration'

interface NoteCardProps {
  claudeInstructions: string
  noteContent: string
  onSave: () => void
  onCancel: () => void
  onClaudeInstructionsChange: (value: string) => void
  onNoteContentChange: (value: string) => void
  isEditing: boolean
  context?: string
  selectedProject?: string
  onProjectChange: (projectId: string) => void
  projects?: any[]
}

const NoteCard: React.FC<NoteCardProps> = ({
  claudeInstructions,
  noteContent,
  onSave,
  onCancel,
  onClaudeInstructionsChange,
  onNoteContentChange,
  isEditing,
  context = 'General',
  selectedProject = '',
  onProjectChange,
  projects = []
}) => {
  const [isFlipped, setIsFlipped] = useState(false)
  const [noteType, setNoteType] = useState('general')
  const instructionsRef = useRef<HTMLTextAreaElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  // Note type templates
  const noteTypes = {
    general: {
      label: 'General Note',
      instructions: 'Optional: Instructions for Claude when organizing this note...'
    },
    claude_md: {
      label: 'Add to CLAUDE.md',
      instructions: 'Add this information to the project CLAUDE.md file with proper formatting'
    },
    commands: {
      label: 'Add to Commands',
      instructions: 'Add this as a command or script to the .claude/Commands directory'
    },
    bug_fix: {
      label: 'Bug Fix',
      instructions: 'This is a bug report. Help implement the fix described in the note'
    },
    visual_adjustment: {
      label: 'Visual/UI Adjustment',
      instructions: 'This is a visual or UI improvement. Help implement the styling changes'
    },
    feature_request: {
      label: 'Feature Request',
      instructions: 'This is a new feature request. Help plan and implement the feature'
    },
    research: {
      label: 'Research Topic',
      instructions: 'Research this topic and provide implementation suggestions'
    },
    refactor: {
      label: 'Code Refactor',
      instructions: 'Help refactor the code described in this note for better structure'
    }
  }

  // Auto-resize textarea function
  const handleTextareaResize = (textarea: HTMLTextAreaElement) => {
    const minHeight = textarea === instructionsRef.current ? 50 : 200
    
    // Reset height to allow shrinking
    textarea.style.height = 'auto'
    
    // Use scrollHeight but cap it at a reasonable maximum
    const maxHeight = textarea === instructionsRef.current ? 200 : 400
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
    textarea.style.height = newHeight + 'px'
  }

  // Initial resize on mount to set proper heights and default instructions
  useEffect(() => {
    // Set default instructions if empty
    if (!claudeInstructions.trim()) {
      const defaultType = noteTypes.general
      onClaudeInstructionsChange(defaultType.instructions)
    }
    
    // Small delay to ensure DOM is fully rendered
    setTimeout(() => {
      if (instructionsRef.current) {
        // Set initial height to accommodate placeholder text
        instructionsRef.current.style.height = '50px'
        handleTextareaResize(instructionsRef.current)
      }
      if (noteRef.current) {
        // Set initial height to accommodate placeholder text
        noteRef.current.style.height = '200px'
        handleTextareaResize(noteRef.current)
      }
    }, 50)
  }, []) // Run once on mount

  // Auto-resize on content change
  useEffect(() => {
    if (instructionsRef.current) {
      handleTextareaResize(instructionsRef.current)
    }
  }, [claudeInstructions])

  useEffect(() => {
    if (noteRef.current) {
      handleTextareaResize(noteRef.current)
    }
  }, [noteContent])

  // Handle instructions input change with auto-resize
  const handleInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onClaudeInstructionsChange(e.target.value)
    handleTextareaResize(e.target)
  }

  // Handle note content change with auto-resize
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onNoteContentChange(e.target.value)
    handleTextareaResize(e.target)
  }

  // Handle note type change
  const handleNoteTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value
    setNoteType(newType)
    // Update instructions based on selected type
    const typeConfig = noteTypes[newType as keyof typeof noteTypes]
    if (typeConfig) {
      onClaudeInstructionsChange(typeConfig.instructions)
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  // Generate Claude prompt based on selections
  const generateClaudePrompt = () => {
    const selectedProjectData = projects.find(p => p.id === selectedProject)
    const projectPath = selectedProjectData ? `D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${selectedProjectData.path || selectedProject}` : null
    const typeConfig = noteTypes[noteType as keyof typeof noteTypes]
    
    let prompt = `Here's a note I captured in my development portfolio:\n\n`
    
    if (claudeInstructions.trim()) {
      prompt += `### Claude Instructions\n${claudeInstructions}\n\n`
    }
    
    prompt += `### Note Content\n${noteContent}\n\n`
    
    prompt += `### Context\n`
    prompt += `- **Type**: ${typeConfig.label}\n`
    prompt += `- **Project**: ${selectedProjectData ? selectedProjectData.title : 'General (No Project)'}\n`
    if (projectPath) {
      prompt += `- **Project Path**: ${projectPath}\n`
    }
    prompt += `- **Timestamp**: ${new Date().toISOString()}\n\n`
    
    if (typeConfig.instructions) {
      prompt += `Please help with: ${typeConfig.instructions}`
    }
    
    return prompt
  }

  // Copy prompt to clipboard
  const copyToClipboard = async () => {
    try {
      const prompt = generateClaudePrompt()
      await copyText(prompt)
      // Could add a toast notification here
      console.log('Claude prompt copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      // Fallback: show prompt in alert
      alert('Claude prompt:\n\n' + generateClaudePrompt())
    }
  }

  return (
    <div className={styles.cardContainer}>
      <div className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}>
        {/* Front of card - Note Editor */}
        <div className={styles.cardFront}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>QUICK NOTE</h3>
            <div className={styles.cardContext}>
              <div className={styles.contextRow}>
                <span className={styles.contextLabel}>Project:</span>
                <select
                  className={styles.projectSelect}
                  value={selectedProject}
                  onChange={(e) => onProjectChange(e.target.value)}
                >
                  <option value="">General (No Project)</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.contextRow}>
                <span className={styles.contextLabel}>Type:</span>
                <select
                  className={styles.projectSelect}
                  value={noteType}
                  onChange={handleNoteTypeChange}
                >
                  {Object.entries(noteTypes).map(([key, type]) => (
                    <option key={key} value={key}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={styles.cardContent}>
            <div className={styles.inputSection}>
              <label className={styles.inputLabel}>
                <span className={styles.labelText}>### Claude Instructions</span>
                <textarea
                  ref={instructionsRef}
                  className={styles.instructionsInput}
                  value={claudeInstructions}
                  onChange={handleInstructionsChange}
                  placeholder={noteTypes[noteType as keyof typeof noteTypes]?.instructions || "Optional: Instructions for Claude when organizing this note..."}
                  rows={2}
                />
              </label>
            </div>

            <div className={styles.inputSection}>
              <label className={styles.inputLabel}>
                <span className={styles.labelText}>## Note Content</span>
                <textarea
                  ref={noteRef}
                  className={styles.noteInput}
                  value={noteContent}
                  onChange={handleNoteChange}
                  placeholder="📝 Universal Note Capture

Capture any thought, idea, or reminder instantly:

• 🚀 Quick Capture: Write anything without thinking about organization
• 🧠 Claude Instructions: Add context for future AI organization above
• 🗂️ Smart Sorting: Notes go to a to-sort folder for later organization
• 📋 One-Click Organization: Use the organize button to sort all notes

Perfect for capturing ideas across all your projects!"
                  rows={12}
                  autoFocus
                />
              </label>
            </div>
          </div>

          <div className={styles.cardActions}>
            <button
              className={`${styles.actionBtn} ${styles.copyBtn}`}
              onClick={copyToClipboard}
              title="Copy Claude prompt to clipboard"
              disabled={!noteContent.trim()}
            >
              <SvgIcon name="copy" size={16} />
              <span className={styles.actionText}>Copy Prompt</span>
            </button>
            <button
              className={styles.actionBtn}
              onClick={handleFlip}
              title="Preview note format"
            >
              <SvgIcon name="eye" size={16} />
              <span className={styles.actionText}>Preview</span>
            </button>
            <button
              className={`${styles.actionBtn} ${styles.saveBtn}`}
              onClick={onSave}
              title="Save to to-sort folder"
              disabled={!noteContent.trim()}
            >
              <SvgIcon name="save" size={16} />
              <span className={styles.actionText}>Save</span>
            </button>
            <button
              className={`${styles.actionBtn} ${styles.cancelBtn}`}
              onClick={onCancel}
              title="Cancel and clear"
            >
              <SvgIcon name="x" size={16} />
              <span className={styles.actionText}>Cancel</span>
            </button>
          </div>
        </div>

        {/* Back of card - Note Preview */}
        <div className={styles.cardBack}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>NOTE PREVIEW</h3>
            <div className={styles.cardContext}>
              <span className={styles.contextLabel}>Will be saved as:</span>
              <span className={styles.contextValue}>Markdown</span>
            </div>
          </div>

          <div className={styles.cardContent}>
            <div className={styles.previewSection}>
              <div className={styles.previewContent}>
                <h4 className={styles.previewTitle}>Quick Note - {new Date().toLocaleDateString()}</h4>
                
                {claudeInstructions.trim() && (
                  <div className={styles.previewInstructions}>
                    <h5 className={styles.previewSubtitle}>### Claude Instructions</h5>
                    <p className={styles.previewText}>{claudeInstructions}</p>
                  </div>
                )}
                
                <div className={styles.previewMetadata}>
                  <p><strong>Project:</strong> {selectedProject ? projects.find(p => p.id === selectedProject)?.title || 'Unknown' : 'General (No Project)'}</p>
                  <p><strong>Type:</strong> <span className={styles.noteTag}>{noteTypes[noteType as keyof typeof noteTypes]?.label}</span></p>
                  {selectedProject && (
                    <p><strong>Project Path:</strong> D:\ClaudeWindows\claude-dev-portfolio\projects\{projects.find(p => p.id === selectedProject)?.path || selectedProject}</p>
                  )}
                  <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
                </div>
                
                <div className={styles.previewNote}>
                  <h5 className={styles.previewSubtitle}>## Note</h5>
                  <div className={styles.previewText}>
                    {noteContent.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                </div>
                
                <div className={styles.previewFooter}>
                  <em>Note saved to to-sort folder for later organization</em>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.cardActions}>
            <button
              className={`${styles.actionBtn} ${styles.copyBtn}`}
              onClick={copyToClipboard}
              title="Copy Claude prompt to clipboard"
              disabled={!noteContent.trim()}
            >
              <SvgIcon name="copy" size={16} />
              <span className={styles.actionText}>Copy Prompt</span>
            </button>
            <button
              className={styles.actionBtn}
              onClick={handleFlip}
              title="Back to editing"
            >
              <SvgIcon name="edit" size={16} />
              <span className={styles.actionText}>Edit</span>
            </button>
            <button
              className={`${styles.actionBtn} ${styles.saveBtn}`}
              onClick={onSave}
              title="Save to to-sort folder"
              disabled={!noteContent.trim()}
            >
              <SvgIcon name="save" size={16} />
              <span className={styles.actionText}>Save</span>
            </button>
            <button
              className={`${styles.actionBtn} ${styles.cancelBtn}`}
              onClick={onCancel}
              title="Cancel and clear"
            >
              <SvgIcon name="x" size={16} />
              <span className={styles.actionText}>Cancel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NoteCard