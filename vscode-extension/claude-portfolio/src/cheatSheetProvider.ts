import * as vscode from 'vscode';

interface CheatSheetItem {
    label: string;
    command: string;
    description: string;
    category: string;
}

export class CheatSheetProvider implements vscode.TreeDataProvider<CheatItem> {
    private items: CheatSheetItem[] = [
        // PowerShell
        { label: 'Navigate to folder', command: 'Set-Location "D:\\ClaudeWindows"', description: 'Change directory', category: 'PowerShell' },
        { label: 'List files', command: 'Get-ChildItem', description: 'List directory contents', category: 'PowerShell' },
        { label: 'Create folder', command: 'New-Item -ItemType Directory -Name "folder"', description: 'Create new directory', category: 'PowerShell' },
        { label: 'Delete folder', command: 'Remove-Item -Recurse -Force "folder"', description: 'Delete directory', category: 'PowerShell' },
        { label: 'Open Explorer', command: 'explorer.exe .', description: 'Open current folder in Explorer', category: 'PowerShell' },
        
        // Git
        { label: 'Check status', command: 'git status', description: 'Show working tree status', category: 'Git' },
        { label: 'Stage all', command: 'git add .', description: 'Stage all changes', category: 'Git' },
        { label: 'Commit', command: 'git commit -m "message"', description: 'Commit with message', category: 'Git' },
        { label: 'New branch', command: 'git checkout -b feature-branch', description: 'Create and switch branch', category: 'Git' },
        { label: 'Push', command: 'git push origin main', description: 'Push to remote', category: 'Git' },
        
        // npm
        { label: 'Install deps', command: 'npm install', description: 'Install dependencies', category: 'npm' },
        { label: 'Start dev', command: 'npm run dev', description: 'Start development server', category: 'npm' },
        { label: 'Build', command: 'npm run build', description: 'Build for production', category: 'npm' },
        { label: 'Create React app', command: 'npx create-react-app myapp', description: 'Create new React app', category: 'npm' },
        
        // Claude Code
        { label: 'Start Claude', command: 'claude', description: 'Start Claude Code session', category: 'Claude Code' },
        { label: 'List MCP servers', command: 'claude mcp list', description: 'List configured MCP servers', category: 'Claude Code' },
        { label: 'AI commit', command: 'claude commit', description: 'AI-assisted git commit', category: 'Claude Code' }
    ];

    getTreeItem(element: CheatItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CheatItem): Thenable<CheatItem[]> {
        if (!element) {
            const categories = [...new Set(this.items.map(i => i.category))];
            return Promise.resolve(
                categories.map(cat => new CheatItem(cat, '', '', vscode.TreeItemCollapsibleState.Expanded, true))
            );
        } else if (element.isCategory) {
            const categoryItems = this.items.filter(i => i.category === element.label);
            return Promise.resolve(
                categoryItems.map(item => new CheatItem(
                    item.label,
                    item.command,
                    item.description,
                    vscode.TreeItemCollapsibleState.None,
                    false
                ))
            );
        }
        return Promise.resolve([]);
    }
}

export class CheatItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly cmd: string,
        public readonly desc: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isCategory: boolean
    ) {
        super(label, collapsibleState);
        
        if (!isCategory) {
            this.tooltip = `${this.cmd}\n${this.desc}`;
            this.description = this.cmd;
            this.contextValue = 'cheatItem';
            this.iconPath = new vscode.ThemeIcon('terminal');
            
            // Copy command on click
            this.command = {
                command: 'claude-portfolio.copyCheatCommand',
                title: 'Copy Command',
                arguments: [this.cmd]
            };
        } else {
            this.contextValue = 'category';
            this.iconPath = new vscode.ThemeIcon('book');
        }
    }
}
