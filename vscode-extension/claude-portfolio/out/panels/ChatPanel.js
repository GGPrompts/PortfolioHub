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
exports.ChatPanel = void 0;
const vscode = __importStar(require("vscode"));
const securityService_1 = require("../securityService");
/**
 * Chat Panel for Multi-AI Communication
 * Termux-style clean interface with VS Code integration
 */
class ChatPanel {
    constructor(_panel, _extensionUri, _context) {
        this._panel = _panel;
        this._extensionUri = _extensionUri;
        this._context = _context;
        this._update();
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.type) {
                case 'sendMessage':
                    this._handleSendMessage(message);
                    break;
                case 'executeTemplate':
                    this._handleTemplateExecution(message);
                    break;
                case 'insertVariable':
                    this._handleVariableInsertion(message);
                    break;
            }
        }, null, this._context.subscriptions);
        this._panel.onDidDispose(() => ChatPanel._instance = undefined, null, this._context.subscriptions);
    }
    static createOrShow(extensionUri, context) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it
        if (ChatPanel._instance) {
            ChatPanel._instance._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(ChatPanel.viewType, 'AI Chat Interface', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'media'),
                vscode.Uri.joinPath(extensionUri, 'out')
            ]
        });
        ChatPanel._instance = new ChatPanel(panel, extensionUri, context);
    }
    static revive(panel, extensionUri, context) {
        ChatPanel._instance = new ChatPanel(panel, extensionUri, context);
    }
    async _handleSendMessage(message) {
        const { content, targets, variables } = message;
        // Replace VS Code variables in the message
        const processedContent = await this._processVariables(content, variables);
        // Send to selected targets
        const results = await this._sendToTargets(processedContent, targets);
        // Send results back to webview
        this._panel.webview.postMessage({
            type: 'messageResults',
            results: results
        });
    }
    async _handleTemplateExecution(message) {
        const { templateId, fillableFields } = message;
        // Get template and process variables
        const template = this._getTemplate(templateId);
        const processedTemplate = this._fillTemplate(template, fillableFields);
        // Execute the processed template
        await this._handleSendMessage({
            content: processedTemplate,
            targets: message.targets,
            variables: message.variables
        });
    }
    async _handleVariableInsertion(message) {
        const { variableType } = message;
        const value = await this._resolveVariable(variableType);
        this._panel.webview.postMessage({
            type: 'variableResolved',
            variableType: variableType,
            value: value
        });
    }
    async _processVariables(content, variables) {
        let processed = content;
        // Replace VS Code built-in variables
        const replacements = {
            '${workspaceFolder}': vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
            '${workspaceFolderBasename}': vscode.workspace.workspaceFolders?.[0]?.name || '',
            '${file}': vscode.window.activeTextEditor?.document.fileName || '',
            '${fileBasename}': vscode.window.activeTextEditor?.document.fileName.split(/[\\/]/).pop() || '',
            '${fileBasenameNoExtension}': vscode.window.activeTextEditor?.document.fileName.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || '',
            '${fileDirname}': vscode.window.activeTextEditor?.document.fileName.split(/[\\/]/).slice(0, -1).join('/') || '',
            '${fileExtname}': `.${vscode.window.activeTextEditor?.document.fileName.split('.').pop()}` || '',
            '${selectedText}': vscode.window.activeTextEditor?.document.getText(vscode.window.activeTextEditor.selection) || '',
            '${lineNumber}': (vscode.window.activeTextEditor?.selection.active.line || 0) + 1,
            '${currentDateTime}': new Date().toISOString(),
            '${gitBranch}': await this._getCurrentGitBranch(),
            '${projectName}': vscode.workspace.name || 'Unknown Project'
        };
        // Replace all variables
        for (const [variable, value] of Object.entries(replacements)) {
            processed = processed.replace(new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
        }
        // Replace custom variables from the message
        if (variables) {
            for (const [key, value] of Object.entries(variables)) {
                processed = processed.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
            }
        }
        return processed;
    }
    async _sendToTargets(content, targets) {
        const results = [];
        for (const target of targets) {
            try {
                switch (target) {
                    case 'claude':
                        const claudeResult = await this._sendToClaude(content);
                        results.push({ target: 'claude', success: true, response: claudeResult });
                        break;
                    case 'copilot':
                        const copilotResult = await this._sendToCopilot(content);
                        results.push({ target: 'copilot', success: true, response: copilotResult });
                        break;
                    case 'terminal':
                        const terminalResult = await this._sendToTerminal(content);
                        results.push({ target: 'terminal', success: true, response: terminalResult });
                        break;
                    default:
                        results.push({ target, success: false, error: 'Unknown target' });
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                results.push({ target, success: false, error: errorMessage });
            }
        }
        return results;
    }
    async _sendToClaude(content) {
        // Placeholder for Claude API integration
        // This would integrate with your existing Claude prompt system
        return `Claude response to: ${content}`;
    }
    async _sendToCopilot(content) {
        // Integration with GitHub Copilot Chat
        await vscode.commands.executeCommand('github.copilot.interactiveEditor.explain');
        return `Copilot activated for: ${content}`;
    }
    async _sendToTerminal(content) {
        // Send command to terminal
        const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('AI Chat');
        terminal.show();
        if (securityService_1.VSCodeSecurityService.validateCommand(content)) {
            terminal.sendText(content);
            return `Executed in terminal: ${content}`;
        }
        else {
            throw new Error('Command blocked by security validation');
        }
    }
    _getTemplate(templateId) {
        // Get current file extension for syntax highlighting
        const getCurrentFileExtension = () => {
            const fileName = vscode.window.activeTextEditor?.document.fileName || '';
            const extension = fileName.split('.').pop() || 'text';
            return extension;
        };
        const fileExtension = getCurrentFileExtension();
        const templates = {
            codeReview: `Review this code for potential issues and improvements:

\`\`\`${fileExtension}
\${selectedText}
\`\`\`

File: \${file}
Context: \${1:Additional context}`,
            documentation: `Generate documentation for this code:

\`\`\`${fileExtension}
\${selectedText}
\`\`\`

Documentation type: \${1:API|README|inline comments}
Audience: \${2:developers|end users|both}`,
            debugging: `Help me debug this issue in \${fileBasename}:

Problem: \${1:Describe the issue}

Code:
\`\`\`${fileExtension}
\${selectedText}
\`\`\`

Expected behavior: \${2:What should happen}
Actual behavior: \${3:What's happening instead}`,
            optimization: `Suggest performance optimizations for this code:

\`\`\`${fileExtension}
\${selectedText}
\`\`\`

Current performance concerns: \${1:Describe performance issues}
Target environment: \${2:browser|node|mobile|desktop}`,
            testing: `Generate unit tests for this function:

\`\`\`${fileExtension}
\${selectedText}
\`\`\`

Test framework: \${1:Jest|Mocha|Vitest|other}
Coverage requirements: \${2:basic|comprehensive|edge cases}`
        };
        return templates[templateId] || '';
    }
    _fillTemplate(template, fields) {
        let filled = template;
        // Replace numbered placeholders
        for (const [key, value] of Object.entries(fields)) {
            filled = filled.replace(new RegExp(`\\$\\{${key}:.*?\\}`, 'g'), value);
            filled = filled.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
        }
        return filled;
    }
    async _resolveVariable(variableType) {
        switch (variableType) {
            case 'selectedText':
                return vscode.window.activeTextEditor?.document.getText(vscode.window.activeTextEditor.selection) || '';
            case 'currentFile':
                return vscode.window.activeTextEditor?.document.fileName || '';
            case 'gitBranch':
                return await this._getCurrentGitBranch();
            case 'projectName':
                return vscode.workspace.name || 'Unknown Project';
            default:
                return '';
        }
    }
    async _getCurrentGitBranch() {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            const git = gitExtension?.getAPI(1);
            const repository = git?.repositories[0];
            return repository?.state?.HEAD?.name || 'main';
        }
        catch {
            return 'main';
        }
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.css'));
        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <link href="${styleUri}" rel="stylesheet">
                <title>AI Chat Interface</title>
            </head>
            <body>
                <div id="chat-container">
                    <!-- Target Selection -->
                    <div id="target-selector">
                        <div class="target-group">
                            <label class="target-option">
                                <input type="checkbox" name="target" value="claude" checked>
                                <span class="target-icon">🤖</span>
                                <span class="target-name">Claude</span>
                            </label>
                            <label class="target-option">
                                <input type="checkbox" name="target" value="copilot">
                                <span class="target-icon">👥</span>
                                <span class="target-name">Copilot</span>
                            </label>
                            <label class="target-option">
                                <input type="checkbox" name="target" value="terminal">
                                <span class="target-icon">📟</span>
                                <span class="target-name">Terminal</span>
                            </label>
                        </div>
                        <div class="queue-info">
                            <span id="queue-count">Queue: 0</span>
                            <button id="process-queue" class="queue-btn">▶️</button>
                        </div>
                    </div>

                    <!-- Message History -->
                    <div id="message-history">
                        <div class="welcome-message">
                            <h3>🚀 AI Chat Interface</h3>
                            <p>Use VS Code variables like <code>\${selectedText}</code>, <code>\${file}</code>, <code>\${workspaceFolder}</code></p>
                            <p>Try templates with <code>/template</code> or use <code>Ctrl+Enter</code> to send</p>
                        </div>
                    </div>

                    <!-- Template Bar -->
                    <div id="template-bar">
                        <button class="template-btn" data-template="codeReview">📝 Code Review</button>
                        <button class="template-btn" data-template="documentation">📚 Docs</button>
                        <button class="template-btn" data-template="debugging">🐛 Debug</button>
                        <button class="template-btn" data-template="optimization">⚡ Optimize</button>
                        <button class="template-btn" data-template="testing">🧪 Tests</button>
                    </div>

                    <!-- Input Area -->
                    <div id="input-area">
                        <div class="input-container">
                            <div class="variable-hints" id="variable-hints"></div>
                            <textarea 
                                id="message-input" 
                                placeholder="Ask Claude, Copilot, or send to terminal... Use \${selectedText} for current selection"
                                rows="3"
                            ></textarea>
                            <div class="input-actions">
                                <button id="variable-helper" class="action-btn" title="Insert Variable">🔧</button>
                                <button id="queue-message" class="action-btn" title="Add to Queue">📋</button>
                                <button id="send-message" class="action-btn primary" title="Send (Ctrl+Enter)">📤</button>
                            </div>
                        </div>
                    </div>
                </div>

                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
exports.ChatPanel = ChatPanel;
ChatPanel.viewType = 'claudePortfolio.chat';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=ChatPanel.js.map