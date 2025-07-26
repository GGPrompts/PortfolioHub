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
exports.CopilotIntegrationService = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Enhanced Copilot Integration Service
 * Provides multiple integration methods for maximum compatibility
 */
class CopilotIntegrationService {
    /**
     * Send message to Copilot with fallback methods
     */
    async sendMessage(content, options) {
        // Method 1: Try Language Model API (preferred for programmatic access)
        if (options?.preferDirectAPI !== false) {
            const directResult = await this.tryLanguageModelAPI(content);
            if (directResult.success) {
                return directResult;
            }
        }
        // Method 2: UI Integration (fallback)
        return await this.uiIntegration(content, options?.showInstructions);
    }
    /**
     * Use Copilot's Language Model API directly (no UI)
     */
    async tryLanguageModelAPI(content) {
        try {
            // Select Copilot model
            const models = await vscode.lm.selectChatModels({
                vendor: 'copilot',
                family: 'gpt-4o'
            });
            if (models.length === 0) {
                throw new Error('No Copilot models available');
            }
            const model = models[0];
            const messages = [vscode.LanguageModelChatMessage.User(content)];
            // Send request
            const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
            // Collect response
            let fullResponse = '';
            for await (const fragment of response.text) {
                fullResponse += fragment;
            }
            return {
                success: true,
                content: fullResponse,
                method: 'language-model'
            };
        }
        catch (error) {
            console.log('Language Model API failed:', error);
            return {
                success: false,
                method: 'language-model',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * UI Integration approach (opens chat interface)
     */
    async uiIntegration(content, showInstructions = true) {
        try {
            // Copy content to clipboard first
            await vscode.env.clipboard.writeText(content);
            // Try multiple UI approaches
            const success = await this.tryUICommands();
            if (success && showInstructions) {
                const action = await vscode.window.showInformationMessage('Copilot Chat opened. Message copied to clipboard.', 'Paste & Send', 'Got it');
                if (action === 'Paste & Send') {
                    // Show additional instructions
                    vscode.window.showInformationMessage('Press Ctrl+V to paste, then Enter to send to Copilot', { modal: false });
                }
            }
            return {
                success: true,
                content: 'Message copied to clipboard. Copilot Chat opened.',
                method: 'ui-integration'
            };
        }
        catch (error) {
            return {
                success: false,
                method: 'ui-integration',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Try various UI commands to open Copilot Chat
     */
    async tryUICommands() {
        const commands = [
            'workbench.panel.chat.view.copilot.focus',
            'workbench.action.openChat',
            'workbench.panel.chat.open',
            'github.copilot.interactiveSession.focus'
        ];
        for (const command of commands) {
            try {
                await vscode.commands.executeCommand(command);
                return true;
            }
            catch (error) {
                console.log(`Command ${command} failed:`, error);
                continue;
            }
        }
        // Fallback: Try inline chat if text is selected
        if (vscode.window.activeTextEditor?.selection &&
            !vscode.window.activeTextEditor.selection.isEmpty) {
            try {
                await vscode.commands.executeCommand('inlineChat.start');
                return true;
            }
            catch (error) {
                console.log('Inline chat failed:', error);
            }
        }
        return false;
    }
    /**
     * Create a chat participant for your extension
     */
    static createChatParticipant(context, participantId, name, handler) {
        const participant = vscode.chat.createChatParticipant(participantId, handler);
        // Set icon if available
        const iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'chat-icon.png');
        participant.iconPath = iconPath;
        return participant;
    }
    /**
     * Get available Copilot models
     */
    async getAvailableModels() {
        try {
            return await vscode.lm.selectChatModels({ vendor: 'copilot' });
        }
        catch (error) {
            console.log('Failed to get Copilot models:', error);
            return [];
        }
    }
    /**
     * Check if Copilot is available
     */
    async isCopilotAvailable() {
        const models = await this.getAvailableModels();
        return models.length > 0;
    }
}
exports.CopilotIntegrationService = CopilotIntegrationService;
//# sourceMappingURL=CopilotIntegrationService.js.map