import * as vscode from 'vscode';
import { ProjectProvider } from './projectProvider';
import { DashboardPanel } from './dashboardPanel';
import { CommandsProvider } from './commandsProvider';
import { CheatSheetProvider } from './cheatSheetProvider';
import { PortfolioWebviewProvider } from './portfolioWebviewProvider';
import { PortfolioTaskProvider } from './taskProvider';
import { VSCodeSecurityService } from './securityService';
import * as path from 'path';
import * as fs from 'fs';

// Helper function to get project path consistently - WITH SECURITY VALIDATION
function getProjectPath(portfolioPath: string, project: any): string {
    if (!project) {
        throw new Error('Project is null or undefined');
    }
    
    const workspaceRoot = path.join(portfolioPath, '..');  // D:\ClaudeWindows
    let projectPath: string;
    
    if (project.path) {
        // Handle different project path formats
        if (path.isAbsolute(project.path)) {
            // Absolute path
            projectPath = project.path;
        } else if (project.path.startsWith('projects/')) {
            // Legacy path format: projects/project-name
            projectPath = path.join(portfolioPath, project.path);
        } else if (project.path.startsWith('../Projects/')) {
            // New optimized structure: ../Projects/project-name
            projectPath = path.resolve(portfolioPath, project.path);
        } else {
            // Other relative paths - resolve from portfolio root
            projectPath = path.resolve(portfolioPath, project.path);
        }
    } else if (project.id) {
        // Fallback to using the project ID as folder name in legacy location
        projectPath = path.join(portfolioPath, 'projects', project.id);
    } else {
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
    } catch (error) {
        throw new Error(`Project path validation failed for ${project.id}: ${error}`);
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
        const taskProvider = new PortfolioTaskProvider(portfolioPath);

        // Register tree data providers
        vscode.window.registerTreeDataProvider('claudeProjects', projectProvider);
        vscode.window.registerTreeDataProvider('claudeCommands', commandsProvider);
        vscode.window.registerTreeDataProvider('claudeCheatSheet', cheatSheetProvider);
        
        // Register task provider
        const taskProviderDisposable = vscode.tasks.registerTaskProvider(
            PortfolioTaskProvider.taskType,
            taskProvider
        );

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
                // Run the appropriate command based on project - securely
                const command = project.buildCommand || 'npm run dev';
                // Use broader workspace root to allow external projects
                const workspaceRoot = path.join(portfolioPath, '..');  // D:\ClaudeWindows
                const success = await VSCodeSecurityService.executeProjectCommand(
                    projectPath,
                    command,
                    `Run ${project.title}`,
                    workspaceRoot
                );
                
                if (!success) {
                    vscode.window.showErrorMessage(`Failed to execute secure command for ${project.title}`);
                    return;
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
        const buildReactCommand = vscode.commands.registerCommand('claude-portfolio.buildReact', async () => {
            const success = await VSCodeSecurityService.executeSecureCommand(
                'npm run build',
                'Build React App',
                portfolioPath
            );
            
            if (success) {
                vscode.window.showInformationMessage('Building React app...');
            } else {
                vscode.window.showErrorMessage('Failed to execute build command');
            }
        });

        const startDevCommand = vscode.commands.registerCommand('claude-portfolio.startDev', async () => {
            const success = await VSCodeSecurityService.executeSecureCommand(
                'npm run dev',
                'Portfolio Dev Server',
                portfolioPath
            );
            
            if (success) {
                vscode.window.showInformationMessage('Starting portfolio dev server...');
            } else {
                vscode.window.showErrorMessage('Failed to execute dev server command');
            }
        });

        const npmInstallCommand = vscode.commands.registerCommand('claude-portfolio.npmInstall', async () => {
            const success = await VSCodeSecurityService.executeSecureCommand(
                'npm install',
                'NPM Install',
                portfolioPath
            );
            
            if (success) {
                vscode.window.showInformationMessage('Installing dependencies...');
            } else {
                vscode.window.showErrorMessage('Failed to execute npm install command');
            }
        });

        const killAllServersCommand = vscode.commands.registerCommand('claude-portfolio.killAllServers', async () => {
            const success = await VSCodeSecurityService.executeSecureCommand(
                '.\\scripts\\kill-all-servers.ps1',
                'Kill All Servers',
                portfolioPath
            );
            
            if (success) {
                vscode.window.showInformationMessage('Killing all dev servers...');
            } else {
                vscode.window.showErrorMessage('Failed to execute kill all command');
            }
        });

        const startAllProjectsCommand = vscode.commands.registerCommand('claude-portfolio.startAllProjects', async () => {
            const success = await VSCodeSecurityService.executeSecureCommand(
                '.\\scripts\\start-all-enhanced.ps1',
                'Start All Projects',
                portfolioPath
            );
            
            if (success) {
                vscode.window.showInformationMessage('Starting all projects...');
            } else {
                vscode.window.showErrorMessage('Failed to execute start all command');
            }
        });

        // Extension Commands
        const reinstallExtensionCommand = vscode.commands.registerCommand('claude-portfolio.reinstallExtension', async () => {
            const success = await VSCodeSecurityService.executeSecureCommand(
                'npm run compile && npx vsce package && code --install-extension .\\claude-portfolio-0.0.1.vsix --force',
                'Reinstall Extension',
                path.join(portfolioPath, 'vscode-extension', 'claude-portfolio')
            );
            
            if (success) {
                vscode.window.showInformationMessage('Rebuilding and reinstalling extension...');
            } else {
                vscode.window.showErrorMessage('Failed to execute extension reinstall command');
            }
        });

        const buildExtensionCommand = vscode.commands.registerCommand('claude-portfolio.buildExtension', async () => {
            const success = await VSCodeSecurityService.executeSecureCommand(
                'npm run compile',
                'Build Extension',
                path.join(portfolioPath, 'vscode-extension', 'claude-portfolio')
            );
            
            if (success) {
                vscode.window.showInformationMessage('Compiling extension TypeScript...');
            } else {
                vscode.window.showErrorMessage('Failed to execute extension build command');
            }
        });

        const packageExtensionCommand = vscode.commands.registerCommand('claude-portfolio.packageExtension', async () => {
            const success = await VSCodeSecurityService.executeSecureCommand(
                'npx vsce package',
                'Package Extension',
                path.join(portfolioPath, 'vscode-extension', 'claude-portfolio')
            );
            
            if (success) {
                vscode.window.showInformationMessage('Creating VSIX package...');
            } else {
                vscode.window.showErrorMessage('Failed to execute extension package command');
            }
        });

        const watchExtensionCommand = vscode.commands.registerCommand('claude-portfolio.watchExtension', async () => {
            const success = await VSCodeSecurityService.executeSecureCommand(
                'npm run watch',
                'Watch Extension',
                path.join(portfolioPath, 'vscode-extension', 'claude-portfolio')
            );
            
            if (success) {
                vscode.window.showInformationMessage('Watching extension for changes...');
            } else {
                vscode.window.showErrorMessage('Failed to execute extension watch command');
            }
        });

        // AI Assistant Commands
        const openClaudeCommand = vscode.commands.registerCommand('claude-portfolio.openClaude', async () => {
            const success = await VSCodeSecurityService.executeSecureCommand(
                'claude',
                'Claude',
                portfolioPath
            );
            
            if (success) {
                vscode.window.showInformationMessage('Starting Claude Code...');
            } else {
                vscode.window.showErrorMessage('Failed to execute Claude command');
            }
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
                        // Use secure echo commands
                        const commands = [
                            `echo "GitHub Copilot Chat: Press Ctrl+Alt+I (Windows/Linux) or Cmd+I (Mac) to open"`,
                            `echo "Project: ${project.title}"`,
                            `echo "Path: ${projectPath}"`
                        ];
                        
                        for (const cmd of commands) {
                            if (VSCodeSecurityService.validateCommand(cmd)) {
                                terminal.sendText(cmd);
                            } else {
                                console.warn(`Copilot echo command blocked: ${cmd}`);
                            }
                        }
                        
                        vscode.window.showInformationMessage('Use Ctrl+Alt+I (Windows/Linux) or Cmd+I (Mac) to open GitHub Copilot Chat');
                    } else {
                        // For Claude and Gemini, run the command securely
                        // Use broader workspace root to allow external projects
                        const workspaceRoot = path.join(portfolioPath, '..');  // D:\ClaudeWindows
                        const success = await VSCodeSecurityService.executeProjectCommand(
                            projectPath, 
                            selected.value, 
                            `${selected.value === 'claude' ? 'Claude' : 'Gemini'} - ${project.title}`,
                            workspaceRoot
                        );
                        
                        if (success) {
                            vscode.window.showInformationMessage(`Starting ${selected.value === 'claude' ? 'Claude Code' : 'Gemini CLI'} for ${project.title}...`);
                        } else {
                            vscode.window.showErrorMessage(`Failed to execute secure command for ${project.title}`);
                        }
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
            taskProviderDisposable,
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
