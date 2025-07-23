import * as vscode from 'vscode';
import { ProjectService } from '../services/projectService';
import { ProjectCommandsProvider } from '../projectCommandsProvider';

/**
 * Individual project operation commands
 */
export class ProjectCommands {
    private projectProvider: any; // Will be injected

    constructor(
        private projectService: ProjectService,
        private projectCommandsProvider: ProjectCommandsProvider
    ) {}

    // Method to inject project provider after construction
    setProjectProvider(projectProvider: any): void {
        this.projectProvider = projectProvider;
    }

    /**
     * Register all project commands
     */
    registerCommands(context: vscode.ExtensionContext): void {
        const commands = [
            vscode.commands.registerCommand('claude-portfolio.runProject', this.runProjectCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.stopProject', this.stopProjectCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.openProjectInBrowser', this.openInBrowserCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.openProjectInExternalBrowser', this.openInExternalBrowserCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.openProject', this.openProjectCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.selectProject', this.selectProjectCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.openAIAssistant', this.openAIAssistantCommand.bind(this))
        ];

        commands.forEach(command => context.subscriptions.push(command));
    }

    /**
     * Start a single project
     */
    private async runProjectCommand(treeItem: any): Promise<void> {
        try {
            const project = treeItem?.project || treeItem;
            const result = await this.projectService.startProject(project);
            
            if (result.success) {
                vscode.window.showInformationMessage(result.message);
            } else {
                vscode.window.showErrorMessage(result.message);
                if (result.error) {
                    console.error(`Run project error:`, result.error);
                }
            }
        } catch (error) {
            const message = `Error running project: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Run project command error:', error);
        }
    }

    /**
     * Stop a single project
     */
    private async stopProjectCommand(treeItem: any): Promise<void> {
        try {
            const project = treeItem?.project || treeItem;
            
            // Show confirmation dialog
            const confirmation = await vscode.window.showInformationMessage(
                `Stop ${project.title}?`,
                { modal: true },
                'Yes', 'No'
            );
            
            if (confirmation !== 'Yes') {
                return;
            }

            const result = await this.projectService.stopProject(project);
            
            if (result.success) {
                vscode.window.showInformationMessage(result.message);
            } else {
                vscode.window.showErrorMessage(result.message);
                if (result.error) {
                    console.error(`Stop project error:`, result.error);
                }
            }
        } catch (error) {
            const message = `Error stopping project: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Stop project command error:', error);
        }
    }

    /**
     * Open project in VS Code integrated browser
     */
    private async openInBrowserCommand(treeItem: any): Promise<void> {
        try {
            const project = treeItem?.project || treeItem;
            const result = await this.projectService.openProjectInBrowser(project);
            
            if (result.success) {
                vscode.window.showInformationMessage(result.message);
            } else {
                vscode.window.showErrorMessage(result.message);
                if (result.error) {
                    console.error(`Open in browser error:`, result.error);
                }
            }
        } catch (error) {
            const message = `Error opening project in browser: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Open in browser command error:', error);
        }
    }

    /**
     * Open project in external browser
     */
    private async openInExternalBrowserCommand(treeItem: any): Promise<void> {
        try {
            const project = treeItem?.project || treeItem;
            const result = await this.projectService.openProjectInExternalBrowser(project);
            
            if (result.success) {
                vscode.window.showInformationMessage(result.message);
            } else {
                vscode.window.showErrorMessage(result.message);
                if (result.error) {
                    console.error(`Open in external browser error:`, result.error);
                }
            }
        } catch (error) {
            const message = `Error opening project in external browser: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Open in external browser command error:', error);
        }
    }

    /**
     * Add project to VS Code workspace
     */
    private async openProjectCommand(treeItem: any): Promise<void> {
        try {
            const project = treeItem?.project || treeItem;
            
            // Update project commands panel to show commands for this project
            this.projectCommandsProvider.setSelectedProject(project);
            
            const result = await this.projectService.openProject(project);
            
            if (result.success) {
                vscode.window.showInformationMessage(result.message);
            } else {
                vscode.window.showErrorMessage(result.message);
                if (result.error) {
                    console.error(`Open project error:`, result.error);
                }
            }
        } catch (error) {
            const message = `Error opening project: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Open project command error:', error);
        }
    }

    /**
     * Select project for commands panel (right-click context menu)
     */
    private async selectProjectCommand(treeItem: any): Promise<void> {
        try {
            const project = treeItem?.project || treeItem;
            
            // Use the project provider's method to set current selection
            if (this.projectProvider) {
                this.projectProvider.setCurrentSelectedProject(project);
            } else {
                // Fallback to direct method
                this.projectCommandsProvider.setSelectedProject(project);
            }
            
            vscode.window.showInformationMessage(`📋 Showing commands for ${project.title}`);
            console.log(`🎯 Selected project: ${project.title} for commands panel`);
        } catch (error) {
            const message = `Error selecting project: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Select project command error:', error);
        }
    }

    /**
     * Open AI Assistant dropdown for project
     */
    private async openAIAssistantCommand(treeItem: any): Promise<void> {
        try {
            const project = treeItem?.project || treeItem;
            
            if (!project || !project.id) {
                vscode.window.showErrorMessage('No project information found');
                return;
            }

            // Show quick pick with AI assistant options
            const options = [
                {
                    label: '🤖 Claude Code',
                    description: 'Open Claude Code in terminal for this project',
                    value: 'claude-code'
                },
                {
                    label: '🌐 ChatGPT',
                    description: 'Open ChatGPT in browser',
                    value: 'chatgpt'
                },
                {
                    label: '🔍 GitHub Copilot',
                    description: 'Open GitHub Copilot chat in VS Code',
                    value: 'copilot'
                },
                {
                    label: '📝 Claude.ai',
                    description: 'Open Claude.ai in browser',
                    value: 'claude-web'
                }
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: `Select AI Assistant for ${project.title}`,
                matchOnDescription: true
            });

            if (!selected) {
                return;
            }

            await this.handleAIAssistantSelection(selected.value, project);
            
        } catch (error) {
            const message = `Error opening AI assistant: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('AI assistant command error:', error);
        }
    }

    /**
     * Handle AI Assistant selection
     */
    private async handleAIAssistantSelection(assistantType: string, project: any): Promise<void> {
        switch (assistantType) {
            case 'claude-code':
                // Open terminal and start Claude Code
                const terminal = vscode.window.createTerminal(`Claude Code - ${project.title}`);
                terminal.show();
                terminal.sendText('claude');
                vscode.window.showInformationMessage(`Opened Claude Code for ${project.title}`);
                break;

            case 'chatgpt':
                await vscode.env.openExternal(vscode.Uri.parse('https://chat.openai.com/'));
                vscode.window.showInformationMessage('Opened ChatGPT in browser');
                break;

            case 'claude-web':
                await vscode.env.openExternal(vscode.Uri.parse('https://claude.ai/'));
                vscode.window.showInformationMessage('Opened Claude.ai in browser');
                break;

            case 'copilot':
                try {
                    await vscode.commands.executeCommand('github.copilot.interactiveEditor.focus');
                    vscode.window.showInformationMessage('Opened GitHub Copilot chat');
                } catch (error) {
                    vscode.window.showErrorMessage('GitHub Copilot extension not available');
                }
                break;

            default:
                vscode.window.showErrorMessage(`Unknown AI assistant type: ${assistantType}`);
        }
    }
}