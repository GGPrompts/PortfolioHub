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
exports.activateCopilotIntegration = activateCopilotIntegration;
const vscode = __importStar(require("vscode"));
const CopilotIntegrationService_1 = require("./CopilotIntegrationService");
const AIModelTestingService_1 = require("./AIModelTestingService");
const AITestingQuickStart_1 = require("./AITestingQuickStart");
// Enhanced AI integration with model comparison capabilities
async function activateCopilotIntegration(context) {
    const copilotService = new CopilotIntegrationService_1.CopilotIntegrationService();
    const testingService = new AIModelTestingService_1.AIModelTestingService(context);
    const quickStart = new AITestingQuickStart_1.AITestingQuickStart(testingService);
    // Register command for direct integration
    const directCommand = vscode.commands.registerCommand('claude-portfolio.sendToCopilotDirect', async (message) => {
        const result = await copilotService.sendMessage(message, {
            preferDirectAPI: true,
            showInstructions: false
        });
        if (result.success && result.content) {
            // Display response in your UI
            vscode.window.showInformationMessage(`Copilot: ${result.content}`);
        }
    });
    // Register command for UI integration
    const uiCommand = vscode.commands.registerCommand('claude-portfolio.sendToCopilotUI', async (message) => {
        await copilotService.sendMessage(message, {
            preferDirectAPI: false,
            showInstructions: true
        });
    });
    // Create a chat participant for your extension
    const participant = CopilotIntegrationService_1.CopilotIntegrationService.createChatParticipant(context, 'claude-portfolio.assistant', 'Portfolio Assistant', async (request, context, stream, token) => {
        // Your chat participant logic here
        stream.markdown(`Portfolio Assistant: ${request.prompt}`);
    });
    // NEW: AI Model Comparison Commands
    const runComparisonCommand = vscode.commands.registerCommand('claude-portfolio.runAIComparison', async () => {
        const prompt = await vscode.window.showInputBox({
            prompt: 'Enter prompt to test with both Claude and Copilot',
            placeHolder: 'e.g., "Explain how to implement a REST API in TypeScript"',
            ignoreFocusOut: true
        });
        if (prompt) {
            await testingService.runComparativeTest(prompt, {
                includeContext: true,
                saveResults: true
            });
        }
    });
    const runScenarioTestCommand = vscode.commands.registerCommand('claude-portfolio.runScenarioTest', async () => {
        const scenarios = testingService.getTestScenarios();
        const selectedScenario = await vscode.window.showQuickPick(scenarios.map(s => ({
            label: s.name,
            description: s.description,
            detail: `Category: ${s.category}`,
            scenario: s
        })), {
            placeHolder: 'Select a test scenario to run',
            ignoreFocusOut: true
        });
        if (selectedScenario) {
            await testingService.runTestScenario(selectedScenario.scenario.id);
        }
    });
    const viewTestResultsCommand = vscode.commands.registerCommand('claude-portfolio.viewTestResults', async () => {
        const results = testingService.getTestResults();
        if (results.length === 0) {
            vscode.window.showInformationMessage('No test results available. Run some AI comparisons first!');
            return;
        }
        // Create results summary
        const summary = `# AI Testing Results Summary

Total Tests: ${results.length / 2} (${results.length} individual responses)

## Recent Results:
${results.slice(-10).map((result, index) => `
${index + 1}. **${result.model.toUpperCase()}** (${result.timestamp.toLocaleString()})
   - Success: ${result.success ? '✅' : '❌'}
   - Response Time: ${result.responseTime}ms
   - Length: ${result.response.length} chars
   - Method: ${result.metadata?.method || 'unknown'}
`).join('\n')}

*View individual test reports for detailed comparisons*
`;
        const doc = await vscode.workspace.openTextDocument({
            content: summary,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
    });
    const quickTestCommand = vscode.commands.registerCommand('claude-portfolio.quickAITest', async () => {
        // Quick test with selected text or current file
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Open a file or select some code to test');
            return;
        }
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        if (selectedText.trim()) {
            // Test with selected code
            const action = await vscode.window.showQuickPick([
                'Explain this code',
                'Review for bugs',
                'Suggest improvements',
                'Generate documentation',
                'Refactor this code'
            ], {
                placeHolder: 'What should the AIs do with the selected code?'
            });
            if (action) {
                const prompt = `${action}: \n\n\`\`\`${editor.document.languageId}\n${selectedText}\n\`\`\``;
                await testingService.runComparativeTest(prompt, {
                    includeContext: true,
                    saveResults: true
                });
            }
        }
        else {
            // Test with file content
            vscode.window.showInformationMessage('Select some code first, then try again');
        }
    });
    context.subscriptions.push(directCommand, uiCommand, participant, runComparisonCommand, runScenarioTestCommand, viewTestResultsCommand, quickTestCommand, 
    // Quick Start Wizard
    vscode.commands.registerCommand('claude-portfolio.aiTestingQuickStart', () => quickStart.showQuickStartWizard()), vscode.commands.registerCommand('claude-portfolio.showTestingTips', () => quickStart.showTestingTips()));
    // Check if Copilot is available
    const isAvailable = await copilotService.isCopilotAvailable();
    if (!isAvailable) {
        vscode.window.showWarningMessage('GitHub Copilot is not available. Please ensure it\'s installed and activated.');
    }
}
//# sourceMappingURL=CopilotActivation.js.map