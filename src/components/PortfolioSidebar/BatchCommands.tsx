import React, { useState, useEffect } from 'react'
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
import { showBrowserNotification } from '../../services/environmentBridge'

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
  onClearFilters: () => void
  executeOrCopyCommand: (command: string, successMessage: string, commandName?: string) => Promise<void>
}

export default function BatchCommands({
  projects,
  selectedProjects,
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

  // Define command options
  const commandOptions = [
    // Launch commands
    {
      id: 'launch-all',
      label: 'Launch All Projects',
      icon: 'play',
      action: async () => {
        if (isVSCodeEnvironment()) {
          await launchAllProjects()
        } else {
          const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\start-all-enhanced.ps1'
          await executeOrCopyCommand(command, 'Start all projects command ready!', 'Start All Projects')
        }
      },
      condition: () => true,
      description: isVSCodeEnvironment() ? "Launch all projects in VS Code terminals" : "Copy command to start all projects"
    },
    {
      id: 'launch-script',
      label: 'Enhanced Script',
      icon: 'terminal',
      action: async () => {
        await executeScript('scripts\\start-all-enhanced.ps1')
        showBrowserNotification('📜 Enhanced startup script executed', 'info')
      },
      condition: () => isVSCodeEnvironment(),
      description: "Run the full enhanced PowerShell script with comprehensive port checking"
    },
    {
      id: 'launch-selected',
      label: `Launch Selected (${selectedProjects.size})`,
      icon: 'play',
      action: async () => {
        if (isVSCodeEnvironment()) {
          await launchSelectedProjects(Array.from(selectedProjects))
        } else {
          copyScriptToClipboard(generateLaunchScript(Array.from(selectedProjects)), 'launch')
        }
      },
      condition: () => selectedProjects.size > 0,
      description: isVSCodeEnvironment() ? "Launch selected projects in VS Code terminals" : "Copy command to start selected projects"
    },
    {
      id: 'launch-enhanced',
      label: `Enhanced Launch (${selectedProjects.size})`,
      icon: 'zap',
      action: async () => {
        await launchProjectsEnhanced(Array.from(selectedProjects), false)
        showBrowserNotification(`⚡ Enhanced launch started for ${selectedProjects.size} projects`, 'info')
      },
      condition: () => isVSCodeEnvironment() && selectedProjects.size > 0,
      description: "Launch selected projects with enhanced port checking and smart restart detection"
    },
    {
      id: 'launch-force',
      label: `Force Restart (${selectedProjects.size})`,
      icon: 'rotateCcw',
      action: async () => {
        await launchProjectsEnhanced(Array.from(selectedProjects), true)
        showBrowserNotification(`🔄 Force restart initiated for ${selectedProjects.size} projects`, 'warning')
      },
      condition: () => isVSCodeEnvironment() && selectedProjects.size > 0,
      description: "Force restart all selected projects (stops existing servers first)"
    },
    // Kill commands
    {
      id: 'kill-all',
      label: 'Kill All Projects',
      icon: 'stop',
      action: async () => {
        if (isVSCodeEnvironment()) {
          await killAllProjects()
        } else {
          const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\kill-all-servers.ps1'
          await executeOrCopyCommand(command, 'Kill all servers command ready!', 'Kill All Servers')
        }
      },
      condition: () => true,
      description: isVSCodeEnvironment() ? "Systematically stop all running projects" : "Copy command to kill all projects"
    },
    {
      id: 'kill-selected',
      label: `Kill Selected (${selectedProjects.size})`,
      icon: 'stop',
      action: async () => {
        if (isVSCodeEnvironment()) {
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
          copyScriptToClipboard(generateKillScript(Array.from(selectedProjects)), 'kill')
        }
      },
      condition: () => selectedProjects.size > 0,
      description: isVSCodeEnvironment() ? "Stop selected projects individually" : "Copy command to kill selected projects"
    },
    // Utility commands
    {
      id: 'clear-filters',
      label: 'Clear Filters',
      icon: 'filterX',
      action: () => {
        onClearFilters()
        showBrowserNotification('🧼 Filters cleared and projects collapsed', 'info')
      },
      condition: () => true,
      description: "Clear filters and collapse all projects"
    },
    // Terminal Management commands
    {
      id: 'cleanup-terminals',
      label: 'Clean Up Terminals',
      icon: 'trash',
      action: async () => {
        const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\enhanced-cleanup.ps1 -OnlyExternal -DelaySeconds 0'
        await executeOrCopyCommand(command, 'Terminal cleanup initiated!', 'Clean Up Terminals')
        showBrowserNotification('🧹 External terminals cleanup initiated', 'info')
      },
      condition: () => true,
      description: "Close external terminal windows (preserves VS Code integrated terminals)"
    },
    {
      id: 'schedule-cleanup',
      label: 'Schedule Cleanup',
      icon: 'clock',
      action: async () => {
        const delay = prompt('Enter delay in seconds (default: 10):', '10')
        const delaySeconds = parseInt(delay || '10')
        if (isNaN(delaySeconds) || delaySeconds < 0) {
          showBrowserNotification('❌ Invalid delay time entered', 'error')
          return
        }
        
        const command = `cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\enhanced-cleanup.ps1 -OnlyExternal -DelaySeconds ${delaySeconds}`
        await executeOrCopyCommand(command, `Terminal cleanup scheduled for ${delaySeconds}s`, 'Schedule Cleanup')
        showBrowserNotification(`⏰ Terminal cleanup scheduled in ${delaySeconds} seconds`, 'info')
      },
      condition: () => true,
      description: "Schedule automatic terminal cleanup after specified delay"
    }
  ]

  // Filter available commands based on conditions
  const availableCommands = commandOptions.filter(cmd => cmd.condition())

  const [selectedCommand, setSelectedCommand] = useState(availableCommands[0]?.id || '')

  // Update selected command when available commands change
  useEffect(() => {
    if (!availableCommands.find(cmd => cmd.id === selectedCommand)) {
      setSelectedCommand(availableCommands[0]?.id || '')
    }
  }, [availableCommands, selectedCommand])

  const executeSelectedCommand = async () => {
    const command = availableCommands.find(cmd => cmd.id === selectedCommand)
    if (command) {
      await command.action()
    }
  }

  return (
    <div className={styles.quickActions}>
      <div className={styles.commandSelector}>
        <div className={styles.projectFilter}>
          <select 
            className={styles.projectSelect}
            value={selectedCommand}
            onChange={(e) => setSelectedCommand(e.target.value)}
          >
            {availableCommands.map((command) => (
              <option key={command.id} value={command.id}>
                {command.label}
              </option>
            ))}
          </select>
        </div>
        <button 
          className={`${styles.actionBtn} ${styles.executeBtn}`}
          onClick={executeSelectedCommand}
          disabled={!selectedCommand || availableCommands.length === 0}
          title={availableCommands.find(cmd => cmd.id === selectedCommand)?.description || 'Execute command'}
        >
          <SvgIcon 
            name={availableCommands.find(cmd => cmd.id === selectedCommand)?.icon || 'play'} 
            size={16} 
          /> 
          Execute
        </button>
      </div>
    </div>
  )
}