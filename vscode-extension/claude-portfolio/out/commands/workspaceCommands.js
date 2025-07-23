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
exports.WorkspaceCommands = void 0;
const vscode = __importStar(require("vscode"));
const securityService_1 = require("../securityService");
const dashboardPanel_1 = require("../dashboardPanel");
/**
 * VS Code workspace and extension management commands
 */
class WorkspaceCommands {
    constructor(configService, portfolioWebviewProvider, extensionContext) {
        this.configService = configService;
        this.portfolioWebviewProvider = portfolioWebviewProvider;
        this.extensionContext = extensionContext;
    }
    /**
     * Register all workspace commands
     */
    registerCommands(context) {
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
            vscode.commands.registerCommand('claude-portfolio.projectCommand', this.projectCommandCommand.bind(this)),
            // Portfolio Server Commands
            vscode.commands.registerCommand('claude-portfolio.startPortfolioServer', this.startPortfolioServerCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.startVSCodeServer', this.startVSCodeServerCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.startAllServers', this.startAllServersCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.startAllProjectsTabbed', this.startAllProjectsTabbedCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.createNewProject', this.createNewProjectCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.checkPortfolioports', this.checkPortfolioPortsCommand.bind(this))
        ];
        commands.forEach(command => context.subscriptions.push(command));
    }
    /**
     * Show dashboard panel
     */
    showDashboardCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            dashboardPanel_1.DashboardPanel.createOrShow(this.extensionContext.extensionUri, portfolioPath);
        }
        catch (error) {
            const message = `Error showing dashboard: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Show dashboard error:', error);
        }
    }
    /**
     * Open portfolio in full-screen webview
     */
    openPortfolioCommand() {
        try {
            // Create a full-screen portfolio webview panel
            const panel = vscode.window.createWebviewPanel('claudePortfolioFull', 'Claude Portfolio', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(this.extensionContext.extensionUri, 'portfolio-dist')]
            });
            // Use the same HTML generation logic (async)
            this.portfolioWebviewProvider._getHtmlForWebview(panel.webview).then(html => {
                panel.webview.html = html;
            }).catch(error => {
                console.error('Failed to generate webview HTML:', error);
                panel.webview.html = '<html><body>Error loading portfolio</body></html>';
            });
            // Set up the same message handling
            this.portfolioWebviewProvider._setupMessageHandling(panel.webview);
        }
        catch (error) {
            const message = `Error opening portfolio: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Open portfolio error:', error);
        }
    }
    /**
     * Refresh projects manually
     */
    refreshProjectsCommand() {
        try {
            console.log('🔄 Manual refresh triggered');
            vscode.commands.executeCommand('claude-portfolio.refreshProjects');
            vscode.window.showInformationMessage('Projects refreshed');
        }
        catch (error) {
            const message = `Error refreshing projects: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Refresh projects error:', error);
        }
    }
    /**
     * Quick open project picker
     */
    async quickOpenCommand() {
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
        }
        catch (error) {
            const message = `Error in quick open: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Quick open error:', error);
        }
    }
    /**
     * Build React portfolio app
     */
    async buildReactCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm run build', 'Build React Portfolio', portfolioPath);
            if (success) {
                vscode.window.showInformationMessage('React portfolio build completed');
            }
            else {
                vscode.window.showErrorMessage('React portfolio build failed');
            }
        }
        catch (error) {
            const message = `Error building React app: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Build React error:', error);
        }
    }
    /**
     * Start development server
     */
    async startDevCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm run dev', 'Start Portfolio Dev Server', portfolioPath);
            if (success) {
                vscode.window.showInformationMessage('Portfolio development server started');
            }
            else {
                vscode.window.showErrorMessage('Failed to start portfolio development server');
            }
        }
        catch (error) {
            const message = `Error starting dev server: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Start dev error:', error);
        }
    }
    /**
     * Run npm install
     */
    async npmInstallCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm install', 'Portfolio npm install', portfolioPath);
            if (success) {
                vscode.window.showInformationMessage('npm install completed');
            }
            else {
                vscode.window.showErrorMessage('npm install failed');
            }
        }
        catch (error) {
            const message = `Error running npm install: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('npm install error:', error);
        }
    }
    /**
     * Reinstall VS Code extension
     */
    async reinstallExtensionCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const extensionPath = `${portfolioPath}\\vscode-extension\\claude-portfolio`;
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('.\\reinstall.ps1', 'Reinstall Extension', extensionPath);
            if (success) {
                vscode.window.showInformationMessage('Extension reinstallation started - check terminal');
            }
            else {
                vscode.window.showErrorMessage('Extension reinstallation failed');
            }
        }
        catch (error) {
            const message = `Error reinstalling extension: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Reinstall extension error:', error);
        }
    }
    /**
     * Build VS Code extension
     */
    async buildExtensionCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const extensionPath = `${portfolioPath}\\vscode-extension\\claude-portfolio`;
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm run compile', 'Build Extension', extensionPath);
            if (success) {
                vscode.window.showInformationMessage('Extension build completed');
            }
            else {
                vscode.window.showErrorMessage('Extension build failed');
            }
        }
        catch (error) {
            const message = `Error building extension: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Build extension error:', error);
        }
    }
    /**
     * Package VS Code extension
     */
    async packageExtensionCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const extensionPath = `${portfolioPath}\\vscode-extension\\claude-portfolio`;
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npx vsce package', 'Package Extension', extensionPath);
            if (success) {
                vscode.window.showInformationMessage('Extension packaging completed');
            }
            else {
                vscode.window.showErrorMessage('Extension packaging failed');
            }
        }
        catch (error) {
            const message = `Error packaging extension: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Package extension error:', error);
        }
    }
    /**
     * Watch extension for changes
     */
    async watchExtensionCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const extensionPath = `${portfolioPath}\\vscode-extension\\claude-portfolio`;
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm run watch', 'Watch Extension', extensionPath);
            if (success) {
                vscode.window.showInformationMessage('Extension watch mode started');
            }
            else {
                vscode.window.showErrorMessage('Extension watch mode failed to start');
            }
        }
        catch (error) {
            const message = `Error starting extension watch: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Watch extension error:', error);
        }
    }
    /**
     * Open Claude Code in terminal
     */
    async openClaudeCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const terminal = vscode.window.createTerminal({
                name: 'Claude Code',
                cwd: portfolioPath
            });
            terminal.show();
            terminal.sendText('claude');
            vscode.window.showInformationMessage('Claude Code opened in terminal');
        }
        catch (error) {
            const message = `Error opening Claude: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Open Claude error:', error);
        }
    }
    /**
     * Test command for debugging
     */
    testCommand() {
        try {
            vscode.window.showInformationMessage('Test command executed successfully!');
            console.log('🧪 Test command executed');
        }
        catch (error) {
            const message = `Error in test command: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Test command error:', error);
        }
    }
    /**
     * Copy cheat sheet command to clipboard
     */
    async copyCheatCommand(command) {
        try {
            if (!command) {
                vscode.window.showErrorMessage('No command provided to copy');
                return;
            }
            await vscode.env.clipboard.writeText(command);
            vscode.window.showInformationMessage(`Copied to clipboard: ${command}`);
        }
        catch (error) {
            const message = `Error copying command: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Copy cheat command error:', error);
        }
    }
    /**
     * Execute project-specific command
     */
    async projectCommandCommand(project, commandType) {
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
        }
        catch (error) {
            const message = `Error executing project command: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Project command error:', error);
        }
    }
    /**
     * Start portfolio development server
     */
    async startPortfolioServerCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm run dev', 'Start Portfolio Server', portfolioPath);
            if (success) {
                vscode.window.showInformationMessage('Portfolio server started - check terminal for URL');
            }
            else {
                vscode.window.showErrorMessage('Failed to start portfolio server');
            }
        }
        catch (error) {
            const message = `Error starting portfolio server: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Start portfolio server error:', error);
        }
    }
    /**
     * Start VS Code server with Simple Browser
     */
    async startVSCodeServerCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            // First start the portfolio server
            const startSuccess = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm run dev', 'Start VS Code Server', portfolioPath);
            if (startSuccess) {
                // Wait a moment for server to start, then open in Simple Browser
                setTimeout(async () => {
                    try {
                        await vscode.commands.executeCommand('simpleBrowser.show', 'http://localhost:5173');
                        vscode.window.showInformationMessage('VS Code server started - opened in Simple Browser');
                    }
                    catch (error) {
                        console.error('Failed to open Simple Browser:', error);
                        vscode.window.showInformationMessage('VS Code server started - manually open http://localhost:5173');
                    }
                }, 3000); // 3 second delay for server startup
            }
            else {
                vscode.window.showErrorMessage('Failed to start VS Code server');
            }
        }
        catch (error) {
            const message = `Error starting VS Code server: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Start VS Code server error:', error);
        }
    }
    /**
     * Start all servers (portfolio + projects)
     */
    async startAllServersCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            // Show confirmation
            const confirmation = await vscode.window.showInformationMessage('Start portfolio server and all project servers?', { modal: true }, 'Yes', 'No');
            if (confirmation !== 'Yes') {
                return;
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Starting all servers...',
                cancellable: false
            }, async (progress) => {
                // Start portfolio server
                progress.report({ increment: 25, message: 'Starting portfolio server...' });
                const portfolioSuccess = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm run dev', 'Start Portfolio Server', portfolioPath);
                // Start all project servers using PowerShell script
                progress.report({ increment: 50, message: 'Starting project servers...' });
                const scriptsSuccess = await securityService_1.VSCodeSecurityService.executeSecureCommand('.\\scripts\\start-all-tabbed.ps1', 'Start All Project Servers', portfolioPath);
                progress.report({ increment: 100, message: 'All servers starting...' });
                if (portfolioSuccess && scriptsSuccess) {
                    vscode.window.showInformationMessage('All servers started - check terminals for status');
                }
                else {
                    vscode.window.showWarningMessage('Some servers may have failed to start - check terminals');
                }
            });
        }
        catch (error) {
            const message = `Error starting all servers: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Start all servers error:', error);
        }
    }
    /**
     * Start all projects in tabbed terminal (PowerShell script)
     */
    async startAllProjectsTabbedCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('.\\scripts\\start-all-tabbed.ps1', 'Start All Projects Tabbed', portfolioPath);
            if (success) {
                vscode.window.showInformationMessage('All projects starting in tabbed terminal - check Windows Terminal');
            }
            else {
                vscode.window.showErrorMessage('Failed to start projects in tabbed terminal');
            }
        }
        catch (error) {
            const message = `Error starting tabbed projects: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Start tabbed projects error:', error);
        }
    }
    /**
     * Create new project using PowerShell script
     */
    async createNewProjectCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            // Get project details from user
            const projectName = await vscode.window.showInputBox({
                prompt: 'Enter project name (no spaces, lowercase)',
                placeHolder: 'my-new-project',
                validateInput: (value) => {
                    if (!value)
                        return 'Project name is required';
                    if (!/^[a-z0-9-]+$/.test(value))
                        return 'Project name must be lowercase letters, numbers, and hyphens only';
                    return null;
                }
            });
            if (!projectName)
                return;
            const description = await vscode.window.showInputBox({
                prompt: 'Enter project description',
                placeHolder: 'A new project for the portfolio'
            });
            if (!description)
                return;
            // Execute PowerShell script
            const command = `.\\scripts\\create-project.ps1 -ProjectName "${projectName}" -Description "${description}"`;
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand(command, 'Create New Project', portfolioPath);
            if (success) {
                vscode.window.showInformationMessage(`Project "${projectName}" created successfully - check terminal for details`);
            }
            else {
                vscode.window.showErrorMessage('Failed to create new project');
            }
        }
        catch (error) {
            const message = `Error creating new project: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Create new project error:', error);
        }
    }
    /**
     * Check portfolio ports status
     */
    async checkPortfolioPortsCommand() {
        try {
            const portfolioPath = this.configService.getPortfolioPath();
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('netstat -ano | Select-String ":300[0-9]"', 'Check Portfolio Ports', portfolioPath);
            if (success) {
                vscode.window.showInformationMessage('Portfolio ports status displayed in terminal');
            }
            else {
                vscode.window.showErrorMessage('Failed to check portfolio ports');
            }
        }
        catch (error) {
            const message = `Error checking portfolio ports: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Check portfolio ports error:', error);
        }
    }
}
exports.WorkspaceCommands = WorkspaceCommands;
//# sourceMappingURL=workspaceCommands.js.map