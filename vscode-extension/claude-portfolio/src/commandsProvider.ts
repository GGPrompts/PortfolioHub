import * as vscode from 'vscode';

interface Command {
    label: string;
    command: string;
    description: string;
    category: string;
}

export class CommandsProvider implements vscode.TreeDataProvider<CommandItem> {
    private commands: Command[] = [
        // VS Code Commands
        { label: 'Open Folder', command: 'workbench.action.files.openFolder', description: 'Open a folder in VS Code', category: 'VS Code' },
        { label: 'Open Workspace', command: 'workbench.action.openWorkspace', description: 'Open a workspace file', category: 'VS Code' },
        { label: 'New Terminal', command: 'terminal.new', description: 'Create a new terminal', category: 'VS Code' },
        { label: 'Split Terminal', command: 'terminal.split', description: 'Split the terminal', category: 'VS Code' },
        { label: 'Reload Window', command: 'workbench.action.reloadWindow', description: 'Reload VS Code window', category: 'VS Code' },
        { label: 'Command Palette', command: 'workbench.action.showCommands', description: 'Show command palette (Ctrl+Shift+P)', category: 'VS Code' },
        
        // Git Commands
        { label: 'Git: Status', command: 'git.status', description: 'Show git status', category: 'Git' },
        { label: 'Git: Pull', command: 'git.pull', description: 'Pull from remote', category: 'Git' },
        { label: 'Git: Push', command: 'git.push', description: 'Push to remote', category: 'Git' },
        { label: 'Git: Commit', command: 'git.commit', description: 'Commit changes', category: 'Git' },
        { label: 'Git: Add All', command: 'git.stageAll', description: 'Stage all changes', category: 'Git' },
        { label: 'Git: Sync', command: 'git.sync', description: 'Sync with remote (pull & push)', category: 'Git' },
        
        // Claude Portfolio
        { label: 'Show Dashboard', command: 'claude-portfolio.showDashboard', description: 'Open portfolio dashboard', category: 'Claude Portfolio' },
        { label: 'Quick Open Project', command: 'claude-portfolio.quickOpen', description: 'Quick open a project', category: 'Claude Portfolio' },
        { label: 'Refresh Projects', command: 'claude-portfolio.refreshProjects', description: 'Refresh project list', category: 'Claude Portfolio' },
        { label: 'Open Full Portfolio', command: 'claude-portfolio.openPortfolio', description: 'Open portfolio in webview', category: 'Claude Portfolio' },
        
        // Development Commands
        { label: 'Build React App', command: 'claude-portfolio.buildReact', description: 'npm run build', category: 'Development' },
        { label: 'Start Dev Server', command: 'claude-portfolio.startDev', description: 'npm run dev', category: 'Development' },
        { label: 'Install Dependencies', command: 'claude-portfolio.npmInstall', description: 'npm install', category: 'Development' },
        { label: 'Kill All Servers', command: 'claude-portfolio.killAllServers', description: 'Kill all running dev servers', category: 'Development' },
        { label: 'Start All Projects', command: 'claude-portfolio.startAllProjects', description: 'Start all project servers', category: 'Development' },
        
        // Extension Commands
        { label: 'Reinstall Extension', command: 'claude-portfolio.reinstallExtension', description: 'Rebuild and reinstall this extension', category: 'Extension' },
        { label: 'Build Extension', command: 'claude-portfolio.buildExtension', description: 'Compile TypeScript (npm run compile)', category: 'Extension' },
        { label: 'Package Extension', command: 'claude-portfolio.packageExtension', description: 'Create VSIX package', category: 'Extension' },
        { label: 'Watch Extension', command: 'claude-portfolio.watchExtension', description: 'Watch for changes (npm run watch)', category: 'Extension' },
        
        // AI Assistants
        { label: 'Open Claude', command: 'claude-portfolio.openClaude', description: 'Start Claude Code in terminal', category: 'AI Assistants' },
        { label: 'Open Copilot Chat', command: 'workbench.action.openChat', description: 'Open GitHub Copilot chat (Ctrl+Alt+I)', category: 'AI Assistants' },
        { label: 'Copilot: Explain', command: 'github.copilot.explainThis', description: 'Explain selected code', category: 'AI Assistants' },
        { label: 'Copilot: Fix', command: 'github.copilot.fixThis', description: 'Fix selected code', category: 'AI Assistants' }
    ];

    getTreeItem(element: CommandItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CommandItem): Thenable<CommandItem[]> {
        if (!element) {
            // Group commands by category
            const categories = [...new Set(this.commands.map(c => c.category))];
            return Promise.resolve(
                categories.map(cat => new CommandItem(cat, '', '', vscode.TreeItemCollapsibleState.Expanded, true))
            );
        } else if (element.isCategory) {
            // Return commands for this category
            const categoryCommands = this.commands.filter(c => c.category === element.label);
            return Promise.resolve(
                categoryCommands.map(cmd => new CommandItem(
                    cmd.label,
                    cmd.command,
                    cmd.description,
                    vscode.TreeItemCollapsibleState.None,
                    false
                ))
            );
        }
        return Promise.resolve([]);
    }
}

export class CommandItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly commandId: string,
        public readonly desc: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isCategory: boolean
    ) {
        super(label, collapsibleState);
        
        if (!isCategory) {
            this.tooltip = this.desc;
            this.description = this.desc;
            this.contextValue = 'command';
            this.iconPath = new vscode.ThemeIcon('play');
            
            // Make clickable
            this.command = {
                command: this.commandId,
                title: 'Execute Command',
                arguments: []
            };
        } else {
            this.contextValue = 'category';
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
}
