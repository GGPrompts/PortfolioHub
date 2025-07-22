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
            // Return root level projects
            return Promise.resolve(this.projects.map(project => new ProjectItem(project, vscode.TreeItemCollapsibleState.None)));
        }
        return Promise.resolve([]);
    }
    async getProjects() {
        return this.projects;
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
            const req = http.request({
                hostname: 'localhost',
                port: port,
                path: '/favicon.ico',
                method: 'GET',
                timeout: 2000
            }, (res) => {
                // Accept any response (even 404) as indication server is running
                resolve(res.statusCode !== undefined);
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
}
exports.ProjectProvider = ProjectProvider;
class ProjectItem extends vscode.TreeItem {
    constructor(project, collapsibleState) {
        super(project.title, collapsibleState);
        this.project = project;
        this.collapsibleState = collapsibleState;
        this.tooltip = `${this.project.description}\nPort: ${this.project.localPort}`;
        this.description = `Port ${this.project.localPort}`;
        this.contextValue = 'project';
        // Set icon based on status
        if (this.project.status === 'active') {
            this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
        }
        else {
            this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
        // Make clickable
        this.command = {
            command: 'claude-portfolio.openProject',
            title: 'Open Project',
            arguments: [this.project]
        };
    }
}
exports.ProjectItem = ProjectItem;
//# sourceMappingURL=projectProvider.js.map