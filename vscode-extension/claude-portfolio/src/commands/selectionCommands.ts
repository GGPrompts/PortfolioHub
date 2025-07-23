import * as vscode from 'vscode';
import { ProjectProvider } from '../projectProvider';

/**
 * Project selection and checkbox management commands
 */
export class SelectionCommands {
    private projectCommandsProvider: any; // Will be injected

    constructor(private projectProvider: ProjectProvider) {}

    // Method to inject project commands provider
    setProjectCommandsProvider(projectCommandsProvider: any): void {
        this.projectCommandsProvider = projectCommandsProvider;
    }

    /**
     * Register all selection commands
     */
    registerCommands(context: vscode.ExtensionContext): void {
        const commands = [
            vscode.commands.registerCommand('claude-portfolio.toggleProjectSelection', this.toggleProjectSelectionCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.clearProjectSelection', this.clearProjectSelectionCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.selectAllProjects', this.selectAllProjectsCommand.bind(this))
        ];

        commands.forEach(command => context.subscriptions.push(command));
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