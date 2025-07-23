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
exports.ProjectItem = exports.ProjectProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
class ProjectProvider {
    constructor(portfolioPath) {
        this.portfolioPath = portfolioPath;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.projects = [];
        this.selectedProjects = new Set(); // Track checked projects
        this.loadProjects();
    }
    refresh() {
        this.loadProjects().then(() => {
            this._onDidChangeTreeData.fire();
        });
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Return root level projects with checkbox state
            return Promise.resolve(this.projects.map(project => new ProjectItem(project, vscode.TreeItemCollapsibleState.None, this.isProjectSelected(project.id), this)));
        }
        return Promise.resolve([]);
    }
    async getProjects() {
        return this.projects;
    }
    // Checkbox selection management
    toggleProjectSelection(projectId) {
        if (this.selectedProjects.has(projectId)) {
            this.selectedProjects.delete(projectId);
        }
        else {
            this.selectedProjects.add(projectId);
        }
        this._onDidChangeTreeData.fire();
    }
    isProjectSelected(projectId) {
        return this.selectedProjects.has(projectId);
    }
    getSelectedProjects() {
        return Array.from(this.selectedProjects);
    }
    getSelectedProjectsData() {
        return this.projects.filter(p => this.selectedProjects.has(p.id));
    }
    clearSelection() {
        this.selectedProjects.clear();
        this._onDidChangeTreeData.fire();
    }
    selectAll() {
        this.projects.forEach(p => this.selectedProjects.add(p.id));
        this._onDidChangeTreeData.fire();
    }
    async loadProjects() {
        const manifestPath = path.join(this.portfolioPath, 'projects', 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);
            this.projects = manifest.projects || [];
            // Check status for each project
            await this.updateProjectStatuses();
        }
    }
    async updateProjectStatuses() {
        console.log('🔍 Updating project statuses...');
        const statusPromises = this.projects.map(async (project) => {
            if (project.localPort) {
                try {
                    const isRunning = await this.checkPortStatus(project.localPort);
                    project.status = isRunning ? 'active' : 'inactive';
                    console.log(`📊 ${project.id}: ${isRunning ? '🟢 ACTIVE' : '🔴 INACTIVE'} (port ${project.localPort})`);
                }
                catch (error) {
                    project.status = 'inactive';
                    console.log(`❌ ${project.id}: ERROR checking port ${project.localPort}:`, error);
                }
            }
            else {
                project.status = 'inactive';
                console.log(`⚪ ${project.id}: NO PORT CONFIGURED`);
            }
            return project;
        });
        await Promise.all(statusPromises);
        console.log('✅ Project status update complete');
    }
    checkPortStatus(port) {
        return new Promise((resolve) => {
            // Try root path first, then favicon.ico as fallback
            const tryPath = (path) => {
                const req = http.request({
                    hostname: 'localhost',
                    port: port,
                    path: path,
                    method: 'GET',
                    timeout: 3000
                }, (res) => {
                    // Accept any response (even 404) as indication server is running
                    console.log(`🔍 Port ${port}${path} responded with status ${res.statusCode} - SERVER ACTIVE`);
                    resolve(true);
                });
                req.on('error', (error) => {
                    if (path === '/') {
                        // If root fails, try favicon.ico
                        console.log(`🔍 Port ${port}/ failed (${error.code || error.message}), trying /favicon.ico...`);
                        tryPath('/favicon.ico');
                    }
                    else {
                        console.log(`🔍 Port ${port} error: ${error.code || error.message} - SERVER INACTIVE`);
                        resolve(false);
                    }
                });
                req.on('timeout', () => {
                    console.log(`🔍 Port ${port}${path} timeout - trying next path or resolving false`);
                    req.destroy();
                    if (path === '/') {
                        tryPath('/favicon.ico');
                    }
                    else {
                        resolve(false);
                    }
                });
                req.end();
            };
            // Start with root path
            tryPath('/');
        });
    }
}
exports.ProjectProvider = ProjectProvider;
class ProjectItem extends vscode.TreeItem {
    constructor(project, collapsibleState, isSelected = false, provider) {
        super(project.title, collapsibleState);
        this.project = project;
        this.collapsibleState = collapsibleState;
        this.isSelected = isSelected;
        this.provider = provider;
        // Create label with checkbox
        const checkbox = isSelected ? '☑️' : '☐';
        const statusIndicator = project.status === 'active' ? '●' : '○';
        this.label = `${checkbox} ${project.title} [${statusIndicator}]`;
        this.tooltip = `${this.project.description}\nPort: ${this.project.localPort}\nStatus: ${this.project.status}\n\nClick to select/deselect\nDouble-click to open project`;
        this.description = `Port ${this.project.localPort}`;
        this.contextValue = isSelected ? 'selectedProject' : 'project';
        // Set icon based on status (smaller since we have checkbox)
        if (this.project.status === 'active') {
            this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
        }
        else {
            this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
        // Single click toggles checkbox, double-click opens project
        this.command = {
            command: 'claude-portfolio.toggleProjectSelection',
            title: 'Toggle Project Selection',
            arguments: [this] // Pass the TreeItem itself instead of just the project
        };
    }
}
exports.ProjectItem = ProjectItem;
//# sourceMappingURL=projectProvider.js.map