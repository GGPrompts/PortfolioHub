import * as vscode from 'vscode';
import { ProjectProvider } from '../projectProvider';

/**
 * Project selection and checkbox management commands
 */
export class SelectionCommands {
    // projectCommandsProvider removed - commands now accessible via command palette only

    constructor(private projectProvider: ProjectProvider) {}

    // setProjectCommandsProvider removed - commands now accessible via command palette only

    /**
     * Register all selection commands
     */
    registerCommands(context: vscode.ExtensionContext): void {
        const commands = [
            vscode.commands.registerCommand('claude-portfolio.toggleProjectSelection', this.toggleProjectSelectionCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.clearProjectSelection', this.clearProjectSelectionCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.selectAllProjects', this.selectAllProjectsCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.project.select', this.projectSelectCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.section.toggle', this.sectionToggleCommand.bind(this))
        ];

        commands.forEach(command => context.subscriptions.push(command));
    }

    /**
     * Project selection command that opens VS Code command palette (gg-devhub style)
     */
    private async projectSelectCommand(projectId?: string): Promise<void> {
        try {
            if (!projectId) {
                vscode.window.showErrorMessage('No project ID provided for selection');
                return;
            }

            // Get project data
            const projects = await this.projectProvider.getProjects();
            const project = projects.find(p => p.id === projectId);
            
            if (!project) {
                vscode.window.showErrorMessage(`Project not found: ${projectId}`);
                return;
            }

            // Build dynamic actions based on project state and type
            const actions: string[] = [];
            
            if (project.status === 'active') {
                // Running project actions
                actions.push('Open Live Preview');
                actions.push('Stop Project');
                actions.push('Open Terminal');
                
                // Special handling for 3D projects
                if (project.requires3D) {
                    actions.push('Open in External Browser');
                }
            } else {
                // Stopped project actions  
                actions.push('Start Project');
                actions.push('Open in VS Code');
                actions.push('Open Terminal');
            }
            
            // Always available actions
            actions.push('View Dashboard');
            actions.push('Toggle Selection'); // For batch operations
            actions.push('Project Settings');
            
            // Show command palette
            const selected = await vscode.window.showQuickPick(actions, {
                placeHolder: `What would you like to do with ${project.title}?`,
                ignoreFocusOut: true
            });

            if (!selected) {
                return; // User cancelled
            }

            // Route to appropriate handlers
            await this.executeProjectAction(selected, project);
            
        } catch (error) {
            const message = `Error in project selection: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Project selection error:', error);
        }
    }

    /**
     * Execute the selected project action
     */
    private async executeProjectAction(action: string, project: any): Promise<void> {
        try {
            switch (action) {
                case 'Start Project':
                    await vscode.commands.executeCommand('claude-portfolio.runProject', project);
                    break;
                case 'Stop Project':
                    await vscode.commands.executeCommand('claude-portfolio.stopProject', project);
                    break;
                case 'Open Live Preview':
                    await vscode.commands.executeCommand('claude-portfolio.openProject', project);
                    break;
                case 'Open in External Browser':
                case 'Open in Browser':
                    await vscode.commands.executeCommand('claude-portfolio.openProjectInBrowser', project);
                    break;
                case 'Open in VS Code':
                    // Open project folder in VS Code
                    const projectPath = this.getProjectPath(project);
                    if (projectPath) {
                        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath), true);
                    }
                    break;
                case 'Open Terminal':
                    // Open terminal at project location
                    const terminal = vscode.window.createTerminal(`${project.title} Terminal`);
                    const path = this.getProjectPath(project);
                    if (path) {
                        terminal.sendText(`cd "${path}"`);
                    }
                    terminal.show();
                    break;
                case 'View Dashboard':
                    await vscode.commands.executeCommand('claude-portfolio.showDashboard');
                    break;
                case 'Toggle Selection':
                    // Toggle checkbox selection for batch operations
                    this.projectProvider.toggleProjectSelection(project.id);
                    vscode.window.showInformationMessage(
                        this.projectProvider.isProjectSelected(project.id) 
                            ? `✓ ${project.title} selected for batch operations`
                            : `○ ${project.title} deselected from batch operations`
                    );
                    break;
                case 'Project Settings':
                    // Could open project-specific settings in future
                    vscode.window.showInformationMessage(`Settings for ${project.title} (feature coming soon)`);
                    break;
                default:
                    vscode.window.showWarningMessage(`Unknown action: ${action}`);
            }
        } catch (error) {
            const message = `Error executing action "${action}": ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error(`Action execution error (${action}):`, error);
        }
    }

    /**
     * Get project path using existing helper function
     */
    private getProjectPath(project: any): string | null {
        try {
            // Import the helper function from extension.ts
            const { getProjectPath } = require('../extension');
            const configService = require('../services/configurationService').ConfigurationService.getInstance();
            const portfolioPath = configService.getPortfolioPath();
            return getProjectPath(portfolioPath, project);
        } catch (error) {
            console.error('Error getting project path:', error);
            return null;
        }
    }

    /**
     * Toggle project selection checkbox
     */
    private async toggleProjectSelectionCommand(...args: any[]): Promise<void> {
        try {
            console.log('🔘 Toggle project selection called with args:', args);
            
            // Handle different argument formats from tree view
            let project: any = null;
            
            if (args.length > 0) {
                const firstArg = args[0];
                if (firstArg?.project) {
                    // TreeItem with project property
                    project = firstArg.project;
                } else if (firstArg?.id && firstArg?.title) {
                    // Direct project object
                    project = firstArg;
                } else if (typeof firstArg === 'string') {
                    // Project ID string
                    const projects = await this.projectProvider.getProjects();
                    project = projects.find(p => p.id === firstArg);
                }
            }
            
            if (!project || !project.id) {
                console.error('❌ No valid project found in toggle selection args:', args);
                vscode.window.showErrorMessage('No project information found for selection toggle');
                return;
            }

            console.log(`🎯 Toggling selection for project: ${project.id} (${project.title})`);
            
            // 1. Toggle the checkbox selection (for batch operations)
            this.projectProvider.toggleProjectSelection(project.id);
            
            // Check current selection status
            const isNowSelected = this.projectProvider.isProjectSelected(project.id);
            
            // 2. Handle Project Commands panel selection based on checkbox state
            if (isNowSelected) {
                // If project is now checked, select it for Project Commands panel
                this.projectProvider.setCurrentSelectedProject(project);
                console.log(`👉 Project ${project.title} selected for individual commands`);
            } else {
                // If project is now unchecked, clear it from Project Commands panel if it was selected
                const currentSelected = this.projectProvider.getCurrentSelectedProject();
                if (currentSelected && currentSelected.id === project.id) {
                    this.projectProvider.clearCurrentSelection();
                    console.log(`👉 Cleared individual commands (${project.title} unchecked)`);
                }
            }
            
            // Show feedback
            const status = isNowSelected ? 'checked' : 'unchecked';
            const icon = isNowSelected ? '✓' : '○';
            console.log(`${icon} Project ${project.title} ${status} for batch operations`);
            
            // The project provider will automatically refresh both views
            
        } catch (error) {
            const message = `Error toggling project selection: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Toggle project selection error:', error);
        }
    }

    /**
     * Clear all project selections
     */
    private async clearProjectSelectionCommand(): Promise<void> {
        try {
            const selectedCount = this.projectProvider.getSelectedProjects().length;
            
            if (selectedCount === 0) {
                vscode.window.showInformationMessage('No projects are currently selected');
                return;
            }

            // Clear all selections
            this.projectProvider.clearSelection();
            
            console.log(`🗑️ Cleared selection for ${selectedCount} project(s)`);
            vscode.window.showInformationMessage(`Cleared selection for ${selectedCount} project(s)`);
            
        } catch (error) {
            const message = `Error clearing project selections: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Clear project selections error:', error);
        }
    }

    /**
     * Select all projects
     */
    private async selectAllProjectsCommand(): Promise<void> {
        try {
            const allProjects = await this.projectProvider.getProjects();
            
            if (allProjects.length === 0) {
                vscode.window.showInformationMessage('No projects available to select');
                return;
            }

            // Select all projects (first clear, then select each)
            this.projectProvider.clearSelection();
            allProjects.forEach(project => {
                if (!this.projectProvider.isProjectSelected(project.id)) {
                    this.projectProvider.toggleProjectSelection(project.id);
                }
            });
            
            console.log(`✅ Selected all ${allProjects.length} project(s)`);
            vscode.window.showInformationMessage(`Selected all ${allProjects.length} project(s)`);
            
        } catch (error) {
            const message = `Error selecting all projects: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Select all projects error:', error);
        }
    }

    /**
     * Toggle section selection (Online/Offline)
     */
    private async sectionToggleCommand(sectionType: 'online' | 'offline'): Promise<void> {
        try {
            console.log(`🔘 Toggle section selection called for: ${sectionType}`);
            
            // Toggle the section selection using the provider method
            this.projectProvider.toggleSectionSelection(sectionType);
            
            // Get project counts for feedback
            const allProjects = await this.projectProvider.getProjects();
            const sectionProjects = sectionType === 'online' 
                ? allProjects.filter(p => p.status === 'active')
                : allProjects.filter(p => p.status === 'inactive');
            
            const selectedInSection = sectionProjects.filter(p => this.projectProvider.isProjectSelected(p.id));
            const allSelected = selectedInSection.length === sectionProjects.length;
            
            // Show feedback
            const sectionName = sectionType === 'online' ? 'Online' : 'Offline';
            const icon = allSelected ? '✓' : '○';
            const action = allSelected ? 'selected' : 'deselected';
            
            console.log(`${icon} ${sectionName} section ${action} (${selectedInSection.length}/${sectionProjects.length} projects)`);
            vscode.window.showInformationMessage(
                `${icon} ${sectionName} projects ${action} (${selectedInSection.length}/${sectionProjects.length})`
            );
            
        } catch (error) {
            const message = `Error toggling section selection: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Toggle section selection error:', error);
        }
    }

    /**
     * Get selection status for display
     */
    getSelectionStatus(): { selectedCount: number; totalCount: number } {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjects();
            // Note: We can't easily get total count here without async call to getProjects()
            // This method is provided for future use if needed
            return {
                selectedCount: selectedProjects.length,
                totalCount: 0 // Would need async call to get this
            };
        } catch (error) {
            console.error('Error getting selection status:', error);
            return { selectedCount: 0, totalCount: 0 };
        }
    }

    /**
     * Check if any projects are selected
     */
    hasSelectedProjects(): boolean {
        try {
            return this.projectProvider.getSelectedProjects().length > 0;
        } catch (error) {
            console.error('Error checking if projects are selected:', error);
            return false;
        }
    }

    /**
     * Get list of selected project IDs
     */
    getSelectedProjectIds(): string[] {
        try {
            return this.projectProvider.getSelectedProjects();
        } catch (error) {
            console.error('Error getting selected project IDs:', error);
            return [];
        }
    }

    /**
     * Select specific projects by ID
     */
    async selectProjectsByIds(projectIds: string[]): Promise<void> {
        try {
            // Clear existing selections first
            this.projectProvider.clearSelection();
            
            // Select specified projects
            projectIds.forEach(projectId => {
                if (!this.projectProvider.isProjectSelected(projectId)) {
                    this.projectProvider.toggleProjectSelection(projectId);
                }
            });
            
            console.log(`✅ Selected ${projectIds.length} specific project(s):`, projectIds);
            vscode.window.showInformationMessage(`Selected ${projectIds.length} project(s)`);
            
        } catch (error) {
            const message = `Error selecting specific projects: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Select specific projects error:', error);
        }
    }
}