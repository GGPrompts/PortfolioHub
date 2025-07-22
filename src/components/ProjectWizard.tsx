import React, { useState, useEffect } from 'react'
import { usePortfolioStore } from '../store/portfolioStore'
import SvgIcon from './SvgIcon'
import styles from './ProjectWizard.module.css'
import { isVSCodeEnvironment, executeCommand, showNotification, copyToClipboard } from '../utils/vsCodeIntegration'

interface ProjectWizardProps {
  onCancel: () => void
  onSuccess: (projectId: string) => void
}

interface WizardFormData {
  projectName: string
  projectType: '2d' | '3d'
  controlSystem: 'orbit' | 'fps' | 'fly' | 'gallery'
  description: string
  port: number
}

const ProjectWizard: React.FC<ProjectWizardProps> = ({ onCancel, onSuccess }) => {
  const { projects } = usePortfolioStore()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<WizardFormData>({
    projectName: '',
    projectType: '2d',
    controlSystem: 'orbit',
    description: '',
    port: 0
  })

  // Calculate next available port
  useEffect(() => {
    const usedPorts = projects
      .map(p => p.localPort)
      .filter(Boolean)
      .sort((a, b) => a! - b!)
    
    let nextPort = 3006
    while (usedPorts.includes(nextPort)) {
      nextPort++
    }
    setFormData(prev => ({ ...prev, port: nextPort }))
  }, [projects])

  const handleInputChange = (field: keyof WizardFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.projectName.trim()) {
          setError('Project name is required')
          return false
        }
        if (!/^[a-zA-Z0-9-]+$/.test(formData.projectName)) {
          setError('Project name can only contain letters, numbers, and hyphens')
          return false
        }
        if (projects.some(p => p.id === formData.projectName.toLowerCase())) {
          setError('A project with this name already exists')
          return false
        }
        return true
      case 2:
        return true // Type is always valid (radio selection)
      case 3:
        return true // Control system is always valid for 3D (or skipped for 2D)
      case 4:
        return true // Description is optional
      case 5:
        return formData.port > 0 && formData.port < 65536
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 2 && formData.projectType === '2d') {
        setCurrentStep(4) // Skip control system for 2D
      } else if (currentStep < 6) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const prevStep = () => {
    if (currentStep === 4 && formData.projectType === '2d') {
      setCurrentStep(2) // Skip control system for 2D when going back
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const generateClaudePrompt = async () => {
    const projectTypeSpecific = formData.projectType === '3d' 
      ? `This will be a Three.js 3D experience using ${formData.controlSystem} controls.

Available control options:
- Orbit: Best for viewing 3D objects/scenes from all angles
- FPS: First-person perspective, great for games/walkthroughs  
- Fly: Free flight movement, perfect for open worlds/space
- Gallery: Fixed viewpoints, ideal for presentations/showcases`
      : 'This will be a React-based web application.'

    const prompt = `I'm creating a new ${formData.projectType.toUpperCase()} project called "${formData.projectName}" for my development portfolio.

Project Type: ${formData.projectType.toUpperCase()}
${projectTypeSpecific}

Please help me:
1. Refine my project concept
2. Suggest key features and functionality
3. Recommend the tech stack additions
4. Outline the initial architecture
5. Identify potential challenges

My initial idea:
[Paste your project idea here]

What specific functionality are you envisioning? What problem does this solve or what experience does it create?`

    if (isVSCodeEnvironment()) {
      await copyToClipboard(prompt)
      showNotification('Claude prompt ready for implementation guidance!')
    } else {
      try {
        await copyToClipboard(prompt)
        alert('Claude prompt copied to clipboard! Paste this in a Claude chat to get AI suggestions for your project.')
      } catch (error) {
        alert('Failed to copy to clipboard. Please manually copy the prompt from the browser console.')
        console.log('Claude Prompt:', prompt)
      }
    }
  }

  const createProject = async () => {
    if (!validateStep(6)) return

    setIsCreating(true)
    setError(null)

    try {
      // Build PowerShell script arguments
      const scriptArgs = [
        `-ProjectName "${formData.projectName}"`,
        `-Type "${formData.projectType}"`,
        formData.projectType === '3d' ? `-ControlSystem "${formData.controlSystem}"` : '',
        formData.description ? `-Description "${formData.description}"` : '',
        `-Port ${formData.port}`
      ].filter(Boolean).join(' ')

      const command = `cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\create-project-enhanced.ps1 ${scriptArgs}`
      
      // Copy command to clipboard for user to execute
      if (isVSCodeEnvironment()) {
        await executeCommand(command, 'Create Project')
      } else {
        await copyToClipboard(command)
      }
      
      // Show success with more detailed instructions
      setSuccess(`✅ Project creation command ready!

The following PowerShell command has been copied to your clipboard:

${command}

📋 Next Steps:
1. Open PowerShell as Administrator (recommended)
2. Paste and run the copied command
3. Wait for the script to complete (installs dependencies & sets up git)
4. Refresh your portfolio browser tab to see the new project
5. Click "Dashboard" to check if your project is running

🎯 Your project will be created at:
D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${formData.projectName.toLowerCase()}

🌐 Development server will be configured for port ${formData.port}

💡 Tip: The script automatically updates your portfolio manifest and port manager!`)
      
      // Note: Direct PowerShell execution from browser is restricted for security.
      // Users must manually run the command in PowerShell.
      // In an Electron app, you could use child_process to execute directly.
      
    } catch (err) {
      setError(`Failed to copy command to clipboard. Please manually copy this command:

cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\create-project-enhanced.ps1 ${scriptArgs}`)
      console.error('Project creation error:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>
              <SvgIcon name="fileText" size={20} />
              Project Name
            </h3>
            <p className={styles.stepDescription}>
              Choose a unique name for your project. Use only letters, numbers, and hyphens.
            </p>
            <input
              type="text"
              className={styles.projectInput}
              placeholder="my-awesome-project"
              value={formData.projectName}
              onChange={(e) => handleInputChange('projectName', e.target.value)}
              autoFocus
            />
            <div className={styles.inputHint}>
              This will be used as the folder name and project ID
            </div>
          </div>
        )

      case 2:
        return (
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>
              <SvgIcon name="layers" size={20} />
              Project Type
            </h3>
            <p className={styles.stepDescription}>
              What type of project are you building?
            </p>
            <div className={styles.typeCards}>
              <label className={`${styles.typeCard} ${formData.projectType === '2d' ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="projectType"
                  value="2d"
                  checked={formData.projectType === '2d'}
                  onChange={(e) => handleInputChange('projectType', e.target.value)}
                />
                <div className={styles.typeIcon}>📱</div>
                <div className={styles.typeTitle}>2D React Application</div>
                <div className={styles.typeDescription}>
                  Modern React 18 with TypeScript, Vite for fast development, portfolio integration built-in
                </div>
                <div className={styles.typeUseCase}>Perfect for: Web apps, dashboards, tools, portfolios</div>
              </label>

              <label className={`${styles.typeCard} ${formData.projectType === '3d' ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="projectType"
                  value="3d"
                  checked={formData.projectType === '3d'}
                  onChange={(e) => handleInputChange('projectType', e.target.value)}
                />
                <div className={styles.typeIcon}>🎮</div>
                <div className={styles.typeTitle}>3D Interactive Experience</div>
                <div className={styles.typeDescription}>
                  Three.js + React Three Fiber, choice of control systems, performance monitoring included
                </div>
                <div className={styles.typeUseCase}>Perfect for: Games, visualizations, art, simulations</div>
              </label>
            </div>
          </div>
        )

      case 3:
        return (
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>
              <SvgIcon name="gamepad" size={20} />
              Control System
            </h3>
            <p className={styles.stepDescription}>
              Choose how users will navigate your 3D experience
            </p>
            <div className={styles.controlCards}>
              {[
                {
                  value: 'orbit',
                  icon: '🔄',
                  title: 'Orbit Controls',
                  description: 'Rotate around objects, zoom in/out',
                  useCase: 'Best for viewing 3D objects/scenes from all angles'
                },
                {
                  value: 'fps',
                  icon: '🎯',
                  title: 'FPS Controls',
                  description: 'First-person shooter style movement',
                  useCase: 'Great for games, walkthroughs, exploration'
                },
                {
                  value: 'fly',
                  icon: '✈️',
                  title: 'Fly Controls',
                  description: 'Spaceship-like free movement',
                  useCase: 'Perfect for open worlds, space simulations'
                },
                {
                  value: 'gallery',
                  icon: '🖼️',
                  title: 'Gallery Controls',
                  description: 'Curated viewpoint navigation',
                  useCase: 'Ideal for presentations, showcases'
                }
              ].map((control) => (
                <label key={control.value} className={`${styles.controlCard} ${formData.controlSystem === control.value ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="controlSystem"
                    value={control.value}
                    checked={formData.controlSystem === control.value}
                    onChange={(e) => handleInputChange('controlSystem', e.target.value)}
                  />
                  <div className={styles.controlIcon}>{control.icon}</div>
                  <div className={styles.controlTitle}>{control.title}</div>
                  <div className={styles.controlDescription}>{control.description}</div>
                  <div className={styles.controlUseCase}>{control.useCase}</div>
                </label>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>
              <SvgIcon name="edit" size={20} />
              Project Description
            </h3>
            <p className={styles.stepDescription}>
              Describe your project (optional). This will appear in your portfolio and README.
            </p>
            <textarea
              className={styles.descriptionInput}
              placeholder={formData.projectType === '3d' 
                ? 'A 3D interactive experience built with Three.js and React'
                : 'A new project in the Claude Development Portfolio'
              }
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
            />
            <div className={styles.aiSuggestionSection}>
              <button
                type="button"
                className={styles.aiSuggestionBtn}
                onClick={generateClaudePrompt}
              >
                <SvgIcon name="sparkles" size={16} />
                Get AI Suggestions
              </button>
              <p className={styles.aiSuggestionText}>
                Generate a Claude prompt to get AI suggestions for your project concept
              </p>
            </div>
          </div>
        )

      case 5:
        return (
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>
              <SvgIcon name="server" size={20} />
              Development Port
            </h3>
            <p className={styles.stepDescription}>
              Choose a port for your development server. We've auto-assigned the next available port.
            </p>
            <div className={styles.portSection}>
              <input
                type="number"
                className={styles.portInput}
                value={formData.port}
                onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 0)}
                min="3000"
                max="65535"
              />
              <div className={styles.portHint}>
                Ports 3000-3099 are recommended for development projects
              </div>
            </div>
            <div className={styles.usedPortsList}>
              <h4>Currently used ports:</h4>
              <div className={styles.usedPorts}>
                {projects
                  .filter(p => p.localPort)
                  .sort((a, b) => a.localPort! - b.localPort!)
                  .map(project => (
                    <span key={project.id} className={styles.usedPort}>
                      {project.localPort} - {project.title}
                    </span>
                  ))
                }
              </div>
            </div>
          </div>
        )

      case 6:
        return (
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>
              <SvgIcon name="check" size={20} />
              Review & Create
            </h3>
            <p className={styles.stepDescription}>
              Review your project settings and create your new project.
            </p>
            <div className={styles.reviewSection}>
              <div className={styles.reviewItem}>
                <strong>Project Name:</strong> {formData.projectName}
              </div>
              <div className={styles.reviewItem}>
                <strong>Type:</strong> {formData.projectType === '3d' ? '3D Interactive Experience' : '2D React Application'}
              </div>
              {formData.projectType === '3d' && (
                <div className={styles.reviewItem}>
                  <strong>Control System:</strong> {formData.controlSystem}
                </div>
              )}
              <div className={styles.reviewItem}>
                <strong>Port:</strong> {formData.port}
              </div>
              {formData.description && (
                <div className={styles.reviewItem}>
                  <strong>Description:</strong> {formData.description}
                </div>
              )}
            </div>

            {success && (
              <div className={styles.successMessage}>
                <SvgIcon name="check" size={16} />
                <div className={styles.successContent}>
                  <h4>Project Creation Command Ready!</h4>
                  <p>{success}</p>
                  <div className={styles.successActions}>
                    <button
                      className={styles.successBtn}
                      onClick={async () => {
                        // Try to open PowerShell (Windows only)
                        try {
                          // This only works in certain contexts (like Electron)
                          window.open('ms-windows-store://pdp/?productid=9MZ1SNWT0N5D', '_blank')
                        } catch {
                          // Fallback: copy command again
                          const scriptArgs = [
                            `-ProjectName "${formData.projectName}"`,
                            `-Type "${formData.projectType}"`,
                            formData.projectType === '3d' ? `-ControlSystem "${formData.controlSystem}"` : '',
                            formData.description ? `-Description "${formData.description}"` : '',
                            `-Port ${formData.port}`
                          ].filter(Boolean).join(' ')
                          const createCommand = `cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\create-project-enhanced.ps1 ${scriptArgs}`;
                          if (isVSCodeEnvironment()) {
                            await executeCommand(createCommand, 'Create Project')
                          } else {
                            await copyToClipboard(createCommand)
                          }
                          alert('Command copied again! Open PowerShell manually.')
                        }
                      }}
                      title="Try to open PowerShell (may not work in browser)"
                    >
                      <SvgIcon name="play" size={14} />
                      Open PowerShell
                    </button>
                    <button
                      className={styles.secondarySuccessBtn}
                      onClick={() => onSuccess(formData.projectName.toLowerCase())}
                    >
                      Got it!
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className={styles.errorMessage}>
                <SvgIcon name="alertTriangle" size={16} />
                {error}
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (success && !isCreating) {
    return (
      <div className={styles.wizardContainer}>
        <div className={styles.wizardContent}>
          {renderStepContent()}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wizardContainer}>
      <div className={styles.wizardHeader}>
        <h2 className={styles.wizardTitle}>
          <SvgIcon name="plus" size={24} />
          Create New Project
        </h2>
        <div className={styles.stepIndicator}>
          Step {currentStep} of 6
        </div>
      </div>

      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${(currentStep / 6) * 100}%` }}
        />
      </div>

      <div className={styles.wizardContent}>
        {renderStepContent()}

        {error && (
          <div className={styles.errorMessage}>
            <SvgIcon name="alertTriangle" size={16} />
            {error}
          </div>
        )}
      </div>

      <div className={styles.wizardActions}>
        <button
          className={styles.secondaryBtn}
          onClick={currentStep === 1 ? onCancel : prevStep}
          disabled={isCreating}
        >
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </button>

        {currentStep < 6 ? (
          <button
            className={styles.primaryBtn}
            onClick={nextStep}
            disabled={isCreating}
          >
            Next
            <SvgIcon name="arrowRight" size={16} />
          </button>
        ) : (
          <button
            className={styles.primaryBtn}
            onClick={createProject}
            disabled={isCreating || success}
          >
            {isCreating ? (
              <>
                <div className={styles.spinner} />
                Creating...
              </>
            ) : (
              <>
                <SvgIcon name="rocket" size={16} />
                Create Project
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export default ProjectWizard;