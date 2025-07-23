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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const projectProvider_1 = require("./projectProvider");
const dashboardPanel_1 = require("./dashboardPanel");
const projectCommandsProvider_1 = require("./projectCommandsProvider");
const multiProjectCommandsProvider_1 = require("./multiProjectCommandsProvider");
const portfolioWebviewProvider_1 = require("./portfolioWebviewProvider");
const taskProvider_1 = require("./taskProvider");
const securityService_1 = require("./securityService");
const portDetectionService_1 = require("./portDetectionService");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Utility function to open project in VS Code integrated browser
async function openProjectInVSCodeBrowser(project, portToUse) {
    const url = `http://localhost:${portToUse}`;
    // Check if this is a 3D project that needs external browser for pointer lock
    const requires3D = project.requires3D === true ||
        project.id?.includes('3d') ||
        project.title?.toLowerCase().includes('3d');
    if (requires3D) {
        console.log(`🎮 Opening 3D project ${project.title} in external browser for pointer lock support`);
        await vscode.env.openExternal(vscode.Uri.parse(url));
        vscode.window.showInformationMessage(`Opened ${project.title} in external browser (3D/pointer lock support)`);
        return;
    }
    try {
        // Create webview panel for integrated browser experience
        console.log(`🌐 Opening ${project.title} in VS Code integrated browser: ${url}`);
        const panel = vscode.window.createWebviewPanel('projectPreview', `${project.title} - Port ${portToUse}`, vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: []
        });
        // Set the webview HTML to load the project
        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${project.title}</title>
                <style>
                    body, html {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100vh;
                        overflow: hidden;
                        background: #1e1e1e;
                    }
                    iframe {
                        width: 100%;
                        height: 100%;
                        border: none;
                    }
                    .loading {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        color: #cccccc;
                        flex-direction: column;
                        gap: 10px;
                    }
                    .error {
                        padding: 20px;
                        text-align: center;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        color: #f48771;
                        background: #1e1e1e;
                    }
                    .spinner {
                        width: 20px;
                        height: 20px;
                        border: 2px solid #555;
                        border-top: 2px solid #007acc;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div class="loading" id="loading">
                    <div class="spinner"></div>
                    <div>Loading ${project.title}...</div>
                    <small>Port ${portToUse}</small>
                </div>
                <iframe 
                    id="projectFrame" 
                    src="${url}" 
                    title="${project.title}"
                    allow="fullscreen; autoplay; camera; microphone; geolocation"
                    style="display: none;"
                    onload="document.getElementById('loading').style.display='none'; this.style.display='block';"
                    onerror="showError('Failed to load ${project.title}');"
                ></iframe>
                <script>
                    function showError(message) {
                        const loading = document.getElementById('loading');
                        loading.innerHTML = '<div class="error">' + message + '<br><small>Make sure the project is running on port ${portToUse}</small></div>';
                    }
                    
                    // Handle iframe load timeout
                    setTimeout(() => {
                        const frame = document.getElementById('projectFrame');
                        if (frame.style.display === 'none') {
                            showError('Project may not be running on port ${portToUse}');
                        }
                    }, 8000);
                </script>
            </body>
            </html>
        `;
        vscode.window.showInformationMessage(`✅ Opened ${project.title} in VS Code integrated browser (port ${portToUse})`);
        console.log(`✅ VS Code integrated browser opened successfully for ${project.title}`);
    }
    catch (webviewError) {
        console.log('❌ VS Code webview failed, trying Simple Browser API:', webviewError);
        try {
            // Try the Simple Browser API as fallback
            await vscode.commands.executeCommand('simpleBrowser.show', url);
            vscode.window.showInformationMessage(`✅ Opened ${project.title} in VS Code Simple Browser`);
        }
        catch (simpleBrowserError) {
            console.log('❌ Simple Browser also failed, using external browser:', simpleBrowserError);
            await vscode.env.openExternal(vscode.Uri.parse(url));
            vscode.window.showWarningMessage(`Opened ${project.title} in external browser (VS Code browser unavailable)`);
        }
    }
}
// Helper function to get project path consistently - WITH SECURITY VALIDATION
function getProjectPath(portfolioPath, project) {
    if (!project) {
        throw new Error('Project is null or undefined');
    }
    const workspaceRoot = path.join(portfolioPath, '..'); // D:\ClaudeWindows
    let projectPath;
    if (project.path) {
        // Handle different project path formats
        if (path.isAbsolute(project.path)) {
            // Absolute path
            projectPath = project.path;
        }
        else if (project.path.startsWith('projects/')) {
            // Legacy path format: projects/project-name
            projectPath = path.join(portfolioPath, project.path);
        }
        else if (project.path.startsWith('../Projects/')) {
            // New optimized structure: ../Projects/project-name
            projectPath = path.resolve(portfolioPath, project.path);
        }
        else {
            // Other relative paths - resolve from portfolio root
            projectPath = path.resolve(portfolioPath, project.path);
        }
    }
    else if (project.id) {
        // Fallback to using the project ID as folder name in legacy location
        projectPath = path.join(portfolioPath, 'projects', project.id);
    }
    else {
        throw new Error(`Project has neither path nor id: ${JSON.stringify(project)}`);
    }
    // SECURITY: Validate the resolved path is within allowed workspace
    try {
        const normalized = path.normalize(projectPath);
        const resolved = path.resolve(normalized);
        const workspaceAbsolute = path.resolve(workspaceRoot);
        if (!resolved.startsWith(workspaceAbsolute)) {
            throw new Error(`Project path traversal detected: ${project.path || project.id} resolves outside workspace`);
        }
        return resolved;
    }
    catch (error) {
        throw new Error(`Project path validation failed for ${project.id}: ${error}`);
    }
}
function activate(context) {
    console.log('Claude Portfolio extension is now active!');
    try {
        // Get portfolio path from settings
        const config = vscode.workspace.getConfiguration('claudePortfolio');
        const portfolioPath = config.get('portfolioPath') || 'D:\\ClaudeWindows\\claude-dev-portfolio';
        // Create providers
        const projectProvider = new projectProvider_1.ProjectProvider(portfolioPath);
        const projectCommandsProvider = new projectCommandsProvider_1.ProjectCommandsProvider();
        const multiProjectCommandsProvider = new multiProjectCommandsProvider_1.MultiProjectCommandsProvider(projectProvider);
        const portfolioWebviewProvider = new portfolioWebviewProvider_1.PortfolioWebviewProvider(context.extensionUri, portfolioPath);
        const taskProvider = new taskProvider_1.PortfolioTaskProvider(portfolioPath);
        // Register tree data providers
        vscode.window.registerTreeDataProvider('claudeProjects', projectProvider);
        vscode.window.registerTreeDataProvider('claudeProjectCommands', projectCommandsProvider);
        vscode.window.registerTreeDataProvider('claudeMultiProjectCommands', multiProjectCommandsProvider);
        // Register task provider
        const taskProviderDisposable = vscode.tasks.registerTaskProvider(taskProvider_1.PortfolioTaskProvider.taskType, taskProvider);
        // Set up cross-provider communication
        // When project provider refreshes, also refresh webview data
        const originalRefresh = projectProvider.refresh.bind(projectProvider);
        projectProvider.refresh = () => {
            originalRefresh();
            // Trigger webview refresh after a short delay to allow project status to update
            setTimeout(() => {
                portfolioWebviewProvider.refreshProjectData();
            }, 1000);
        };
        // Set up periodic refresh for project status (every 5 seconds)
        const refreshInterval = setInterval(() => {
            console.log('🔄 Refreshing project status...');
            projectProvider.refresh();
            // Also refresh webview data when project status changes
            portfolioWebviewProvider.refreshProjectData();
        }, 5000);
        context.subscriptions.push({ dispose: () => clearInterval(refreshInterval) });
        // Keep the webview provider for full portfolio functionality
        // (Not registering as sidebar view, only for full-screen use)
        // Register commands
        const openProjectCommand = vscode.commands.registerCommand('claude-portfolio.openProject', (treeItem) => {
            try {
                // Extract project data from tree item
                const project = treeItem?.project || treeItem;
                // Update project commands panel to show commands for this project
                projectCommandsProvider.setSelectedProject(project);
                const projectPath = getProjectPath(portfolioPath, project);
                if (fs.existsSync(projectPath)) {
                    // Add folder to workspace
                    const uri = vscode.Uri.file(projectPath);
                    vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0, null, { uri, name: project.title });
                    vscode.window.showInformationMessage(`Opened project: ${project.title}`);
                }
                else {
                    vscode.window.showErrorMessage(`Project directory not found: ${projectPath}`);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error opening project: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        // Add command to select project for commands panel (triggered by right-click menu)
        const selectProjectCommand = vscode.commands.registerCommand('claude-portfolio.selectProject', (treeItem) => {
            try {
                const project = treeItem?.project || treeItem;
                projectCommandsProvider.setSelectedProject(project);
                vscode.window.showInformationMessage(`📋 Showing commands for ${project.title}`);
                console.log(`🎯 Right-click selected project: ${project.title} for commands panel`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error selecting project: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        const showDashboardCommand = vscode.commands.registerCommand('claude-portfolio.showDashboard', () => {
            dashboardPanel_1.DashboardPanel.createOrShow(context.extensionUri, portfolioPath);
        });
        const openPortfolioCommand = vscode.commands.registerCommand('claude-portfolio.openPortfolio', () => {
            // Create a full-screen portfolio webview panel
            const panel = vscode.window.createWebviewPanel('claudePortfolioFull', 'Claude Portfolio', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'portfolio-dist')]
            });
            // Use the same HTML generation logic (async)
            portfolioWebviewProvider._getHtmlForWebview(panel.webview).then(html => {
                panel.webview.html = html;
            }).catch(error => {
                console.error('Failed to generate webview HTML:', error);
                panel.webview.html = '<html><body>Error loading portfolio</body></html>';
            });
            // Set up the same message handling
            portfolioWebviewProvider._setupMessageHandling(panel.webview);
        });
        const runProjectCommand = vscode.commands.registerCommand('claude-portfolio.runProject', async (treeItem) => {
            try {
                // Extract project data from tree item
                const project = treeItem?.project || treeItem;
                const projectPath = getProjectPath(portfolioPath, project);
                // Create a new terminal
                // Run the appropriate command based on project - securely
                const command = project.buildCommand || 'npm run dev';
                // Use broader workspace root to allow external projects
                const workspaceRoot = path.join(portfolioPath, '..'); // D:\ClaudeWindows
                const success = await securityService_1.VSCodeSecurityService.executeProjectCommand(projectPath, command, `Run ${project.title}`, workspaceRoot);
                if (!success) {
                    vscode.window.showErrorMessage(`Failed to execute secure command for ${project.title}`);
                    return;
                }
                vscode.window.showInformationMessage(`Starting ${project.title} on port ${project.localPort}`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error running project: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        const openInBrowserCommand = vscode.commands.registerCommand('claude-portfolio.openProjectInBrowser', async (treeItem) => {
            try {
                // Extract project data from tree item
                const project = treeItem?.project || treeItem;
                if (!project || !project.id) {
                    vscode.window.showErrorMessage('No project information found');
                    return;
                }
                console.log(`🌐 Checking status for ${project.title} before opening browser...`);
                // Use the unified port detection service for consistency
                const portDetectionService = portDetectionService_1.PortDetectionService.getInstance();
                const projectStatuses = await portDetectionService.checkProjectStatuses([project]);
                const projectStatus = projectStatuses.find(status => status.projectId === project.id);
                if (!projectStatus) {
                    vscode.window.showErrorMessage(`Unable to determine status for ${project.title}`);
                    return;
                }
                console.log(`📊 Project ${project.id} status: ${projectStatus.status}`, {
                    ports: projectStatus.ports.map(p => `${p.port}:${p.isRunning ? 'running' : 'stopped'}`),
                    warnings: projectStatus.warnings
                });
                // Find the best port to use
                let portToUse = project.localPort;
                let isRunning = false;
                if (projectStatus.status === 'active' || projectStatus.status === 'multiple') {
                    // Find first running port
                    const runningPort = projectStatus.ports.find(p => p.isRunning);
                    if (runningPort) {
                        portToUse = runningPort.port;
                        isRunning = true;
                    }
                }
                // Show warnings if any exist
                if (projectStatus.warnings.length > 0) {
                    console.log(`⚠️ Warnings for ${project.id}:`, projectStatus.warnings);
                    if (projectStatus.status === 'multiple') {
                        const runningPorts = projectStatus.ports.filter(p => p.isRunning).map(p => p.port);
                        vscode.window.showWarningMessage(`${project.title} has multiple instances running on ports: ${runningPorts.join(', ')}. Opening port ${portToUse}.`);
                    }
                }
                if (portToUse && isRunning) {
                    await openProjectInVSCodeBrowser(project, portToUse);
                }
                else {
                    vscode.window.showWarningMessage(`${project.title} is not currently running. Please start the project first.`);
                }
            }
            catch (error) {
                console.error('Error in openProjectInBrowser:', error);
                vscode.window.showErrorMessage(`Error opening browser: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        const openInExternalBrowserCommand = vscode.commands.registerCommand('claude-portfolio.openProjectInExternalBrowser', async (treeItem) => {
            try {
                // Extract project data from tree item
                const project = treeItem?.project || treeItem;
                if (!project || !project.id) {
                    vscode.window.showErrorMessage('No project information found');
                    return;
                }
                console.log(`🌍 Checking status for ${project.title} before opening external browser...`);
                // Use the unified port detection service for consistency
                const portDetectionService = portDetectionService_1.PortDetectionService.getInstance();
                const projectStatuses = await portDetectionService.checkProjectStatuses([project]);
                const projectStatus = projectStatuses.find(status => status.projectId === project.id);
                if (!projectStatus) {
                    vscode.window.showErrorMessage(`Unable to determine status for ${project.title}`);
                    return;
                }
                // Find the best port to use
                let portToUse = project.localPort;
                let isRunning = false;
                if (projectStatus.status === 'active' || projectStatus.status === 'multiple') {
                    // Find first running port
                    const runningPort = projectStatus.ports.find(p => p.isRunning);
                    if (runningPort) {
                        portToUse = runningPort.port;
                        isRunning = true;
                    }
                }
                if (portToUse && isRunning) {
                    const url = `http://localhost:${portToUse}`;
                    // Use external browser
                    vscode.env.openExternal(vscode.Uri.parse(url));
                    vscode.window.showInformationMessage(`Opened ${project.title} in external browser (port ${portToUse})`);
                }
                else {
                    vscode.window.showWarningMessage(`${project.title} is not currently running. Please start the project first.`);
                }
            }
            catch (error) {
                console.error('Error in openProjectInExternalBrowser:', error);
                vscode.window.showErrorMessage(`Error opening external browser: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        const refreshProjectsCommand = vscode.commands.registerCommand('claude-portfolio.refreshProjects', () => {
            projectProvider.refresh();
        });
        // Copy cheat command to clipboard
        const copyCheatCommand = vscode.commands.registerCommand('claude-portfolio.copyCheatCommand', async (command) => {
            try {
                await vscode.env.clipboard.writeText(command);
                vscode.window.showInformationMessage(`Copied to clipboard: ${command}`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to copy command: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        // Test command (keep for verification)
        const testCommand = vscode.commands.registerCommand('claude-portfolio.test', () => {
            vscode.window.showInformationMessage('Claude Portfolio extension is working!');
        });
        // Add missing quick open command to package.json
        const quickOpenCommand = vscode.commands.registerCommand('claude-portfolio.quickOpen', async () => {
            try {
                const projects = await projectProvider.getProjects();
                const items = projects.map(p => ({
                    label: p.title,
                    description: p.description,
                    detail: `Port: ${p.localPort} | Status: ${p.status}`,
                    project: p
                }));
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a project to open',
                    matchOnDescription: true,
                    matchOnDetail: true
                });
                if (selected) {
                    vscode.commands.executeCommand('claude-portfolio.openProject', selected.project);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error in quick open: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        // Status bar item
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        statusBarItem.text = "$(folder-library) Claude Portfolio";
        statusBarItem.tooltip = "Open Full Claude Portfolio";
        statusBarItem.command = 'claude-portfolio.openPortfolio';
        statusBarItem.show();
        // Development Commands
        const buildReactCommand = vscode.commands.registerCommand('claude-portfolio.buildReact', async () => {
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm run build', 'Build React App', portfolioPath);
            if (success) {
                vscode.window.showInformationMessage('Building React app...');
            }
            else {
                vscode.window.showErrorMessage('Failed to execute build command');
            }
        });
        const startDevCommand = vscode.commands.registerCommand('claude-portfolio.startDev', async () => {
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm run dev', 'Portfolio Dev Server', portfolioPath);
            if (success) {
                vscode.window.showInformationMessage('Starting portfolio dev server...');
            }
            else {
                vscode.window.showErrorMessage('Failed to execute dev server command');
            }
        });
        const npmInstallCommand = vscode.commands.registerCommand('claude-portfolio.npmInstall', async () => {
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm install', 'NPM Install', portfolioPath);
            if (success) {
                vscode.window.showInformationMessage('Installing dependencies...');
            }
            else {
                vscode.window.showErrorMessage('Failed to execute npm install command');
            }
        });
        const killAllServersCommand = vscode.commands.registerCommand('claude-portfolio.killAllServers', async () => {
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('.\\scripts\\kill-all-servers.ps1', 'Kill All Servers', portfolioPath);
            if (success) {
                vscode.window.showInformationMessage('Killing all dev servers...');
            }
            else {
                vscode.window.showErrorMessage('Failed to execute kill all command');
            }
        });
        const startAllProjectsCommand = vscode.commands.registerCommand('claude-portfolio.startAllProjects', async () => {
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('.\\scripts\\start-all-enhanced.ps1', 'Start All Projects', portfolioPath);
            if (success) {
                vscode.window.showInformationMessage('Starting all projects...');
            }
            else {
                vscode.window.showErrorMessage('Failed to execute start all command');
            }
        });
        // Extension Commands
        const reinstallExtensionCommand = vscode.commands.registerCommand('claude-portfolio.reinstallExtension', async () => {
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm run compile && npx vsce package && code --install-extension .\\claude-portfolio-0.0.1.vsix --force', 'Reinstall Extension', path.join(portfolioPath, 'vscode-extension', 'claude-portfolio'));
            if (success) {
                vscode.window.showInformationMessage('Rebuilding and reinstalling extension...');
            }
            else {
                vscode.window.showErrorMessage('Failed to execute extension reinstall command');
            }
        });
        const buildExtensionCommand = vscode.commands.registerCommand('claude-portfolio.buildExtension', async () => {
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm run compile', 'Build Extension', path.join(portfolioPath, 'vscode-extension', 'claude-portfolio'));
            if (success) {
                vscode.window.showInformationMessage('Compiling extension TypeScript...');
            }
            else {
                vscode.window.showErrorMessage('Failed to execute extension build command');
            }
        });
        const packageExtensionCommand = vscode.commands.registerCommand('claude-portfolio.packageExtension', async () => {
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npx vsce package', 'Package Extension', path.join(portfolioPath, 'vscode-extension', 'claude-portfolio'));
            if (success) {
                vscode.window.showInformationMessage('Creating VSIX package...');
            }
            else {
                vscode.window.showErrorMessage('Failed to execute extension package command');
            }
        });
        const watchExtensionCommand = vscode.commands.registerCommand('claude-portfolio.watchExtension', async () => {
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('npm run watch', 'Watch Extension', path.join(portfolioPath, 'vscode-extension', 'claude-portfolio'));
            if (success) {
                vscode.window.showInformationMessage('Watching extension for changes...');
            }
            else {
                vscode.window.showErrorMessage('Failed to execute extension watch command');
            }
        });
        // AI Assistant Commands
        const openClaudeCommand = vscode.commands.registerCommand('claude-portfolio.openClaude', async () => {
            const success = await securityService_1.VSCodeSecurityService.executeSecureCommand('claude', 'Claude', portfolioPath);
            if (success) {
                vscode.window.showInformationMessage('Starting Claude Code...');
            }
            else {
                vscode.window.showErrorMessage('Failed to execute Claude command');
            }
        });
        // AI Assistant Dropdown Command
        // Add generic project command execution
        const projectCommandCommand = vscode.commands.registerCommand('claude-portfolio.projectCommand', async (project, commandType) => {
            try {
                if (!project) {
                    vscode.window.showErrorMessage('No project provided for command');
                    return;
                }
                const projectPath = getProjectPath(portfolioPath, project);
                const workspaceRoot = path.join(portfolioPath, '..'); // D:\ClaudeWindows
                let command = '';
                let terminalName = '';
                // Determine command based on type (we'll expand this)
                switch (commandType) {
                    case 'npm install':
                        command = 'npm install';
                        terminalName = `${project.title} - Install`;
                        break;
                    case 'npm run build':
                        command = 'npm run build';
                        terminalName = `${project.title} - Build`;
                        break;
                    case 'npm test':
                        command = 'npm test';
                        terminalName = `${project.title} - Test`;
                        break;
                    case 'git status':
                        command = 'git status';
                        terminalName = `${project.title} - Git Status`;
                        break;
                    case 'git pull':
                        command = 'git pull';
                        terminalName = `${project.title} - Git Pull`;
                        break;
                    default:
                        vscode.window.showErrorMessage(`Unknown command type: ${commandType}`);
                        return;
                }
                const success = await securityService_1.VSCodeSecurityService.executeProjectCommand(projectPath, command, terminalName, workspaceRoot);
                if (!success) {
                    vscode.window.showErrorMessage(`Failed to execute secure command: ${command}`);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error executing project command: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        // Add stop project command
        // Checkbox selection commands
        const toggleProjectSelectionCommand = vscode.commands.registerCommand('claude-portfolio.toggleProjectSelection', async (...args) => {
            try {
                console.log('🔍 toggleProjectSelection called with args:', args);
                // Handle different argument formats
                let project = null;
                if (args.length > 0) {
                    const firstArg = args[0];
                    // Case 1: TreeItem with project property
                    if (firstArg && typeof firstArg === 'object' && firstArg.project) {
                        project = firstArg.project;
                        console.log('📋 Using project from TreeItem.project:', project.id);
                    }
                    // Case 2: Direct project object
                    else if (firstArg && typeof firstArg === 'object' && firstArg.id) {
                        project = firstArg;
                        console.log('📋 Using direct project object:', project.id);
                    }
                    // Case 3: Project ID string
                    else if (typeof firstArg === 'string') {
                        // Find project by ID
                        const projects = await projectProvider.getProjects();
                        project = projects.find(p => p.id === firstArg);
                        console.log('📋 Found project by ID:', firstArg, project ? 'found' : 'not found');
                    }
                }
                if (!project || !project.id) {
                    console.error('❌ No valid project found in arguments:', args);
                    vscode.window.showErrorMessage('Unable to identify project for selection toggle');
                    return;
                }
                // Toggle checkbox selection
                projectProvider.toggleProjectSelection(project.id);
                await multiProjectCommandsProvider.refresh();
                // ALSO update the single project commands panel to show commands for this project
                projectCommandsProvider.setSelectedProject(project);
                console.log(`🎯 Successfully selected project: ${project.title} for commands panel`);
            }
            catch (error) {
                console.error('❌ Error in toggleProjectSelection:', error, 'Args:', args);
                vscode.window.showErrorMessage(`Error toggling selection: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        const clearProjectSelectionCommand = vscode.commands.registerCommand('claude-portfolio.clearProjectSelection', async () => {
            projectProvider.clearSelection();
            await multiProjectCommandsProvider.refresh();
            // Keep the last selected project in the single project commands panel
            vscode.window.showInformationMessage('Cleared project selection');
        });
        const selectAllProjectsCommand = vscode.commands.registerCommand('claude-portfolio.selectAllProjects', async () => {
            projectProvider.selectAll();
            await multiProjectCommandsProvider.refresh();
            const count = projectProvider.getSelectedProjects().length;
            vscode.window.showInformationMessage(`Selected all ${count} projects`);
        });
        // Batch operation commands
        const batchStartProjectsCommand = vscode.commands.registerCommand('claude-portfolio.batchStartProjects', async () => {
            const selectedProjects = projectProvider.getSelectedProjectsData().filter(p => p.status !== 'active');
            if (selectedProjects.length === 0) {
                vscode.window.showWarningMessage('No stopped projects selected');
                return;
            }
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Starting ${selectedProjects.length} projects...`,
                cancellable: false
            }, async (progress) => {
                for (let i = 0; i < selectedProjects.length; i++) {
                    const project = selectedProjects[i];
                    progress.report({
                        message: `Starting ${project.title}...`,
                        increment: (100 / selectedProjects.length)
                    });
                    // Start project using existing command
                    await vscode.commands.executeCommand('claude-portfolio.runProject', project);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between starts
                }
            });
            vscode.window.showInformationMessage(`Started ${selectedProjects.length} projects`);
        });
        const batchStopProjectsCommand = vscode.commands.registerCommand('claude-portfolio.batchStopProjects', async () => {
            const selectedProjects = projectProvider.getSelectedProjectsData().filter(p => p.status === 'active');
            if (selectedProjects.length === 0) {
                vscode.window.showWarningMessage('No running projects selected');
                return;
            }
            for (const project of selectedProjects) {
                await vscode.commands.executeCommand('claude-portfolio.stopProject', project);
            }
            vscode.window.showInformationMessage(`Stopped ${selectedProjects.length} projects`);
        });
        const batchOpenBrowserCommand = vscode.commands.registerCommand('claude-portfolio.batchOpenBrowser', async () => {
            const selectedProjects = projectProvider.getSelectedProjectsData().filter(p => p.status === 'active');
            if (selectedProjects.length === 0) {
                vscode.window.showWarningMessage('No running projects selected');
                return;
            }
            for (const project of selectedProjects) {
                await vscode.commands.executeCommand('claude-portfolio.openProjectInBrowser', project);
                await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between opens
            }
            vscode.window.showInformationMessage(`Opened ${selectedProjects.length} projects in browser`);
        });
        const stopProjectCommand = vscode.commands.registerCommand('claude-portfolio.stopProject', async (treeItem) => {
            try {
                const project = treeItem?.project || treeItem;
                const projectPath = getProjectPath(portfolioPath, project);
                // Find and kill terminals for this project
                const terminals = vscode.window.terminals.filter(t => t.name.includes(project.title) || t.name.includes(project.id));
                if (terminals.length > 0) {
                    for (const terminal of terminals) {
                        terminal.sendText('\x03'); // Send Ctrl+C
                        setTimeout(() => terminal.dispose(), 1000);
                    }
                    vscode.window.showInformationMessage(`Stopped ${project.title} servers`);
                    // Refresh project status
                    setTimeout(() => {
                        projectProvider.refresh();
                        portfolioWebviewProvider.refreshProjectData();
                    }, 2000);
                }
                else {
                    vscode.window.showWarningMessage(`No running terminals found for ${project.title}`);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error stopping project: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        const openAIAssistantCommand = vscode.commands.registerCommand('claude-portfolio.openAIAssistant', async (treeItem) => {
            try {
                // Extract project data from tree item
                const project = treeItem?.project || treeItem;
                const projectPath = getProjectPath(portfolioPath, project);
                // Define AI assistants with their commands
                const assistants = [
                    {
                        label: '$(sparkle) Claude',
                        description: 'Claude Code - AI pair programming',
                        detail: 'Runs: claude',
                        value: 'claude'
                    },
                    {
                        label: '$(sparkle) Gemini',
                        description: 'Gemini CLI - Google AI assistant',
                        detail: 'Runs: gemini',
                        value: 'gemini'
                    },
                    {
                        label: '$(comment-discussion) Copilot',
                        description: 'GitHub Copilot Chat',
                        detail: 'Hotkey: Ctrl+Alt+I (Windows/Linux) or Cmd+I (Mac)',
                        value: 'copilot'
                    }
                ];
                const selected = await vscode.window.showQuickPick(assistants, {
                    placeHolder: `Select AI assistant for ${project.title}`,
                    matchOnDescription: true,
                    matchOnDetail: true
                });
                if (selected) {
                    if (selected.value === 'copilot') {
                        // For Copilot, show the hotkey info
                        const terminal = vscode.window.createTerminal({
                            name: `Copilot - ${project.title}`,
                            cwd: projectPath
                        });
                        terminal.show();
                        // Use secure echo commands
                        const commands = [
                            `echo "GitHub Copilot Chat: Press Ctrl+Alt+I (Windows/Linux) or Cmd+I (Mac) to open"`,
                            `echo "Project: ${project.title}"`,
                            `echo "Path: ${projectPath}"`
                        ];
                        for (const cmd of commands) {
                            if (securityService_1.VSCodeSecurityService.validateCommand(cmd)) {
                                terminal.sendText(cmd);
                            }
                            else {
                                console.warn(`Copilot echo command blocked: ${cmd}`);
                            }
                        }
                        vscode.window.showInformationMessage('Use Ctrl+Alt+I (Windows/Linux) or Cmd+I (Mac) to open GitHub Copilot Chat');
                    }
                    else {
                        // For Claude and Gemini, run the command securely
                        // Use broader workspace root to allow external projects
                        const workspaceRoot = path.join(portfolioPath, '..'); // D:\ClaudeWindows
                        const success = await securityService_1.VSCodeSecurityService.executeProjectCommand(projectPath, selected.value, `${selected.value === 'claude' ? 'Claude' : 'Gemini'} - ${project.title}`, workspaceRoot);
                        if (success) {
                            vscode.window.showInformationMessage(`Starting ${selected.value === 'claude' ? 'Claude Code' : 'Gemini CLI'} for ${project.title}...`);
                        }
                        else {
                            vscode.window.showErrorMessage(`Failed to execute secure command for ${project.title}`);
                        }
                    }
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error opening AI assistant: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        // Push all disposables
        context.subscriptions.push(openProjectCommand, selectProjectCommand, showDashboardCommand, openPortfolioCommand, runProjectCommand, openInBrowserCommand, openInExternalBrowserCommand, refreshProjectsCommand, copyCheatCommand, testCommand, quickOpenCommand, statusBarItem, taskProviderDisposable, 
        // New commands
        buildReactCommand, startDevCommand, npmInstallCommand, killAllServersCommand, startAllProjectsCommand, reinstallExtensionCommand, buildExtensionCommand, packageExtensionCommand, watchExtensionCommand, openClaudeCommand, openAIAssistantCommand, 
        // Project-specific commands
        projectCommandCommand, stopProjectCommand, 
        // Checkbox and batch commands
        toggleProjectSelectionCommand, clearProjectSelectionCommand, selectAllProjectsCommand, batchStartProjectsCommand, batchStopProjectsCommand, batchOpenBrowserCommand);
        console.log('Claude Portfolio extension fully activated!');
    }
    catch (error) {
        console.error('Extension activation failed:', error);
        vscode.window.showErrorMessage(`Claude Portfolio extension failed to activate: ${error}`);
    }
}
function deactivate() {
    // Clean up
}
//# sourceMappingURL=extension.js.map