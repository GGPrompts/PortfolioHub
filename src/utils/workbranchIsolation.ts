/**
 * Workbranch Isolation Utilities
 * 
 * Provides mechanisms for isolating terminal contexts by workbranch,
 * including CLAUDE.md context management and git integration.
 */

import { WorkbranchContext, TerminalConfig } from '../types/terminal';
import { environmentBridge } from '../services/environmentBridge';

/**
 * Workbranch context isolation configuration
 */
export interface WorkbranchIsolationConfig {
  enableGitIntegration: boolean;      // Automatically sync with git branches
  enableContextIsolation: boolean;    // Isolate CLAUDE.md contexts
  enableFileSystemIsolation: boolean; // Use separate working directories
  enableEnvironmentIsolation: boolean; // Isolate environment variables
  autoCreateBranches: boolean;        // Auto-create git branches for new workbranches
  contextFileNames: string[];         // Context file names to look for
  basePath: string;                   // Base path for workbranch directories
}

/**
 * Default isolation configuration
 */
const DEFAULT_ISOLATION_CONFIG: WorkbranchIsolationConfig = {
  enableGitIntegration: true,
  enableContextIsolation: true,
  enableFileSystemIsolation: false, // Keep terminals in same directory by default
  enableEnvironmentIsolation: true,
  autoCreateBranches: false,
  contextFileNames: ['CLAUDE.md', 'README.md', '.claude-context.md'],
  basePath: 'D:\\ClaudeWindows\\claude-dev-portfolio',
};

/**
 * Workbranch isolation manager
 */
export class WorkbranchIsolationManager {
  private config: WorkbranchIsolationConfig;
  
  constructor(config: Partial<WorkbranchIsolationConfig> = {}) {
    this.config = { ...DEFAULT_ISOLATION_CONFIG, ...config };
  }
  
  /**
   * Create a new workbranch context with proper isolation
   */
  async createWorkbranchContext(
    name: string,
    baseBranch: string = 'master',
    projectRoot?: string
  ): Promise<WorkbranchContext> {
    console.log(`🌿 Creating isolated workbranch context: ${name}`);
    
    const rootPath = projectRoot || this.config.basePath;
    const workbranchPath = this.config.enableFileSystemIsolation 
      ? `${rootPath}\\workbranches\\${name.replace('/', '_')}`
      : rootPath;
    
    // Find context file
    const claudeContextPath = await this.findContextFile(workbranchPath);
    
    // Create workbranch context
    const context: WorkbranchContext = {
      name,
      displayName: this.formatDisplayName(name),
      baseBranch,
      claudeContextPath,
      projectRoot: workbranchPath,
      terminals: [],
      gitStatus: 'clean',
      description: `Workbranch for ${name}`,
      tags: this.extractTagsFromName(name),
      priority: 'medium',
      locked: false,
    };
    
    // Initialize git branch if enabled
    if (this.config.enableGitIntegration && this.config.autoCreateBranches) {
      await this.initializeGitBranch(name, baseBranch, rootPath);
    }
    
    // Create workbranch directory if filesystem isolation is enabled
    if (this.config.enableFileSystemIsolation) {
      await this.createWorkbranchDirectory(workbranchPath, rootPath);
    }
    
    // Initialize context file if it doesn't exist
    if (!claudeContextPath && this.config.enableContextIsolation) {
      await this.createContextFile(workbranchPath, name, baseBranch);
    }
    
    console.log(`✅ Workbranch context created: ${name} at ${workbranchPath}`);
    return context;
  }
  
  /**
   * Apply workbranch isolation to a terminal
   */
  async applyWorkbranchIsolation(
    terminal: TerminalConfig,
    workbranch: WorkbranchContext
  ): Promise<Partial<TerminalConfig>> {
    console.log(`🔒 Applying workbranch isolation: ${terminal.id} → ${workbranch.name}`);
    
    const updates: Partial<TerminalConfig> = {
      workbranch: workbranch.name,
      workingDirectory: workbranch.projectRoot,
      claudeContext: workbranch.claudeContextPath,
    };
    
    // Apply environment variable isolation
    if (this.config.enableEnvironmentIsolation) {
      updates.environmentVars = {
        ...terminal.environmentVars,
        CLAUDE_WORKBRANCH: workbranch.name,
        CLAUDE_CONTEXT_PATH: workbranch.claudeContextPath,
        CLAUDE_PROJECT_ROOT: workbranch.projectRoot,
        GIT_BRANCH: workbranch.name,
      };
    }
    
    // Switch git branch if enabled
    if (this.config.enableGitIntegration && environmentBridge.isVSCodeAvailable()) {
      await this.switchGitBranch(workbranch.name, workbranch.projectRoot);
    }
    
    return updates;
  }
  
  /**
   * Get context-aware prompt for Claude
   */
  async getContextAwarePrompt(workbranch: WorkbranchContext): Promise<string> {
    console.log(`📋 Generating context-aware prompt for: ${workbranch.name}`);
    
    let prompt = `You are working in workbranch: ${workbranch.name}\n`;
    prompt += `Base branch: ${workbranch.baseBranch}\n`;
    prompt += `Project root: ${workbranch.projectRoot}\n\n`;
    
    // Include context from CLAUDE.md if available
    if (workbranch.claudeContextPath && environmentBridge.isVSCodeAvailable()) {
      try {
        // This would read the context file content
        // For now, we'll include a reference
        prompt += `Context file: ${workbranch.claudeContextPath}\n`;
        prompt += `Please read the context file for specific instructions and background.\n\n`;
      } catch (error) {
        console.warn(`⚠️ Could not read context file: ${workbranch.claudeContextPath}`);
      }
    }
    
    // Include git status if available
    if (this.config.enableGitIntegration) {
      const gitStatus = await this.getGitStatus(workbranch.projectRoot);
      if (gitStatus) {
        prompt += `Git status: ${gitStatus}\n`;
      }
    }
    
    // Include workbranch-specific information
    if (workbranch.description) {
      prompt += `Description: ${workbranch.description}\n`;
    }
    
    if (workbranch.tags.length > 0) {
      prompt += `Tags: ${workbranch.tags.join(', ')}\n`;
    }
    
    prompt += `\nPlease provide assistance specific to this workbranch context.`;
    
    return prompt;
  }
  
  /**
   * Validate workbranch isolation integrity
   */
  async validateWorkbranchIsolation(workbranch: WorkbranchContext): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    console.log(`🔍 Validating workbranch isolation: ${workbranch.name}`);
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check if project root exists
    if (this.config.enableFileSystemIsolation) {
      // Would check if directory exists
      if (!workbranch.projectRoot) {
        issues.push('Project root directory not specified');
      }
    }
    
    // Check if context file exists
    if (this.config.enableContextIsolation) {
      if (!workbranch.claudeContextPath) {
        issues.push('Context file not found');
        recommendations.push('Create a CLAUDE.md file with workbranch-specific instructions');
      }
    }
    
    // Check git branch consistency
    if (this.config.enableGitIntegration && environmentBridge.isVSCodeAvailable()) {
      try {
        const currentBranch = await this.getCurrentGitBranch(workbranch.projectRoot);
        if (currentBranch && currentBranch !== workbranch.name) {
          issues.push(`Git branch mismatch: expected ${workbranch.name}, got ${currentBranch}`);
          recommendations.push(`Switch to correct git branch: git checkout ${workbranch.name}`);
        }
      } catch (error) {
        console.warn('Could not validate git branch:', error);
      }
    }
    
    // Check for terminal conflicts
    const terminalCount = workbranch.terminals.length;
    if (terminalCount > 10) {
      recommendations.push('Consider splitting workbranch - too many terminals may impact performance');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }
  
  /**
   * Merge workbranch contexts (for collaboration)
   */
  async mergeWorkbranchContexts(
    sourceWorkbranch: WorkbranchContext,
    targetWorkbranch: WorkbranchContext
  ): Promise<WorkbranchContext> {
    console.log(`🔄 Merging workbranch contexts: ${sourceWorkbranch.name} → ${targetWorkbranch.name}`);
    
    // Create merged context
    const mergedContext: WorkbranchContext = {
      ...targetWorkbranch,
      terminals: [...new Set([...targetWorkbranch.terminals, ...sourceWorkbranch.terminals])],
      tags: [...new Set([...targetWorkbranch.tags, ...sourceWorkbranch.tags])],
      description: `${targetWorkbranch.description}\n\nMerged from: ${sourceWorkbranch.description}`,
    };
    
    // Merge git branches if enabled
    if (this.config.enableGitIntegration && environmentBridge.isVSCodeAvailable()) {
      await this.mergeGitBranches(sourceWorkbranch.name, targetWorkbranch.name, targetWorkbranch.projectRoot);
    }
    
    return mergedContext;
  }
  
  /**
   * Archive workbranch (preserve context but mark as inactive)
   */
  async archiveWorkbranch(workbranch: WorkbranchContext): Promise<WorkbranchContext> {
    console.log(`📦 Archiving workbranch: ${workbranch.name}`);
    
    const archivedContext: WorkbranchContext = {
      ...workbranch,
      locked: true,
      tags: [...workbranch.tags, 'archived'],
      description: `${workbranch.description}\n\nArchived on: ${new Date().toISOString()}`,
    };
    
    // Archive git branch if enabled
    if (this.config.enableGitIntegration && environmentBridge.isVSCodeAvailable()) {
      await this.archiveGitBranch(workbranch.name, workbranch.projectRoot);
    }
    
    return archivedContext;
  }
  
  // Private helper methods
  
  private async findContextFile(workbranchPath: string): Promise<string> {
    for (const fileName of this.config.contextFileNames) {
      const filePath = `${workbranchPath}\\${fileName}`;
      
      // Would check if file exists
      // For now, return the first CLAUDE.md path
      if (fileName === 'CLAUDE.md') {
        return filePath;
      }
    }
    
    return '';
  }
  
  private formatDisplayName(name: string): string {
    return name
      .split('/')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' › ');
  }
  
  private extractTagsFromName(name: string): string[] {
    const tags: string[] = [];
    
    if (name.includes('feature/')) {
      tags.push('feature');
    }
    
    if (name.includes('bugfix/')) {
      tags.push('bugfix');
    }
    
    if (name.includes('hotfix/')) {
      tags.push('hotfix');
    }
    
    if (name.includes('experiment/')) {
      tags.push('experiment');
    }
    
    return tags;
  }
  
  private async initializeGitBranch(name: string, baseBranch: string, rootPath: string): Promise<void> {
    if (!environmentBridge.isVSCodeAvailable()) return;
    
    try {
      // Check if branch already exists
      const branchExists = await environmentBridge.gitOperation(`git show-ref --verify --quiet refs/heads/${name}`, rootPath);
      
      if (!branchExists) {
        // Create new branch from base
        await environmentBridge.gitOperation(`git checkout -b ${name} ${baseBranch}`, rootPath);
        console.log(`✅ Created git branch: ${name}`);
      } else {
        // Switch to existing branch
        await environmentBridge.gitOperation(`git checkout ${name}`, rootPath);
        console.log(`✅ Switched to existing git branch: ${name}`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not initialize git branch ${name}:`, error);
    }
  }
  
  private async createWorkbranchDirectory(workbranchPath: string, basePath: string): Promise<void> {
    // Would create directory structure
    console.log(`📁 Would create workbranch directory: ${workbranchPath}`);
  }
  
  private async createContextFile(workbranchPath: string, name: string, baseBranch: string): Promise<void> {
    const contextPath = `${workbranchPath}\\CLAUDE.md`;
    
    const contextContent = `# ${this.formatDisplayName(name)} - Workbranch Context

## Overview
This is the context file for workbranch: **${name}**

**Base Branch:** ${baseBranch}  
**Created:** ${new Date().toISOString()}

## Purpose
<!-- Describe the purpose of this workbranch -->

## Key Changes
<!-- List key changes being made in this workbranch -->

## Context for Claude
<!-- Provide specific context and instructions for Claude AI -->

## Related Files
<!-- List important files and their purposes -->

## Testing Notes
<!-- Notes about testing this workbranch -->

## Merge Checklist
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Ready for merge to ${baseBranch}
`;
    
    if (environmentBridge.isVSCodeAvailable()) {
      try {
        await environmentBridge.saveFile(contextPath, contextContent);
        console.log(`✅ Created context file: ${contextPath}`);
      } catch (error) {
        console.warn(`⚠️ Could not create context file:`, error);
      }
    }
  }
  
  private async switchGitBranch(branchName: string, projectRoot: string): Promise<void> {
    try {
      await environmentBridge.gitOperation(`git checkout ${branchName}`, projectRoot);
    } catch (error) {
      console.warn(`⚠️ Could not switch to git branch ${branchName}:`, error);
    }
  }
  
  private async getGitStatus(projectRoot: string): Promise<string> {
    try {
      // Would execute git status command and return result
      return 'clean'; // Placeholder
    } catch (error) {
      return 'unknown';
    }
  }
  
  private async getCurrentGitBranch(projectRoot: string): Promise<string | null> {
    try {
      // Would execute git branch --show-current and return result
      return null; // Placeholder
    } catch (error) {
      return null;
    }
  }
  
  private async mergeGitBranches(sourceBranch: string, targetBranch: string, projectRoot: string): Promise<void> {
    try {
      await environmentBridge.gitOperation(`git checkout ${targetBranch}`, projectRoot);
      await environmentBridge.gitOperation(`git merge ${sourceBranch}`, projectRoot);
      console.log(`✅ Merged ${sourceBranch} into ${targetBranch}`);
    } catch (error) {
      console.error(`❌ Failed to merge branches:`, error);
    }
  }
  
  private async archiveGitBranch(branchName: string, projectRoot: string): Promise<void> {
    try {
      const archiveBranchName = `archive/${branchName}`;
      await environmentBridge.gitOperation(`git checkout -b ${archiveBranchName} ${branchName}`, projectRoot);
      await environmentBridge.gitOperation(`git push origin ${archiveBranchName}`, projectRoot);
      console.log(`✅ Archived branch as: ${archiveBranchName}`);
    } catch (error) {
      console.warn(`⚠️ Could not archive branch ${branchName}:`, error);
    }
  }
}

/**
 * Default workbranch isolation manager instance
 */
export const workbranchIsolationManager = new WorkbranchIsolationManager();

/**
 * Utility functions for workbranch management
 */

/**
 * Generate workbranch-specific environment variables
 */
export function generateWorkbranchEnvironment(workbranch: WorkbranchContext): Record<string, string> {
  return {
    CLAUDE_WORKBRANCH: workbranch.name,
    CLAUDE_WORKBRANCH_DISPLAY: workbranch.displayName,
    CLAUDE_CONTEXT_PATH: workbranch.claudeContextPath,
    CLAUDE_PROJECT_ROOT: workbranch.projectRoot,
    CLAUDE_BASE_BRANCH: workbranch.baseBranch,
    CLAUDE_WORKBRANCH_TAGS: workbranch.tags.join(','),
    CLAUDE_WORKBRANCH_PRIORITY: workbranch.priority,
  };
}

/**
 * Check if a workbranch name is valid
 */
export function isValidWorkbranchName(name: string): { valid: boolean; message?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: 'Workbranch name cannot be empty' };
  }
  
  if (name.includes('..')) {
    return { valid: false, message: 'Workbranch name cannot contain ".."' };
  }
  
  if (name.startsWith('/') || name.endsWith('/')) {
    return { valid: false, message: 'Workbranch name cannot start or end with "/"' };
  }
  
  if (name.includes(' ')) {
    return { valid: false, message: 'Workbranch name cannot contain spaces (use hyphens or underscores)' };
  }
  
  return { valid: true };
}

/**
 * Generate unique workbranch name
 */
export function generateWorkbranchName(prefix: string, description?: string): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const randomSuffix = Math.random().toString(36).substr(2, 5);
  
  let name = `${prefix}/${timestamp}`;
  
  if (description) {
    const cleanDescription = description
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
    
    name += `-${cleanDescription}`;
  }
  
  name += `-${randomSuffix}`;
  
  return name;
}

export default WorkbranchIsolationManager;