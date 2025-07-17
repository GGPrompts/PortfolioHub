// Project launcher utilities
import { Project } from '../store/portfolioStore'

interface LauncherStatus {
  [projectId: string]: {
    isRunning: boolean
    port: number
    pid?: number
    startTime?: Date
  }
}

class ProjectLauncher {
  private static instance: ProjectLauncher
  private status: LauncherStatus = {}
  private checkInterval: number | null = null

  static getInstance() {
    if (!ProjectLauncher.instance) {
      ProjectLauncher.instance = new ProjectLauncher()
    }
    return ProjectLauncher.instance
  }

  constructor() {
    // Load status from localStorage
    const saved = localStorage.getItem('projectLauncherStatus')
    if (saved) {
      this.status = JSON.parse(saved)
    }
    
    // Start checking project status
    this.startStatusCheck()
  }

  private saveStatus() {
    localStorage.setItem('projectLauncherStatus', JSON.stringify(this.status))
  }

  private startStatusCheck() {
    // Check every 5 seconds if projects are still running
    this.checkInterval = window.setInterval(() => {
      Object.entries(this.status).forEach(([projectId, info]) => {
        if (info.isRunning) {
          this.checkProjectHealth(projectId, info.port)
        }
      })
    }, 5000)
  }

  private async checkProjectHealth(projectId: string, port: number) {
    try {
      const response = await fetch(`http://localhost:${port}`, { 
        method: 'HEAD',
        mode: 'no-cors'
      })
      // If we get here, the server is likely running
    } catch (error) {
      // Server is not responding
      this.status[projectId].isRunning = false
      this.saveStatus()
    }
  }

  async launchProject(project: Project): Promise<boolean> {
    if (project.displayType !== 'external' || !project.localPort) {
      console.error('Project cannot be launched:', project.id)
      return false
    }

    // Check if already running
    if (this.isProjectRunning(project.id)) {
      console.log(`Project ${project.id} is already running on port ${project.localPort}`)
      window.open(`http://localhost:${project.localPort}`, '_blank')
      return true
    }

    // Launch the project
    try {
      // Send request to our launcher backend
      const response = await fetch('/api/launch-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          command: project.buildCommand || 'npm run dev',
          port: project.localPort,
          directory: this.getProjectDirectory(project.id)
        })
      })

      if (response.ok) {
        const { pid } = await response.json()
        this.status[project.id] = {
          isRunning: true,
          port: project.localPort,
          pid,
          startTime: new Date()
        }
        this.saveStatus()

        // Wait a bit for the server to start
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Open in new tab
        window.open(`http://localhost:${project.localPort}`, '_blank')
        return true
      }
    } catch (error) {
      console.error('Failed to launch project:', error)
    }

    return false
  }

  isProjectRunning(projectId: string): boolean {
    return this.status[projectId]?.isRunning || false
  }

  getProjectStatus(projectId: string) {
    return this.status[projectId]
  }

  private getProjectDirectory(projectId: string): string {
    // Map project IDs to their actual directories
    const projectDirs: { [key: string]: string } = {
      'ggprompts-main': 'D:/ClaudeWindows/Projects/GGPromptsProject/GGPrompts',
      'ggprompts-style-guide': 'D:/ClaudeWindows/Projects/GGPromptsProject/GGPrompts-StyleGuide'
    }
    return projectDirs[projectId] || ''
  }

  async stopProject(projectId: string): Promise<boolean> {
    const status = this.status[projectId]
    if (!status || !status.isRunning) {
      return false
    }

    try {
      await fetch('/api/stop-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: status.pid })
      })

      this.status[projectId].isRunning = false
      this.saveStatus()
      return true
    } catch (error) {
      console.error('Failed to stop project:', error)
      return false
    }
  }

  cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
  }
}

export default ProjectLauncher.getInstance()