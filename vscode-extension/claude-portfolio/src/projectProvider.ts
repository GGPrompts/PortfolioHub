import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

export class ProjectProvider implements vscode.TreeDataProvider<ProjectItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | null | void> = new vscode.EventEmitter<ProjectItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private projects: any[] = [];

    constructor(private portfolioPath: string) {
        this.loadProjects();
    }

    refresh(): void {
        this.loadProjects().then(() => {
            this._onDidChangeTreeData.fire();
        });
    }

    getTreeItem(element: ProjectItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProjectItem): Thenable<ProjectItem[]> {
        if (!element) {
            // Return root level projects
            return Promise.resolve(this.projects.map(project => new ProjectItem(
                project,
                vscode.TreeItemCollapsibleState.None
            )));
        }
        return Promise.resolve([]);
    }

    async getProjects(): Promise<any[]> {
        return this.projects;
    }

    private async loadProjects() {
        const manifestPath = path.join(this.portfolioPath, 'projects', 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);
            this.projects = manifest.projects || [];
            
            // Check status for each project
            await this.updateProjectStatuses();
        }
    }

    private async updateProjectStatuses() {
        const statusPromises = this.projects.map(async (project) => {
            if (project.localPort) {
                try {
                    const isRunning = await this.checkPortStatus(project.localPort);
                    project.status = isRunning ? 'active' : 'inactive';
                } catch (error) {
                    project.status = 'inactive';
                }
            } else {
                project.status = 'inactive';
            }
            return project;
        });

        await Promise.all(statusPromises);
    }

    private checkPortStatus(port: number): Promise<boolean> {
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
}

export class ProjectItem extends vscode.TreeItem {
    constructor(
        public readonly project: any,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(project.title, collapsibleState);
        this.tooltip = `${this.project.description}\nPort: ${this.project.localPort}`;
        this.description = `Port ${this.project.localPort}`;
        this.contextValue = 'project';
        
        // Set icon based on status
        if (this.project.status === 'active') {
            this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
        } else {
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
