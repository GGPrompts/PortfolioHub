import * as vscode from 'vscode';

export interface PortfolioConfiguration {
    portfolioPath: string;
    defaultBrowser: string;
    autoStartEnabled: boolean;
    refreshInterval: number;
    maxPortRange: number;
    showDebugLogs: boolean;
    enableProjectSelection: boolean;
    batchOperationConfirmation: boolean;
}

export class ConfigurationService {
    private static instance: ConfigurationService;
    private readonly CONFIG_SECTION = 'claudePortfolio';

    public static getInstance(): ConfigurationService {
        if (!ConfigurationService.instance) {
            ConfigurationService.instance = new ConfigurationService();
        }
        return ConfigurationService.instance;
    }

    /**
     * Get portfolio path from VS Code configuration
     */
    getPortfolioPath(): string {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<string>('portfolioPath') || 'D:\\ClaudeWindows\\claude-dev-portfolio';
    }

    /**
     * Get default browser preference
     */
    getDefaultBrowser(): string {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<string>('defaultBrowser') || 'integrated';
    }

    /**
     * Check if auto-start is enabled for projects
     */
    isAutoStartEnabled(): boolean {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<boolean>('autoStartEnabled') || false;
    }

    /**
     * Get refresh interval for project status updates (in milliseconds)
     */
    getRefreshInterval(): number {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<number>('refreshInterval') || 5000;
    }

    /**
     * Get maximum port range for scanning
     */
    getMaxPortRange(): number {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<number>('maxPortRange') || 9999;
    }

    /**
     * Check if debug logging is enabled
     */
    isDebugLogsEnabled(): boolean {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<boolean>('showDebugLogs') || false;
    }

    /**
     * Check if project selection (checkbox system) is enabled
     */
    isProjectSelectionEnabled(): boolean {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<boolean>('enableProjectSelection') || true;
    }

    /**
     * Check if batch operation confirmation is required
     */
    isBatchOperationConfirmationEnabled(): boolean {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<boolean>('batchOperationConfirmation') || true;
    }

    /**
     * Get all configuration values
     */
    getAllConfiguration(): PortfolioConfiguration {
        return {
            portfolioPath: this.getPortfolioPath(),
            defaultBrowser: this.getDefaultBrowser(),
            autoStartEnabled: this.isAutoStartEnabled(),
            refreshInterval: this.getRefreshInterval(),
            maxPortRange: this.getMaxPortRange(),
            showDebugLogs: this.isDebugLogsEnabled(),
            enableProjectSelection: this.isProjectSelectionEnabled(),
            batchOperationConfirmation: this.isBatchOperationConfirmationEnabled()
        };
    }

    /**
     * Update a configuration value
     */
    async updateConfiguration(key: string, value: any, global: boolean = false): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const target = global ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
        
        try {
            await config.update(key, value, target);
            console.log(`✅ Updated configuration: ${key} = ${value} (${global ? 'global' : 'workspace'})`);
        } catch (error) {
            console.error(`❌ Failed to update configuration ${key}:`, error);
            throw error;
        }
    }

    /**
     * Reset all configuration to defaults
     */
    async resetToDefaults(): Promise<void> {
        const defaultConfig = {
            portfolioPath: 'D:\\ClaudeWindows\\claude-dev-portfolio',
            defaultBrowser: 'integrated',
            autoStartEnabled: false,
            refreshInterval: 5000,
            maxPortRange: 9999,
            showDebugLogs: false,
            enableProjectSelection: true,
            batchOperationConfirmation: true
        };

        for (const [key, value] of Object.entries(defaultConfig)) {
            await this.updateConfiguration(key, value);
        }

        vscode.window.showInformationMessage('Portfolio configuration reset to defaults');
    }

    /**
     * Validate configuration values
     */
    validateConfiguration(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const config = this.getAllConfiguration();

        // Validate portfolio path
        if (!config.portfolioPath || typeof config.portfolioPath !== 'string') {
            errors.push('Portfolio path must be a valid string');
        }

        // Validate refresh interval
        if (config.refreshInterval < 1000 || config.refreshInterval > 60000) {
            errors.push('Refresh interval must be between 1000 and 60000 milliseconds');
        }

        // Validate max port range
        if (config.maxPortRange < 3000 || config.maxPortRange > 65535) {
            errors.push('Max port range must be between 3000 and 65535');
        }

        // Validate browser option
        const validBrowsers = ['integrated', 'external', 'auto'];
        if (!validBrowsers.includes(config.defaultBrowser)) {
            errors.push(`Default browser must be one of: ${validBrowsers.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Listen for configuration changes
     */
    onConfigurationChanged(callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(this.CONFIG_SECTION)) {
                console.log('🔧 Portfolio configuration changed');
                callback(e);
            }
        });
    }

    /**
     * Get workspace trust status
     */
    isWorkspaceTrusted(): boolean {
        return vscode.workspace.isTrusted;
    }

    /**
     * Show configuration in VS Code settings UI
     */
    openConfigurationUI(): void {
        vscode.commands.executeCommand('workbench.action.openSettings', this.CONFIG_SECTION);
    }

    /**
     * Export current configuration to JSON
     */
    exportConfiguration(): string {
        const config = this.getAllConfiguration();
        return JSON.stringify(config, null, 2);
    }

    /**
     * Import configuration from JSON
     */
    async importConfiguration(jsonConfig: string): Promise<void> {
        try {
            const config = JSON.parse(jsonConfig) as Partial<PortfolioConfiguration>;
            
            for (const [key, value] of Object.entries(config)) {
                if (value !== undefined) {
                    await this.updateConfiguration(key, value);
                }
            }
            
            vscode.window.showInformationMessage('Configuration imported successfully');
        } catch (error) {
            const message = `Failed to import configuration: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            throw new Error(message);
        }
    }
}