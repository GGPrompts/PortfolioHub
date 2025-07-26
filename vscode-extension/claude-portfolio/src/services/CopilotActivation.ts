import * as vscode from 'vscode';
import { CopilotIntegrationService } from './CopilotIntegrationService';
import { AIModelTestingService } from './AIModelTestingService';
import { AITestingQuickStart } from './AITestingQuickStart';

// Enhanced AI integration with model comparison capabilities

export async function activateCopilotIntegration(context: vscode.ExtensionContext) {
    const copilotService = new CopilotIntegrationService();
    const testingService = new AIModelTestingService(context);
    const quickStart = new AITestingQuickStart(testingService);
    
    // Register command for direct integration
    const directCommand = vscode.commands.registerCommand(
        'claude-portfolio.sendToCopilotDirect', 
        async (message: string) => {
            const result = await copilotService.sendMessage(message, {
                preferDirectAPI: true,
                showInstructions: false
            });
            
            if (result.success && result.content) {
                // Display response in your UI
                vscode.window.showInformationMessage(`Copilot: ${result.content}`);
            }
        }
    );
    
    // Register command for UI integration
    const uiCommand = vscode.commands.registerCommand(
        'claude-portfolio.sendToCopilotUI',
        async (message: string) => {
            await copilotService.sendMessage(message, {
                preferDirectAPI: false,
                showInstructions: true
            });
        }
    );
    
    // Create a chat participant for your extension
    const participant = CopilotIntegrationService.createChatParticipant(
        context,
        'claude-portfolio.assistant',
        'Portfolio Assistant',
        async (request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken) => {
            // Your chat participant logic here
            stream.markdown(`Portfolio Assistant: ${request.prompt}`);
        }
    );
    
    // NEW: AI Model Comparison Commands
    const runComparisonCommand = vscode.commands.registerCommand(
        'claude-portfolio.runAIComparison',
        async () => {
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
        }
    );

    const runScenarioTestCommand = vscode.commands.registerCommand(
        'claude-portfolio.runScenarioTest',
        async () => {
            const scenarios = testingService.getTestScenarios();
            const selectedScenario = await vscode.window.showQuickPick(
                scenarios.map(s => ({
                    label: s.name,
                    description: s.description,
                    detail: `Category: ${s.category}`,
                    scenario: s
                })),
                {
                    placeHolder: 'Select a test scenario to run',
                    ignoreFocusOut: true
                }
            );

            if (selectedScenario) {
                await testingService.runTestScenario(selectedScenario.scenario.id);
            }
        }
    );

    const viewTestResultsCommand = vscode.commands.registerCommand(
        'claude-portfolio.viewTestResults',
        async () => {
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
        }
    );

    const quickTestCommand = vscode.commands.registerCommand(
        'claude-portfolio.quickAITest',
        async () => {
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
            } else {
                // Test with file content
                vscode.window.showInformationMessage('Select some code first, then try again');
            }
        }
    );

    context.subscriptions.push(
        directCommand, 
        uiCommand, 
        participant,
        runComparisonCommand,
        runScenarioTestCommand,
        viewTestResultsCommand,
        quickTestCommand,
        
        // Quick Start Wizard
        vscode.commands.registerCommand(
            'claude-portfolio.aiTestingQuickStart',
            () => quickStart.showQuickStartWizard()
        ),
        
        vscode.commands.registerCommand(
            'claude-portfolio.showTestingTips',
            () => quickStart.showTestingTips()
        )
    );
    
    // Check if Copilot is available
    const isAvailable = await copilotService.isCopilotAvailable();
    if (!isAvailable) {
        vscode.window.showWarningMessage(
            'GitHub Copilot is not available. Please ensure it\'s installed and activated.'
        );
    }
}
