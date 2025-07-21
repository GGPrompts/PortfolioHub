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
        
        // Git Commands
        { label: 'Git: Status', command: 'git.status', description: 'Show git status', category: 'Git' },
        { label: 'Git: Pull', command: 'git.pull', description: 'Pull from remote', category: 'Git' },
        { label: 'Git: Push', command: 'git.push', description: 'Push to remote', category: 'Git' },
        { label: 'Git: Commit', command: 'git.commit', description: 'Commit changes', category: 'Git' },
        
        // Claude Portfolio
        { label: 'Show Dashboard', command: 'claude-portfolio.showDashboard', description: 'Open portfolio dashboard', category: 'Claude Portfolio' },
        { label: 'Quick Open Project', command: 'claude-portfolio.quickOpen', description: 'Quick open a project', category: 'Claude Portfolio' },
        { label: 'Refresh Projects', command: 'claude-portfolio.refreshProjects', description: 'Refresh project list', category: 'Claude Portfolio' }
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
