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
    _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Claude Portfolio Dashboard';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'dashboard.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'dashboard.css'));
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

                function loadProjects() {
                    // In a real implementation, this would load from the manifest
                    // For now, we'll use placeholder data
                    const projects = [
                        {
                            title: "3D Matrix Cards",
                            description: "Interactive 3D card display with Matrix effects",
                            localPort: 3005,
                            status: "active",
                            tech: ["Three.js", "JavaScript"]
                        },
                        {
                            title: "GGPrompts",
                            description: "AI prompt management platform",
                            localPort: 9323,
                            status: "active",
                            tech: ["React", "Supabase"]
                        }
                    ];

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
                                <span class="status \${project.status}">\${project.status}</span>
                            </div>
                            <div class="project-tech">
                                \${project.tech.map(t => \`<span class="tech-tag">\${t}</span>\`).join('')}
                            </div>
                            <div class="project-actions">
                                <button onclick='openProject(\${JSON.stringify(project)})'>Open</button>
                                <button onclick='runProject(\${JSON.stringify(project)})'>Run</button>
                                <button onclick='openInBrowser(\${JSON.stringify(project)})'>Browser</button>
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

                function openProject(project) {
                    vscode.postMessage({ command: 'openProject', project });
                }

                function runProject(project) {
                    vscode.postMessage({ command: 'runProject', project });
                }

                function openInBrowser(project) {
                    vscode.postMessage({ command: 'openInBrowser', project });
                }

                function refreshProjects() {
                    loadProjects();
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