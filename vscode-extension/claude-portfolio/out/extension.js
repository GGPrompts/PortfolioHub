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
const commandsProvider_1 = require("./commandsProvider");
const cheatSheetProvider_1 = require("./cheatSheetProvider");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Helper function to get project path consistently
function getProjectPath(portfolioPath, project) {
    if (!project) {
        throw new Error('Project is null or undefined');
    }
    if (project.path) {
        if (project.path.startsWith('projects/')) {
            return path.join(portfolioPath, project.path);
        }
        else {
            return path.join(portfolioPath, 'projects', project.path);
        }
    }
    else if (project.id) {
        // Fallback to using the project ID as folder name
        return path.join(portfolioPath, 'projects', project.id);
    }
    else {
        throw new Error(`Project has neither path nor id: ${JSON.stringify(project)}`);
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
        const commandsProvider = new commandsProvider_1.CommandsProvider();
        const cheatSheetProvider = new cheatSheetProvider_1.CheatSheetProvider();
        // Register tree data providers
        vscode.window.registerTreeDataProvider('claudeProjects', projectProvider);
        vscode.window.registerTreeDataProvider('claudeCommands', commandsProvider);
        vscode.window.registerTreeDataProvider('claudeCheatSheet', cheatSheetProvider);
        // Register commands
        const openProjectCommand = vscode.commands.registerCommand('claude-portfolio.openProject', (treeItem) => {
            try {
                // Extract project data from tree item
                const project = treeItem?.project || treeItem;
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
        const showDashboardCommand = vscode.commands.registerCommand('claude-portfolio.showDashboard', () => {
            dashboardPanel_1.DashboardPanel.createOrShow(context.extensionUri, portfolioPath);
        });
        const runProjectCommand = vscode.commands.registerCommand('claude-portfolio.runProject', async (treeItem) => {
            try {
                // Extract project data from tree item
                const project = treeItem?.project || treeItem;
                const projectPath = getProjectPath(portfolioPath, project);
                // Create a new terminal
                const terminal = vscode.window.createTerminal({
                    name: `Run ${project.title}`,
                    cwd: projectPath
                });
                terminal.show();
                // Run the appropriate command based on project
                if (project.buildCommand) {
                    terminal.sendText(project.buildCommand);
                }
                else {
                    terminal.sendText('npm run dev');
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
                if (project?.localPort) {
                    const url = `http://localhost:${project.localPort}`;
                    // Use VS Code's simple browser instead of external browser
                    await vscode.commands.executeCommand('simpleBrowser.show', url);
                    vscode.window.showInformationMessage(`Opened ${project.title} in VS Code browser`);
                }
                else {
                    vscode.window.showErrorMessage('No port information found for this project');
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error opening browser: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        const openInExternalBrowserCommand = vscode.commands.registerCommand('claude-portfolio.openProjectInExternalBrowser', async (treeItem) => {
            try {
                // Extract project data from tree item
                const project = treeItem?.project || treeItem;
                if (project?.localPort) {
                    const url = `http://localhost:${project.localPort}`;
                    // Use external browser
                    vscode.env.openExternal(vscode.Uri.parse(url));
                    vscode.window.showInformationMessage(`Opened ${project.title} in external browser`);
                }
                else {
                    vscode.window.showErrorMessage('No port information found for this project');
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error opening external browser: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        const refreshProjectsCommand = vscode.commands.registerCommand('claude-portfolio.refreshProjects', () => {
            projectProvider.refresh();
        });
        // Quick pick palette for projects
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
        // Status bar item
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        statusBarItem.text = "$(folder-library) Claude Portfolio";
        statusBarItem.tooltip = "Open Claude Portfolio Dashboard";
        statusBarItem.command = 'claude-portfolio.showDashboard';
        statusBarItem.show();
        // Push all disposables
        context.subscriptions.push(openProjectCommand, showDashboardCommand, runProjectCommand, openInBrowserCommand, openInExternalBrowserCommand, refreshProjectsCommand, quickOpenCommand, copyCheatCommand, testCommand, statusBarItem);
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