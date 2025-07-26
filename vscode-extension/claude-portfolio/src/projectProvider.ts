import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

export class ProjectProvider implements vscode.TreeDataProvider<ProjectItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | null | void> = new vscode.EventEmitter<ProjectItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private projects: any[] = [];
    private selectedProjects: Set<string> = new Set(); // Track checked projects

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
            // Return root level projects with checkbox state
            return Promise.resolve(this.projects.map(project => new ProjectItem(
                project,
                vscode.TreeItemCollapsibleState.None,
                this.isProjectSelected(project.id),
                this
            )));
        }
        return Promise.resolve([]);
    }

    async getProjects(): Promise<any[]> {
        return this.projects;
    }

    // Checkbox selection management
    toggleProjectSelection(projectId: string): void {
        if (this.selectedProjects.has(projectId)) {
            this.selectedProjects.delete(projectId);
        } else {
            this.selectedProjects.add(projectId);
        }
        this._onDidChangeTreeData.fire();
    }

    isProjectSelected(projectId: string): boolean {
        return this.selectedProjects.has(projectId);
    }

    getSelectedProjects(): string[] {
        return Array.from(this.selectedProjects);
    }

    getSelectedProjectsData(): any[] {
        return this.projects.filter(p => this.selectedProjects.has(p.id));
    }

    // Single project selection for commands panel (different from checkbox selection)
    private currentSelectedProject: any = null;

    setCurrentSelectedProject(project: any): void {
        this.currentSelectedProject = project;
        this._onDidChangeTreeData.fire();
    }

    getCurrentSelectedProject(): any {
        return this.currentSelectedProject;
    }

    clearCurrentSelection(): void {
        this.currentSelectedProject = null;
        this._onDidChangeTreeData.fire();
    }

    clearSelection(): void {
        this.selectedProjects.clear();
        this._onDidChangeTreeData.fire();
    }

    selectAll(): void {
        this.projects.forEach(p => this.selectedProjects.add(p.id));
        this._onDidChangeTreeData.fire();
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
            // VSCode embedded projects are always online since they're part of the extension
            if (project.displayType === 'vscode-embedded') {
                project.status = 'active';
                console.log(`📊 ${project.id}: 🟢 ACTIVE (VSCode embedded - always online)`);
                return project;
            }
            
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
            // Try root path first, then favicon.ico as fallback
            const tryPath = (path: string) => {
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

                req.on('error', (error: any) => {
                    if (path === '/') {
                        // If root fails, try favicon.ico
                        console.log(`🔍 Port ${port}/ failed (${error.code || error.message}), trying /favicon.ico...`);
                        tryPath('/favicon.ico');
                    } else {
                        console.log(`🔍 Port ${port} error: ${error.code || error.message} - SERVER INACTIVE`);
                        resolve(false);
                    }
                });

                req.on('timeout', () => {
                    console.log(`🔍 Port ${port}${path} timeout - trying next path or resolving false`);
                    req.destroy();
                    if (path === '/') {
                        tryPath('/favicon.ico');
                    } else {
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

export class ProjectItem extends vscode.TreeItem {
    constructor(
        public readonly project: any,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isSelected: boolean = false,
        public readonly provider?: ProjectProvider
    ) {
        super(project.title, collapsibleState);
        
        // Project label with checkbox support for VS Code tree view
        this.label = project.title;
        
        // Status-based description showing port and status
        const statusText = project.status === 'active' ? 'running' : 'stopped';
        this.description = project.localPort ? `${statusText} :${project.localPort}` : statusText;
        
        this.tooltip = `${this.project.description}\nPort: ${this.project.localPort}\nStatus: ${this.project.status}\n\nClick to open command palette\nRight-click for context menu`;
        
        // Set checkbox state for VS Code tree view
        this.checkboxState = isSelected ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked;
        
        // Set contextValue based on project type and selection state
        if (this.project.displayType === 'vscode-embedded') {
            this.contextValue = isSelected ? 'selectedVSCodeProject' : 'vsCodeProject';
        } else {
            this.contextValue = isSelected ? 'selectedProject' : 'project';
        }
        
        // Set icon based on status (gg-devhub style)
        if (this.project.status === 'active') {
            this.iconPath = new vscode.ThemeIcon('play-circle', new vscode.ThemeColor('testing.iconPassed'));
        } else {
            this.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('testing.iconQueued'));
        }

        // Single click opens command palette for project actions
        this.command = {
            command: 'claude-portfolio.project.select',
            title: 'Select Project Action',
            arguments: [this.project.id] // Pass the project ID for clean command palette integration
        };
    }
}
