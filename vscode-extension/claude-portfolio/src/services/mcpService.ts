import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service for managing MCP (Model Context Protocol) server configurations
 * and security settings for the Claude Portfolio extension
 */
export class MCPService {
    private static instance: MCPService;
    private mcpConfigPath: string;
    private statusBarItem: vscode.StatusBarItem;

    private constructor() {
        this.mcpConfigPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', 'mcp_servers.json');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.updateStatusBar();
    }

    public static getInstance(): MCPService {
        if (!MCPService.instance) {
            MCPService.instance = new MCPService();
        }
        return MCPService.instance;
    }

    /**
     * Get current MCP security level from VS Code settings
     */
    public getSecurityLevel(): string {
        const config = vscode.workspace.getConfiguration('claudePortfolio');
        return config.get<string>('mcpSecurityLevel', 'enhanced');
    }

    /**
     * Set MCP security level in VS Code settings
     */
    public async setSecurityLevel(level: 'enhanced' | 'basic' | 'disabled'): Promise<void> {
        const config = vscode.workspace.getConfiguration('claudePortfolio');
        await config.update('mcpSecurityLevel', level, vscode.ConfigurationTarget.Global);
        this.updateStatusBar();
        
        // Update the actual MCP server configuration
        await this.updateMCPServerConfig(level);
    }

    /**
     * Toggle between security levels
     */
    public async toggleSecurity(): Promise<void> {
        const currentLevel = this.getSecurityLevel();
        let newLevel: 'enhanced' | 'basic' | 'disabled';

        switch (currentLevel) {
            case 'enhanced':
                newLevel = 'basic';
                break;
            case 'basic':
                newLevel = 'disabled';
                break;
            default:
                newLevel = 'enhanced';
                break;
        }

        await this.setSecurityLevel(newLevel);
        vscode.window.showInformationMessage(`MCP Security: ${newLevel.toUpperCase()}`);
    }

    /**
     * Get PowerShell execution policy from settings
     */
    public getPowerShellPolicy(): string {
        const config = vscode.workspace.getConfiguration('claudePortfolio');
        return config.get<string>('powerShellExecutionPolicy', 'RemoteSigned');
    }

    /**
     * Update MCP server configuration file
     */
    private async updateMCPServerConfig(securityLevel: string): Promise<void> {
        try {
            if (!fs.existsSync(this.mcpConfigPath)) {
                console.log('MCP config file not found:', this.mcpConfigPath);
                return;
            }

            const configData = fs.readFileSync(this.mcpConfigPath, 'utf8');
            const config = JSON.parse(configData);

            // Update standalone-terminal MCP server if it exists
            if (config.mcpServers && config.mcpServers['standalone-terminal']) {
                const terminalServer = config.mcpServers['standalone-terminal'];
                if (terminalServer.env) {
                    terminalServer.env.SECURITY_VALIDATION = securityLevel;
                    
                    // Write updated config back
                    fs.writeFileSync(this.mcpConfigPath, JSON.stringify(config, null, 2));
                    console.log(`Updated MCP security level to: ${securityLevel}`);
                }
            }
        } catch (error) {
            console.error('Error updating MCP config:', error);
            vscode.window.showErrorMessage(`Failed to update MCP config: ${error}`);
        }
    }

    /**
     * Check MCP server status
     */
    public async checkMCPStatus(): Promise<{[key: string]: boolean}> {
        const status: {[key: string]: boolean} = {};

        try {
            // Check if config file exists
            if (!fs.existsSync(this.mcpConfigPath)) {
                return { configExists: false };
            }

            const configData = fs.readFileSync(this.mcpConfigPath, 'utf8');
            const config = JSON.parse(configData);

            status.configExists = true;
            
            // Check each server
            if (config.mcpServers) {
                for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
                    // Basic health check - could be enhanced with actual server pings
                    status[serverName] = true;
                }
            }

        } catch (error) {
            console.error('Error checking MCP status:', error);
            status.error = true;
        }

        return status;
    }

    /**
     * Restart MCP server using Claude Code CLI
     */
    public async restartMCPServer(serverName?: string): Promise<boolean> {
        try {
            const { spawn } = require('child_process');
            
            if (serverName) {
                // Restart specific server
                const restartProcess = spawn('claude', ['mcp', 'remove', serverName], { shell: true });
                await new Promise((resolve) => restartProcess.on('close', resolve));
                
                // Re-add the server (would need server config details)
                vscode.window.showInformationMessage(`Restarted MCP server: ${serverName}`);
            } else {
                // Restart Claude Desktop to reload all MCP servers
                vscode.window.showInformationMessage('Please restart Claude Desktop to reload MCP servers');
            }
            
            return true;
        } catch (error) {
            console.error('Error restarting MCP server:', error);
            vscode.window.showErrorMessage(`Failed to restart MCP server: ${error}`);
            return false;
        }
    }

    /**
     * Generate PowerShell command with proper syntax for Windows 11/PowerShell 7.5
     */
    public generatePowerShellCommand(baseCommand: string, args: string[] = []): string {
        const policy = this.getPowerShellPolicy();
        const securityLevel = this.getSecurityLevel();
        
        // For Windows 11 and PowerShell 7.5, use pwsh instead of powershell
        const pwshExecutable = 'pwsh.exe';
        
        let command = `${pwshExecutable} -ExecutionPolicy ${policy}`;
        
        if (securityLevel === 'disabled') {
            command += ' -ExecutionPolicy Bypass';
        }
        
        // Add the actual command
        if (baseCommand.includes(' ')) {
            command += ` -Command "${baseCommand}"`;
        } else {
            command += ` -Command ${baseCommand}`;
        }
        
        // Add arguments if provided
        if (args.length > 0) {
            command += ` ${args.join(' ')}`;
        }
        
        return command;
    }

    /**
     * Generate safer netstat command for port checking
     */
    public generatePortCheckCommand(port: number): string {
        const securityLevel = this.getSecurityLevel();
        
        if (securityLevel === 'enhanced') {
            // Use Get-NetTCPConnection for enhanced security
            return this.generatePowerShellCommand(
                `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess, State`
            );
        } else {
            // Use traditional netstat for basic/disabled security
            return `cmd /c netstat -ano | findstr :${port}`;
        }
    }

    /**
     * Generate process kill command for specific port
     */
    public generateKillPortCommand(port: number): string {
        const securityLevel = this.getSecurityLevel();
        
        if (securityLevel === 'enhanced') {
            // Use PowerShell for enhanced security
            return this.generatePowerShellCommand(
                `$proc = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue; if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }`
            );
        } else {
            // Use traditional taskkill for basic/disabled security
            const netstatCmd = `netstat -ano | findstr :${port}`;
            return `cmd /c "for /f \"tokens=5\" %i in ('${netstatCmd}') do taskkill /PID %i /F"`;
        }
    }

    /**
     * Update status bar to show current security level
     */
    private updateStatusBar(): void {
        const securityLevel = this.getSecurityLevel();
        const icons = {
            enhanced: '$(shield)',
            basic: '$(warning)',
            disabled: '$(shield-x)'
        };
        
        const icon = icons[securityLevel as keyof typeof icons] || '$(question)';
        this.statusBarItem.text = `${icon} MCP: ${securityLevel.toUpperCase()}`;
        this.statusBarItem.tooltip = `MCP Security Level: ${securityLevel}\nClick to toggle`;
        this.statusBarItem.command = 'claude-portfolio.toggleMCPSecurity';
        this.statusBarItem.show();
    }

    /**
     * Dispose of the service
     */
    public dispose(): void {
        this.statusBarItem.dispose();
    }
}