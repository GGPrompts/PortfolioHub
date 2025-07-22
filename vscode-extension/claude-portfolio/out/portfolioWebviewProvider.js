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
    getCachedProjectData() {
        return this._cachedProjectData;
    }
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
    async refreshProjectData() {
        if (this._view) {
            try {
                // Clear cached data to force fresh status checking
                this._cachedProjectData = null;
                // Reload project data with fresh status
                const freshData = await this._loadProjectDataWithStatus();
                this._cachedProjectData = freshData;
                console.log('Fresh project statuses:', freshData.projects?.map((p) => `${p.id}: ${p.status}`));
                // Update the webview with fresh data
                const html = await this._getHtmlForWebview(this._view.webview);
                this._view.webview.html = html;
                console.log('Portfolio webview refreshed with updated project data at', new Date().toLocaleTimeString());
            }
            catch (error) {
                console.error('Failed to refresh portfolio webview:', error);
            }
        }
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
        try {
            // Use VS Code Simple Browser for better integration
            await vscode.commands.executeCommand('simpleBrowser.show', url);
            console.log(`🌐 Opened ${url} in VS Code Simple Browser`);
        }
        catch (error) {
            console.log(`Simple Browser not available, falling back to external browser for ${url}`);
            // Fallback to external browser if Simple Browser is not available
            await vscode.env.openExternal(vscode.Uri.parse(url));
        }
    }
    async _openInExternalBrowser(url, reason) {
        try {
            // Force external browser (bypasses Simple Browser limitations)
            await vscode.env.openExternal(vscode.Uri.parse(url));
            const reasonText = reason ? ` (${reason})` : '';
            console.log(`🌍 Opened ${url} in external browser${reasonText}`);
            if (reason) {
                vscode.window.showInformationMessage(`Opened in external browser: ${reason}`);
            }
        }
        catch (error) {
            console.error('Failed to open external browser:', error);
            vscode.window.showErrorMessage(`Failed to open ${url} in external browser`);
        }
    }
    async _createEmbeddedPreview(projectId, url) {
        try {
            // Create embedded preview panel with mobile/desktop toggle
            const panel = vscode.window.createWebviewPanel(`preview-${projectId}`, `🔍 Preview: ${projectId} (Desktop)`, {
                viewColumn: vscode.ViewColumn.Beside,
                preserveFocus: true
            }, {
                enableScripts: true,
                retainContextWhenHidden: true,
                portMapping: [
                    { webviewPort: parseInt(url.split(':')[2]), extensionHostPort: parseInt(url.split(':')[2]) }
                ]
            });
            let isMobileView = false;
            const getPreviewHTML = (mobile) => {
                const viewportMeta = mobile
                    ? '<meta name="viewport" content="width=375, initial-scale=1.0">'
                    : '<meta name="viewport" content="width=1920, initial-scale=1.0">';
                const containerStyle = mobile
                    ? 'width: 375px; height: 812px; margin: 20px auto; border: 2px solid #333; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3);'
                    : 'width: 100%; height: 100%;';
                const iframeStyle = mobile
                    ? 'width: 375px; height: 812px; border: none; transform: scale(0.8); transform-origin: top left;'
                    : 'width: 100%; height: calc(100vh - 60px); border: none;';
                return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    ${viewportMeta}
                    <title>Preview: ${projectId} (${mobile ? 'Mobile' : 'Desktop'})</title>
                    <style>
                        body, html { 
                            margin: 0; 
                            padding: 0; 
                            width: 100%; 
                            height: 100%; 
                            overflow: ${mobile ? 'auto' : 'hidden'};
                            background: ${mobile ? '#f0f0f0' : '#1e1e1e'};
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        }
                        .toolbar {
                            height: 40px;
                            background: #2d2d30;
                            color: white;
                            display: flex;
                            align-items: center;
                            padding: 0 20px;
                            gap: 15px;
                            border-bottom: 1px solid #3e3e42;
                        }
                        .toggle-btn {
                            background: #0e639c;
                            color: white;
                            border: none;
                            padding: 6px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 12px;
                        }
                        .toggle-btn:hover { background: #1177bb; }
                        .view-info { 
                            color: #cccccc; 
                            font-size: 12px;
                        }
                        .preview-container {
                            ${containerStyle}
                        }
                        iframe { ${iframeStyle} }
                        .loading { 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            height: 200px;
                            color: #ffffff;
                        }
                    </style>
                </head>
                <body>
                    <div class="toolbar">
                        <button class="toggle-btn" onclick="toggleView()">${mobile ? '🖥️ Desktop' : '📱 Mobile'}</button>
                        <span class="view-info">
                            ${mobile ? '📱 375×812 Mobile View' : '🖥️ Desktop View'} | ${projectId}
                        </span>
                        <button class="toggle-btn" onclick="refreshPreview()">🔄 Refresh</button>
                    </div>
                    <div class="preview-container">
                        <div class="loading" id="loading">Loading ${projectId} preview...</div>
                        <iframe id="preview" src="${url}" style="display: none;" 
                                onload="document.getElementById('loading').style.display='none'; this.style.display='block';">
                        </iframe>
                    </div>
                    <script>
                        const vscode = acquireVsCodeApi();
                        function toggleView() {
                            vscode.postMessage({ command: 'toggleView' });
                        }
                        function refreshPreview() {
                            document.getElementById('preview').src = document.getElementById('preview').src;
                        }
                    </script>
                </body>
                </html>
            `;
            };
            // Handle messages from webview
            panel.webview.onDidReceiveMessage(message => {
                if (message.command === 'toggleView') {
                    isMobileView = !isMobileView;
                    panel.title = `🔍 Preview: ${projectId} (${isMobileView ? 'Mobile' : 'Desktop'})`;
                    panel.webview.html = getPreviewHTML(isMobileView);
                }
            });
            // Set initial HTML
            panel.webview.html = getPreviewHTML(false);
            console.log(`🔍 Created embedded preview panel for ${projectId} at ${url}`);
            // Optional: Close panel when project stops running
            const interval = setInterval(async () => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1000);
                    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (!response.ok)
                        throw new Error('Project not running');
                }
                catch {
                    panel.dispose();
                    clearInterval(interval);
                    console.log(`🔍 Closed preview panel for ${projectId} (project stopped)`);
                }
            }, 10000);
            panel.onDidDispose(() => clearInterval(interval));
        }
        catch (error) {
            console.error(`Failed to create embedded preview for ${projectId}:`, error);
            vscode.window.showErrorMessage(`Failed to create preview for ${projectId}`);
        }
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
    async _loadProjectDataWithStatus() {
        try {
            const manifest = this._loadProjectData();
            if (manifest.projects && manifest.projects.length > 0) {
                // Update project statuses with real-time port checking
                await this._updateProjectStatuses(manifest.projects);
                // Remove thumbnail references for VS Code webview to prevent ERR_ACCESS_DENIED
                manifest.projects.forEach((project) => {
                    delete project.thumbnail;
                });
            }
            return manifest;
        }
        catch (error) {
            console.error('Failed to load project data with status:', error);
            return { projects: [] };
        }
    }
    async _updateProjectStatuses(projects) {
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
                }
                catch (error) {
                    project.status = 'inactive';
                    project.actualPort = null;
                    console.log(`❌ ${project.id} ERROR:`, error);
                }
            }
            else {
                project.status = 'inactive';
                project.actualPort = null;
                console.log(`❌ ${project.id} INACTIVE - no port configured`);
            }
        });
        await Promise.all(statusPromises);
        const finalStatuses = projects.map(p => `${p.id}: ${p.status} (${p.actualPort || 'no port'})`).join(', ');
        console.log('📊 Final project statuses:', finalStatuses);
    }
    async _findProjectActualPort(project) {
        // Define port ranges to scan based on project type
        let portsToCheck = [];
        if (project.id === 'ggprompts') {
            // GGPrompts often uses 9323-9330 range
            portsToCheck = [9323, 9324, 9325, 9326, 9327, 9328, 9329, 9330];
        }
        else if (project.localPort < 4000) {
            // Regular React apps typically use 3000-3099 range
            portsToCheck = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];
        }
        else if (project.localPort >= 5000) {
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
            }
            catch (error) {
                // Continue checking other ports
                continue;
            }
        }
        return null;
    }
    async _verifyProjectOnPort(project, port) {
        try {
            // Make a simple HEAD request to verify this is our project
            const req = require('http').request({
                hostname: 'localhost',
                port: port,
                path: '/',
                method: 'HEAD',
                timeout: 1000
            }, (res) => {
                // Any successful response indicates the project is running
                return res.statusCode < 500;
            });
            return new Promise((resolve) => {
                req.on('response', (res) => {
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
        }
        catch (error) {
            return false;
        }
    }
    _checkPortStatus(port) {
        return new Promise((resolve) => {
            // Use same settings as projectProvider for consistency
            const req = require('http').request({
                hostname: 'localhost',
                port: port,
                path: '/favicon.ico', // Match projectProvider.ts
                method: 'GET',
                timeout: 2000 // Match projectProvider.ts timeout
            }, (res) => {
                // Accept any response (even 404) as indication server is running - match projectProvider logic
                const isRunning = res.statusCode !== undefined;
                console.log(`🔍 Port ${port} responded with status ${res.statusCode} - ${isRunning ? 'ACTIVE' : 'INACTIVE'}`);
                resolve(isRunning);
            });
            req.on('error', (err) => {
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
    async _getHtmlForWebview(webview) {
        // Get the local path to portfolio assets
        const portfolioPath = vscode.Uri.joinPath(this._extensionUri, 'portfolio-dist');
        // Load project data from manifest with status checking (always use fresh data for HTML generation)
        const projectData = await this._loadProjectDataWithStatus();
        this._cachedProjectData = projectData;
        console.log('HTML generation - project statuses:', projectData.projects?.map((p) => `${p.id}: ${p.status}`));
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
                cssUri = webview.asWebviewUri(vscode.Uri.joinPath(portfolioPath, 'assets', cssMatch[1])).toString();
                jsUri = webview.asWebviewUri(vscode.Uri.joinPath(portfolioPath, 'assets', jsMatch[1])).toString();
            }
        }
        catch (error) {
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
        console.log('🔧 Project statuses being injected:', ${JSON.stringify(projectData?.projects?.map((p) => ({ id: p.id, status: p.status, actualPort: p.actualPort, localPort: p.localPort })) || [])});
        
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