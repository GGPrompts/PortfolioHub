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
        console.log('🔍 Updating project statuses...');
        const statusPromises = this.projects.map(async (project) => {
            if (project.localPort) {
                try {
                    const isRunning = await this.checkPortStatus(project.localPort);
                    project.status = isRunning ? 'active' : 'inactive';
                    console.log(`📊 ${project.id}: ${isRunning ? '🟢 ACTIVE' : '🔴 INACTIVE'} (port ${project.localPort})`);
                } catch (error) {
                    project.status = 'inactive';
                    console.log(`❌ ${project.id}: ERROR checking port ${project.localPort}:`, error);
                }
            } else {
                project.status = 'inactive';
                console.log(`⚪ ${project.id}: NO PORT CONFIGURED`);
            }
            return project;
        });

        await Promise.all(statusPromises);
        console.log('✅ Project status update complete');
    }

    private checkPortStatus(port: number): Promise<boolean> {
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
