"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectionCommands = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Project selection and checkbox management commands
 */
class SelectionCommands {
    constructor(projectProvider) {
        this.projectProvider = projectProvider;
    }
    /**
     * Register all selection commands
     */
    registerCommands(context) {
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
    async toggleProjectSelectionCommand(...args) {
        try {
            console.log('🔘 Toggle project selection called with args:', args);
            // Handle different argument formats from tree view
            let project = null;
            if (args.length > 0) {
                const firstArg = args[0];
                if (firstArg?.project) {
                    // TreeItem with project property
                    project = firstArg.project;
                }
                else if (firstArg?.id && firstArg?.title) {
                    // Direct project object
                    project = firstArg;
                }
                else if (typeof firstArg === 'string') {
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
            // Toggle the selection
            this.projectProvider.toggleProjectSelection(project.id);
            // Check current selection status
            const isNowSelected = this.projectProvider.isProjectSelected(project.id);
            // Show feedback
            const status = isNowSelected ? 'selected' : 'deselected';
            const icon = isNowSelected ? '✓' : '○';
            console.log(`${icon} Project ${project.title} ${status}`);
            // Optionally show a brief notification (uncomment if desired)
            // vscode.window.showInformationMessage(`${icon} ${project.title} ${status}`, { detail: false });
            // The project provider will automatically refresh the view
        }
        catch (error) {
            const message = `Error toggling project selection: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Toggle project selection error:', error);
        }
    }
    /**
     * Clear all project selections
     */
    async clearProjectSelectionCommand() {
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
        }
        catch (error) {
            const message = `Error clearing project selections: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Clear project selections error:', error);
        }
    }
    /**
     * Select all projects
     */
    async selectAllProjectsCommand() {
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
        }
        catch (error) {
            const message = `Error selecting all projects: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Select all projects error:', error);
        }
    }
    /**
     * Get selection status for display
     */
    getSelectionStatus() {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjects();
            // Note: We can't easily get total count here without async call to getProjects()
            // This method is provided for future use if needed
            return {
                selectedCount: selectedProjects.length,
                totalCount: 0 // Would need async call to get this
            };
        }
        catch (error) {
            console.error('Error getting selection status:', error);
            return { selectedCount: 0, totalCount: 0 };
        }
    }
    /**
     * Check if any projects are selected
     */
    hasSelectedProjects() {
        try {
            return this.projectProvider.getSelectedProjects().length > 0;
        }
        catch (error) {
            console.error('Error checking if projects are selected:', error);
            return false;
        }
    }
    /**
     * Get list of selected project IDs
     */
    getSelectedProjectIds() {
        try {
            return this.projectProvider.getSelectedProjects();
        }
        catch (error) {
            console.error('Error getting selected project IDs:', error);
            return [];
        }
    }
    /**
     * Select specific projects by ID
     */
    async selectProjectsByIds(projectIds) {
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
        }
        catch (error) {
            const message = `Error selecting specific projects: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Select specific projects error:', error);
        }
    }
}
exports.SelectionCommands = SelectionCommands;
//# sourceMappingURL=selectionCommands.js.map