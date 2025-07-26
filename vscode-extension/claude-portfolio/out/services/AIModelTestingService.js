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
exports.AIModelTestingService = void 0;
const vscode = __importStar(require("vscode"));
const CopilotIntegrationService_1 = require("./CopilotIntegrationService");
/**
 * AI Model Comparison and Testing Service
 * Compare Claude Max and GitHub Copilot Pro on identical tasks
 */
class AIModelTestingService {
    constructor(context) {
        this.context = context;
        this.testResults = [];
        this.testScenarios = [];
        this.copilotService = new CopilotIntegrationService_1.CopilotIntegrationService();
        this.loadTestScenarios();
    }
    /**
     * Run the same prompt against both Claude and Copilot
     */
    async runComparativeTest(prompt, options = {}) {
        const startTime = Date.now();
        // Prepare context if requested
        let contextualPrompt = prompt;
        if (options.includeContext) {
            contextualPrompt = await this.addContext(prompt);
        }
        // Test both models simultaneously
        const [claudeResult, copilotResult] = await Promise.allSettled([
            this.testClaude(contextualPrompt),
            this.testCopilot(contextualPrompt)
        ]);
        const claude = claudeResult.status === 'fulfilled'
            ? claudeResult.value
            : this.createErrorResult('claude', contextualPrompt, claudeResult.reason);
        const copilot = copilotResult.status === 'fulfilled'
            ? copilotResult.value
            : this.createErrorResult('copilot', contextualPrompt, copilotResult.reason);
        // Analyze comparison
        const comparison = this.compareResults(claude, copilot);
        // Save results if requested
        if (options.saveResults !== false) {
            this.testResults.push(claude, copilot);
            await this.saveTestResults();
        }
        // Show results in VS Code
        await this.displayComparisonResults(claude, copilot, comparison);
        return { claude, copilot, comparison };
    }
    /**
     * Test Claude (via your existing Claude integration)
     */
    async testClaude(prompt) {
        const startTime = Date.now();
        try {
            // Since you have Claude Max, this would integrate with your existing Claude system
            // For now, we'll simulate the integration - you can replace this with your actual Claude integration
            // Copy to clipboard for manual Claude testing
            await vscode.env.clipboard.writeText(prompt);
            // Open a new file for Claude response
            const doc = await vscode.workspace.openTextDocument({
                content: `CLAUDE TEST PROMPT:\n${prompt}\n\nCLAUDE RESPONSE:\n[Paste Claude's response here]`,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
            const responseTime = Date.now() - startTime;
            // For now, return a placeholder that user can fill
            return {
                model: 'claude',
                prompt,
                response: '[MANUAL INPUT REQUIRED - Paste Claude response in the opened document]',
                timestamp: new Date(),
                responseTime,
                success: true,
                metadata: {
                    method: 'manual'
                }
            };
        }
        catch (error) {
            return this.createErrorResult('claude', prompt, error);
        }
    }
    /**
     * Test Copilot (using Language Model API)
     */
    async testCopilot(prompt) {
        const startTime = Date.now();
        try {
            const result = await this.copilotService.sendMessage(prompt, {
                preferDirectAPI: true,
                showInstructions: false
            });
            const responseTime = Date.now() - startTime;
            if (result.success && result.content) {
                return {
                    model: 'copilot',
                    prompt,
                    response: result.content,
                    timestamp: new Date(),
                    responseTime,
                    success: true,
                    metadata: {
                        method: result.method === 'language-model' ? 'api' : 'ui'
                    }
                };
            }
            else {
                throw new Error(result.error || 'No response from Copilot');
            }
        }
        catch (error) {
            return this.createErrorResult('copilot', prompt, error);
        }
    }
    /**
     * Add workspace context to prompts
     */
    async addContext(prompt) {
        const context = [];
        // Add current file context
        if (vscode.window.activeTextEditor) {
            const document = vscode.window.activeTextEditor.document;
            context.push(`Current file: ${document.fileName}`);
            context.push(`Language: ${document.languageId}`);
            // Add selected text if any
            const selection = vscode.window.activeTextEditor.selection;
            if (!selection.isEmpty) {
                const selectedText = document.getText(selection);
                context.push(`Selected code:\n\`\`\`${document.languageId}\n${selectedText}\n\`\`\``);
            }
        }
        // Add workspace context
        if (vscode.workspace.workspaceFolders) {
            context.push(`Workspace: ${vscode.workspace.workspaceFolders[0].name}`);
        }
        // Add project type context
        const packageJson = vscode.workspace.findFiles('package.json', null, 1);
        if ((await packageJson).length > 0) {
            context.push('Project type: Node.js/JavaScript project');
        }
        return context.length > 0
            ? `Context:\n${context.join('\n')}\n\nTask:\n${prompt}`
            : prompt;
    }
    /**
     * Compare two AI results
     */
    compareResults(claude, copilot) {
        const responseTimeDiff = claude.responseTime - copilot.responseTime;
        const lengthDiff = claude.response.length - copilot.response.length;
        // Simple similarity analysis
        const claudeWords = new Set(claude.response.toLowerCase().split(/\s+/));
        const copilotWords = new Set(copilot.response.toLowerCase().split(/\s+/));
        const commonWords = [...claudeWords].filter(word => copilotWords.has(word));
        const claudeOnlyWords = [...claudeWords].filter(word => !copilotWords.has(word));
        const copilotOnlyWords = [...copilotWords].filter(word => !claudeWords.has(word));
        return {
            responseTimeDiff,
            lengthDiff,
            similarities: commonWords.slice(0, 10), // Top 10 common words
            differences: [
                ...claudeOnlyWords.slice(0, 5).map(w => `Claude: ${w}`),
                ...copilotOnlyWords.slice(0, 5).map(w => `Copilot: ${w}`)
            ]
        };
    }
    /**
     * Display comparison results in VS Code
     */
    async displayComparisonResults(claude, copilot, comparison) {
        const reportContent = `# AI Model Comparison Report

## Test Details
- **Prompt**: ${claude.prompt.substring(0, 100)}...
- **Timestamp**: ${new Date().toISOString()}

## Results Summary

### Claude Max
- ✅ **Success**: ${claude.success}
- ⏱️ **Response Time**: ${claude.responseTime}ms
- 📝 **Response Length**: ${claude.response.length} characters
- 🔧 **Method**: ${claude.metadata?.method || 'unknown'}

### GitHub Copilot Pro  
- ✅ **Success**: ${copilot.success}
- ⏱️ **Response Time**: ${copilot.responseTime}ms
- 📝 **Response Length**: ${copilot.response.length} characters
- 🔧 **Method**: ${copilot.metadata?.method || 'unknown'}

## Comparison Analysis

### Performance
- **Speed Difference**: ${Math.abs(comparison.responseTimeDiff)}ms (${comparison.responseTimeDiff > 0 ? 'Copilot faster' : 'Claude faster'})
- **Length Difference**: ${Math.abs(comparison.lengthDiff)} characters (${comparison.lengthDiff > 0 ? 'Claude longer' : 'Copilot longer'})

### Content Analysis
**Common Keywords**: ${comparison.similarities.join(', ')}

**Unique Differences**: 
${comparison.differences.join('\n')}

---

## Full Responses

### Claude Response:
\`\`\`
${claude.response}
\`\`\`

### Copilot Response:
\`\`\`
${copilot.response}
\`\`\`

---
*Generated by AI Model Testing Service*
`;
        // Create and show the report
        const doc = await vscode.workspace.openTextDocument({
            content: reportContent,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: false
        });
        // Also show a summary notification
        const winner = comparison.responseTimeDiff > 0 ? 'Copilot' : 'Claude';
        vscode.window.showInformationMessage(`Test completed! ${winner} was faster by ${Math.abs(comparison.responseTimeDiff)}ms`, 'View Report', 'Run Another Test').then(selection => {
            if (selection === 'Run Another Test') {
                vscode.commands.executeCommand('claude-portfolio.runAIComparison');
            }
        });
    }
    /**
     * Create error result
     */
    createErrorResult(model, prompt, error) {
        return {
            model,
            prompt,
            response: '',
            timestamp: new Date(),
            responseTime: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            metadata: { method: 'api' }
        };
    }
    /**
     * Load predefined test scenarios
     */
    loadTestScenarios() {
        this.testScenarios = [
            {
                id: 'code-review',
                name: 'Code Review',
                description: 'Review the selected code for best practices and improvements',
                prompt: 'Please review this code for best practices, potential bugs, and suggest improvements:\n\n${selectedText}',
                category: 'coding',
                evaluationCriteria: ['Accuracy', 'Completeness', 'Actionability']
            },
            {
                id: 'documentation',
                name: 'Generate Documentation',
                description: 'Generate comprehensive documentation for code',
                prompt: 'Generate detailed documentation for this code including parameters, return values, and usage examples:\n\n${selectedText}',
                category: 'documentation',
                evaluationCriteria: ['Clarity', 'Completeness', 'Examples']
            },
            {
                id: 'bug-fix',
                name: 'Debug Issue',
                description: 'Analyze and fix bugs in code',
                prompt: 'This code has a bug. Please identify the issue and provide a fix:\n\n${selectedText}',
                category: 'debugging',
                evaluationCriteria: ['Problem identification', 'Solution quality', 'Explanation clarity']
            },
            {
                id: 'refactor',
                name: 'Code Refactoring',
                description: 'Refactor code for better structure and performance',
                prompt: 'Refactor this code to improve readability, performance, and maintainability:\n\n${selectedText}',
                category: 'coding',
                evaluationCriteria: ['Code quality', 'Performance improvement', 'Maintainability']
            },
            {
                id: 'architecture',
                name: 'Architecture Design',
                description: 'Design system architecture for a project',
                prompt: 'Design a scalable architecture for a ${projectName} application with the following requirements: ${requirements}',
                category: 'architecture',
                variables: { 'requirements': 'Enter your requirements here' },
                evaluationCriteria: ['Scalability', 'Best practices', 'Feasibility']
            }
        ];
    }
    /**
     * Save test results to workspace
     */
    async saveTestResults() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder)
            return;
        const resultsPath = vscode.Uri.joinPath(workspaceFolder.uri, '.ai-testing', 'results.json');
        try {
            const resultsData = JSON.stringify(this.testResults, null, 2);
            await vscode.workspace.fs.writeFile(resultsPath, Buffer.from(resultsData));
        }
        catch (error) {
            console.log('Failed to save test results:', error);
        }
    }
    /**
     * Get test scenarios for UI
     */
    getTestScenarios() {
        return this.testScenarios;
    }
    /**
     * Get test results history
     */
    getTestResults() {
        return this.testResults;
    }
    /**
     * Run a predefined test scenario
     */
    async runTestScenario(scenarioId, variables) {
        const scenario = this.testScenarios.find(s => s.id === scenarioId);
        if (!scenario) {
            throw new Error(`Test scenario ${scenarioId} not found`);
        }
        let prompt = scenario.prompt;
        // Replace variables
        if (scenario.variables || variables) {
            const allVariables = { ...scenario.variables, ...variables };
            for (const [key, value] of Object.entries(allVariables)) {
                prompt = prompt.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
            }
        }
        // Replace VS Code variables
        prompt = await this.replaceVSCodeVariables(prompt);
        await this.runComparativeTest(prompt, {
            includeContext: true,
            category: scenario.category,
            saveResults: true
        });
    }
    /**
     * Replace VS Code built-in variables
     */
    async replaceVSCodeVariables(text) {
        const replacements = {
            '${selectedText}': vscode.window.activeTextEditor?.document.getText(vscode.window.activeTextEditor.selection) || '[No text selected]',
            '${fileName}': vscode.window.activeTextEditor?.document.fileName || '[No file open]',
            '${projectName}': vscode.workspace.name || 'Unknown Project',
            '${workspaceFolder}': vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '[No workspace]'
        };
        let result = text;
        for (const [variable, value] of Object.entries(replacements)) {
            result = result.replace(new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        }
        return result;
    }
}
exports.AIModelTestingService = AIModelTestingService;
//# sourceMappingURL=AIModelTestingService.js.map