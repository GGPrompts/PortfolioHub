import * as vscode from 'vscode';
import { ProjectProvider } from './projectProvider';
import { DashboardPanel } from './dashboardPanel';
import { CommandsProvider } from './commandsProvider';
import { CheatSheetProvider } from './cheatSheetProvider';
import { PortfolioWebviewProvider } from './portfolioWebviewProvider';
import * as path from 'path';
import * as fs from 'fs';

// Helper function to get project path consistently
function getProjectPath(portfolioPath: string, project: any): string {
    if (!project) {
        throw new Error('Project is null or undefined');
    }
    
    if (project.path) {
        // Handle both relative and absolute project paths
        if (project.path.startsWith('projects/')) {
            // Path already includes projects/ prefix
            return path.join(portfolioPath, project.path);
        } else if (path.isAbsolute(project.path)) {
            // Absolute path
            return project.path;
        } else {
            // Relative path without projects/ prefix
            return path.join(portfolioPath, 'projects', project.path);
        }
    } else if (project.id) {
        // Fallback to using the project ID as folder name
        return path.join(portfolioPath, 'projects', project.id);
    } else {
        throw new Error(`Project has neither path nor id: ${JSON.stringify(project)}`);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Claude Portfolio extension is now active!');

    try {
        // Get portfolio path from settings
        const config = vscode.workspace.getConfiguration('claudePortfolio');
        const portfolioPath = config.get<string>('portfolioPath') || 'D:\\ClaudeWindows\\claude-dev-portfolio';

        // Create providers
        const projectProvider = new ProjectProvider(portfolioPath);
        const commandsProvider = new CommandsProvider();
        const cheatSheetProvider = new CheatSheetProvider();
        const portfolioWebviewProvider = new PortfolioWebviewProvider(context.extensionUri, portfolioPath);

        // Register tree data providers
        vscode.window.registerTreeDataProvider('claudeProjects', projectProvider);
        vscode.window.registerTreeDataProvider('claudeCommands', commandsProvider);
        vscode.window.registerTreeDataProvider('claudeCheatSheet', cheatSheetProvider);

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
                const projectPath = getProjectPath(portfolioPath, project);
                if (fs.existsSync(projectPath)) {
                    // Add folder to workspace
                    const uri = vscode.Uri.file(projectPath);
                    vscode.workspace.updateWorkspaceFolders(
                        vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0,
                        null,
                        { uri, name: project.title }
                    );
                    vscode.window.showInformationMessage(`Opened project: ${project.title}`);
                } else {
                    vscode.window.showErrorMessage(`Project directory not found: ${projectPath}`);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error opening project: ${error instanceof Error ? error.message : String(error)}`);
            }
        });

        const showDashboardCommand = vscode.commands.registerCommand('claude-portfolio.showDashboard', () => {
            DashboardPanel.createOrShow(context.extensionUri, portfolioPath);
        });

        const openPortfolioCommand = vscode.commands.registerCommand('claude-portfolio.openPortfolio', () => {
            // Create a full-screen portfolio webview panel
            const panel = vscode.window.createWebviewPanel(
                'claudePortfolioFull',
                'Claude Portfolio',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'portfolio-dist')]
                }
            );

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
            } catch (error) {
                vscode.window.showErrorMessage(`Error running project: ${error instanceof Error ? error.message : String(error)}`);
            }
        });

        const openInBrowserCommand = vscode.commands.registerCommand('claude-portfolio.openProjectInBrowser', async (treeItem) => {
            try {
                // Extract project data from tree item
                const project = treeItem?.project || treeItem;
                
                // Get the actual running port from our port detection system
                let portToUse = project?.localPort;
                let isRunning = false;
                
                if (project?.id) {
                    // Refresh project data to get latest status
                    await portfolioWebviewProvider.refreshProjectData();
                    
                    // Get updated project data with actual ports
                    const projectData = portfolioWebviewProvider.getCachedProjectData();
                    const updatedProject = projectData?.projects?.find((p: any) => p.id === project.id);
                    
                    if (updatedProject) {
                        portToUse = updatedProject.actualPort || updatedProject.localPort || project.localPort;
                        isRunning = updatedProject.status === 'active';
                        
                        console.log(`🌐 Opening browser for ${project.id}:`, {
                            defaultPort: project.localPort,
                            actualPort: updatedProject.actualPort,
                            finalPort: portToUse,
                            isRunning
                        });
                    }
                }
                
                if (portToUse && isRunning) {
                    const url = `http://localhost:${portToUse}`;
                    
                    try {
                        // Try VS Code Simple Browser with better configuration for React apps
                        console.log(`🌐 Opening ${project.title} in VS Code Simple Browser: ${url}`);
                        
                        await vscode.commands.executeCommand('simpleBrowser.show', url, {
                            viewColumn: vscode.ViewColumn.Beside,
                            preserveFocus: false,
                            // Additional options that might help with React apps
                            enableScripts: true,
                            enableCommands: false,
                            allowMultipleInstances: true
                        });
                        
                        vscode.window.showInformationMessage(`Opened ${project.title} in VS Code browser (port ${portToUse})`);
                        console.log(`✅ VS Code Simple Browser opened for ${project.title}`);
                        
                    } catch (simpleBrowserError) {
                        console.log('❌ VS Code Simple Browser failed:', simpleBrowserError);
                        
                        // Fallback to external browser
                        console.log('🔄 Falling back to external Chrome');
                        await vscode.env.openExternal(vscode.Uri.parse(url));
                        vscode.window.showInformationMessage(`Opened ${project.title} in external Chrome (Simple Browser failed)`);
                    }
                } else if (!isRunning) {
                    vscode.window.showWarningMessage(`${project.title} is not currently running. Please start the project first.`);
                } else {
                    vscode.window.showErrorMessage('No port information found for this project');
                }
            } catch (error) {
                console.error('Error in openProjectInBrowser:', error);
                vscode.window.showErrorMessage(`Error opening browser: ${error instanceof Error ? error.message : String(error)}`);
            }
        });

        const openInExternalBrowserCommand = vscode.commands.registerCommand('claude-portfolio.openProjectInExternalBrowser', async (treeItem) => {
            try {
                // Extract project data from tree item
                const project = treeItem?.project || treeItem;
                
                // Get the actual running port from our port detection system
                let portToUse = project?.localPort;
                let isRunning = false;
                
                if (project?.id) {
                    // Refresh project data to get latest status
                    await portfolioWebviewProvider.refreshProjectData();
                    
                    // Get updated project data with actual ports
                    const projectData = portfolioWebviewProvider.getCachedProjectData();
                    const updatedProject = projectData?.projects?.find((p: any) => p.id === project.id);
                    
                    if (updatedProject) {
                        portToUse = updatedProject.actualPort || updatedProject.localPort || project.localPort;
                        isRunning = updatedProject.status === 'active';
                    }
                }
                
                if (portToUse && isRunning) {
                    const url = `http://localhost:${portToUse}`;
                    // Use external browser
                    vscode.env.openExternal(vscode.Uri.parse(url));
                    vscode.window.showInformationMessage(`Opened ${project.title} in external browser (port ${portToUse})`);
                } else if (!isRunning) {
                    vscode.window.showWarningMessage(`${project.title} is not currently running. Please start the project first.`);
                } else {
                    vscode.window.showErrorMessage('No port information found for this project');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error opening external browser: ${error instanceof Error ? error.message : String(error)}`);
            }
        });

        const refreshProjectsCommand = vscode.commands.registerCommand('claude-portfolio.refreshProjects', () => {
            projectProvider.refresh();
        });

        // Copy cheat command to clipboard
        const copyCheatCommand = vscode.commands.registerCommand('claude-portfolio.copyCheatCommand', async (command: string) => {
            try {
                await vscode.env.clipboard.writeText(command);
                vscode.window.showInformationMessage(`Copied to clipboard: ${command}`);
            } catch (error) {
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
            } catch (error) {
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
        const buildReactCommand = vscode.commands.registerCommand('claude-portfolio.buildReact', () => {
            const terminal = vscode.window.createTerminal({
                name: 'Build React App',
                cwd: portfolioPath
            });
            terminal.show();
            terminal.sendText('npm run build');
            vscode.window.showInformationMessage('Building React app...');
        });

        const startDevCommand = vscode.commands.registerCommand('claude-portfolio.startDev', () => {
            const terminal = vscode.window.createTerminal({
                name: 'Portfolio Dev Server',
                cwd: portfolioPath
            });
            terminal.show();
            terminal.sendText('npm run dev');
            vscode.window.showInformationMessage('Starting portfolio dev server...');
        });

        const npmInstallCommand = vscode.commands.registerCommand('claude-portfolio.npmInstall', () => {
            const terminal = vscode.window.createTerminal({
                name: 'NPM Install',
                cwd: portfolioPath
            });
            terminal.show();
            terminal.sendText('npm install');
            vscode.window.showInformationMessage('Installing dependencies...');
        });

        const killAllServersCommand = vscode.commands.registerCommand('claude-portfolio.killAllServers', () => {
            const terminal = vscode.window.createTerminal({
                name: 'Kill All Servers',
                cwd: portfolioPath
            });
            terminal.show();
            terminal.sendText('.\\scripts\\kill-all-servers.ps1');
            vscode.window.showInformationMessage('Killing all dev servers...');
        });

        const startAllProjectsCommand = vscode.commands.registerCommand('claude-portfolio.startAllProjects', () => {
            const terminal = vscode.window.createTerminal({
                name: 'Start All Projects',
                cwd: portfolioPath
            });
            terminal.show();
            terminal.sendText('.\\scripts\\start-all-enhanced.ps1');
            vscode.window.showInformationMessage('Starting all projects...');
        });

        // Extension Commands
        const reinstallExtensionCommand = vscode.commands.registerCommand('claude-portfolio.reinstallExtension', () => {
            const terminal = vscode.window.createTerminal({
                name: 'Reinstall Extension',
                cwd: path.join(portfolioPath, 'vscode-extension', 'claude-portfolio')
            });
            terminal.show();
            terminal.sendText('npm run compile && npx vsce package && code --install-extension .\\claude-portfolio-0.0.1.vsix --force');
            vscode.window.showInformationMessage('Rebuilding and reinstalling extension...');
        });

        const buildExtensionCommand = vscode.commands.registerCommand('claude-portfolio.buildExtension', () => {
            const terminal = vscode.window.createTerminal({
                name: 'Build Extension',
                cwd: path.join(portfolioPath, 'vscode-extension', 'claude-portfolio')
            });
            terminal.show();
            terminal.sendText('npm run compile');
            vscode.window.showInformationMessage('Compiling extension TypeScript...');
        });

        const packageExtensionCommand = vscode.commands.registerCommand('claude-portfolio.packageExtension', () => {
            const terminal = vscode.window.createTerminal({
                name: 'Package Extension',
                cwd: path.join(portfolioPath, 'vscode-extension', 'claude-portfolio')
            });
            terminal.show();
            terminal.sendText('npx vsce package');
            vscode.window.showInformationMessage('Creating VSIX package...');
        });

        const watchExtensionCommand = vscode.commands.registerCommand('claude-portfolio.watchExtension', () => {
            const terminal = vscode.window.createTerminal({
                name: 'Watch Extension',
                cwd: path.join(portfolioPath, 'vscode-extension', 'claude-portfolio')
            });
            terminal.show();
            terminal.sendText('npm run watch');
            vscode.window.showInformationMessage('Watching extension for changes...');
        });

        // AI Assistant Commands
        const openClaudeCommand = vscode.commands.registerCommand('claude-portfolio.openClaude', () => {
            const terminal = vscode.window.createTerminal({
                name: 'Claude',
                cwd: portfolioPath
            });
            terminal.show();
            terminal.sendText('claude');
            vscode.window.showInformationMessage('Starting Claude Code...');
        });

        // AI Assistant Dropdown Command
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
                        terminal.sendText(`echo "GitHub Copilot Chat: Press Ctrl+Alt+I (Windows/Linux) or Cmd+I (Mac) to open"`);
                        terminal.sendText(`echo "Project: ${project.title}"`);
                        terminal.sendText(`echo "Path: ${projectPath}"`);
                        
                        vscode.window.showInformationMessage('Use Ctrl+Alt+I (Windows/Linux) or Cmd+I (Mac) to open GitHub Copilot Chat');
                    } else {
                        // For Claude and Gemini, run the command
                        const terminal = vscode.window.createTerminal({
                            name: `${selected.value === 'claude' ? 'Claude' : 'Gemini'} - ${project.title}`,
                            cwd: projectPath
                        });
                        terminal.show();
                        terminal.sendText(`cd "${projectPath}" && ${selected.value}`);
                        
                        vscode.window.showInformationMessage(`Starting ${selected.value === 'claude' ? 'Claude Code' : 'Gemini CLI'} for ${project.title}...`);
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error opening AI assistant: ${error instanceof Error ? error.message : String(error)}`);
            }
        });

        // Push all disposables
        context.subscriptions.push(
            openProjectCommand,
            showDashboardCommand,
            openPortfolioCommand,
            runProjectCommand,
            openInBrowserCommand,
            openInExternalBrowserCommand,
            refreshProjectsCommand,
            copyCheatCommand,
            testCommand,
            quickOpenCommand,
            statusBarItem,
            // New commands
            buildReactCommand,
            startDevCommand,
            npmInstallCommand,
            killAllServersCommand,
            startAllProjectsCommand,
            reinstallExtensionCommand,
            buildExtensionCommand,
            packageExtensionCommand,
            watchExtensionCommand,
            openClaudeCommand,
            openAIAssistantCommand
        );

        console.log('Claude Portfolio extension fully activated!');

    } catch (error) {
        console.error('Extension activation failed:', error);
        vscode.window.showErrorMessage(`Claude Portfolio extension failed to activate: ${error}`);
    }
}

export function deactivate() {
    // Clean up
}
