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
exports.PortfolioWebviewProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class PortfolioWebviewProvider {
    constructor(_extensionUri, _portfolioPath) {
        this._extensionUri = _extensionUri;
        this._portfolioPath = _portfolioPath;
    }
    resolveWebviewView(webviewView, context, _token) {
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
    _setupMessageHandling(webview) {
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
    async _executeInTerminal(command, terminalName) {
        const terminal = vscode.window.createTerminal(terminalName || 'Portfolio Command');
        terminal.sendText(command);
        terminal.show();
    }
    async _addProjectToWorkspace(project) {
        const projectPath = path.isAbsolute(project.path)
            ? project.path
            : path.join(this._portfolioPath, project.path || project.id);
        const projectUri = vscode.Uri.file(projectPath);
        if (!fs.existsSync(projectPath)) {
            vscode.window.showErrorMessage(`Project path does not exist: ${projectPath}`);
            return;
        }
        const success = vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length || 0, 0, { uri: projectUri, name: project.title });
        if (success) {
            vscode.window.showInformationMessage(`Added ${project.title} to workspace`);
        }
        else {
            vscode.window.showErrorMessage(`Failed to add ${project.title} to workspace`);
        }
    }
    async _saveFile(relativePath, content) {
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to save file: ${error}`);
        }
    }
    async _updateGitRepo(projectPath) {
        const fullPath = path.isAbsolute(projectPath)
            ? projectPath
            : path.join(this._portfolioPath, projectPath);
        const terminal = vscode.window.createTerminal('Git Update');
        terminal.sendText(`cd "${fullPath}"`);
        terminal.sendText('git pull');
        terminal.show();
    }
    async _openInVSCode(projectPath) {
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
    async _openInBrowser(url) {
        await vscode.env.openExternal(vscode.Uri.parse(url));
    }
    async _openFolder(folderPath) {
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
        }
        else {
            // On other platforms, try to open with VS Code
            const uri = vscode.Uri.file(fullPath);
            await vscode.commands.executeCommand('revealFileInOS', uri);
        }
    }
    _showNotification(text, level = 'info') {
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
    async _launchAllProjects() {
        try {
            const projectData = this._loadProjectData();
            const projects = projectData.projects || [];
            this._showNotification(`Starting ${projects.length + 1} projects...`);
            // Launch portfolio first
            const portfolioTerminal = vscode.window.createTerminal('Portfolio');
            portfolioTerminal.sendText(`cd "${this._portfolioPath}"`);
            portfolioTerminal.sendText('$env:OPEN_BROWSER = false');
            portfolioTerminal.sendText('$env:REACT_APP_OPEN_BROWSER = false');
            portfolioTerminal.sendText('$env:BROWSER = none');
            portfolioTerminal.sendText('npm run dev');
            // Launch each project in its own terminal
            let successCount = 0;
            for (const project of projects) {
                try {
                    await this._launchProject(project);
                    successCount++;
                    // Small delay to avoid overwhelming the system
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (error) {
                    console.error(`Failed to launch project ${project.id}:`, error);
                    this._showNotification(`Failed to launch ${project.title}: ${error}`, 'error');
                }
            }
            // Show portfolio terminal
            portfolioTerminal.show();
            this._showNotification(`✅ Successfully launched ${successCount + 1} of ${projects.length + 1} projects!`);
        }
        catch (error) {
            this._showNotification(`❌ Failed to launch projects: ${error}`, 'error');
        }
    }
    async _launchSelectedProjects(projectIds) {
        try {
            const projectData = this._loadProjectData();
            const projects = (projectData.projects || []).filter((p) => projectIds.includes(p.id));
            if (projects.length === 0) {
                this._showNotification('❌ No projects found to launch', 'warning');
                return;
            }
            this._showNotification(`Starting ${projects.length} selected projects...`);
            let successCount = 0;
            for (const project of projects) {
                try {
                    await this._launchProject(project);
                    successCount++;
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (error) {
                    console.error(`Failed to launch project ${project.id}:`, error);
                    this._showNotification(`Failed to launch ${project.title}: ${error}`, 'error');
                }
            }
            this._showNotification(`✅ Successfully launched ${successCount} of ${projects.length} selected projects!`);
        }
        catch (error) {
            this._showNotification(`❌ Failed to launch selected projects: ${error}`, 'error');
        }
    }
    async _launchProject(project) {
        const projectPath = path.join(this._portfolioPath, 'projects', project.path || project.id);
        // Check if project directory exists
        if (!fs.existsSync(projectPath)) {
            throw new Error(`Project directory not found: ${projectPath}`);
        }
        const terminal = vscode.window.createTerminal(project.title || project.id);
        // Change to project directory
        terminal.sendText(`cd "${projectPath}"`);
        // Check if package.json exists (for npm projects)
        const packageJsonPath = path.join(projectPath, 'package.json');
        const hasPackageJson = fs.existsSync(packageJsonPath);
        if (hasPackageJson) {
            // Set environment variables for Node.js projects
            if (project.localPort) {
                terminal.sendText(`$env:PORT = ${project.localPort}`);
            }
            terminal.sendText('$env:BROWSER = none');
            terminal.sendText('$env:OPEN_BROWSER = false');
            terminal.sendText('$env:REACT_APP_OPEN_BROWSER = false');
            // Check if node_modules exists
            const nodeModulesPath = path.join(projectPath, 'node_modules');
            if (!fs.existsSync(nodeModulesPath)) {
                terminal.sendText('Write-Host "Installing dependencies..." -ForegroundColor Yellow');
                terminal.sendText('npm install');
            }
        }
        // Run the build command
        const command = project.buildCommand || 'npm run dev';
        const portText = project.localPort ? ` at http://localhost:${project.localPort}` : '';
        terminal.sendText(`Write-Host 'Starting ${project.title}${portText}' -ForegroundColor Green`);
        terminal.sendText(command);
    }
    _loadProjectData() {
        try {
            const manifestPath = path.join(this._portfolioPath, 'projects', 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                const manifestContent = fs.readFileSync(manifestPath, 'utf8');
                const manifest = JSON.parse(manifestContent);
                return manifest;
            }
        }
        catch (error) {
            console.error('Failed to load project manifest:', error);
        }
        return { projects: [] };
    }
    _getHtmlForWebview(webview) {
        // Get the local path to portfolio assets
        const portfolioPath = vscode.Uri.joinPath(this._extensionUri, 'portfolio-dist');
        // Load project data from manifest
        const projectData = this._loadProjectData();
        // Read the actual index.html file and parse asset names
        let htmlContent = '';
        let cssUri = '';
        let jsUri = '';
        try {
            const indexHtmlPath = vscode.Uri.joinPath(portfolioPath, 'index.html');
            const htmlBuffer = fs.readFileSync(indexHtmlPath.fsPath);
            htmlContent = htmlBuffer.toString();
            // Extract asset filenames from HTML
            const cssMatch = htmlContent.match(/href="\/assets\/(index-[^"]+\.css)"/);
            const jsMatch = htmlContent.match(/src="\/assets\/(index-[^"]+\.js)"/);
            if (cssMatch && jsMatch) {
                cssUri = webview.asWebviewUri(vscode.Uri.joinPath(portfolioPath, cssMatch[1])).toString();
                jsUri = webview.asWebviewUri(vscode.Uri.joinPath(portfolioPath, jsMatch[1])).toString();
            }
        }
        catch (error) {
            console.error('Failed to load portfolio HTML:', error);
            // Fallback to hardcoded names
            cssUri = webview.asWebviewUri(vscode.Uri.joinPath(portfolioPath, 'index-gcHwfFpK.css')).toString();
            jsUri = webview.asWebviewUri(vscode.Uri.joinPath(portfolioPath, 'index-DV13vJNQ.js')).toString();
        }
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
exports.PortfolioWebviewProvider = PortfolioWebviewProvider;
PortfolioWebviewProvider.viewType = 'claude-portfolio.main';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=portfolioWebviewProvider.js.map