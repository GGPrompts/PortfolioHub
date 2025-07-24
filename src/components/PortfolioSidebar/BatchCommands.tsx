import React from 'react'
import SvgIcon from '../SvgIcon'
import styles from '../PortfolioSidebar.module.css'
import { 
  isVSCodeEnvironment, 
  launchAllProjects, 
  killAllProjects,
  launchSelectedProjects, 
  launchProjectsEnhanced, 
  executeScript 
} from '../../utils/vsCodeIntegration'

interface Project {
  id: string
  title: string
  localPort?: number
  buildCommand?: string
  path?: string
}

interface BatchCommandsProps {
  projects: Project[]
  selectedProjects: Set<string>
  onOpenDashboard?: () => void
  onClearFilters: () => void
  executeOrCopyCommand: (command: string, successMessage: string, commandName?: string) => Promise<void>
}

export default function BatchCommands({
  projects,
  selectedProjects,
  onOpenDashboard,
  onClearFilters,
  executeOrCopyCommand
}: BatchCommandsProps) {

  // Helper function to get correct project path for scripts
  const getProjectPath = (project: Project): string => {
    if (isVSCodeEnvironment()) {
      // In VS Code, use proper path resolution
      const portfolioPath = 'D:\\ClaudeWindows\\claude-dev-portfolio'
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
            if (isVSCodeEnvironment()) {
              await killAllProjects()
            } else {
              const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\kill-all-servers.ps1'
              await executeOrCopyCommand(command, 'Kill all servers command ready!', 'Kill All Servers')
            }
          }}
          title={isVSCodeEnvironment() ? "Systematically stop all running projects" : "Copy command to kill all projects"}
        >
          <SvgIcon name="stop" size={16} /> All
        </button>
        <button 
          className={styles.actionBtn}
          onClick={async () => {
            if (isVSCodeEnvironment()) {
              // Use environment bridge to kill selected projects individually
              const selectedProjectsList = projects.filter(p => selectedProjects.has(p.id))
              console.log(`🔴 Killing ${selectedProjectsList.length} selected projects...`)
              
              for (const project of selectedProjectsList) {
                if (project.localPort) {
                  console.log(`🔴 Stopping ${project.title} on port ${project.localPort}...`)
                  const command = `powershell "Get-Process | Where-Object {\\$_.Name -eq 'node'} | Where-Object {(Get-NetTCPConnection -OwningProcess \\$_.Id -ErrorAction SilentlyContinue | Where-Object LocalPort -eq ${project.localPort})} | Stop-Process -Force"`
                  await executeOrCopyCommand(command, `Stopped ${project.title}`, `Kill ${project.title}`)
                }
              }
            } else {
              // Web mode - copy PowerShell script to clipboard
              copyScriptToClipboard(generateKillScript(Array.from(selectedProjects)), 'kill')
            }
          }}
          disabled={selectedProjects.size === 0}
          title={isVSCodeEnvironment() ? "Stop selected projects individually" : "Copy command to kill selected projects"}
        >
          <SvgIcon name="stop" size={16} /> Selected ({selectedProjects.size})
        </button>
      </div>
      <button
        className={styles.actionBtn}
        onClick={onClearFilters}
        title="Clear filters and collapse all projects"
      >
        <SvgIcon name="refresh" size={16} /> Clear
      </button>
    </div>
  )
}