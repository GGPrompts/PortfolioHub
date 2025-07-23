/**
 * Path Formatter - Environment-aware path handling
 * 
 * This utility provides cross-environment path formatting to handle
 * differences between VS Code enhanced mode and web application mode.
 */

import { environmentBridge } from '../services/environmentBridge'

export interface Project {
  id: string
  title: string
  path?: string
  buildCommand?: string
  localPort?: number
}

export class PathFormatter {
  /**
   * Formats a path and command for the current environment
   * @param path The file path to format
   * @param command The command to execute
   * @returns Formatted command string
   */
  static formatForEnvironment(path: string, command: string): string {
    const env = environmentBridge.getMode()
    
    if (env === 'web-local') {
      // Web mode: Escape backslashes for clipboard
      const escapedPath = path.replace(/\\/g, '\\\\')
      // Use && for command chaining in clipboard mode
      return `cd "${escapedPath}" && ${command}`
    } else {
      // VS Code mode: Use native path handling
      // VS Code handles paths natively through WebSocket bridge
      return `cd "${path}"; ${command}`
    }
  }
  
  /**
   * Formats a project path with its build command
   * @param project The project to format
   * @returns Formatted command string
   */
  static formatProjectPath(project: Project): string {
    const basePath = environmentBridge.getPortfolioPath()
    const projectPath = `${basePath}\\projects\\${project.path || project.id}`
    const command = project.buildCommand || 'npm run dev'
    
    return this.formatForEnvironment(projectPath, command)
  }
  
  /**
   * Formats an absolute path for the current environment
   * @param absolutePath The absolute path to format
   * @param command The command to execute
   * @returns Formatted command string
   */
  static formatAbsolutePath(absolutePath: string, command: string): string {
    return this.formatForEnvironment(absolutePath, command)
  }
  
  /**
   * Escapes a path for safe use in PowerShell commands
   * @param path The path to escape
   * @returns Escaped path string
   */
  static escapePowerShellPath(path: string): string {
    // Escape special PowerShell characters
    return path.replace(/[&|<>^]/g, '`$&')
  }
  
  /**
   * Normalizes a path to use consistent separators
   * @param path The path to normalize
   * @returns Normalized path string
   */
  static normalizePath(path: string): string {
    // Convert forward slashes to backslashes for Windows
    return path.replace(/\//g, '\\')
  }
  
  /**
   * Creates a safe command for project operations
   * @param project The project
   * @param operation The operation ('start', 'stop', 'build', etc.)
   * @returns Safe command string
   */
  static createProjectCommand(project: Project, operation: string): string {
    const basePath = environmentBridge.getPortfolioPath()
    let projectPath: string
    
    // Handle different path formats
    if (project.path) {
      if (project.path.startsWith('../Projects/')) {
        // External project
        projectPath = `${basePath}\\..\\Projects\\${project.path.replace('../Projects/', '')}`
      } else if (project.path === '.') {
        // Portfolio root
        projectPath = basePath
      } else {
        // Internal project
        projectPath = `${basePath}\\projects\\${project.path}`
      }
    } else {
      // Default to projects directory
      projectPath = `${basePath}\\projects\\${project.id}`
    }
    
    // Build command based on operation
    let command: string
    switch (operation) {
      case 'start':
        command = project.buildCommand || 'npm run dev'
        break
      case 'stop':
        if (project.localPort) {
          command = `taskkill /F /FI "PID eq (Get-NetTCPConnection -LocalPort ${project.localPort} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)"`
        } else {
          command = 'echo "No port configured for stop operation"'
        }
        break
      case 'build':
        command = 'npm run build'
        break
      case 'install':
        command = 'npm install'
        break
      default:
        command = operation
    }
    
    return this.formatForEnvironment(projectPath, command)
  }
  
  /**
   * Gets the base portfolio path for the current environment
   * @returns Portfolio base path
   */
  static getPortfolioBasePath(): string {
    return environmentBridge.getPortfolioPath() || 'D:\\ClaudeWindows\\claude-dev-portfolio'
  }
  
  /**
   * Resolves a project path to an absolute path
   * @param project The project
   * @returns Absolute path to the project
   */
  static resolveProjectPath(project: Project): string {
    const basePath = this.getPortfolioBasePath()
    
    if (project.path) {
      if (project.path.startsWith('../Projects/')) {
        // External project
        return `${basePath}\\..\\Projects\\${project.path.replace('../Projects/', '')}`
      } else if (project.path === '.') {
        // Portfolio root
        return basePath
      } else if (project.path.startsWith('projects/')) {
        // Internal project with full path
        return `${basePath}\\${project.path}`
      } else {
        // Internal project, assume projects directory
        return `${basePath}\\projects\\${project.path}`
      }
    } else {
      // Default to projects directory
      return `${basePath}\\projects\\${project.id}`
    }
  }
  
  /**
   * Creates a batch command for multiple projects
   * @param projects Array of projects
   * @param operation The operation to perform
   * @returns Array of formatted commands
   */
  static createBatchCommands(projects: Project[], operation: string): string[] {
    return projects.map(project => this.createProjectCommand(project, operation))
  }
  
  /**
   * Validates that a path is safe and within the workspace
   * @param path The path to validate
   * @returns True if path is safe
   */
  static validatePath(path: string): boolean {
    // Basic validation - no path traversal
    if (path.includes('..\\..') || path.includes('../..') || path.includes('..\\')) {
      return false
    }
    
    // No dangerous characters
    if (/[<>:"|?*]/.test(path)) {
      return false
    }
    
    return true
  }
}

export default PathFormatter