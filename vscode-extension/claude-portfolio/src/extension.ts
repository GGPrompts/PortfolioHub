import * as vscode from 'vscode';
import { ProjectProvider } from './projectProvider';
import { DashboardPanel } from './dashboardPanel';
import { CommandsProvider } from './commandsProvider';
import { CheatSheetProvider } from './cheatSheetProvider';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('Claude Portfolio extension is now active!');

    // Get portfolio path from settings
    const config = vscode.workspace.getConfiguration('claudePortfolio');
    const portfolioPath = config.get<string>('portfolioPath') || 'D:\\ClaudeWindows\\claude-dev-portfolio';

    // Create providers
    const projectProvider = new ProjectProvider(portfolioPath);
    const commandsProvider = new CommandsProvider();
    const cheatSheetProvider = new CheatSheetProvider();

    // Register tree data providers
    vscode.window.registerTreeDataProvider('claudeProjects', projectProvider);
    vscode.window.registerTreeDataProvider('claudeCommands', commandsProvider);
    vscode.window.registerTreeDataProvider('claudeCheatSheet', cheatSheetProvider);

    // Register commands
    const openProjectCommand = vscode.commands.registerCommand('claude-portfolio.openProject', (project) => {
        const projectPath = path.join(portfolioPath, 'projects', project.path);
        if (fs.existsSync(projectPath)) {
            // Add folder to workspace
            const uri = vscode.Uri.file(projectPath);
            vscode.workspace.updateWorkspaceFolders(
                vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0,
                null,
                { uri, name: project.title }
            );
            vscode.window.showInformationMessage(`Opened project: ${project.title}`);
        }
    });

    const showDashboardCommand = vscode.commands.registerCommand('claude-portfolio.showDashboard', () => {
        DashboardPanel.createOrShow(context.extensionUri, portfolioPath);
    });

    const runProjectCommand = vscode.commands.registerCommand('claude-portfolio.runProject', async (project) => {
        const projectPath = path.join(portfolioPath, 'projects', project.path);
        
        // Create a new terminal
        const terminal = vscode.window.createTerminal({
            name: `Run ${project.title}`,
            cwd: projectPath
        });
        
        terminal.show();
        
        // Run the appropriate command based on project
        if (project.buildCommand) {
            terminal.sendText(project.buildCommand);
        } else {
            terminal.sendText('npm run dev');
        }
        
        vscode.window.showInformationMessage(`Starting ${project.title} on port ${project.localPort}`);
    });

    const openInBrowserCommand = vscode.commands.registerCommand('claude-portfolio.openProjectInBrowser', async (project) => {
        if (project.localPort) {
            const url = `http://localhost:${project.localPort}`;
            vscode.env.openExternal(vscode.Uri.parse(url));
        }
    });

    const refreshProjectsCommand = vscode.commands.registerCommand('claude-portfolio.refreshProjects', () => {
        projectProvider.refresh();
    });

    // Quick pick palette for projects
    const quickOpenCommand = vscode.commands.registerCommand('claude-portfolio.quickOpen', async () => {
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
    });

    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = "$(folder-library) Claude Portfolio";
    statusBarItem.tooltip = "Open Claude Portfolio Dashboard";
    statusBarItem.command = 'claude-portfolio.showDashboard';
    statusBarItem.show();

    // Push all disposables
    context.subscriptions.push(
        openProjectCommand,
        showDashboardCommand,
        runProjectCommand,
        openInBrowserCommand,
        refreshProjectsCommand,
        quickOpenCommand,
        statusBarItem
    );

    // Auto-open workspace if configured
    const workspacePath = path.join(portfolioPath, 'portfolio-dev.code-workspace');
    if (fs.existsSync(workspacePath) && vscode.workspace.workspaceFolders?.length === 0) {
        vscode.window.showInformationMessage(
            'Would you like to open the Claude Portfolio workspace?',
            'Yes',
            'No'
        ).then(selection => {
            if (selection === 'Yes') {
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(workspacePath));
            }
        });
    }
}

export function deactivate() {
    // Clean up
}
