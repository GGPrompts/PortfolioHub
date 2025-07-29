import * as vscode from 'vscode';
import { MCPService } from './services/mcpService';

/**
 * Tree data provider for MCP server management commands
 */
export class MCPCommandsProvider implements vscode.TreeDataProvider<MCPCommandItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<MCPCommandItem | undefined | null | void> = new vscode.EventEmitter<MCPCommandItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MCPCommandItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private mcpService: MCPService;

    constructor() {
        this.mcpService = MCPService.getInstance();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: MCPCommandItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: MCPCommandItem): Promise<MCPCommandItem[]> {
        if (!element) {
            // Root level - show main MCP controls
            return this.getMCPControls();
        }
        return [];
    }

    private async getMCPControls(): Promise<MCPCommandItem[]> {
        const securityLevel = this.mcpService.getSecurityLevel();
        const powerShellPolicy = this.mcpService.getPowerShellPolicy();
        const mcpStatus = await this.mcpService.checkMCPStatus();

        const controls: MCPCommandItem[] = [
            // Security Controls
            new MCPCommandItem(
                `Security: ${securityLevel.toUpperCase()}`,
                'Current MCP security validation level',
                vscode.TreeItemCollapsibleState.None,
                'claude-portfolio.toggleMCPSecurity',
                this.getSecurityIcon(securityLevel)
            ),
            
            new MCPCommandItem(
                `PowerShell: ${powerShellPolicy}`,
                'Current PowerShell execution policy',
                vscode.TreeItemCollapsibleState.None,
                'claude-portfolio.changePowerShellPolicy',
                '$(terminal-powershell)'
            ),

            // Server Status
            new MCPCommandItem(
                'Check MCP Status',
                'Check status of all MCP servers',
                vscode.TreeItemCollapsibleState.None,
                'claude-portfolio.checkMCPStatus',
                '$(pulse)'
            ),

            new MCPCommandItem(
                'Restart MCP Server',
                'Restart the standalone terminal MCP server',
                vscode.TreeItemCollapsibleState.None,
                'claude-portfolio.restartMCPServer',
                '$(refresh)'
            ),

            // Quick Actions
            new MCPCommandItem(
                'Check Ports (Enhanced)',
                'Check active ports using PowerShell Get-NetTCPConnection',
                vscode.TreeItemCollapsibleState.None,
                'claude-portfolio.checkPortsEnhanced',
                '$(server-process)'
            ),

            new MCPCommandItem(
                'Kill Port Process',
                'Kill process on specific port using secure method',
                vscode.TreeItemCollapsibleState.None,
                'claude-portfolio.killPortProcess',
                '$(close)'
            ),

            // Configuration
            new MCPCommandItem(
                'Open MCP Config',
                'Open the MCP server configuration file',
                vscode.TreeItemCollapsibleState.None,
                'claude-portfolio.openMCPConfig',
                '$(gear)'
            ),

            new MCPCommandItem(
                'Test MCP Tools',
                'Test MCP server connectivity and tools',
                vscode.TreeItemCollapsibleState.None,
                'claude-portfolio.testMCPTools',
                '$(beaker)'
            )
        ];

        return controls;
    }

    private getSecurityIcon(level: string): string {
        const icons: { [key: string]: string } = {
            enhanced: '$(shield)',
            basic: '$(warning)',
            disabled: '$(shield-x)'
        };
        return icons[level] || '$(question)';
    }
}

/**
 * Represents an MCP command item in the tree view
 */
export class MCPCommandItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        commandId?: string,
        public readonly iconPath?: string | vscode.ThemeIcon
    ) {
        super(label, collapsibleState);
        
        this.tooltip = tooltip;
        this.contextValue = 'mcpCommand';
        
        if (commandId) {
            this.command = {
                command: commandId,
                title: label,
                arguments: []
            };
        }

        if (iconPath) {
            if (typeof iconPath === 'string') {
                this.iconPath = new vscode.ThemeIcon(iconPath.replace('$(', '').replace(')', ''));
            } else {
                this.iconPath = iconPath;
            }
        }
    }
}