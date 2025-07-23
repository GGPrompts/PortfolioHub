import * as vscode from 'vscode';
import { VSCodeSecurityService } from '../securityService';
import { ConfigurationService } from '../services/configurationService';
import { DashboardPanel } from '../dashboardPanel';
import { PortfolioWebviewProvider } from '../portfolioWebviewProvider';

/**
 * VS Code workspace and extension management commands
 */
export class WorkspaceCommands {
    constructor(
        private configService: ConfigurationService,
        private portfolioWebviewProvider: PortfolioWebviewProvider,
        private extensionContext: vscode.ExtensionContext
    ) {}

    /**
     * Register all workspace commands
     */
    registerCommands(context: vscode.ExtensionContext): void {
        const commands = [
            vscode.commands.registerCommand('claude-portfolio.showDashboard', this.showDashboardCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.openPortfolio', this.openPortfolioCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.refreshProjects', this.refreshProjectsCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.quickOpen', this.quickOpenCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.buildReact', this.buildReactCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.startDev', this.startDevCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.npmInstall', this.npmInstallCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.reinstallExtension', this.reinstallExtensionCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.buildExtension', this.buildExtensionCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.packageExtension', this.packageExtensionCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.watchExtension', this.watchExtensionCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.openClaude', this.openClaudeCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.test', this.testCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.copyCheatCommand', this.copyCheatCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.projectCommand', this.projectCommandCommand.bind(this))
        ];

        commands.forEach(command => context.subscriptions.push(command));
    }

    /**
     * Show dashboard panel
     */
    private showDashboardCommand(): void {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            DashboardPanel.createOrShow(this.extensionContext.extensionUri, portfolioPath);
        } catch (error) {
            const message = `Error showing dashboard: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Show dashboard error:', error);
        }
    }

    /**
     * Open portfolio in full-screen webview
     */
    private openPortfolioCommand(): void {
        try {
            // Create a full-screen portfolio webview panel
            const panel = vscode.window.createWebviewPanel(
                'claudePortfolioFull',
                'Claude Portfolio',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [vscode.Uri.joinPath(this.extensionContext.extensionUri, 'portfolio-dist')]
                }
            );

            // Use the same HTML generation logic (async)
            this.portfolioWebviewProvider._getHtmlForWebview(panel.webview).then(html => {
                panel.webview.html = html;
            }).catch(error => {
                console.error('Failed to generate webview HTML:', error);
                panel.webview.html = '<html><body>Error loading portfolio</body></html>';
            });

            // Set up the same message handling
            this.portfolioWebviewProvider._setupMessageHandling(panel.webview);
        } catch (error) {
            const message = `Error opening portfolio: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Open portfolio error:', error);
        }
    }

    /**
     * Refresh projects manually
     */
    private refreshProjectsCommand(): void {
        try {
            console.log('🔄 Manual refresh triggered');
            vscode.commands.executeCommand('claude-portfolio.refreshProjects');
            vscode.window.showInformationMessage('Projects refreshed');
        } catch (error) {
            const message = `Error refreshing projects: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Refresh projects error:', error);
        }
    }

    /**
     * Quick open project picker
     */
    private async quickOpenCommand(): Promise<void> {
        try {
            // This would need access to ProjectProvider to get projects
            // For now, show a simple message
            vscode.window.showInformationMessage('Quick open: Use the projects tree view to open projects');
            
            // TODO: Implement actual quick pick when ProjectProvider is accessible
            // const projects = await this.projectProvider.getProjects();
            // const items = projects.map(p => ({
            //     label: p.title,
            //     description: p.description,
            //     detail: `Port: ${p.localPort}`,
            //     project: p
            // }));
            // 
            // const selected = await vscode.window.showQuickPick(items, {
            //     placeHolder: 'Select a project to open'
            // });
            // 
            // if (selected) {
            //     await vscode.commands.executeCommand('claude-portfolio.openProject', selected.project);
            // }
            
        } catch (error) {
            const message = `Error in quick open: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Quick open error:', error);
        }
    }

    /**
     * Build React portfolio app
     */
    private async buildReactCommand(): Promise<void> {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const success = await VSCodeSecurityService.executeSecureCommand(
                'npm run build',
                'Build React Portfolio',
                portfolioPath
            );
            
            if (success) {
                vscode.window.showInformationMessage('React portfolio build completed');
            } else {
                vscode.window.showErrorMessage('React portfolio build failed');
            }
        } catch (error) {
            const message = `Error building React app: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Build React error:', error);
        }
    }

    /**
     * Start development server
     */
    private async startDevCommand(): Promise<void> {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const success = await VSCodeSecurityService.executeSecureCommand(
                'npm run dev',
                'Start Portfolio Dev Server',
                portfolioPath
            );
            
            if (success) {
                vscode.window.showInformationMessage('Portfolio development server started');
            } else {
                vscode.window.showErrorMessage('Failed to start portfolio development server');
            }
        } catch (error) {
            const message = `Error starting dev server: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Start dev error:', error);
        }
    }

    /**
     * Run npm install
     */
    private async npmInstallCommand(): Promise<void> {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const success = await VSCodeSecurityService.executeSecureCommand(
                'npm install',
                'Portfolio npm install',
                portfolioPath
            );
            
            if (success) {
                vscode.window.showInformationMessage('npm install completed');
            } else {
                vscode.window.showErrorMessage('npm install failed');
            }
        } catch (error) {
            const message = `Error running npm install: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('npm install error:', error);
        }
    }

    /**
     * Reinstall VS Code extension
     */
    private async reinstallExtensionCommand(): Promise<void> {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const extensionPath = `${portfolioPath}\\vscode-extension\\claude-portfolio`;
            
            const success = await VSCodeSecurityService.executeSecureCommand(
                '.\\reinstall.ps1',
                'Reinstall Extension',
                extensionPath
            );
            
            if (success) {
                vscode.window.showInformationMessage('Extension reinstallation started - check terminal');
            } else {
                vscode.window.showErrorMessage('Extension reinstallation failed');
            }
        } catch (error) {
            const message = `Error reinstalling extension: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Reinstall extension error:', error);
        }
    }

    /**
     * Build VS Code extension
     */
    private async buildExtensionCommand(): Promise<void> {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const extensionPath = `${portfolioPath}\\vscode-extension\\claude-portfolio`;
            
            const success = await VSCodeSecurityService.executeSecureCommand(
                'npm run compile',
                'Build Extension',
                extensionPath
            );
            
            if (success) {
                vscode.window.showInformationMessage('Extension build completed');
            } else {
                vscode.window.showErrorMessage('Extension build failed');
            }
        } catch (error) {
            const message = `Error building extension: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Build extension error:', error);
        }
    }

    /**
     * Package VS Code extension
     */
    private async packageExtensionCommand(): Promise<void> {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const extensionPath = `${portfolioPath}\\vscode-extension\\claude-portfolio`;
            
            const success = await VSCodeSecurityService.executeSecureCommand(
                'npx vsce package',
                'Package Extension',
                extensionPath
            );
            
            if (success) {
                vscode.window.showInformationMessage('Extension packaging completed');
            } else {
                vscode.window.showErrorMessage('Extension packaging failed');
            }
        } catch (error) {
            const message = `Error packaging extension: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Package extension error:', error);
        }
    }

    /**
     * Watch extension for changes
     */
    private async watchExtensionCommand(): Promise<void> {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const extensionPath = `${portfolioPath}\\vscode-extension\\claude-portfolio`;
            
            const success = await VSCodeSecurityService.executeSecureCommand(
                'npm run watch',
                'Watch Extension',
                extensionPath
            );
            
            if (success) {
                vscode.window.showInformationMessage('Extension watch mode started');
            } else {
                vscode.window.showErrorMessage('Extension watch mode failed to start');
            }
        } catch (error) {
            const message = `Error starting extension watch: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Watch extension error:', error);
        }
    }

    /**
     * Open Claude Code in terminal
     */
    private async openClaudeCommand(): Promise<void> {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const terminal = vscode.window.createTerminal({
                name: 'Claude Code',
                cwd: portfolioPath
            });
            
            terminal.show();
            terminal.sendText('claude');
            vscode.window.showInformationMessage('Claude Code opened in terminal');
        } catch (error) {
            const message = `Error opening Claude: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Open Claude error:', error);
        }
    }

    /**
     * Test command for debugging
     */
    private testCommand(): void {
        try {
            vscode.window.showInformationMessage('Test command executed successfully!');
            console.log('🧪 Test command executed');
        } catch (error) {
            const message = `Error in test command: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Test command error:', error);
        }
    }

    /**
     * Copy cheat sheet command to clipboard
     */
    private async copyCheatCommand(command: string): Promise<void> {
        try {
            if (!command) {
                vscode.window.showErrorMessage('No command provided to copy');
                return;
            }

            await vscode.env.clipboard.writeText(command);
            vscode.window.showInformationMessage(`Copied to clipboard: ${command}`);
        } catch (error) {
            const message = `Error copying command: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Copy cheat command error:', error);
        }
    }

    /**
     * Execute project-specific command
     */
    private async projectCommandCommand(project: any, commandType: string): Promise<void> {
        try {
            if (!project || !project.id) {
                vscode.window.showErrorMessage('No project information found');
                return;
            }

            // Route to appropriate command based on type
            switch (commandType) {
                case 'start':
                    await vscode.commands.executeCommand('claude-portfolio.runProject', project);
                    break;
                case 'stop':
                    await vscode.commands.executeCommand('claude-portfolio.stopProject', project);
                    break;
                case 'browser':
                    await vscode.commands.executeCommand('claude-portfolio.openProjectInBrowser', project);
                    break;
                case 'external':
                    await vscode.commands.executeCommand('claude-portfolio.openProjectInExternalBrowser', project);
                    break;
                case 'workspace':
                    await vscode.commands.executeCommand('claude-portfolio.openProject', project);
                    break;
                default:
                    vscode.window.showErrorMessage(`Unknown command type: ${commandType}`);
            }
        } catch (error) {
            const message = `Error executing project command: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Project command error:', error);
        }
    }
}