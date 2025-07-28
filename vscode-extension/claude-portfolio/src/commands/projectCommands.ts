import * as vscode from 'vscode';
import * as path from 'path';
import { ProjectService } from '../services/projectService';
import { ProjectCommandsProvider } from '../projectCommandsProvider';
import { VSCodeSecurityService } from '../securityService';

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
            vscode.commands.registerCommand('claude-portfolio.openAIAssistant', this.openAIAssistantCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.launchTerminalSystem', this.launchTerminalSystemCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.checkTerminalSystemHealth', this.checkTerminalSystemHealthCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.killTerminalSystemPorts', this.killTerminalSystemPortsCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.openTerminalSystemLogs', this.openTerminalSystemLogsCommand.bind(this))
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
                // Open terminal and start Claude Code securely
                const workspaceRoot = path.join(this.projectService.getPortfolioPath(), '..');
                const success = await VSCodeSecurityService.executeSecureCommand(
                    'claude',
                    `Claude Code - ${project.title}`,
                    workspaceRoot
                );
                
                if (!success) {
                    vscode.window.showErrorMessage('Failed to launch Claude Code - command blocked for security');
                    return;
                }
                
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

    /**
     * Launch the standalone terminal system
     */
    private async launchTerminalSystemCommand(): Promise<void> {
        try {
            const portfolioPath = this.projectService.getPortfolioPath();
            const terminalSystemPath = `${portfolioPath}/projects/standalone-terminal-system`;
            
            const options = [
                {
                    label: "🚀 Start Complete System",
                    description: "Launch both Web UI (3007) and Backend servers (8124, 8125)",
                    value: "complete"
                },
                {
                    label: "🌐 Start Web UI Only",
                    description: "Launch terminal system web interface (port 3007)",
                    value: "webui"
                },
                {
                    label: "🔌 Start Backend Only",
                    description: "Launch WebSocket backend server (ports 8124, 8125)",
                    value: "backend"
                },
                {
                    label: "🤖 Start MCP Server",
                    description: "Launch MCP server for Claude Code integration",
                    value: "mcp"
                },
                {
                    label: "📊 Health Check",
                    description: "Check status of all terminal system components",
                    value: "health"
                },
                {
                    label: "📂 Open Project Folder",
                    description: "Open terminal system project in VS Code",
                    value: "open"
                }
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: "Choose how to launch the standalone terminal system",
                matchOnDescription: true
            });

            if (!selected) {
                return;
            }

            await this.handleTerminalSystemLaunch(selected.value, terminalSystemPath);
            
        } catch (error) {
            const message = `Error launching terminal system: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error("Launch terminal system command error:", error);
        }
    }

    private async handleTerminalSystemLaunch(launchType: string, terminalSystemPath: string): Promise<void> {
        const workspaceRoot = path.dirname(terminalSystemPath);
        
        switch (launchType) {
            case "complete":
                // Start both web UI and backend
                const webuiSuccess = await VSCodeSecurityService.executeSecureCommand(
                    `cd "${terminalSystemPath}" && npm run dev`,
                    "Terminal System Web UI",
                    workspaceRoot
                );
                
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                
                const backendSuccess = await VSCodeSecurityService.executeSecureCommand(
                    `cd "${terminalSystemPath}" && npm run backend:prod`,
                    "Terminal System Backend",
                    workspaceRoot
                );
                
                if (webuiSuccess && backendSuccess) {
                    vscode.window.showInformationMessage("🚀 Complete terminal system started:\n• Web UI (port 3007)\n• Backend (ports 8124, 8125)");
                } else {
                    vscode.window.showErrorMessage("Failed to start complete terminal system");
                }
                break;

            case "webui":
                const webUISuccess = await VSCodeSecurityService.executeSecureCommand(
                    `cd "${terminalSystemPath}" && npm run dev`,
                    "Terminal System Web UI",
                    workspaceRoot
                );
                
                if (webUISuccess) {
                    vscode.window.showInformationMessage("🌐 Terminal system Web UI started on port 3007");
                } else {
                    vscode.window.showErrorMessage("Failed to start terminal system Web UI");
                }
                break;

            case "backend":
                const backendOnlySuccess = await VSCodeSecurityService.executeSecureCommand(
                    `cd "${terminalSystemPath}" && npm run backend:prod`,
                    "Terminal System Backend",
                    workspaceRoot
                );
                
                if (backendOnlySuccess) {
                    vscode.window.showInformationMessage("🔌 Terminal system backend started on ports 8124 & 8125");
                } else {
                    vscode.window.showErrorMessage("Failed to start terminal system backend");
                }
                break;

            case "mcp":
                const mcpSuccess = await VSCodeSecurityService.executeSecureCommand(
                    `cd "${terminalSystemPath}" && npm run mcp:prod`,
                    "Terminal System MCP",
                    workspaceRoot
                );
                
                if (mcpSuccess) {
                    vscode.window.showInformationMessage("🤖 Terminal system MCP server started");
                } else {
                    vscode.window.showErrorMessage("Failed to start terminal system MCP server");
                }
                break;

            case "health":
                // Delegate to health check command
                await this.checkTerminalSystemHealthCommand();
                break;

            case "open":
                const terminalSystemUri = vscode.Uri.file(terminalSystemPath);
                await vscode.commands.executeCommand("vscode.openFolder", terminalSystemUri, { forceNewWindow: true });
                vscode.window.showInformationMessage("📂 Opened terminal system project");
                break;

            default:
                vscode.window.showErrorMessage(`Unknown launch type: ${launchType}`);
        }
    }

    /**
     * Check terminal system health and status
     */
    private async checkTerminalSystemHealthCommand(): Promise<void> {
        try {
            const portfolioPath = this.projectService.getPortfolioPath();
            const terminalSystemPath = `${portfolioPath}/projects/standalone-terminal-system`;
            
            // Check if the terminal system is running on its ports
            const ports = [3007, 8124, 8125]; // Web UI, WebSocket, MCP
            const portStatuses: string[] = [];
            
            for (const port of ports) {
                const success = await VSCodeSecurityService.executeSecureCommand(
                    `netstat -ano | findstr :${port}`,
                    "Port Check",
                    this.projectService.getPortfolioPath()
                );
                
                const portName = port === 3007 ? "Web UI" : port === 8124 ? "WebSocket" : "MCP";
                portStatuses.push(`${portName} (${port}): ${success ? '✅ ACTIVE' : '❌ INACTIVE'}`);
            }
            
            // Show health status
            const healthMessage = `Terminal System Health Check:\n\n${portStatuses.join('\n')}`;
            
            const result = await vscode.window.showInformationMessage(
                healthMessage,
                { modal: true },
                'View Logs', 'Kill Processes', 'Close'
            );
            
            if (result === 'View Logs') {
                await this.openTerminalSystemLogsCommand();
            } else if (result === 'Kill Processes') {
                await this.killTerminalSystemPortsCommand();
            }
            
        } catch (error) {
            const message = `Error checking terminal system health: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Terminal system health check error:', error);
        }
    }

    /**
     * Kill all terminal system processes on their ports
     */
    private async killTerminalSystemPortsCommand(): Promise<void> {
        try {
            const confirmation = await vscode.window.showWarningMessage(
                'Kill all terminal system processes?\n\nThis will stop:\n• Web UI (port 3007)\n• WebSocket Server (port 8124)\n• MCP Server (port 8125)',
                { modal: true },
                'Yes, Kill All', 'Cancel'
            );
            
            if (confirmation !== 'Yes, Kill All') {
                return;
            }

            const ports = [3007, 8124, 8125];
            let killedCount = 0;
            
            for (const port of ports) {
                const success = await VSCodeSecurityService.executeSecureCommand(
                    `powershell "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
                    `Kill Port ${port}`,
                    this.projectService.getPortfolioPath()
                );
                
                if (success) {
                    killedCount++;
                }
            }
            
            if (killedCount > 0) {
                vscode.window.showInformationMessage(`✅ Killed processes on ${killedCount} ports`);
            } else {
                vscode.window.showInformationMessage(`ℹ️ No terminal system processes were running`);
            }
            
        } catch (error) {
            const message = `Error killing terminal system processes: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Kill terminal system processes error:', error);
        }
    }

    /**
     * Open terminal system logs in VS Code
     */
    private async openTerminalSystemLogsCommand(): Promise<void> {
        try {
            const portfolioPath = this.projectService.getPortfolioPath();
            const terminalSystemPath = `${portfolioPath}/projects/standalone-terminal-system`;
            const logsPath = `${terminalSystemPath}/logs`;
            
            // Check if logs directory exists
            const fs = require('fs');
            if (!fs.existsSync(logsPath)) {
                vscode.window.showInformationMessage('No logs directory found. Start the terminal system first to generate logs.');
                return;
            }
            
            // Open logs directory in VS Code
            const logsUri = vscode.Uri.file(logsPath);
            await vscode.commands.executeCommand('vscode.openFolder', logsUri, { forceNewWindow: true });
            
            vscode.window.showInformationMessage('📂 Opened terminal system logs directory');
            
        } catch (error) {
            const message = `Error opening terminal system logs: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Open terminal system logs error:', error);
        }
    }
}
