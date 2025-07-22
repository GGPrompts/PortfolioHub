import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class PortfolioWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'claude-portfolio.main';
    
    private _view?: vscode.WebviewView;

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

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Set up message handling
        this._setupMessageHandling(webviewView.webview);
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
                default:
                    console.log('Unhandled message type:', message.type);
            }
        });
    }

    private async _executeInTerminal(command: string, terminalName?: string): Promise<void> {
        const terminal = vscode.window.createTerminal(terminalName || 'Portfolio Command');
        terminal.sendText(command);
        terminal.show();
    }

    private async _addProjectToWorkspace(project: any): Promise<void> {
        const projectPath = path.isAbsolute(project.path) 
            ? project.path 
            : path.join(this._portfolioPath, project.path || project.id);
        
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
        const fullPath = path.isAbsolute(projectPath) 
            ? projectPath 
            : path.join(this._portfolioPath, projectPath);

        const terminal = vscode.window.createTerminal('Git Update');
        terminal.sendText(`cd "${fullPath}"`);
        terminal.sendText('git pull');
        terminal.show();
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
        await vscode.env.openExternal(vscode.Uri.parse(url));
    }

    private async _openFolder(folderPath: string): Promise<void> {
        const fullPath = path.isAbsolute(folderPath) 
            ? folderPath 
            : path.join(this._portfolioPath, folderPath);

        if (!fs.existsSync(fullPath)) {
            vscode.window.showErrorMessage(`Folder does not exist: ${fullPath}`);
            return;
        }

        // On Windows, use explorer
        if (process.platform === 'win32') {
            const terminal = vscode.window.createTerminal('Open Folder');
            terminal.sendText(`explorer "${fullPath}"`);
            terminal.dispose();
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

    private async _launchAllProjects(): Promise<void> {
        const projectData = this._loadProjectData();
        const projects = projectData.projects || [];
        
        // Launch portfolio first
        const portfolioTerminal = vscode.window.createTerminal('Portfolio');
        portfolioTerminal.sendText(`cd "${this._portfolioPath}"`);
        portfolioTerminal.sendText('$env:OPEN_BROWSER = "false"; $env:REACT_APP_OPEN_BROWSER = "false"; $env:BROWSER = "none"');
        portfolioTerminal.sendText('npm run dev');
        
        // Launch each project in its own terminal
        for (const project of projects) {
            await this._launchProject(project);
            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Show portfolio terminal
        portfolioTerminal.show();
        this._showNotification(`Launched ${projects.length + 1} projects in VS Code terminals!`);
    }

    private async _launchSelectedProjects(projectIds: string[]): Promise<void> {
        const projectData = this._loadProjectData();
        const projects = (projectData.projects || []).filter((p: any) => projectIds.includes(p.id));
        
        for (const project of projects) {
            await this._launchProject(project);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        this._showNotification(`Launched ${projects.length} selected projects in VS Code terminals!`);
    }

    private async _launchProject(project: any): Promise<void> {
        const projectPath = path.join(this._portfolioPath, 'projects', project.path || project.id);
        const terminal = vscode.window.createTerminal(project.title || project.id);
        
        terminal.sendText(`cd "${projectPath}"`);
        
        // Set environment variables
        if (project.localPort) {
            terminal.sendText(`$env:PORT = "${project.localPort}"`);
        }
        terminal.sendText('$env:BROWSER = "none"; $env:OPEN_BROWSER = "false"; $env:REACT_APP_OPEN_BROWSER = "false"');
        
        // Run the build command
        const command = project.buildCommand || 'npm run dev';
        terminal.sendText(`Write-Host '${project.title} running at http://localhost:${project.localPort}' -ForegroundColor Green`);
        terminal.sendText(command);
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

    public _getHtmlForWebview(webview: vscode.Webview) {
        // Get the local path to portfolio assets
        const portfolioPath = vscode.Uri.joinPath(this._extensionUri, 'portfolio-dist');
        
        // Get URIs for the CSS and JS files
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(portfolioPath, 'index-gcHwfFpK.css'));
        const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(portfolioPath, 'index-DV13vJNQ.js'));

        // Load project data from manifest
        const projectData = this._loadProjectData();

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; connect-src 'self' http://localhost:* ws://localhost:*; img-src ${webview.cspSource} data: http: https:; font-src ${webview.cspSource};">
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
        console.log('VS Code Portfolio Webview Loading...');
        console.log('Portfolio Path:', '${this._portfolioPath.replace(/\\/g, '\\\\')}');
        console.log('Project Data:', ${JSON.stringify(projectData)});
        
        // Global portfolio configuration for VS Code
        window.vsCodePortfolio = {
            portfolioPath: '${this._portfolioPath.replace(/\\/g, '\\\\')}',
            isVSCodeWebview: true,
            projectData: ${JSON.stringify(projectData)},
            
            // Main postMessage method for communication
            postMessage: (message) => {
                vscode.postMessage(message);
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
            }
        };
        
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
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}