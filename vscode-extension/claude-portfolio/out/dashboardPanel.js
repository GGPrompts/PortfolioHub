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
    static createOrShow(extensionUri, portfolioPath) {
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
        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri, portfolioPath);
    }
    constructor(panel, extensionUri, portfolioPath) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._portfolioPath = portfolioPath;
        this._update();
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
                    this._update();
                    return;
            }
        }, null, this._disposables);
    }
    dispose() {
        DashboardPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    async _getProjectData() {
        try {
            const manifestPath = path.join(this._portfolioPath, 'projects', 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                const manifestContent = fs.readFileSync(manifestPath, 'utf8');
                const manifest = JSON.parse(manifestContent);
                const projects = manifest.projects || [];
                // Check real-time status for each project
                await this._updateProjectStatuses(projects);
                return projects;
            }
        }
        catch (error) {
            console.error('Failed to load project manifest:', error);
        }
        return [];
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
    async _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Claude Portfolio Dashboard';
        this._panel.webview.html = await this._getHtmlForWebview(webview);
    }
    async _getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'dashboard.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'dashboard.css'));
        // Load project data with real-time status checking
        const projectData = await this._getProjectData();
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <title>Claude Portfolio Dashboard</title>
        </head>
        <body>
            <div class="container">
                <header>
                    <h1>🚀 Claude Portfolio Dashboard</h1>
                    <p>Manage your portfolio projects directly in VS Code</p>
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
                </div>

                <div class="projects-grid" id="projectsGrid">
                    <!-- Projects will be loaded here -->
                </div>

                <div class="actions">
                    <button class="action-btn" onclick="refreshProjects()">
                        🔄 Refresh Projects
                    </button>
                    <button class="action-btn" onclick="openAllProjects()">
                        📂 Open All Projects
                    </button>
                    <button class="action-btn" onclick="startAllServers()">
                        ▶️ Start All Servers
                    </button>
                </div>

                <div class="tips">
                    <h3>💡 Quick Tips</h3>
                    <ul>
                        <li>Use <kbd>Ctrl+Shift+P</kbd> and type "Claude" to see all commands</li>
                        <li>Click on any project to open it in the workspace</li>
                        <li>Right-click projects in the sidebar for more options</li>
                        <li>The status bar shows quick access to this dashboard</li>
                    </ul>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const portfolioPath = '${this._portfolioPath}';
                
                // Load real project data from manifest
                window.portfolioProjects = ${JSON.stringify(projectData)};

                function loadProjects() {
                    const projects = window.portfolioProjects || [];
                    displayProjects(projects);
                    updateStats(projects);
                }

                function displayProjects(projects) {
                    const grid = document.getElementById('projectsGrid');
                    grid.innerHTML = projects.map(project => \`
                        <div class="project-card">
                            <h3>\${project.title}</h3>
                            <p>\${project.description}</p>
                            <div class="project-meta">
                                <span class="port">Port: \${project.localPort}</span>
                                <span class="status \${project.status || 'inactive'}">\${project.status || 'inactive'}</span>
                            </div>
                            <div class="project-tech">
                                \${(project.tech || []).map(t => \`<span class="tech-tag">\${t}</span>\`).join('')}
                            </div>
                            <div class="project-actions">
                                <button onclick='openProject("\${project.id}")'>📂 Open</button>
                                <button onclick='runProject("\${project.id}")'>▶️ Run</button>
                                <button onclick='openInBrowser("\${project.id}")'>🌐 VS Code</button>
                                <button onclick='openInExternalBrowser("\${project.id}")'>🔗 External</button>
                            </div>
                        </div>
                    \`).join('');
                }

                function updateStats(projects) {
                    document.getElementById('totalProjects').textContent = projects.length;
                    document.getElementById('activeProjects').textContent = projects.filter(p => p.status === 'active').length;
                    
                    const allTech = new Set();
                    projects.forEach(p => p.tech.forEach(t => allTech.add(t)));
                    document.getElementById('techCount').textContent = allTech.size;
                }

                function openProject(projectId) {
                    const project = window.portfolioProjects.find(p => p.id === projectId);
                    if (project) vscode.postMessage({ command: 'openProject', project });
                }

                function runProject(projectId) {
                    const project = window.portfolioProjects.find(p => p.id === projectId);
                    if (project) vscode.postMessage({ command: 'runProject', project });
                }

                function openInBrowser(projectId) {
                    const project = window.portfolioProjects.find(p => p.id === projectId);
                    if (project) vscode.postMessage({ command: 'openInBrowser', project });
                }

                function openInExternalBrowser(projectId) {
                    const project = window.portfolioProjects.find(p => p.id === projectId);
                    if (project) vscode.postMessage({ command: 'openInExternalBrowser', project });
                }

                function refreshProjects() {
                    vscode.postMessage({ command: 'refresh' });
                }

                // Load projects on startup
                loadProjects();
            </script>
        </body>
        </html>`;
    }
}
exports.DashboardPanel = DashboardPanel;
DashboardPanel.viewType = 'claudePortfolioDashboard';
//# sourceMappingURL=dashboardPanel.js.map