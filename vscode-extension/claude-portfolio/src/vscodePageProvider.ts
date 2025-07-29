import * as vscode from 'vscode';

export class VSCodePageProvider implements vscode.TreeDataProvider<VSCodePageItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<VSCodePageItem | undefined | null | void> = new vscode.EventEmitter<VSCodePageItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<VSCodePageItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: VSCodePageItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: VSCodePageItem): Thenable<VSCodePageItem[]> {
        if (!element) {
            // Return the VS Code pages
            return Promise.resolve([
                new VSCodePageItem(
                    'Portfolio Dashboard',
                    'View project status and management dashboard',
                    'claude-portfolio.showDashboard',
                    vscode.TreeItemCollapsibleState.None,
                    'dashboard'
                ),
                new VSCodePageItem(
                    'Command Cheat Sheet',
                    'Windows command reference for Claude Code development',
                    'claude-portfolio.openCheatSheet', 
                    vscode.TreeItemCollapsibleState.None,
                    'cheatsheet'
                ),
                // Temporary MCP controls for testing
                new VSCodePageItem(
                    'MCP Security Toggle',
                    'Toggle MCP security validation level',
                    'claude-portfolio.toggleMCPSecurity',
                    vscode.TreeItemCollapsibleState.None,
                    'mcp-security'
                ),
                new VSCodePageItem(
                    'Check MCP Status',
                    'Check MCP server status',
                    'claude-portfolio.checkMCPStatus',
                    vscode.TreeItemCollapsibleState.None,
                    'mcp-status'
                ),
                new VSCodePageItem(
                    'Test MCP Tools',
                    'Test MCP server connectivity',
                    'claude-portfolio.testMCPTools',
                    vscode.TreeItemCollapsibleState.None,
                    'mcp-test'
                )
            ]);
        }
        return Promise.resolve([]);
    }
}

export class VSCodePageItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly commandId: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly pageType: string
    ) {
        super(label, collapsibleState);
        
        this.tooltip = description;
        this.description = description;
        
        // Set the command to execute when clicked
        this.command = {
            command: commandId,
            title: label,
            arguments: []
        };

        // Set context value for menu items
        this.contextValue = pageType;

        // Set icons
        switch (pageType) {
            case 'dashboard':
                this.iconPath = new vscode.ThemeIcon('dashboard');
                break;
            case 'cheatsheet':
                this.iconPath = new vscode.ThemeIcon('book');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('file');
        }
    }
}