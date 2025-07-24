import React, { useState, useEffect } from 'react'
import { Project } from '../../store/portfolioStore'
import { isVSCodeEnvironment, executeCommand, showNotification, openInBrowser } from '../../utils/vsCodeIntegration'
import { useProjectData } from '../../hooks/useProjectData'
import SvgIcon from '../SvgIcon'
import GitUpdateButton from '../GitUpdateButton'
import LiveProjectPreview from '../LiveProjectPreview'
import styles from './EnhancedProjectViewer.module.css'

interface EnhancedProjectViewerProps {
  project: Project
  onClose: () => void
}

const EnhancedProjectViewer: React.FC<EnhancedProjectViewerProps> = ({ project, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'readme' | 'claude' | 'commands'>('overview')
  const [readmeContent, setReadmeContent] = useState('')
  const [claudeContent, setClaudeContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Use unified project data hook for status detection
  const { getProjectStatus } = useProjectData()
  
  // Get project status using unified architecture
  const isRunning = getProjectStatus(project.id)
  const actualPort = isRunning ? project.localPort : null

  // Helper function to get the actual project file path
  const getProjectFilePath = (filename: string): string => {
    const basePath = 'D:\\ClaudeWindows\\claude-dev-portfolio'
    
    if (project.path === '.') {
      // Portfolio app itself
      return `${basePath}\\${filename}`
    } else if (project.path && project.path.startsWith('../Projects/')) {
      // External projects
      const projectDir = project.path.replace('../Projects/', '')
      return `D:\\ClaudeWindows\\Projects\\${projectDir}\\${filename}`
    } else {
      // Default path structure
      return `${basePath}\\projects\\${project.id}\\${filename}`
    }
  }

  // Load README.md and CLAUDE.md from actual files when tabs are selected
  useEffect(() => {
    const loadContent = async () => {
      if (activeTab === 'readme') {
        setIsLoading(true)
        try {
          const readmePath = getProjectFilePath('README.md')
          
          // In VS Code environment, try to read the actual file
          if (isVSCodeEnvironment()) {
            try {
              // Request file content from VS Code extension
              const fileContent = await new Promise<string>((resolve, reject) => {
                const message = {
                  type: 'read-file',
                  filePath: readmePath,
                  id: `read-${Date.now()}`
                }
                
                // Send message to VS Code extension via global bridge
                if ((window as any).vsCodePortfolio?.sendMessage) {
                  (window as any).vsCodePortfolio.sendMessage(message, (response: any) => {
                    if (response.success && response.content) {
                      resolve(response.content)
                    } else {
                      reject(new Error('File not found or could not be read'))
                    }
                  })
                } else {
                  reject(new Error('VS Code bridge not available'))
                }
              })
              
              setReadmeContent(fileContent)
            } catch (fileError) {
              console.log(`Could not read ${readmePath}, generating content...`)
              // Fall back to generated content
              setReadmeContent(generateReadmeContent())
            }
          } else {
            // Web mode - generate content (file system not accessible)
            setReadmeContent(generateReadmeContent())
          }
        } catch (error) {
          setReadmeContent(`# ${project.title}\n\n*Could not load README.md*\n\nError: ${error}`)
        }
        setIsLoading(false)
      } else if (activeTab === 'claude') {
        setIsLoading(true)
        try {
          const claudePath = getProjectFilePath('CLAUDE.md')
          
          // In VS Code environment, try to read the actual file
          if (isVSCodeEnvironment()) {
            try {
              // Request file content from VS Code extension
              const fileContent = await new Promise<string>((resolve, reject) => {
                const message = {
                  type: 'read-file',
                  filePath: claudePath,
                  id: `read-${Date.now()}`
                }
                
                // Send message to VS Code extension via global bridge
                if ((window as any).vsCodePortfolio?.sendMessage) {
                  (window as any).vsCodePortfolio.sendMessage(message, (response: any) => {
                    if (response.success && response.content) {
                      resolve(response.content)
                    } else {
                      reject(new Error('File not found or could not be read'))
                    }
                  })
                } else {
                  reject(new Error('VS Code bridge not available'))
                }
              })
              
              setClaudeContent(fileContent)
            } catch (fileError) {
              console.log(`Could not read ${claudePath}, generating content...`)
              // Fall back to generated content
              setClaudeContent(generateClaudeContent())
            }
          } else {
            // Web mode - generate content (file system not accessible)
            setClaudeContent(generateClaudeContent())
          }
        } catch (error) {
          setClaudeContent(`# Claude Instructions for ${project.title}\n\n*Could not load CLAUDE.md*\n\nError: ${error}`)
        }
        setIsLoading(false)
      }
    }
    
    loadContent()
  }, [activeTab, project])

  // Generate README content when actual file is not available
  const generateReadmeContent = (): string => {
    const getProjectSpecificFeatures = () => {
            const features = ['Modern and responsive design', `Built with ${project.tech.join(', ')}`]
            
            // Add project-specific features based on tech stack and type
            if (project.tech.includes('React')) {
              features.push('Component-based architecture with hooks')
              features.push('TypeScript support for type safety')
            }
            if (project.tech.includes('Three.js')) {
              features.push('3D graphics and interactive visualizations')
              features.push('WebGL rendering with performance optimization')
            }
            if (project.tech.includes('CSS3')) {
              features.push('Custom CSS animations and transitions')
              features.push('Responsive design for all screen sizes')
            }
            if (project.tech.includes('Vite')) {
              features.push('Fast development server with hot module replacement')
              features.push('Optimized production builds')
            }
            if (project.displayType === 'external') {
              features.push('Standalone web application')
              features.push('Direct browser integration')
            }
            
            return features
          }

          const getProjectStructure = () => {
            if (project.tech.includes('React')) {
              return `${project.id}/
├── src/
│   ├── components/          # React components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── styles/             # CSS/SCSS files
│   ├── assets/             # Images and static files
│   └── App.tsx             # Main application component
├── public/                 # Public assets
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
└── README.md              # This file`
            } else {
              return `${project.id}/
├── src/                   # Source code
├── assets/                # Static assets
├── package.json          # Dependencies and scripts
└── README.md             # Documentation`
            }
          }

    return `# ${project.title}

${project.description}

## ✨ Features
${getProjectSpecificFeatures().map(f => `- ${f}`).join('\n')}

## 🛠️ Technologies
${project.tech.map(t => `- **${t}**`).join('\n')}

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation
\`\`\`bash
# Clone or navigate to project directory
cd ${project.id}

# Install dependencies
npm install

# Start development server
${project.buildCommand || 'npm run dev'}
\`\`\`

### Development Server
The development server will start at:
- **URL**: http://localhost:${project.localPort || '3000'}
- **Hot Reload**: ✅ Enabled
- **TypeScript**: ${project.tech.includes('TypeScript') ? '✅ Enabled' : '❌ Not configured'}

## 📁 Project Structure
\`\`\`
${getProjectStructure()}
\`\`\`

## 🎯 Development Commands
\`\`\`bash
# Development server
${project.buildCommand || 'npm run dev'}

# Production build
npm run build

# Preview production build
npm run preview

# Run tests (if configured)
npm test

# Lint code
npm run lint
\`\`\`

## 🔧 Configuration
- **Port**: ${project.localPort || '3000'}
- **Build Tool**: ${project.tech.includes('Vite') ? 'Vite' : project.tech.includes('Webpack') ? 'Webpack' : 'Standard build tools'}
- **TypeScript**: ${project.tech.includes('TypeScript') ? 'Enabled with strict mode' : 'JavaScript only'}

## 📈 Performance
- Fast development server with hot module replacement
- Optimized production builds with code splitting
- Modern JavaScript features and ES modules
${project.tech.includes('Three.js') ? '- GPU-accelerated 3D rendering' : ''}

## 🤝 Development Notes
This project is part of the Claude Development Portfolio system and integrates with:
- VS Code extension for enhanced development experience
- Unified portfolio interface for project management
- Automated build and deployment workflows

For detailed development instructions, see the CLAUDE.md tab above.`
  }

  // Generate CLAUDE content when actual file is not available
  const generateClaudeContent = (): string => {
          const getProjectSpecificGuidelines = () => {
            const guidelines = []
            
            if (project.tech.includes('React')) {
              guidelines.push('- **React Best Practices**: Use functional components with hooks')
              guidelines.push('- **Component Architecture**: Keep components small and focused on single responsibility')
              guidelines.push('- **State Management**: Use useState for local state, useContext for shared state')
              guidelines.push('- **Props Interface**: Define clear TypeScript interfaces for all component props')
            }
            
            if (project.tech.includes('TypeScript')) {
              guidelines.push('- **Type Safety**: Leverage TypeScript\'s type system to prevent runtime errors')
              guidelines.push('- **Interface Design**: Create comprehensive interfaces for data structures')
              guidelines.push('- **Generic Types**: Use generics for reusable components and utilities')
            }
            
            if (project.tech.includes('Three.js')) {
              guidelines.push('- **3D Performance**: Optimize geometry and materials for smooth rendering')
              guidelines.push('- **Memory Management**: Dispose of Three.js objects properly to prevent leaks')
              guidelines.push('- **Interactive Controls**: Implement intuitive camera and object controls')
            }
            
            if (project.tech.includes('CSS3')) {
              guidelines.push('- **Responsive Design**: Use CSS Grid and Flexbox for layout')
              guidelines.push('- **Animations**: Prefer CSS transitions over JavaScript animations when possible')
              guidelines.push('- **CSS Variables**: Use custom properties for consistent theming')
            }
            
            return guidelines.length > 0 ? guidelines.join('\n') : '- Follow modern web development best practices'
          }

          const getCommonTasks = () => {
            const tasks = []
            
            if (project.tech.includes('React')) {
              tasks.push('## 🧩 Component Development')
              tasks.push('1. **Creating Components**: Use functional components with TypeScript interfaces')
              tasks.push('2. **Hook Implementation**: Leverage useEffect, useState, useCallback appropriately')
              tasks.push('3. **Context Management**: Implement React Context for shared state')
              tasks.push('')
            }
            
            if (project.tech.includes('Three.js')) {
              tasks.push('## 🎮 3D Development')
              tasks.push('1. **Scene Setup**: Configure camera, lighting, and renderer settings')
              tasks.push('2. **Geometry Creation**: Build or import 3D models and optimize for performance')
              tasks.push('3. **Animation System**: Implement smooth animations using Three.js AnimationMixer')
              tasks.push('4. **Interactive Controls**: Add mouse/keyboard controls for 3D navigation')
              tasks.push('')
            }
            
            tasks.push('## 🎨 Styling & UI')
            tasks.push('1. **CSS Architecture**: Organize styles with CSS modules or styled-components')
            tasks.push('2. **Responsive Design**: Ensure compatibility across different screen sizes')
            tasks.push('3. **Accessibility**: Add ARIA labels and keyboard navigation support')
            tasks.push('')
            
            tasks.push('## 🔧 Development Workflow')
            tasks.push('1. **Local Development**: Use hot reload for rapid iteration')
            tasks.push('2. **Testing**: Write unit tests for components and utility functions')
            tasks.push('3. **Performance**: Profile and optimize rendering performance')
            tasks.push('4. **Build Process**: Ensure production builds are optimized')
            
            return tasks.join('\n')
          }

          const getProjectArchitecture = () => {
            if (project.tech.includes('React')) {
              return `## 🏗️ Architecture Overview

### Component Hierarchy
\`\`\`
App.tsx
├── Layout Components
│   ├── Header/Navigation
│   ├── Main Content Area
│   └── Footer (if applicable)
├── Feature Components
│   ├── Business Logic Components
│   ├── UI Components
│   └── Utility Components
└── Shared Components
    ├── Common UI Elements
    ├── Hooks (Custom)
    └── Utils/Helpers
\`\`\`

### State Management
- **Local State**: useState, useReducer for component-specific state
- **Global State**: React Context for app-wide state management
- **External State**: API calls managed through custom hooks`
            } else {
              return `## 🏗️ Architecture Overview

### Project Structure
The project follows standard web development practices with modular organization and clear separation of concerns.`
            }
          }

    return `# Claude Instructions for ${project.title}

## 📋 Project Context
**Type**: ${project.displayType} web application
**Description**: ${project.description}
**Tech Stack**: ${project.tech.join(', ')}
**Port**: ${project.localPort || 'TBD'}
**Build Command**: \`${project.buildCommand || 'npm run dev'}\`

${getProjectArchitecture()}

## 📐 Development Guidelines

${getProjectSpecificGuidelines()}

### Code Quality Standards
- **Clean Code**: Write self-documenting code with meaningful variable names
- **Error Handling**: Implement proper error boundaries and graceful fallbacks
- **Performance**: Optimize for Core Web Vitals and smooth user experience
- **Security**: Validate all user inputs and sanitize data appropriately

## 🛠️ Common Development Tasks

${getCommonTasks()}

## 🚀 Getting Started

### Development Environment Setup
\`\`\`bash
# Navigate to project directory
cd ${project.id}

# Install dependencies
npm install

# Start development server
${project.buildCommand || 'npm run dev'}

# Open in browser
# http://localhost:${project.localPort || '3000'}
\`\`\`

### VS Code Integration
This project integrates with the Claude Development Portfolio system:
- **Portfolio Management**: Access via unified portfolio interface
- **Live Preview**: Real-time preview in VS Code or browser
- **Command Integration**: Execute project commands through VS Code extension

## 🎯 Development Focus Areas

### Current Priorities
1. **Feature Development**: Implement core functionality and user interface
2. **Performance Optimization**: Ensure smooth rendering and interaction
3. **Responsive Design**: Support all device sizes and orientations
4. **Code Quality**: Maintain high standards for maintainability

### Future Enhancements
- Enhanced user experience features
- Performance monitoring and optimization
- Advanced functionality based on user feedback
- Integration with additional tools and services

## 🔍 Debugging & Troubleshooting

### Development Server Issues
- **Port Conflicts**: Check if port ${project.localPort || '3000'} is available
- **Module Errors**: Clear node_modules and reinstall dependencies
- **TypeScript Errors**: Check tsconfig.json configuration

### Common Issues
- **Hot Reload**: Restart development server if hot reload stops working
- **Build Errors**: Check for TypeScript type errors and resolve them
${project.tech.includes('Three.js') ? '- **3D Rendering**: Verify WebGL support and GPU acceleration' : ''}

## 📝 Notes for Claude AI

### When Working on This Project
1. **Context Awareness**: This is part of a larger portfolio system
2. **Integration Points**: Consider how changes affect portfolio integration
3. **Performance Impact**: Monitor bundle size and runtime performance
4. **User Experience**: Prioritize smooth, intuitive interactions

### Helpful Commands
- \`npm run dev\` - Start development server
- \`npm run build\` - Create production build
- \`npm run preview\` - Preview production build locally
- Portfolio system commands available through VS Code extension

---

*This CLAUDE.md file is dynamically generated based on project configuration. For the latest development instructions, check the project's actual CLAUDE.md file if it exists.*`
  }

  // Handle edit button clicks to open files in VS Code
  const handleEditFile = async (filename: string) => {
    const filePath = getProjectFilePath(filename)
    
    if (isVSCodeEnvironment()) {
      try {
        // Open file in VS Code
        await executeCommand(`code "${filePath}"`, `Open ${filename}`)
        showNotification(`Opening ${filename} in VS Code...`, 'info')
      } catch (error) {
        console.error('Failed to open file:', error)
        showNotification(`Failed to open ${filename}`, 'error')
      }
    } else {
      // Web mode - copy file path to clipboard
      await navigator.clipboard.writeText(filePath)
      alert(`File path copied to clipboard: ${filePath}`)
    }
  }

  // Generate Claude prompt to update project documentation
  const handleAskClaudeToUpdate = async (fileType: 'README' | 'CLAUDE') => {
    const filename = fileType === 'README' ? 'README.md' : 'CLAUDE.md'
    const filePath = getProjectFilePath(filename)
    
    const prompt = generateClaudeUpdatePrompt(fileType, filePath)
    
    if (isVSCodeEnvironment()) {
      try {
        // Copy prompt to clipboard and show notification
        await navigator.clipboard.writeText(prompt)
        showNotification(`Claude update prompt copied to clipboard for ${filename}`, 'info')
        
        // Optionally open Claude directly if available
        const claudeCommand = `cd "${getProjectFilePath('')}" && claude`
        await executeCommand(claudeCommand, `Open Claude for ${project.title}`)
      } catch (error) {
        // Fallback to just copying prompt
        await navigator.clipboard.writeText(prompt)
        alert(`Claude prompt copied to clipboard for ${filename}`)
      }
    } else {
      // Web mode - copy prompt to clipboard
      await navigator.clipboard.writeText(prompt)
      alert(`Claude prompt copied to clipboard for ${filename}`)
    }
  }

  // Generate comprehensive Claude prompt for documentation updates
  const generateClaudeUpdatePrompt = (fileType: 'README' | 'CLAUDE', filePath: string): string => {
    const isReadme = fileType === 'README'
    
    return `# ${isReadme ? 'README.md' : 'CLAUDE.md'} Update Request for ${project.title}

## Project Context
- **Name**: ${project.title}
- **Description**: ${project.description}
- **Tech Stack**: ${project.tech.join(', ')}
- **Port**: ${project.localPort}
- **Build Command**: ${project.buildCommand || 'npm run dev'}
- **Project Path**: ${project.path}
- **Display Type**: ${project.displayType}

## File Location
Please update the ${isReadme ? 'README.md' : 'CLAUDE.md'} file at:
\`${filePath}\`

${isReadme ? `## README.md Requirements
Please create a comprehensive README.md that includes:

### Essential Sections
1. **Project Title & Description**
   - Clear, concise project description
   - Key features and capabilities

2. **Installation & Setup**
   - Prerequisites (Node.js version, etc.)
   - Step-by-step installation instructions
   - Environment setup if needed

3. **Usage Instructions**
   - How to start the development server
   - How to access the application (http://localhost:${project.localPort})
   - Basic usage examples

4. **Technology Stack**
   - List all technologies used: ${project.tech.join(', ')}
   - Brief explanation of why each was chosen

5. **Project Structure**
   - High-level directory structure
   - Explanation of key files and folders

6. **Development**
   - Available npm scripts
   - Development workflow
   - How to contribute (if applicable)

7. **Features**
   - Detailed feature list based on the project description
   - Screenshots or GIFs if the project has a visual interface

### Style Guidelines
- Use proper Markdown formatting
- Include code blocks with syntax highlighting
- Add badges if appropriate (build status, version, etc.)
- Keep it professional but accessible
- Include emojis sparingly for visual appeal

### Project-Specific Notes
${project.tech.includes('React') ? '- This is a React application with modern hooks and functional components' : ''}
${project.tech.includes('Three.js') ? '- This project includes 3D graphics and may require WebGL support' : ''}
${project.tech.includes('TypeScript') ? '- TypeScript is used for type safety and better development experience' : ''}
${project.requires3D ? '- This project requires 3D/WebGL support and pointer lock for optimal experience' : ''}` : `## CLAUDE.md Requirements
Please create comprehensive Claude AI instructions that include:

### Essential Sections
1. **Project Overview**
   - Technical context and architecture
   - Key files and their purposes
   - Development patterns used

2. **Development Guidelines**
   - Code style and conventions
   - Best practices specific to this tech stack: ${project.tech.join(', ')}
   - Architecture patterns to follow

3. **Common Tasks**
   - Adding new features
   - Debugging common issues
   - Performance optimization
   - Testing strategies

4. **File Structure & Key Components**
   - Important files and their roles
   - How components interact
   - Data flow and state management

5. **Development Workflow**
   - How to start development (\`${project.buildCommand || 'npm run dev'}\`)
   - Build and deployment process
   - Integration with portfolio system

6. **Troubleshooting**
   - Common issues and solutions
   - Port conflicts (project uses ${project.localPort})
   - Environment-specific problems

### Claude-Specific Instructions
- Provide context for AI assistance on this project
- Include helpful commands and shortcuts
- Explain the project's role in the larger portfolio system
- Note any special requirements or constraints

### Project-Specific Context
${project.tech.includes('React') ? '- Modern React patterns with hooks, context, and functional components' : ''}
${project.tech.includes('Three.js') ? '- 3D graphics development with Three.js, WebGL optimization needed' : ''}
${project.tech.includes('TypeScript') ? '- TypeScript development with strict type checking' : ''}
${project.requires3D ? '- 3D project requiring pointer lock and WebGL capabilities' : ''}
- Part of Claude Development Portfolio system
- Integrates with VS Code extension and unified portfolio interface`}

## Current Features
${project.features ? project.features.map(f => `- ${f}`).join('\n') : 'No specific features listed in manifest'}

## Request
Please analyze the current project structure and create a comprehensive, professional ${isReadme ? 'README.md' : 'CLAUDE.md'} file that accurately reflects the project's current state, features, and development needs.

Make sure to:
- Check the actual project files to understand the current implementation
- Update any outdated information
- Add any missing sections that would be helpful
- Ensure all paths, commands, and technical details are accurate
- Follow modern documentation best practices

Thank you!`
  }

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
          <button onClick={() => {
            onClose()
            showNotification('Returned to projects overview', 'info')
          }} className={styles.backButton}>
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
              <button onClick={() => {
                handleOpenInBrowser()
                if (actualPort) {
                  showNotification(`Opening ${project.title} in browser (port ${actualPort})`, 'info')
                } else {
                  showNotification('Project is not running - cannot open in browser', 'warning')
                }
              }} className={styles.btnSecondary}>
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
                {/* Live Preview Section */}
                {project.displayType === 'external' && isRunning && actualPort && (
                  <section className={styles.section}>
                    <h3>Live Preview</h3>
                    <div className={styles.previewContainer}>
                      <LiveProjectPreview
                        project={project}
                        isRunning={isRunning}
                        actualPort={actualPort}
                        viewMode="desktop"
                      />
                    </div>
                  </section>
                )}
                
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
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: '#00ff88' }}>README.md</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleAskClaudeToUpdate('README')}
                      className={styles.btnPrimary}
                      title="Generate Claude prompt to update README.md"
                    >
                      <SvgIcon name="brain" size={16} />
                      Ask Claude to Update
                    </button>
                    <button
                      onClick={() => handleEditFile('README.md')}
                      className={styles.btnSecondary}
                      title="Edit README.md file in VS Code"
                    >
                      <SvgIcon name="edit" size={16} />
                      Edit File
                    </button>
                  </div>
                </div>
                <div className={styles.markdownContent}>
                  <pre>{readmeContent}</pre>
                </div>
              </div>
            )}
            
            {activeTab === 'claude' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: '#00ff88' }}>CLAUDE.md</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleAskClaudeToUpdate('CLAUDE')}
                      className={styles.btnPrimary}
                      title="Generate Claude prompt to update CLAUDE.md"
                    >
                      <SvgIcon name="brain" size={16} />
                      Ask Claude to Update
                    </button>
                    <button
                      onClick={() => handleEditFile('CLAUDE.md')}
                      className={styles.btnSecondary}
                      title="Edit CLAUDE.md file in VS Code"
                    >
                      <SvgIcon name="edit" size={16} />
                      Edit File
                    </button>
                  </div>
                </div>
                <div className={styles.markdownContent}>
                  <pre>{claudeContent}</pre>
                </div>
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
