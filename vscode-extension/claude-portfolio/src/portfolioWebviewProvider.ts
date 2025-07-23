import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { VSCodeSecurityService } from './securityService';

export class PortfolioWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'claude-portfolio.main';
    
    private _view?: vscode.WebviewView;
    private _cachedProjectData?: any;

    public getCachedProjectData(): any {
        return this._cachedProjectData;
    }

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _portfolioPath: string
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            // And restrict the webview to only loading content from our extension's portfolio-dist directory
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'portfolio-dist')
            ]
        };

        // Load HTML asynchronously with status checking
        this._getHtmlForWebview(webviewView.webview).then(html => {
            webviewView.webview.html = html;
        }).catch(error => {
            console.error('Failed to generate webview HTML:', error);
            webviewView.webview.html = '<html><body>Error loading portfolio</body></html>';
        });

        // Set up message handling
        this._setupMessageHandling(webviewView.webview);
    }

    public async refreshProjectData(): Promise<void> {
        if (this._view) {
            try {
                // Clear cached data to force fresh status checking
                this._cachedProjectData = null;
                
                // Reload project data with fresh status
                const freshData = await this._loadProjectDataWithStatus();
                this._cachedProjectData = freshData;
                
                console.log('Fresh project statuses:', freshData.projects?.map((p: any) => `${p.id}: ${p.status}`));
                
                // Update the webview with fresh data
                const html = await this._getHtmlForWebview(this._view.webview);
                this._view.webview.html = html;
                
                console.log('Portfolio webview refreshed with updated project data at', new Date().toLocaleTimeString());
            } catch (error) {
                console.error('Failed to refresh portfolio webview:', error);
            }
        }
    }

    public _setupMessageHandling(webview: vscode.Webview) {
        webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'terminal:execute':
                    await this._executeInTerminal(message.command, message.name);
                    break;
                case 'workspace:addProject':
                    await this._addProjectToWorkspace(message.project);
                    break;
                case 'file:save':
                    await this._saveFile(message.path, message.content);
                    break;
                case 'git:update':
                    await this._updateGitRepo(message.projectPath);
                    break;
                case 'vscode:open':
                    await this._openInVSCode(message.path);
                    break;
                case 'browser:open':
                    await this._openInBrowser(message.url);
                    break;
                case 'browser:openExternal':
                    await this._openInExternalBrowser(message.url, message.reason);
                    break;
                case 'folder:open':
                    await this._openFolder(message.path);
                    break;
                case 'notification:show':
                    this._showNotification(message.text, message.level);
                    break;
                case 'projects:launchAll':
                    await this._launchAllProjects();
                    break;
                case 'projects:launchSelected':
                    await this._launchSelectedProjects(message.projects);
                    break;
                case 'project:run':
                    await this._runProject(message.projectPath, message.command, message.projectTitle);
                    break;
                case 'preview:create':
                    await this._createEmbeddedPreview(message.url, message.title, message.viewType);
                    break;
                case 'preview:close':
                    await this._closeEmbeddedPreview(message.title);
                    break;
                case 'server:start':
                    await this._startVSCodeServer(message.serverType, message.port);
                    break;
                case 'server:startAll':
                    await this._startAllServers();
                    break;
                case 'server:startPortfolio':
                    await this._startPortfolioServer();
                    break;
                case 'livePreview:open':
                    await this._openLivePreview(message.url, message.title, message.projectId);
                    break;
                case 'livePreview:openMultiple':
                    await this._openMultipleLivePreviews(message.projects);
                    break;
                case 'command:execute':
                    // Execute VS Code command directly
                    await vscode.commands.executeCommand(message.command, ...(message.args || []));
                    break;
                case 'project:start':
                    // Start a specific project by ID
                    await this._startProjectById(message.projectId);
                    break;
                case 'refresh:projects':
                    // Refresh project data and inject fresh data into webview
                    console.log('🔄 Refreshing VS Code project data on request');
                    await this._refreshAndInjectProjectData();
                    break;
                case 'refresh:status':
                    // Refresh only project status
                    console.log('🔄 Refreshing VS Code project status on request');
                    await this._refreshProjectStatus();
                    break;
                default:
                    console.log('Unhandled message type:', message.type);
            }
        });
    }

    private async _executeInTerminal(command: string, terminalName?: string): Promise<void> {
        // ✅ SECURITY: Use secure command execution instead of direct terminal.sendText()
        const workspaceRoot = path.join(this._portfolioPath, '..'); // D:\ClaudeWindows
        const success = await VSCodeSecurityService.executeSecureCommand(
            command,
            terminalName || 'Portfolio Command',
            workspaceRoot
        );
        
        if (!success) {
            console.error(`Command execution blocked: ${command}`);
            vscode.window.showErrorMessage('Command execution was blocked for security reasons');
        }
    }

    private async _addProjectToWorkspace(project: any): Promise<void> {
        let projectPath: string;
        
        if (path.isAbsolute(project.path)) {
            projectPath = project.path;
        } else if (project.path === '.') {
            projectPath = this._portfolioPath;
        } else if (project.path?.startsWith('../Projects/')) {
            projectPath = path.resolve(this._portfolioPath, project.path);
        } else if (project.path?.startsWith('projects/')) {
            projectPath = path.join(this._portfolioPath, project.path);
        } else {
            projectPath = path.join(this._portfolioPath, 'projects', project.path || project.id);
        }
        
        const projectUri = vscode.Uri.file(projectPath);
        
        if (!fs.existsSync(projectPath)) {
            vscode.window.showErrorMessage(`Project path does not exist: ${projectPath}`);
            return;
        }

        const success = vscode.workspace.updateWorkspaceFolders(
            vscode.workspace.workspaceFolders?.length || 0,
            0,
            { uri: projectUri, name: project.title }
        );

        if (success) {
            vscode.window.showInformationMessage(`Added ${project.title} to workspace`);
        } else {
            vscode.window.showErrorMessage(`Failed to add ${project.title} to workspace`);
        }
    }

    private async _saveFile(relativePath: string, content: string): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const fullPath = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
        
        try {
            // Ensure directory exists
            const dirPath = vscode.Uri.joinPath(fullPath, '..');
            await vscode.workspace.fs.createDirectory(dirPath);
            
            // Write file
            await vscode.workspace.fs.writeFile(fullPath, Buffer.from(content, 'utf8'));
            
            vscode.window.showInformationMessage(`Note saved: ${relativePath}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save file: ${error}`);
        }
    }

    private async _updateGitRepo(projectPath: string): Promise<void> {
        try {
            const fullPath = path.isAbsolute(projectPath) 
                ? projectPath 
                : path.join(this._portfolioPath, projectPath);

            // Use secure project command execution with broader workspace root
            const workspaceRoot = path.join(this._portfolioPath, '..');  // D:\ClaudeWindows
            const success = await VSCodeSecurityService.executeProjectCommand(
                fullPath,
                'git pull',
                'Git Update',
                workspaceRoot
            );
            
            if (success) {
                vscode.window.showInformationMessage(`Git pull completed for ${path.basename(fullPath)}`);
            } else {
                vscode.window.showErrorMessage(`Failed to execute git pull for ${path.basename(fullPath)}`);
            }
        } catch (error) {
            console.error('Git update failed:', error);
            vscode.window.showErrorMessage(`Git update failed: ${error}`);
        }
    }

    private async _openInVSCode(projectPath: string): Promise<void> {
        const fullPath = path.isAbsolute(projectPath) 
            ? projectPath 
            : path.join(this._portfolioPath, projectPath);

        if (!fs.existsSync(fullPath)) {
            vscode.window.showErrorMessage(`Path does not exist: ${fullPath}`);
            return;
        }

        const uri = vscode.Uri.file(fullPath);
        await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true });
    }

    private async _openInBrowser(url: string): Promise<void> {
        try {
            // Use VS Code Simple Browser for better integration
            await vscode.commands.executeCommand('simpleBrowser.show', url);
            console.log(`🌐 Opened ${url} in VS Code Simple Browser`);
        } catch (error) {
            console.log(`Simple Browser not available, falling back to external browser for ${url}`);
            // Fallback to external browser if Simple Browser is not available
            await vscode.env.openExternal(vscode.Uri.parse(url));
        }
    }

    private async _openInExternalBrowser(url: string, reason?: string): Promise<void> {
        try {
            // Force external browser (bypasses Simple Browser limitations)
            await vscode.env.openExternal(vscode.Uri.parse(url));
            const reasonText = reason ? ` (${reason})` : '';
            console.log(`🌍 Opened ${url} in external browser${reasonText}`);
            
            if (reason) {
                vscode.window.showInformationMessage(`Opened in external browser: ${reason}`);
            }
        } catch (error) {
            console.error('Failed to open external browser:', error);
            vscode.window.showErrorMessage(`Failed to open ${url} in external browser`);
        }
    }

    /**
     * ✅ SECURE: Start project by ID with full security validation
     */
    private async _startProjectById(projectId: string): Promise<void> {
        try {
            // Load project manifest to get project details
            const manifestPath = path.join(this._portfolioPath, 'projects', 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const project = manifest.projects.find((p: any) => p.id === projectId);
            
            if (!project) {
                vscode.window.showErrorMessage(`Project not found: ${projectId}`);
                return;
            }
            
            // Get project path - use existing path resolution logic
            let projectPath: string;
            if (project.path?.startsWith('D:\\')) {
                projectPath = project.path;
            } else if (project.path?.startsWith('../Projects/')) {
                projectPath = path.resolve(this._portfolioPath, project.path);
            } else if (project.path?.startsWith('projects/')) {
                projectPath = path.join(this._portfolioPath, project.path);
            } else if (project.path === '.') {
                projectPath = this._portfolioPath;
            } else {
                projectPath = path.join(this._portfolioPath, 'projects', project.path || project.id);
            }
            
            const command = project.buildCommand || 'npm run dev';            
            await this._runProject(projectPath, command, project.title);
        } catch (error) {
            console.error('Failed to start project by ID:', error);
            vscode.window.showErrorMessage(`Failed to start project: ${projectId}`);
        }
    }

    /**
     * ✅ SECURE: Run individual project with full security validation
     */
    private async _runProject(projectPath: string, command: string, projectTitle: string): Promise<void> {
        try {
            console.log(`🚀 Secure project run request: ${projectTitle} at ${projectPath} with command: ${command}`);
            
            // Use the existing secure project command execution
            const workspaceRoot = path.join(this._portfolioPath, '..'); // D:\ClaudeWindows
            const success = await VSCodeSecurityService.executeProjectCommand(
                projectPath,
                command,
                `Run ${projectTitle}`,
                workspaceRoot
            );
            
            if (success) {
                vscode.window.showInformationMessage(`✅ Started ${projectTitle}`);
                // Refresh project data to update status
                setTimeout(() => {
                    this.refreshProjectData();
                }, 2000);
            } else {
                vscode.window.showErrorMessage(`❌ Failed to start ${projectTitle} - command blocked for security`);
            }
            
        } catch (error) {
            console.error(`Project run failed for ${projectTitle}:`, error);
            vscode.window.showErrorMessage(`Failed to run ${projectTitle}: ${error}`);
        }
    }

    /**
     * ✅ SECURE: Launch all projects with security validation
     */
    private async _launchAllProjects(): Promise<void> {
        try {
            console.log('🚀 Launching all projects...');
            
            // Get project data
            const projectData = await this._loadProjectDataWithStatus();
            const launchableProjects = projectData?.projects?.filter((p: any) => 
                p.displayType === 'external' && p.buildCommand && p.status !== 'active'
            ) || [];

            if (launchableProjects.length === 0) {
                vscode.window.showInformationMessage('No projects available to launch');
                return;
            }

            const workspaceRoot = path.join(this._portfolioPath, '..'); // D:\ClaudeWindows
            let successCount = 0;

            for (const project of launchableProjects) {
                try {
                    const projectPath = this._resolveProjectPath(project);
                    const success = await VSCodeSecurityService.executeProjectCommand(
                        projectPath,
                        project.buildCommand,
                        `Launch ${project.title}`,
                        workspaceRoot
                    );
                    
                    if (success) {
                        successCount++;
                        console.log(`✅ Launched: ${project.title}`);
                    } else {
                        console.warn(`❌ Failed to launch: ${project.title}`);
                    }
                    
                    // Add delay between launches to prevent overwhelming the system
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.error(`Error launching ${project.title}:`, error);
                }
            }

            vscode.window.showInformationMessage(
                `Launched ${successCount}/${launchableProjects.length} projects successfully`
            );
            
            // Refresh project data after launching
            setTimeout(() => {
                this.refreshProjectData();
            }, 5000);
            
        } catch (error) {
            console.error('Failed to launch all projects:', error);
            vscode.window.showErrorMessage(`Failed to launch projects: ${error}`);
        }
    }

    /**
     * ✅ SECURE: Launch selected projects with security validation
     */
    private async _launchSelectedProjects(projectIds: string[]): Promise<void> {
        try {
            console.log('🚀 Launching selected projects:', projectIds);
            
            if (!projectIds || projectIds.length === 0) {
                vscode.window.showWarningMessage('No projects selected to launch');
                return;
            }

            // Get project data
            const projectData = await this._loadProjectDataWithStatus();
            const allProjects = projectData?.projects || [];
            
            const selectedProjects = allProjects.filter((p: any) => 
                projectIds.includes(p.id) && p.displayType === 'external' && p.buildCommand
            );

            if (selectedProjects.length === 0) {
                vscode.window.showWarningMessage('No valid projects found to launch');
                return;
            }

            const workspaceRoot = path.join(this._portfolioPath, '..'); // D:\ClaudeWindows
            let successCount = 0;

            for (const project of selectedProjects) {
                try {
                    // Skip if already running
                    if (project.status === 'active') {
                        console.log(`⏭️ Skipping ${project.title} - already running`);
                        continue;
                    }

                    const projectPath = this._resolveProjectPath(project);
                    const success = await VSCodeSecurityService.executeProjectCommand(
                        projectPath,
                        project.buildCommand,
                        `Launch ${project.title}`,
                        workspaceRoot
                    );
                    
                    if (success) {
                        successCount++;
                        console.log(`✅ Launched: ${project.title}`);
                    } else {
                        console.warn(`❌ Failed to launch: ${project.title}`);
                    }
                    
                    // Add delay between launches
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.error(`Error launching ${project.title}:`, error);
                }
            }

            vscode.window.showInformationMessage(
                `Launched ${successCount}/${selectedProjects.length} selected projects successfully`
            );
            
            // Refresh project data after launching
            setTimeout(() => {
                this.refreshProjectData();
            }, 5000);
            
        } catch (error) {
            console.error('Failed to launch selected projects:', error);
            vscode.window.showErrorMessage(`Failed to launch selected projects: ${error}`);
        }
    }

    /**
     * Helper method to resolve project path consistently with security validation
     */
    private _resolveProjectPath(project: any): string {
        if (!project) {
            throw new Error('Project is null or undefined');
        }
        
        let projectPath: string;
        
        if (project.path) {
            if (path.isAbsolute(project.path)) {
                projectPath = project.path;
            } else if (project.path === '.') {
                // Self-reference to portfolio root
                projectPath = this._portfolioPath;
            } else if (project.path.startsWith('../Projects/')) {
                // External project path (relative to portfolio)
                projectPath = path.resolve(this._portfolioPath, project.path);
            } else if (project.path.startsWith('projects/')) {
                // Internal project path (relative to portfolio root)
                projectPath = path.join(this._portfolioPath, project.path);
            } else {
                // Default: assume internal project
                projectPath = path.join(this._portfolioPath, 'projects', project.path);
            }
        } else if (project.id) {
            // Fallback to using project ID
            projectPath = path.join(this._portfolioPath, 'projects', project.id);
        } else {
            throw new Error(`Project has neither path nor id: ${JSON.stringify(project)}`);
        }
        
        // Validate the resolved path is within allowed workspace
        const normalized = path.normalize(projectPath);
        const resolved = path.resolve(normalized);
        const workspaceRoot = path.resolve(path.join(this._portfolioPath, '..'));
        
        if (!resolved.startsWith(workspaceRoot)) {
            throw new Error(`Project path traversal detected: ${project.path || project.id} resolves outside workspace`);
        }
        
        return resolved;
    }

    /**
     * ✅ SECURE: Start VS Code Server with security validation
     */
    private async _startVSCodeServer(serverType: string = 'vscode-web', port: number = 8080): Promise<void> {
        try {
            console.log(`🚀 Starting ${serverType} server on port ${port}...`);
            
            const workspaceRoot = path.join(this._portfolioPath, '..');
            
            // Execute server startup commands individually for security compliance
            const commands = [
                'Stop-Process -Name "code-tunnel" -Force -ErrorAction SilentlyContinue',
                `Set-Location "${this._portfolioPath}"`,
                'Write-Host "Starting VS Code Server from: $(Get-Location)"',
                `code serve-web --port ${port} --host 0.0.0.0 --without-connection-token --accept-server-license-terms`
            ];
            
            let successCount = 0;
            for (const command of commands) {
                const success = await VSCodeSecurityService.executeSecureCommand(
                    command,
                    'VS Code Server Setup',
                    workspaceRoot
                );
                
                if (success) {
                    successCount++;
                    console.log(`✅ Server setup command executed: ${command.substring(0, 50)}...`);
                    
                    // Add delay between commands for stability
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.warn(`❌ Failed to execute server command: ${command}`);
                    break;
                }
            }
            
            if (successCount === commands.length) {
                vscode.window.showInformationMessage(
                    `✅ VS Code Server starting on port ${port}!\n\n💡 Tip: Once ready, open Simple Browser → http://localhost:${port} for live previews`
                );
                
                // Offer to automatically open Simple Browser after delay
                setTimeout(async () => {
                    const choice = await vscode.window.showInformationMessage(
                        'VS Code Server should be ready now. Open it in Simple Browser?',
                        'Open Simple Browser',
                        'Open External Browser',
                        'Later'
                    );
                    
                    if (choice === 'Open Simple Browser') {
                        try {
                            await vscode.commands.executeCommand('simpleBrowser.show', `http://localhost:${port}`);
                        } catch (error) {
                            console.log('Simple Browser not available, opening external browser');
                            await vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}`));
                        }
                    } else if (choice === 'Open External Browser') {
                        await vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}`));
                    }
                }, 10000); // Wait 10 seconds for server to start
                
            } else {
                vscode.window.showErrorMessage(`Failed to start VS Code Server. ${successCount}/${commands.length} commands succeeded.`);
            }
            
        } catch (error) {
            console.error('Failed to start VS Code Server:', error);
            vscode.window.showErrorMessage(`Failed to start VS Code Server: ${error}`);
        }
    }

    private async _startAllServers(): Promise<void> {
        try {
            console.log('🚀 Starting all servers (Portfolio + VS Code)...');
            
            vscode.window.showInformationMessage('Starting all servers...');
            
            // Start portfolio dev server using VS Code task
            await this._startPortfolioServer();
            
            // Wait a moment then start VS Code server
            setTimeout(async () => {
                await this._startVSCodeServer();
            }, 3000);
            
        } catch (error) {
            console.error('Failed to start all servers:', error);
            vscode.window.showErrorMessage(`Failed to start servers: ${error}`);
        }
    }

    private async _startPortfolioServer(): Promise<void> {
        try {
            console.log('💼 Starting portfolio dev server using VS Code task...');
            
            // Use VS Code's task system to start the dev server
            const tasks = await vscode.tasks.fetchTasks();
            const devServerTask = tasks.find(task => 
                task.name === 'Start Portfolio Dev Server' || 
                task.definition.label === 'Start Portfolio Dev Server'
            );
            
            if (devServerTask) {
                console.log('✅ Found dev server task, executing...');
                await vscode.tasks.executeTask(devServerTask);
                vscode.window.showInformationMessage('✅ Portfolio dev server starting! Check terminal for progress.');
            } else {
                // Fallback: create and execute task manually
                console.log('⚠️ Dev server task not found, creating manual task...');
                const task = new vscode.Task(
                    { type: 'shell' },
                    vscode.TaskScope.Workspace,
                    'Start Portfolio Dev Server',
                    'portfolio',
                    new vscode.ShellExecution('npm', ['run', 'dev'], {
                        cwd: this._portfolioPath
                    }),
                    []
                );
                task.isBackground = true;
                task.group = vscode.TaskGroup.Test;
                
                await vscode.tasks.executeTask(task);
                vscode.window.showInformationMessage('✅ Portfolio dev server starting! Check terminal for progress.');
            }
            
        } catch (error) {
            console.error('Failed to start portfolio server:', error);
            vscode.window.showErrorMessage(`Failed to start portfolio server: ${error}`);
        }
    }

    /**
     * Creates an embedded Simple Browser panel for project previews
     * This solves the iframe nesting issue in VS Code webviews
     */
    private async _createEmbeddedPreview(url: string, title: string, viewType: 'mobile' | 'desktop' = 'desktop'): Promise<void> {
        try {
            // Close existing preview for this project if it exists
            await this._closeEmbeddedPreview(title);

            console.log(`🌐 Creating embedded preview for ${title}: ${url}`);

            // Create the Simple Browser panel
            const panel = vscode.window.createWebviewPanel(
                'portfolio-preview',
                `Preview: ${title}`,
                {
                    viewColumn: vscode.ViewColumn.Beside,
                    preserveFocus: false
                },
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    enableFindWidget: true,
                    enableCommandUris: false
                }
            );

            // Store reference to track open panels
            this._openPreviews.set(title, panel);

            // Set up the webview content to use Simple Browser
            const browserHtml = this._getBrowserHtml(url, title, viewType);
            panel.webview.html = browserHtml;

            // Handle panel disposal
            panel.onDidDispose(() => {
                this._openPreviews.delete(title);
                console.log(`🗑️ Embedded preview closed for ${title}`);
            });

            // Set up refresh button
            panel.webview.onDidReceiveMessage(async (message) => {
                switch (message.type) {
                    case 'refresh':
                        panel.webview.html = this._getBrowserHtml(url, title, viewType);
                        break;
                    case 'toggleView':
                        const newViewType = viewType === 'mobile' ? 'desktop' : 'mobile';
                        panel.webview.html = this._getBrowserHtml(url, title, newViewType);
                        break;
                }
            });

            vscode.window.showInformationMessage(`Opened ${title} in embedded preview`);

        } catch (error) {
            console.error('Failed to create embedded preview:', error);
            vscode.window.showErrorMessage(`Failed to create preview for ${title}: ${error}`);
        }
    }

    /**
     * Generates HTML for the embedded browser view
     */
    private _getBrowserHtml(url: string, title: string, viewType: 'mobile' | 'desktop'): string {
        const width = viewType === 'mobile' ? '375px' : '100%';
        const height = viewType === 'mobile' ? '667px' : '100%';
        const margin = viewType === 'mobile' ? '0 auto' : '0';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview: ${title}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #1e1e1e;
            color: #cccccc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .preview-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .preview-toolbar {
            background: #2d2d30;
            padding: 8px 16px;
            border-bottom: 1px solid #464647;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 13px;
        }
        .preview-content {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: ${viewType === 'mobile' ? 'flex-start' : 'stretch'};
            padding: ${viewType === 'mobile' ? '20px' : '0'};
            overflow: auto;
        }
        iframe {
            width: ${width};
            height: ${height};
            border: ${viewType === 'mobile' ? '1px solid #464647' : 'none'};
            border-radius: ${viewType === 'mobile' ? '12px' : '0'};
            margin: ${margin};
            background: white;
        }
        .toolbar-button {
            background: #0e639c;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        .toolbar-button:hover {
            background: #1177bb;
        }
        .url-display {
            color: #9cdcfe;
            font-family: 'Cascadia Code', monospace;
            background: #1e1e1e;
            padding: 2px 6px;
            border-radius: 3px;
            flex: 1;
            max-width: 400px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .view-indicator {
            background: #5f5f5f;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-toolbar">
            <button class="toolbar-button" onclick="refreshPreview()">⟳ Refresh</button>
            <button class="toolbar-button" onclick="toggleView()">${viewType === 'mobile' ? '🖥️ Desktop' : '📱 Mobile'}</button>
            <div class="url-display">${url}</div>
            <div class="view-indicator">${viewType}</div>
        </div>
        <div class="preview-content">
            <iframe 
                src="${url}" 
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
            </iframe>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function refreshPreview() {
            vscode.postMessage({ type: 'refresh' });
        }
        
        function toggleView() {
            vscode.postMessage({ type: 'toggleView' });
        }
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            const iframe = document.querySelector('iframe');
            if (iframe) {
                iframe.src = iframe.src;
            }
        }, 30000);
    </script>
</body>
</html>`;
    }

    private async _openFolder(folderPath: string): Promise<void> {
        const fullPath = path.isAbsolute(folderPath) 
            ? folderPath 
            : path.join(this._portfolioPath, folderPath);

        if (!fs.existsSync(fullPath)) {
            vscode.window.showErrorMessage(`Folder does not exist: ${fullPath}`);
            return;
        }

        // On Windows, use explorer securely
        if (process.platform === 'win32') {
            const workspaceRoot = path.join(this._portfolioPath, '..');
            const success = await VSCodeSecurityService.executeSecureCommand(
                `explorer "${fullPath}"`,
                'Open Folder',
                workspaceRoot
            );
            
            if (!success) {
                vscode.window.showErrorMessage('Failed to open folder - command blocked for security');
                return;
            }
        } else {
            // On other platforms, try to open with VS Code
            const uri = vscode.Uri.file(fullPath);
            await vscode.commands.executeCommand('revealFileInOS', uri);
        }
    }

    private _showNotification(text: string, level: 'info' | 'warning' | 'error' = 'info'): void {
        switch (level) {
            case 'warning':
                vscode.window.showWarningMessage(text);
                break;
            case 'error':
                vscode.window.showErrorMessage(text);
                break;
            default:
                vscode.window.showInformationMessage(text);
        }
    }

    /**
     * ✅ SECURE: Helper method to launch a single project with security validation
     */
    private async _launchProject(project: any): Promise<void> {
        try {
            const projectPath = this._resolveProjectPath(project);
            const command = project.buildCommand || 'npm run dev';
            const workspaceRoot = path.join(this._portfolioPath, '..');
            
            const success = await VSCodeSecurityService.executeProjectCommand(
                projectPath,
                command,
                project.title || project.id,
                workspaceRoot
            );
            
            if (!success) {
                throw new Error('Command execution was blocked for security reasons');
            }
            
            console.log(`✅ Launched: ${project.title}`);
            
        } catch (error) {
            console.error(`Error launching ${project.title}:`, error);
            throw error;
        }
    }

    private _loadProjectData(): any {
        try {
            const manifestPath = path.join(this._portfolioPath, 'projects', 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                const manifestContent = fs.readFileSync(manifestPath, 'utf8');
                const manifest = JSON.parse(manifestContent);
                return manifest;
            }
        } catch (error) {
            console.error('Failed to load project manifest:', error);
        }
        return { projects: [] };
    }

    private async _loadProjectDataWithStatus(): Promise<any> {
        try {
            const manifest = this._loadProjectData();
            if (manifest.projects && manifest.projects.length > 0) {
                // Update project statuses with real-time port checking
                await this._updateProjectStatuses(manifest.projects);
                
                // Remove thumbnail references for VS Code webview to prevent ERR_ACCESS_DENIED
                manifest.projects.forEach((project: any) => {
                    delete project.thumbnail;
                });
            }
            return manifest;
        } catch (error) {
            console.error('Failed to load project data with status:', error);
            return { projects: [] };
        }
    }

    private async _updateProjectStatuses(projects: any[]): Promise<void> {
        console.log('🔍 Starting port status checks for', projects.length, 'projects');
        const statusPromises = projects.map(async (project) => {
            if (project.localPort) {
                try {
                    console.log(`🔍 Checking ${project.id} on default port ${project.localPort}`);
                    // First check the default port
                    const defaultPortRunning = await this._checkPortStatus(project.localPort);
                    console.log(`🔍 ${project.id} port ${project.localPort} status:`, defaultPortRunning);
                    
                    if (defaultPortRunning) {
                        project.status = 'active';
                        project.actualPort = project.localPort;
                        console.log(`✅ ${project.id} ACTIVE on default port ${project.localPort}`);
                        return;
                    }

                    // No alternative port scanning - be strict about configured ports
                    project.status = 'inactive';
                    project.actualPort = null;
                    console.log(`❌ ${project.id} INACTIVE - configured port ${project.localPort} not responding`);
                } catch (error) {
                    project.status = 'inactive';
                    project.actualPort = null;
                    console.log(`❌ ${project.id} ERROR:`, error);
                }
            } else {
                project.status = 'inactive';
                project.actualPort = null;
                console.log(`❌ ${project.id} INACTIVE - no port configured`);
            }
        });
        await Promise.all(statusPromises);
        
        const finalStatuses = projects.map(p => `${p.id}: ${p.status} (${p.actualPort || 'no port'})`).join(', ');
        console.log('📊 Final project statuses:', finalStatuses);
    }

    private async _findProjectActualPort(project: any): Promise<number | null> {
        // Define port ranges to scan based on project type
        let portsToCheck: number[] = [];
        
        if (project.id === 'ggprompts') {
            // GGPrompts often uses 9323-9330 range
            portsToCheck = [9323, 9324, 9325, 9326, 9327, 9328, 9329, 9330];
        } else if (project.localPort < 4000) {
            // Regular React apps typically use 3000-3099 range
            portsToCheck = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];
        } else if (project.localPort >= 5000) {
            // Vite/Next.js apps typically use 5173-5179 range
            portsToCheck = [5173, 5174, 5175, 5176, 5177, 5178, 5179];
        }

        // Remove the default port since we already checked it
        portsToCheck = portsToCheck.filter(port => port !== project.localPort);

        // Check each port in the range
        for (const port of portsToCheck) {
            try {
                const isRunning = await this._checkPortStatus(port);
                if (isRunning) {
                    // Verify this is actually our project by checking if it serves the expected content
                    const isOurProject = await this._verifyProjectOnPort(project, port);
                    if (isOurProject) {
                        return port;
                    }
                }
            } catch (error) {
                // Continue checking other ports
                continue;
            }
        }

        return null;
    }

    private async _verifyProjectOnPort(project: any, port: number): Promise<boolean> {
        try {
            // Make a simple HEAD request to verify this is our project
            const req = require('http').request({
                hostname: 'localhost',
                port: port,
                path: '/',
                method: 'HEAD',
                timeout: 1000
            }, (res: any) => {
                // Any successful response indicates the project is running
                return res.statusCode < 500;
            });

            return new Promise((resolve) => {
                req.on('response', (res: any) => {
                    resolve(res.statusCode < 500);
                });

                req.on('error', () => {
                    resolve(false);
                });

                req.on('timeout', () => {
                    req.destroy();
                    resolve(false);
                });

                req.end();
            });
        } catch (error) {
            return false;
        }
    }

    private _checkPortStatus(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            // Use same settings as projectProvider for consistency
            const req = require('http').request({
                hostname: 'localhost',
                port: port,
                path: '/favicon.ico',  // Match projectProvider.ts
                method: 'GET',
                timeout: 2000  // Match projectProvider.ts timeout
            }, (res: any) => {
                // Accept any response (even 404) as indication server is running - match projectProvider logic
                const isRunning = res.statusCode !== undefined;
                console.log(`🔍 Port ${port} responded with status ${res.statusCode} - ${isRunning ? 'ACTIVE' : 'INACTIVE'}`);
                resolve(isRunning);
            });

            req.on('error', (err: any) => {
                console.log(`🔍 Port ${port} error: ${err.code || err.message} - INACTIVE`);
                resolve(false);
            });

            req.on('timeout', () => {
                console.log(`🔍 Port ${port} timeout - INACTIVE`);
                req.destroy();
                resolve(false);
            });

            req.end();
        });
    }

    // Track open preview panels
    private _openPreviews = new Map<string, vscode.WebviewPanel>();

    /**
     * Closes an embedded preview panel
     */
    private async _closeEmbeddedPreview(title: string): Promise<void> {
        const existingPanel = this._openPreviews.get(title);
        if (existingPanel) {
            existingPanel.dispose();
            this._openPreviews.delete(title);
            console.log(`🗑️ Closed embedded preview for ${title}`);
        }
    }

    public async _getHtmlForWebview(webview: vscode.Webview) {
        // Get the local path to portfolio assets
        const portfolioPath = vscode.Uri.joinPath(this._extensionUri, 'portfolio-dist');
        
        // Load project data from manifest with status checking (always use fresh data for HTML generation)
        const projectData = await this._loadProjectDataWithStatus();
        this._cachedProjectData = projectData;
        
        console.log('HTML generation - project statuses:', projectData.projects?.map((p: any) => `${p.id}: ${p.status}`));

        // Read the actual index.html file and parse asset names
        let htmlContent = '';
        let cssUri: string = '';
        let jsUri: string = '';
        
        try {
            const indexHtmlPath = vscode.Uri.joinPath(portfolioPath, 'index.html');
            const htmlBuffer = fs.readFileSync(indexHtmlPath.fsPath);
            htmlContent = htmlBuffer.toString();
            
            // Extract asset filenames from HTML
            const cssMatch = htmlContent.match(/href="\/assets\/(index-[^"]+\.css)"/);
            const jsMatch = htmlContent.match(/src="\/assets\/(index-[^"]+\.js)"/);
            
            if (cssMatch && jsMatch) {
                cssUri = webview.asWebviewUri(vscode.Uri.joinPath(portfolioPath, 'assets', cssMatch[1])).toString();
                jsUri = webview.asWebviewUri(vscode.Uri.joinPath(portfolioPath, 'assets', jsMatch[1])).toString();
            }
        } catch (error) {
            console.error('Failed to load portfolio HTML:', error);
            console.error('Using hardcoded fallback asset names');
            // Fallback to hardcoded names (updated to current build)
            cssUri = webview.asWebviewUri(vscode.Uri.joinPath(portfolioPath, 'assets', 'index-BrNvLEXu.css')).toString();
            jsUri = webview.asWebviewUri(vscode.Uri.joinPath(portfolioPath, 'assets', 'index-Cr0I3TKJ.js')).toString();
        }
        
        console.log('🔧 Asset URIs:', { cssUri, jsUri });

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-inline'; connect-src 'self' http://localhost:* https://localhost:* ws://localhost:* wss://localhost:*; img-src ${webview.cspSource} data: http: https: http://localhost:* https://localhost:*; font-src ${webview.cspSource} https:; frame-src http://localhost:* https://localhost:*; child-src http://localhost:* https://localhost:*; frame-ancestors 'self';"
    <title>Claude Portfolio</title>
    <link rel="stylesheet" type="text/css" href="${cssUri}">
    <style>
        /* Override any absolute positioning for VS Code webview */
        body {
            margin: 0;
            padding: 0;
            width: 100% !important;
            height: 100vh !important;
            overflow-x: hidden;
            overflow-y: auto;
        }
        #root {
            width: 100% !important;
            min-height: 100% !important;
        }
        /* Ensure VS Code integration */
        .vscode-webview-integration {
            --vscode-portfolio-path: '${this._portfolioPath}';
        }
    </style>
</head>
<body class="vscode-webview-integration">
    <div id="root"></div>
    <script nonce="${nonce}">
        // VS Code API setup
        const vscode = acquireVsCodeApi();
        
        // Debug logging
        console.log('🔧 VS Code Portfolio Webview Loading...');
        console.log('🔧 Portfolio Path:', '${this._portfolioPath.replace(/\\/g, '\\\\')}');
        console.log('🔧 Project Data Injection:', ${JSON.stringify(projectData)});
        console.log('🔧 Data timestamp:', ${Date.now()});
        console.log('🔧 Project statuses being injected:', ${JSON.stringify(projectData?.projects?.map((p: any) => ({ id: p.id, status: p.status, actualPort: p.actualPort, localPort: p.localPort })) || [])});
        
        // Global portfolio configuration for VS Code
        window.vsCodePortfolio = {
            portfolioPath: '${this._portfolioPath.replace(/\\/g, '\\\\')}',
            isVSCodeWebview: true,
            projectData: ${JSON.stringify(projectData)},
            lastUpdated: ${Date.now()},
            
            // Main postMessage method for communication
            postMessage: (message) => {
                vscode.postMessage(message);
            },
            
            // Project management functions  
            launchAllProjects: () => {
                console.log('Launching all projects in VS Code terminals...');
                vscode.postMessage({ type: 'projects:launchAll' });
            },
            
            launchSelectedProjects: (projects) => {
                console.log('Launching selected projects:', projects);
                vscode.postMessage({ type: 'projects:launchSelected', projects });
            },
            
            // VS Code API wrappers
            executeCommand: (command, name) => {
                vscode.postMessage({ type: 'terminal:execute', command, name });
            },
            
            addProjectToWorkspace: (project) => {
                vscode.postMessage({ type: 'workspace:addProject', project });
            },
            
            saveFile: (path, content) => {
                vscode.postMessage({ type: 'file:save', path, content });
            },
            
            updateGitRepo: (projectPath) => {
                vscode.postMessage({ type: 'git:update', projectPath });
            },
            
            openInVSCode: (path) => {
                vscode.postMessage({ type: 'vscode:open', path });
            },
            
            openInBrowser: (url) => {
                vscode.postMessage({ type: 'browser:open', url });
            },
            
            openFolder: (path) => {
                vscode.postMessage({ type: 'folder:open', path });
            },
            
            showNotification: (text, level = 'info') => {
                vscode.postMessage({ type: 'notification:show', text, level });
            },
            
            // Embedded preview functions to replace iframe nesting
            createEmbeddedPreview: (url, title, viewType = 'desktop') => {
                console.log('Creating embedded preview for:', title, url);
                vscode.postMessage({ type: 'preview:create', url, title, viewType });
            },
            
            closeEmbeddedPreview: (title) => {
                console.log('Closing embedded preview for:', title);
                vscode.postMessage({ type: 'preview:close', title });
            }
        };
        
        // Verify data injection worked
        console.log('🔧 Verification - window.vsCodePortfolio exists:', !!window.vsCodePortfolio);
        console.log('🔧 Verification - isVSCodeWebview:', window.vsCodePortfolio?.isVSCodeWebview);
        console.log('🔧 Verification - project count:', window.vsCodePortfolio?.projectData?.projects?.length);
        
        // Override clipboard operations for VS Code integration
        const originalClipboard = navigator.clipboard;
        navigator.clipboard = {
            ...originalClipboard,
            writeText: async (text) => {
                try {
                    // Try native clipboard first
                    await originalClipboard.writeText(text);
                    window.vsCodePortfolio.showNotification('Copied to clipboard');
                } catch (error) {
                    // Fallback - show notification with command
                    window.vsCodePortfolio.showNotification('Command ready: ' + text);
                }
            }
        };
    </script>
    <script type="module" nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
    }

    /**
     * Opens a project in VS Code Live Preview extension
     */
    private async _openLivePreview(url: string, title: string, projectId: string): Promise<void> {
        try {
            console.log(`🔴 Opening Live Preview for ${title} at ${url}`);
            
            // Check if Live Preview extension is available
            const livePreviewExtension = vscode.extensions.getExtension('ms-vscode.live-server');
            
            if (livePreviewExtension && livePreviewExtension.isActive) {
                // Use Live Preview extension - open external server
                await vscode.commands.executeCommand('livePreview.start.externalServer', {
                    serverPath: url,
                    serverName: title
                });
                
                vscode.window.showInformationMessage(`🔴 Live Preview opened for ${title}`);
                console.log(`✅ Live Preview started for ${title} using Live Preview extension`);
                
            } else if (livePreviewExtension && !livePreviewExtension.isActive) {
                // Extension exists but not active - activate it
                await livePreviewExtension.activate();
                await vscode.commands.executeCommand('livePreview.start.externalServer', {
                    serverPath: url,
                    serverName: title
                });
                
                vscode.window.showInformationMessage(`🔴 Live Preview opened for ${title}`);
                console.log(`✅ Live Preview started for ${title} after activating extension`);
                
            } else {
                // Fallback to VS Code Simple Browser
                await vscode.commands.executeCommand('simpleBrowser.show', url);
                
                vscode.window.showInformationMessage(
                    `Opened ${title} in Simple Browser. Install Live Preview extension for better experience.`,
                    'Install Live Preview'
                ).then(selection => {
                    if (selection === 'Install Live Preview') {
                        vscode.commands.executeCommand('workbench.extensions.search', 'ms-vscode.live-server');
                    }
                });
                
                console.log(`✅ Opened ${title} in Simple Browser (Live Preview not available)`);
            }
            
        } catch (error) {
            console.error('Failed to open Live Preview:', error);
            
            // Final fallback to external browser
            await vscode.env.openExternal(vscode.Uri.parse(url));
            vscode.window.showErrorMessage(
                `Failed to open Live Preview for ${title}. Opened in external browser instead.`
            );
        }
    }

    /**
     * Opens multiple projects in Live Preview
     */
    private async _openMultipleLivePreviews(projects: Array<{url: string, title: string, projectId: string}>): Promise<void> {
        try {
            console.log(`🔴 Opening ${projects.length} Live Previews...`);
            
            const results = await Promise.allSettled(
                projects.map(project => this._openLivePreview(project.url, project.title, project.projectId))
            );
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            if (failed > 0) {
                vscode.window.showWarningMessage(
                    `Opened ${successful}/${projects.length} Live Previews. ${failed} failed to open.`
                );
            } else {
                vscode.window.showInformationMessage(
                    `🔴 Successfully opened ${successful} Live Previews`
                );
            }
            
        } catch (error) {
            console.error('Failed to open multiple Live Previews:', error);
            vscode.window.showErrorMessage('Failed to open multiple Live Previews');
        }
    }

    /**
     * Refresh and inject fresh project data into webview
     */
    private async _refreshAndInjectProjectData(): Promise<void> {
        console.log('🔄 Refreshing and injecting fresh project data');
        
        // Force reload of project data with fresh status
        this._cachedProjectData = null;
        const freshData = await this._loadProjectDataWithStatus();
        this._cachedProjectData = freshData;
        
        console.log('🔄 Fresh project data loaded:', freshData.projects?.map((p: any) => `${p.id}: ${p.status}`));
        
        // Update the webview with the fresh data by regenerating HTML
        if (this._view) {
            const html = await this._getHtmlForWebview(this._view.webview);
            this._view.webview.html = html;
            console.log('🔄 Webview updated with fresh project data');
        }
    }

    /**
     * Refresh only project status (lighter operation)
     */
    private async _refreshProjectStatus(): Promise<void> {
        console.log('🔄 Refreshing project status only');
        
        if (this._cachedProjectData?.projects) {
            // Update statuses of existing projects
            await this._updateProjectStatuses(this._cachedProjectData.projects);
            
            console.log('🔄 Project statuses refreshed:', this._cachedProjectData.projects?.map((p: any) => `${p.id}: ${p.status}`));
            
            // Update the webview with the updated status data
            if (this._view) {
                const html = await this._getHtmlForWebview(this._view.webview);
                this._view.webview.html = html;
                console.log('🔄 Webview updated with fresh status data');
            }
        }
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
