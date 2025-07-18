import React, { useState, useEffect, useRef } from 'react'
import styles from './NoteCard.module.css'

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
  const instructionsRef = useRef<HTMLTextAreaElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea function
  const handleTextareaResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = Math.max(textarea.scrollHeight, 60) + 'px'
  }

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

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  return (
    <div className={styles.cardContainer}>
      <div className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}>
        {/* Front of card - Note Editor */}
        <div className={styles.cardFront}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>QUICK NOTE</h3>
            <div className={styles.cardContext}>
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
                  placeholder="Optional: Instructions for Claude when organizing this note..."
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
              className={styles.actionBtn}
              onClick={handleFlip}
              title="Preview note format"
            >
              <span className={styles.actionIcon}>👁️</span>
              <span className={styles.actionText}>Preview</span>
            </button>
            <button
              className={`${styles.actionBtn} ${styles.saveBtn}`}
              onClick={onSave}
              title="Save to to-sort folder"
              disabled={!noteContent.trim()}
            >
              <span className={styles.actionIcon}>💾</span>
              <span className={styles.actionText}>Save</span>
            </button>
            <button
              className={`${styles.actionBtn} ${styles.cancelBtn}`}
              onClick={onCancel}
              title="Cancel and clear"
            >
              <span className={styles.actionIcon}>❌</span>
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
              className={styles.actionBtn}
              onClick={handleFlip}
              title="Back to editing"
            >
              <span className={styles.actionIcon}>✏️</span>
              <span className={styles.actionText}>Edit</span>
            </button>
            <button
              className={`${styles.actionBtn} ${styles.saveBtn}`}
              onClick={onSave}
              title="Save to to-sort folder"
              disabled={!noteContent.trim()}
            >
              <span className={styles.actionIcon}>💾</span>
              <span className={styles.actionText}>Save</span>
            </button>
            <button
              className={`${styles.actionBtn} ${styles.cancelBtn}`}
              onClick={onCancel}
              title="Cancel and clear"
            >
              <span className={styles.actionIcon}>❌</span>
              <span className={styles.actionText}>Cancel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Organize Notes Card */}
      <div className={styles.organizeCard}>
        <div className={styles.organizeHeader}>
          <h4 className={styles.organizeTitle}>📁 TO-SORT FOLDER</h4>
        </div>
        <div className={styles.organizeContent}>
          <p className={styles.organizeText}>
            Notes are saved to a to-sort folder for quick capture. 
            Use the organize button to generate a Claude prompt 
            that will sort all notes into appropriate project folders.
          </p>
        </div>
      </div>
    </div>
  )
}

export default NoteCard