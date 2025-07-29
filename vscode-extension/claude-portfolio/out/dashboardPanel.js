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
exports.DashboardPanel = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const http = __importStar(require("http"));
class DashboardPanel {
    static createOrShow(extensionUri, portfolioPath, websocketBridge, portDetectionService, projectService) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel(DashboardPanel.viewType, 'Claude Portfolio Dashboard', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [extensionUri]
        });
        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri, portfolioPath, websocketBridge, portDetectionService, projectService);
    }
    constructor(panel, extensionUri, portfolioPath, websocketBridge, portDetectionService, projectService) {
        this._disposables = [];
        this._refreshThrottle = null;
        this._batchOperationThrottle = null;
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._portfolioPath = portfolioPath;
        this._websocketBridge = websocketBridge;
        this._portDetectionService = portDetectionService;
        this._projectService = projectService;
        this._update();
        this._setupRealtimeUpdates();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'openProject':
                    vscode.commands.executeCommand('claude-portfolio.openProject', message.project);
                    return;
                case 'runProject':
                    vscode.commands.executeCommand('claude-portfolio.runProject', message.project);
                    return;
                case 'openInBrowser':
                    vscode.commands.executeCommand('claude-portfolio.openProjectInBrowser', message.project);
                    return;
                case 'openInExternalBrowser':
                    vscode.commands.executeCommand('claude-portfolio.openProjectInExternalBrowser', message.project);
                    return;
                case 'refresh':
                case 'refreshProjects': // Add missing handler
                    this._throttledRefresh();
                    return;
                case 'openAllProjects':
                    this._throttledBatchOperation(() => this._handleOpenAllProjects());
                    return;
                case 'startAllServers':
                    this._throttledBatchOperation(() => this._handleStartAllServers());
                    return;
            }
        }, null, this._disposables);
    }
    dispose() {
        // Clean up throttles
        if (this._refreshThrottle) {
            clearTimeout(this._refreshThrottle);
            this._refreshThrottle = null;
        }
        if (this._batchOperationThrottle) {
            clearTimeout(this._batchOperationThrottle);
            this._batchOperationThrottle = null;
        }
        DashboardPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    async _loadProjectsFromManifest() {
        try {
            const manifestPath = path.join(this._portfolioPath, 'projects', 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                const manifestContent = fs.readFileSync(manifestPath, 'utf8');
                const manifest = JSON.parse(manifestContent);
                return manifest.projects || [];
            }
        }
        catch (error) {
            console.error('📊 Dashboard: Failed to load project manifest:', error);
        }
        return [];
    }
    async _getProjectData() {
        try {
            const projects = await this._loadProjectsFromManifest();
            // Use enhanced port detection service if available
            if (this._portDetectionService) {
                console.log('📊 Dashboard: Using enhanced port detection service');
                const statuses = await this._portDetectionService.checkProjectStatuses(projects);
                // Merge status information
                projects.forEach(project => {
                    const statusInfo = statuses.find(s => s.projectId === project.id);
                    if (statusInfo) {
                        project.status = statusInfo.status === 'active' || statusInfo.status === 'multiple' ? 'active' : 'inactive';
                        project.enhancedStatus = statusInfo;
                    }
                    else {
                        project.status = 'inactive';
                    }
                });
            }
            else {
                // Fallback to basic port checking
                console.log('📊 Dashboard: Using basic port checking');
                await this._updateProjectStatuses(projects);
            }
            return projects;
        }
        catch (error) {
            console.error('📊 Dashboard: Failed to get project data:', error);
            return [];
        }
    }
    async _updateProjectStatuses(projects) {
        const statusPromises = projects.map(async (project) => {
            if (project.localPort) {
                try {
                    const isRunning = await this._checkPortStatus(project.localPort);
                    project.status = isRunning ? 'active' : 'inactive';
                }
                catch (error) {
                    project.status = 'inactive';
                }
            }
            else {
                project.status = 'inactive';
            }
            return project;
        });
        await Promise.all(statusPromises);
    }
    _checkPortStatus(port) {
        return new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: port,
                path: '/',
                method: 'GET',
                timeout: 1000
            }, (res) => {
                // Only resolve true for successful HTTP status codes
                resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400);
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
    /**
     * Setup real-time updates via WebSocket bridge
     */
    _setupRealtimeUpdates() {
        if (!this._websocketBridge) {
            console.log('📊 Dashboard: No WebSocket bridge available for real-time updates');
            return;
        }
        console.log('📊 Dashboard: Setting up real-time project status updates');
        // Listen for WebSocket bridge broadcasts
        // Note: This would need to be implemented in the WebSocket bridge service
        // For now, we'll rely on manual refresh and throttling
    }
    /**
     * Throttled refresh to prevent excessive updates
     */
    _throttledRefresh() {
        if (this._refreshThrottle) {
            clearTimeout(this._refreshThrottle);
        }
        this._refreshThrottle = setTimeout(async () => {
            console.log('📊 Dashboard: Executing throttled refresh');
            await this._update();
            // Notify React app via WebSocket bridge if available
            if (this._websocketBridge && this._portDetectionService) {
                try {
                    const projects = await this._loadProjectsFromManifest();
                    const statuses = await this._portDetectionService.checkProjectStatuses(projects);
                    // Broadcast update to connected React clients
                    this._websocketBridge.broadcast({
                        type: 'dashboard-project-update',
                        data: {
                            projects,
                            statuses,
                            timestamp: Date.now(),
                            source: 'dashboard-refresh'
                        }
                    });
                }
                catch (error) {
                    console.error('📊 Dashboard: Failed to broadcast project update:', error);
                }
            }
            this._refreshThrottle = null;
        }, 1000); // 1 second throttle
    }
    /**
     * Throttled batch operations to prevent system overload
     */
    _throttledBatchOperation(operation) {
        if (this._batchOperationThrottle) {
            console.log('📊 Dashboard: Batch operation already in progress, skipping');
            return;
        }
        this._batchOperationThrottle = setTimeout(async () => {
            try {
                console.log('📊 Dashboard: Executing throttled batch operation');
                await operation();
            }
            catch (error) {
                console.error('📊 Dashboard: Batch operation failed:', error);
                vscode.window.showErrorMessage(`Dashboard batch operation failed: ${error}`);
            }
            finally {
                this._batchOperationThrottle = null;
            }
        }, 2000); // 2 second throttle for batch operations
    }
    async _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Claude Portfolio Dashboard';
        this._panel.webview.html = await this._getHtmlForWebview(webview);
    }
    async _getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'dashboard.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'dashboard.css'));
        // Generate nonce for security
        const nonce = this._getNonce();
        // Load project data with real-time status checking
        const projectData = await this._getProjectData();
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:;">
            <link href="${styleUri}" rel="stylesheet">
            <title>Claude Portfolio Dashboard</title>
        </head>
        <body>
            <div class="container">
                <header>
                    <h1>🚀 Claude Portfolio Dashboard</h1>
                    <p>Manage your portfolio projects directly in VS Code</p>
                    <div class="dashboard-status">
                        <span id="connectionStatus">🔗 VS Code Connected</span>
                        <span id="lastUpdate">Last updated: ${new Date().toLocaleTimeString()}</span>
                    </div>
                </header>

                <div class="stats">
                    <div class="stat-card">
                        <h3>Total Projects</h3>
                        <div class="stat-value" id="totalProjects">0</div>
                    </div>
                    <div class="stat-card">
                        <h3>Active Projects</h3>
                        <div class="stat-value" id="activeProjects">0</div>
                    </div>
                    <div class="stat-card">
                        <h3>Technologies</h3>
                        <div class="stat-value" id="techCount">0</div>
                    </div>
                    <div class="stat-card">
                        <h3>Bridge Status</h3>
                        <div class="stat-value" id="bridgeStatus">${this._websocketBridge?.isRunning() ? '🟢' : '🔴'}</div>
                    </div>
                </div>

                <div class="projects-grid" id="projectsGrid">
                    <!-- Projects will be loaded here -->
                </div>

                <div class="actions">
                    <button class="action-btn" onclick="refreshProjects()" id="refreshBtn">
                        🔄 Refresh Projects
                    </button>
                    <button class="action-btn" onclick="openAllProjects()" id="openAllBtn">
                        📂 Open All Projects
                    </button>
                    <button class="action-btn" onclick="startAllServers()" id="startAllBtn">
                        ▶️ Start All Servers
                    </button>
                    <button class="action-btn" onclick="runDashboardTest()" id="testBtn">
                        🧪 Test Dashboard
                    </button>
                </div>

                <div class="dashboard-logs" id="dashboardLogs" style="display: none;">
                    <h3>🔍 Dashboard Activity Log</h3>
                    <div id="logContent"></div>
                    <button onclick="clearLogs()">Clear Logs</button>
                    <button onclick="toggleLogs()">Hide Logs</button>
                </div>

                <div class="tips">
                    <h3>💡 Quick Tips</h3>
                    <ul>
                        <li>Use <kbd>Ctrl+Shift+P</kbd> and type "Claude" to see all commands</li>
                        <li>Click on any project to open it in the workspace</li>
                        <li>Right-click projects in the sidebar for more options</li>
                        <li>The status bar shows quick access to this dashboard</li>
                        <li>🔄 Auto-refresh: Dashboard updates every 30 seconds</li>
                        <li>⚡ Throttling: Batch operations are throttled to prevent overload</li>
                    </ul>
                </div>
            </div>

            <script nonce="${nonce}">
                // Initialize project data for external script  
                window.portfolioProjects = ${JSON.stringify(projectData)};
                window.portfolioPath = '${this._portfolioPath}';
                window.dashboardCapabilities = {
                    websocketBridge: ${!!this._websocketBridge},
                    portDetection: ${!!this._portDetectionService},
                    projectService: ${!!this._projectService},
                    realTimeUpdates: ${!!this._websocketBridge},
                    throttling: true
                };
            </script>
            <script src="${scriptUri}" nonce="${nonce}"></script>
        </body>
        </html>`;
    }
    /**
     * Handle opening all projects with throttling
     */
    async _handleOpenAllProjects() {
        console.log('📊 Dashboard: Opening all projects (batch operation)');
        try {
            const projects = await this._loadProjectsFromManifest();
            for (const project of projects) {
                try {
                    await vscode.commands.executeCommand('claude-portfolio.openProject', project);
                    console.log(`📊 Dashboard: Opened project: ${project.title}`);
                    // Small delay between operations to prevent overwhelming VS Code
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (error) {
                    console.error(`📊 Dashboard: Failed to open project ${project.title}:`, error);
                }
            }
            vscode.window.showInformationMessage(`📊 Dashboard: Opened ${projects.length} projects`);
        }
        catch (error) {
            console.error('📊 Dashboard: Batch open projects failed:', error);
            vscode.window.showErrorMessage(`Dashboard batch open failed: ${error}`);
        }
    }
    /**
     * Handle starting all servers with throttling
     */
    async _handleStartAllServers() {
        console.log('📊 Dashboard: Starting all servers (batch operation)');
        try {
            const projects = await this._loadProjectsFromManifest();
            let successCount = 0;
            let failCount = 0;
            for (const project of projects) {
                try {
                    await vscode.commands.executeCommand('claude-portfolio.runProject', project);
                    console.log(`📊 Dashboard: Started server for: ${project.title}`);
                    successCount++;
                    // Longer delay for server starts to prevent port conflicts
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                catch (error) {
                    console.error(`📊 Dashboard: Failed to start server for ${project.title}:`, error);
                    failCount++;
                }
            }
            const message = `📊 Dashboard: Started ${successCount} servers`;
            const fullMessage = failCount > 0 ? `${message}, ${failCount} failed` : message;
            if (failCount === 0) {
                vscode.window.showInformationMessage(fullMessage);
            }
            else {
                vscode.window.showWarningMessage(fullMessage);
            }
            // Trigger refresh after batch operation
            setTimeout(() => this._throttledRefresh(), 3000);
        }
        catch (error) {
            console.error('📊 Dashboard: Batch start servers failed:', error);
            vscode.window.showErrorMessage(`Dashboard batch start failed: ${error}`);
        }
    }
    /**
     * Public method to trigger refresh from extension
     */
    refreshFromExtension() {
        this._throttledRefresh();
    }
    /**
     * Public method to check if dashboard is ready
     */
    isDashboardReady() {
        return this._panel && this._panel.visible;
    }
    /**
     * Get dashboard statistics for extension integration
     */
    async getDashboardStats() {
        const projects = await this._getProjectData();
        return {
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'active').length,
            bridgeConnected: this._websocketBridge?.isRunning() || false,
            lastRefresh: new Date().toISOString()
        };
    }
}
exports.DashboardPanel = DashboardPanel;
DashboardPanel.viewType = 'claudePortfolioDashboard';
//# sourceMappingURL=dashboardPanel.js.map