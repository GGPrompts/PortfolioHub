import React, { useState, useEffect } from 'react'
import { Project } from '../../store/portfolioStore'
import { isVSCodeEnvironment, executeCommand, showNotification, openInBrowser } from '../../utils/vsCodeIntegration'
import SvgIcon from '../SvgIcon'
import GitUpdateButton from '../GitUpdateButton'
import styles from './EnhancedProjectViewer.module.css'

interface EnhancedProjectViewerProps {
  project: Project
  onClose: () => void
}

const EnhancedProjectViewer: React.FC<EnhancedProjectViewerProps> = ({ project, onClose }) => {
  const [isRunning, setIsRunning] = useState(false)
  const [actualPort, setActualPort] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'readme' | 'claude' | 'commands'>('overview')
  const [readmeContent, setReadmeContent] = useState('')
  const [claudeContent, setClaudeContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Check project status
  useEffect(() => {
    if (project.displayType === 'external') {
      if (isVSCodeEnvironment() && (window as any).vsCodePortfolio?.projectData) {
        const vsCodeProjects = (window as any).vsCodePortfolio.projectData.projects || []
        const vsCodeProject = vsCodeProjects.find((p: any) => p.id === project.id)
        
        if (vsCodeProject) {
          const running = vsCodeProject.status === 'active'
          const port = vsCodeProject.actualPort || vsCodeProject.localPort || project.localPort
          setIsRunning(running)
          setActualPort(running ? port : null)
        }
      }
    }
  }, [project])

  // Load README.md and CLAUDE.md when tabs are selected
  useEffect(() => {
    const loadContent = async () => {
      if (activeTab === 'readme') {
        setIsLoading(true)
        try {
          // In a real implementation, this would fetch from the file system
          // For now, we'll use placeholder content
          setReadmeContent(`# ${project.title}

${project.description}

## Features
- Modern and responsive design
- Built with ${project.tech.join(', ')}
- Easy to customize and extend

## Technologies
${project.tech.map(t => `- ${t}`).join('\n')}

## Getting Started
\`\`\`bash
npm install
${project.buildCommand || 'npm run dev'}
\`\`\`

Visit http://localhost:${project.localPort || '3000'}

## Project Structure
\`\`\`
${project.id}/
├── src/
│   ├── components/
│   ├── styles/
│   └── App.tsx
├── package.json
└── README.md
\`\`\``)
        } catch (error) {
          setReadmeContent('Failed to load README.md')
        }
        setIsLoading(false)
      } else if (activeTab === 'claude') {
        setIsLoading(true)
        try {
          // In a real implementation, this would fetch from the file system
          setClaudeContent(`# Claude Instructions for ${project.title}

## Project Context
This is a ${project.tech.join(', ')} project that ${project.description.toLowerCase()}.

## Key Files
- src/App.tsx - Main application component
- src/components/ - Reusable components
- src/styles/ - Styling files

## Development Guidelines
- Follow React best practices
- Use TypeScript for type safety
- Keep components modular and reusable
- Write clear, self-documenting code

## Common Tasks
1. Adding new features
2. Updating styles
3. Fixing bugs
4. Performance optimization

## Notes
- The project uses ${project.buildCommand || 'npm run dev'} for development
- Default port is ${project.localPort || 3000}
- Check package.json for all available scripts`)
        } catch (error) {
          setClaudeContent('Failed to load CLAUDE.md')
        }
        setIsLoading(false)
      }
    }
    
    loadContent()
  }, [activeTab, project])

  const handleStartServer = async () => {
    const projectPath = isVSCodeEnvironment() && (window as any).vsCodePortfolio?.portfolioPath 
      ? `${(window as any).vsCodePortfolio.portfolioPath}\\projects\\${project.id}`
      : `D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${project.id}`
    
    const command = `cd "${projectPath}" && ${project.buildCommand || 'npm run dev'}`
    
    if (isVSCodeEnvironment()) {
      await executeCommand(command, `Start ${project.title}`)
      showNotification(`Starting ${project.title}...`, 'info')
    } else {
      await navigator.clipboard.writeText(command)
      alert(`Start command copied to clipboard!`)
    }
  }

  const handleKillServer = async () => {
    if (!actualPort) return
    
    const command = isVSCodeEnvironment() 
      ? `$proc = Get-NetTCPConnection -LocalPort ${actualPort} -ErrorAction SilentlyContinue | Select-Object -First 1; if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }`
      : `taskkill /F /PID (Get-NetTCPConnection -LocalPort ${actualPort} | Select-Object -ExpandProperty OwningProcess)`
    
    if (isVSCodeEnvironment()) {
      await executeCommand(command, `Kill ${project.title}`)
      showNotification(`Stopping ${project.title}...`, 'info')
    } else {
      await navigator.clipboard.writeText(command)
      alert(`Kill command copied to clipboard!`)
    }
  }

  const handleOpenInBrowser = () => {
    if (actualPort) {
      const url = `http://localhost:${actualPort}`
      openInBrowser(url)
    }
  }

  const projectCommands = [
    {
      name: 'Start Development Server',
      command: `cd projects/${project.id} && ${project.buildCommand || 'npm run dev'}`,
      description: 'Start the development server',
      icon: 'play' as const
    },
    {
      name: 'Install Dependencies',
      command: `cd projects/${project.id} && npm install`,
      description: 'Install all project dependencies',
      icon: 'package' as const
    },
    {
      name: 'Build for Production',
      command: `cd projects/${project.id} && npm run build`,
      description: 'Create production build',
      icon: 'box' as const
    },
    {
      name: 'Run Tests',
      command: `cd projects/${project.id} && npm test`,
      description: 'Run project tests',
      icon: 'checkCircle' as const
    }
  ]

  return (
    <div className={styles.enhancedProjectViewer}>
      {/* Header */}
      <div className={styles.viewerHeader}>
        <div className={styles.headerInfo}>
          <button onClick={onClose} className={styles.backButton}>
            <SvgIcon name="arrowLeft" size={20} />
            Back to Projects
          </button>
          <div className={styles.projectTitle}>
            <h2>{project.title}</h2>
            <div className={styles.statusBadge}>
              <span className={`${styles.statusDot} ${isRunning ? styles.running : ''}`}></span>
              {isRunning ? `Running on port ${actualPort}` : 'Not Running'}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          {!isRunning ? (
            <button onClick={handleStartServer} className={styles.btnPrimary}>
              <SvgIcon name="play" size={16} />
              Start Server
            </button>
          ) : (
            <>
              <button onClick={handleOpenInBrowser} className={styles.btnSecondary}>
                <SvgIcon name="externalLink" size={16} />
                Open in Browser
              </button>
              <button onClick={handleKillServer} className={styles.btnDanger}>
                <SvgIcon name="stop" size={16} />
                Stop Server
              </button>
            </>
          )}
          <GitUpdateButton 
            type="project" 
            projectId={project.id}
            projectName={project.title}
            size="small" 
            variant="primary"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.viewerTabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <SvgIcon name="info" size={16} />
          Overview
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'readme' ? styles.active : ''}`}
          onClick={() => setActiveTab('readme')}
        >
          <SvgIcon name="fileText" size={16} />
          README
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'claude' ? styles.active : ''}`}
          onClick={() => setActiveTab('claude')}
        >
          <SvgIcon name="brain" size={16} />
          CLAUDE.md
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'commands' ? styles.active : ''}`}
          onClick={() => setActiveTab('commands')}
        >
          <SvgIcon name="terminal" size={16} />
          Commands
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.viewerContent}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className={styles.overviewContent}>
                <section className={styles.section}>
                  <h3>Description</h3>
                  <p>{project.description}</p>
                </section>
                
                <section className={styles.section}>
                  <h3>Technologies</h3>
                  <div className={styles.techStack}>
                    {project.tech.map(tech => (
                      <span key={tech} className={styles.techBadge}>{tech}</span>
                    ))}
                  </div>
                </section>
                
                <section className={styles.section}>
                  <h3>Project Details</h3>
                  <div className={styles.detailsGrid}>
                    <div className={styles.detailItem}>
                      <strong>Type</strong>
                      <span>{project.displayType}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <strong>Port</strong>
                      <span>{project.localPort || 'N/A'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <strong>Build Command</strong>
                      <span>{project.buildCommand || 'npm run dev'}</span>
                    </div>
                    {project.repository && (
                      <div className={styles.detailItem}>
                        <strong>Repository</strong>
                        <a href={project.repository} target="_blank" rel="noopener noreferrer">
                          <SvgIcon name="github" size={16} />
                          View on GitHub
                        </a>
                      </div>
                    )}
                  </div>
                </section>

                {project.thumbnail && (
                  <section className={styles.section}>
                    <h3>Preview</h3>
                    <div className={styles.previewImage}>
                      <img src={project.thumbnail} alt={`${project.title} preview`} />
                    </div>
                  </section>
                )}
              </div>
            )}
            
            {activeTab === 'readme' && (
              <div className={styles.markdownContent}>
                <pre>{readmeContent}</pre>
              </div>
            )}
            
            {activeTab === 'claude' && (
              <div className={styles.markdownContent}>
                <pre>{claudeContent}</pre>
              </div>
            )}
            
            {activeTab === 'commands' && (
              <div className={styles.commandsContent}>
                {projectCommands.map((cmd, index) => (
                  <div key={index} className={styles.commandItem}>
                    <div className={styles.commandHeader}>
                      <div className={styles.commandInfo}>
                        <SvgIcon name={cmd.icon} size={20} />
                        <div>
                          <h4>{cmd.name}</h4>
                          <p>{cmd.description}</p>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          const projectPath = isVSCodeEnvironment() && (window as any).vsCodePortfolio?.portfolioPath 
                            ? `${(window as any).vsCodePortfolio.portfolioPath}\\`
                            : `D:\\ClaudeWindows\\claude-dev-portfolio\\`
                          
                          const fullCommand = `cd "${projectPath}" && ${cmd.command}`
                          
                          if (isVSCodeEnvironment()) {
                            await executeCommand(fullCommand, cmd.name)
                            showNotification(`Executing: ${cmd.name}`, 'info')
                          } else {
                            await navigator.clipboard.writeText(fullCommand)
                            alert('Command copied to clipboard!')
                          }
                        }}
                        className={styles.btnExecute}
                      >
                        <SvgIcon name="play" size={14} />
                        Execute
                      </button>
                    </div>
                    <code className={styles.commandCode}>{cmd.command}</code>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default EnhancedProjectViewer
