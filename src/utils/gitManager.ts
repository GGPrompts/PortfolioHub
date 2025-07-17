// Git Management Utilities for Portfolio

export interface GitUpdateResult {
  success: boolean
  message: string
  output?: string
  error?: string
}

export interface ProjectUpdateStatus {
  projectId: string
  name: string
  status: 'pending' | 'updating' | 'success' | 'error'
  result?: GitUpdateResult
}

// Execute git commands via the portfolio's launcher server
async function executeGitCommand(command: string, cwd?: string): Promise<GitUpdateResult> {
  try {
    const response = await fetch('/api/git-command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command, cwd })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    return {
      success: false,
      message: 'Failed to execute git command',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Update the main portfolio repository
export async function updatePortfolioRepo(): Promise<GitUpdateResult> {
  return executeGitCommand('git pull origin master', process.cwd())
}

// Update a specific project repository
export async function updateProjectRepo(projectPath: string): Promise<GitUpdateResult> {
  const fullPath = `D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${projectPath}`
  
  // First check the current branch
  const branchResult = await executeGitCommand('git branch --show-current', fullPath)
  
  if (!branchResult.success) {
    return branchResult
  }
  
  const currentBranch = branchResult.output?.trim() || 'main'
  return executeGitCommand(`git pull origin ${currentBranch}`, fullPath)
}

// Update all project repositories
export async function updateAllProjects(): Promise<ProjectUpdateStatus[]> {
  const projects = [
    { id: 'matrix-cards', name: 'Matrix Cards', path: 'matrix-cards' },
    { id: 'ggprompts', name: 'GGPrompts', path: 'ggprompts' },
    { id: 'ggprompts-style-guide', name: 'GGPrompts Style Guide', path: 'ggprompts-style-guide' },
    { id: 'sleak-card', name: 'Sleak Card', path: 'sleak-card' },
    { id: '3d-matrix-cards', name: '3D Matrix Cards', path: '3d-matrix-cards' },
    { id: '3d-file-system', name: '3D File System', path: '3d-file-system' }
  ]

  const results: ProjectUpdateStatus[] = []

  for (const project of projects) {
    const status: ProjectUpdateStatus = {
      projectId: project.id,
      name: project.name,
      status: 'updating'
    }
    
    results.push(status)
    
    try {
      const result = await updateProjectRepo(project.path)
      status.result = result
      status.status = result.success ? 'success' : 'error'
    } catch (error) {
      status.status = 'error'
      status.result = {
        success: false,
        message: 'Update failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  return results
}

// Check if repository has updates available
export async function checkForUpdates(projectPath?: string): Promise<GitUpdateResult> {
  const cwd = projectPath 
    ? `D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${projectPath}`
    : process.cwd()
    
  // Fetch latest from remote
  const fetchResult = await executeGitCommand('git fetch origin', cwd)
  if (!fetchResult.success) {
    return fetchResult
  }
  
  // Check if behind remote
  const statusResult = await executeGitCommand('git status -uno', cwd)
  return statusResult
}

// Get current git status
export async function getGitStatus(projectPath?: string): Promise<GitUpdateResult> {
  const cwd = projectPath 
    ? `D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${projectPath}`
    : process.cwd()
    
  return executeGitCommand('git status --porcelain', cwd)
}