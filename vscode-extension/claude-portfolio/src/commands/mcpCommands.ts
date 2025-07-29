import * as vscode from 'vscode';
import * as path from 'path';
import { MCPService } from '../services/mcpService';
import { MCPCommandsProvider } from '../mcpCommandsProvider';

/**
 * Handler for MCP-related commands
 */
export class MCPCommands {
    constructor(
        private mcpService: MCPService,
        private mcpCommandsProvider: MCPCommandsProvider
    ) {}

    /**
     * Register all MCP commands
     */
    registerCommands(context: vscode.ExtensionContext): void {
        const commands = [
            vscode.commands.registerCommand('claude-portfolio.toggleMCPSecurity', this.toggleMCPSecurity.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.checkMCPStatus', this.checkMCPStatus.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.restartMCPServer', this.restartMCPServer.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.changePowerShellPolicy', this.changePowerShellPolicy.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.checkPortsEnhanced', this.checkPortsEnhanced.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.killPortProcess', this.killPortProcess.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.openMCPConfig', this.openMCPConfig.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.testMCPTools', this.testMCPTools.bind(this))
        ];

        commands.forEach(command => context.subscriptions.push(command));
    }

    /**
     * Toggle MCP security level
     */
    private async toggleMCPSecurity(): Promise<void> {
        try {
            await this.mcpService.toggleSecurity();
            this.mcpCommandsProvider.refresh();
        } catch (error) {
            const message = `Error toggling MCP security: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
        }
    }

    /**
     * Check MCP server status
     */
    private async checkMCPStatus(): Promise<void> {
        try {
            const status = await this.mcpService.checkMCPStatus();
            
            const statusItems = Object.entries(status).map(([key, value]) => 
                `${key}: ${value ? 'OK' : 'FAILED'}`
            );
            
            if (statusItems.length === 0) {
                vscode.window.showInformationMessage('No MCP servers configured');
            } else {
                vscode.window.showInformationMessage(`MCP Status: ${statusItems.join(', ')}`);
            }
        } catch (error) {
            const message = `Error checking MCP status: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
        }
    }

    /**
     * Restart MCP server
     */
    private async restartMCPServer(): Promise<void> {
        try {
            const serverName = await vscode.window.showInputBox({
                prompt: 'Enter MCP server name to restart (leave empty for all)',
                placeHolder: 'standalone-terminal'
            });

            if (serverName !== undefined) {
                const success = await this.mcpService.restartMCPServer(serverName || undefined);
                if (success) {
                    this.mcpCommandsProvider.refresh();
                }
            }
        } catch (error) {
            const message = `Error restarting MCP server: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
        }
    }

    /**
     * Change PowerShell execution policy
     */
    private async changePowerShellPolicy(): Promise<void> {
        try {
            const policies = ['Restricted', 'RemoteSigned', 'Unrestricted', 'Bypass'];
            const currentPolicy = this.mcpService.getPowerShellPolicy();
            
            const selectedPolicy = await vscode.window.showQuickPick(policies, {
                placeHolder: `Current policy: ${currentPolicy}`,
                canPickMany: false
            });

            if (selectedPolicy) {
                const config = vscode.workspace.getConfiguration('claudePortfolio');
                await config.update('powerShellExecutionPolicy', selectedPolicy, vscode.ConfigurationTarget.Global);
                
                vscode.window.showInformationMessage(`PowerShell execution policy set to: ${selectedPolicy}`);
                this.mcpCommandsProvider.refresh();
            }
        } catch (error) {
            const message = `Error changing PowerShell policy: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
        }
    }

    /**
     * Check ports using enhanced PowerShell method
     */
    private async checkPortsEnhanced(): Promise<void> {
        try {
            const portInput = await vscode.window.showInputBox({
                prompt: 'Enter port number to check (or leave empty to check common development ports)',
                placeHolder: '3000'
            });

            const portsToCheck = portInput ? 
                [parseInt(portInput)] : 
                [3000, 3001, 3007, 5000, 8000, 8124, 8125];

            const terminal = vscode.window.createTerminal('Port Check');
            terminal.show();

            for (const port of portsToCheck) {
                const command = this.mcpService.generatePortCheckCommand(port);
                terminal.sendText(command);
                terminal.sendText('Write-Host "---"');
            }

            vscode.window.showInformationMessage(`Checking ports: ${portsToCheck.join(', ')}`);
        } catch (error) {
            const message = `Error checking ports: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
        }
    }

    /**
     * Kill process on specific port
     */
    private async killPortProcess(): Promise<void> {
        try {
            const portInput = await vscode.window.showInputBox({
                prompt: 'Enter port number to kill process on',
                placeHolder: '3000',
                validateInput: (value) => {
                    const port = parseInt(value);
                    if (isNaN(port) || port < 1 || port > 65535) {
                        return 'Please enter a valid port number (1-65535)';
                    }
                    return null;
                }
            });

            if (portInput) {
                const port = parseInt(portInput);
                
                const confirmation = await vscode.window.showWarningMessage(
                    `Kill process on port ${port}?`,
                    { modal: true },
                    'Yes', 'No'
                );

                if (confirmation === 'Yes') {
                    const terminal = vscode.window.createTerminal('Kill Port Process');
                    terminal.show();
                    
                    const command = this.mcpService.generateKillPortCommand(port);
                    terminal.sendText(command);
                    
                    vscode.window.showInformationMessage(`Attempting to kill process on port ${port}`);
                }
            }
        } catch (error) {
            const message = `Error killing port process: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
        }
    }

    /**
     * Open MCP configuration file
     */
    private async openMCPConfig(): Promise<void> {
        try {
            const mcpConfigPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', 'mcp_servers.json');
            const uri = vscode.Uri.file(mcpConfigPath);
            
            await vscode.window.showTextDocument(uri);
        } catch (error) {
            const message = `Error opening MCP config: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
        }
    }

    /**
     * Test MCP tools connectivity
     */
    private async testMCPTools(): Promise<void> {
        try {
            const terminal = vscode.window.createTerminal('MCP Test');
            terminal.show();
            
            // Test Claude Code MCP command
            terminal.sendText('claude mcp list');
            terminal.sendText('echo "--- MCP Server List ---"');
            
            // Test connectivity
            terminal.sendText('echo "Testing MCP connectivity..."');
            terminal.sendText('claude mcp get standalone-terminal');
            
            vscode.window.showInformationMessage('Testing MCP tools - check terminal output');
        } catch (error) {
            const message = `Error testing MCP tools: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
        }
    }
}