import * as vscode from 'vscode';

interface ProjectCommand {
    label: string;
    command: string;
    icon: string;
    description: string;
    category: string;
    requiresRunning?: boolean;
    requiresStopped?: boolean;
}

export class ProjectCommandsProvider implements vscode.TreeDataProvider<ProjectCommandItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectCommandItem | undefined | null | void> = new vscode.EventEmitter<ProjectCommandItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectCommandItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private selectedProject: any = null;
    private commands: ProjectCommand[] = [];

    constructor() {
        this.updateCommands();
    }

    setSelectedProject(project: any) {
        this.selectedProject = project;
        this.updateCommands();
        this._onDidChangeTreeData.fire();
    }

    clearSelection() {
        this.selectedProject = null;
        this.commands = [];
        this._onDidChangeTreeData.fire();
    }

    private updateCommands() {
        if (!this.selectedProject) {
            this.commands = [];
            return;
        }

        const isRunning = this.selectedProject.status === 'active';
        
        this.commands = [
            // Server Control
            {
                label: isRunning ? 'Stop Server' : 'Start Server',
                command: isRunning ? 'claude-portfolio.stopProject' : 'claude-portfolio.runProject',
                icon: isRunning ? 'debug-stop' : 'play',
                description: isRunning ? `Stop ${this.selectedProject.title}` : `Start ${this.selectedProject.title}`,
                category: 'Server Control'
            },

            // Browse & Open
            {
                label: 'Open in Browser',
                command: 'claude-portfolio.openProjectInBrowser',
                icon: 'globe',
                description: 'Open in VS Code Simple Browser',
                category: 'Browse & Open',
                requiresRunning: true
            },
            {
                label: 'Open External Browser',
                command: 'claude-portfolio.openProjectInExternalBrowser', 
                icon: 'link-external',
                description: 'Open in system default browser',
                category: 'Browse & Open',
                requiresRunning: true
            },
            {
                label: 'Open in VS Code',
                command: 'claude-portfolio.openProject',
                icon: 'folder-opened',
                description: 'Add to VS Code workspace',
                category: 'Browse & Open'
            },

            // Development
            {
                label: 'Install Dependencies',
                command: 'claude-portfolio.npmInstall',
                icon: 'package',
                description: 'Run npm install',
                category: 'Development'
            },
            {
                label: 'Build Project',
                command: 'claude-portfolio.npmBuild',
                icon: 'tools',
                description: 'Run npm run build',
                category: 'Development'
            },
            {
                label: 'Run Tests',
                command: 'claude-portfolio.npmTest',
                icon: 'beaker',
                description: 'Run npm test',
                category: 'Development'
            },

            // Git Operations
            {
                label: 'Git Status',
                command: 'claude-portfolio.gitStatus',
                icon: 'git-branch',
                description: 'Check git status',
                category: 'Git Operations'
            },
            {
                label: 'Git Pull',
                command: 'claude-portfolio.gitPull',
                icon: 'repo-pull',
                description: 'Pull latest changes',
                category: 'Git Operations'
            },
            {
                label: 'Git Commit',
                command: 'claude-portfolio.gitCommit',
                icon: 'git-commit',
                description: 'Commit changes',
                category: 'Git Operations'
            },

            // AI Assistants
            {
                label: 'Open Claude',
                command: 'claude-portfolio.openAIAssistant',
                icon: 'sparkle',
                description: 'Start Claude Code for this project',
                category: 'AI Assistants'
            },
            {
                label: 'Open Copilot',
                command: 'workbench.action.openChat',
                icon: 'comment-discussion',
                description: 'GitHub Copilot Chat (Ctrl+Alt+I)',
                category: 'AI Assistants'
            }
        ].filter(cmd => {
            // Filter commands based on project status
            if (cmd.requiresRunning && !isRunning) return false;
            if ('requiresStopped' in cmd && cmd.requiresStopped && isRunning) return false;
            return true;
        });
    }

    getTreeItem(element: ProjectCommandItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProjectCommandItem): Thenable<ProjectCommandItem[]> {
        if (!this.selectedProject) {
            return Promise.resolve([new ProjectCommandItem(
                'Select a project to see commands',
                '',
                '',
                'info',
                'Select a project from the Projects view above',
                vscode.TreeItemCollapsibleState.None,
                true
            )]);
        }

        if (!element) {
            // Group commands by category
            const categories = [...new Set(this.commands.map(c => c.category))];
            return Promise.resolve(
                categories.map(cat => new ProjectCommandItem(
                    cat,
                    '',
                    cat,
                    'folder',
                    `${cat} commands for ${this.selectedProject.title}`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    true
                ))
            );
        } else if (element.isCategory) {
            // Return commands for this category
            const categoryCommands = this.commands.filter(c => c.category === element.label);
            return Promise.resolve(
                categoryCommands.map(cmd => new ProjectCommandItem(
                    cmd.label,
                    cmd.command,
                    cmd.category,
                    cmd.icon,
                    cmd.description,
                    vscode.TreeItemCollapsibleState.None,
                    false,
                    this.selectedProject
                ))
            );
        }
        return Promise.resolve([]);
    }
}

export class ProjectCommandItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly commandId: string,
        public readonly category: string,
        public readonly iconName: string,
        public readonly desc: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isCategory: boolean,
        public readonly project?: any
    ) {
        super(label, collapsibleState);
        
        this.tooltip = this.desc;
        this.iconPath = new vscode.ThemeIcon(iconName);
        
        if (!isCategory && commandId) {
            this.description = this.desc;
            this.contextValue = 'projectCommand';
            
            // Make clickable - pass project data to commands that need it
            this.command = {
                command: this.commandId,
                title: 'Execute Command',
                arguments: this.project ? [this.project] : []
            };
        } else if (isCategory) {
            this.contextValue = 'commandCategory';
        } else {
            // Info item
            this.contextValue = 'info';
        }
    }
}