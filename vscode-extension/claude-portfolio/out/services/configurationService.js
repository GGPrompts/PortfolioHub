"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationService = void 0;
const vscode = __importStar(require("vscode"));
class ConfigurationService {
    constructor() {
        this.CONFIG_SECTION = 'claudePortfolio';
    }
    static getInstance() {
        if (!ConfigurationService.instance) {
            ConfigurationService.instance = new ConfigurationService();
        }
        return ConfigurationService.instance;
    }
    /**
     * Get portfolio path from VS Code configuration
     */
    getPortfolioPath() {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get('portfolioPath') || 'D:\\ClaudeWindows\\claude-dev-portfolio';
    }
    /**
     * Get default browser preference
     */
    getDefaultBrowser() {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get('defaultBrowser') || 'integrated';
    }
    /**
     * Check if auto-start is enabled for projects
     */
    isAutoStartEnabled() {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get('autoStartEnabled') || false;
    }
    /**
     * Get refresh interval for project status updates (in milliseconds)
     */
    getRefreshInterval() {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get('refreshInterval') || 5000;
    }
    /**
     * Get maximum port range for scanning
     */
    getMaxPortRange() {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get('maxPortRange') || 9999;
    }
    /**
     * Check if debug logging is enabled
     */
    isDebugLogsEnabled() {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get('showDebugLogs') || false;
    }
    /**
     * Check if project selection (checkbox system) is enabled
     */
    isProjectSelectionEnabled() {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get('enableProjectSelection') || true;
    }
    /**
     * Check if batch operation confirmation is required
     */
    isBatchOperationConfirmationEnabled() {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get('batchOperationConfirmation') || true;
    }
    /**
     * Get all configuration values
     */
    getAllConfiguration() {
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
    async updateConfiguration(key, value, global = false) {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const target = global ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
        try {
            await config.update(key, value, target);
            console.log(`✅ Updated configuration: ${key} = ${value} (${global ? 'global' : 'workspace'})`);
        }
        catch (error) {
            console.error(`❌ Failed to update configuration ${key}:`, error);
            throw error;
        }
    }
    /**
     * Reset all configuration to defaults
     */
    async resetToDefaults() {
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
    validateConfiguration() {
        const errors = [];
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
    onConfigurationChanged(callback) {
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
    isWorkspaceTrusted() {
        return vscode.workspace.isTrusted;
    }
    /**
     * Show configuration in VS Code settings UI
     */
    openConfigurationUI() {
        vscode.commands.executeCommand('workbench.action.openSettings', this.CONFIG_SECTION);
    }
    /**
     * Export current configuration to JSON
     */
    exportConfiguration() {
        const config = this.getAllConfiguration();
        return JSON.stringify(config, null, 2);
    }
    /**
     * Import configuration from JSON
     */
    async importConfiguration(jsonConfig) {
        try {
            const config = JSON.parse(jsonConfig);
            for (const [key, value] of Object.entries(config)) {
                if (value !== undefined) {
                    await this.updateConfiguration(key, value);
                }
            }
            vscode.window.showInformationMessage('Configuration imported successfully');
        }
        catch (error) {
            const message = `Failed to import configuration: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            throw new Error(message);
        }
    }
}
exports.ConfigurationService = ConfigurationService;
//# sourceMappingURL=configurationService.js.map