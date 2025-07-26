import * as vscode from 'vscode';
import { CopilotIntegrationService } from './CopilotIntegrationService';

export interface AITestResult {
    model: 'claude' | 'copilot';
    prompt: string;
    response: string;
    timestamp: Date;
    responseTime: number;
    success: boolean;
    error?: string;
    metadata?: {
        tokenCount?: number;
        confidence?: number;
        method: 'api' | 'ui' | 'manual';
    };
}

export interface TestScenario {
    id: string;
    name: string;
    description: string;
    prompt: string;
    category: 'coding' | 'documentation' | 'debugging' | 'architecture' | 'creative' | 'analysis';
    variables?: Record<string, string>;
    expectedOutputs?: string[];
    evaluationCriteria?: string[];
}

/**
 * AI Model Comparison and Testing Service
 * Compare Claude Max and GitHub Copilot Pro on identical tasks
 */
export class AIModelTestingService {
    private copilotService: CopilotIntegrationService;
    private testResults: AITestResult[] = [];
    private testScenarios: TestScenario[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.copilotService = new CopilotIntegrationService();
        this.loadTestScenarios();
    }

    /**
     * Run the same prompt against both Claude and Copilot
     */
    async runComparativeTest(
        prompt: string, 
        options: {
            includeContext?: boolean;
            category?: TestScenario['category'];
            saveResults?: boolean;
        } = {}
    ): Promise<{
        claude: AITestResult;
        copilot: AITestResult;
        comparison: {
            responseTimeDiff: number;
            lengthDiff: number;
            similarities: string[];
            differences: string[];
        };
    }> {
        
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

        const claude: AITestResult = claudeResult.status === 'fulfilled' 
            ? claudeResult.value 
            : this.createErrorResult('claude', contextualPrompt, claudeResult.reason);

        const copilot: AITestResult = copilotResult.status === 'fulfilled'
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
    private async testClaude(prompt: string): Promise<AITestResult> {
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
            
        } catch (error) {
            return this.createErrorResult('claude', prompt, error);
        }
    }

    /**
     * Test Copilot (using Language Model API)
     */
    private async testCopilot(prompt: string): Promise<AITestResult> {
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
            } else {
                throw new Error(result.error || 'No response from Copilot');
            }

        } catch (error) {
            return this.createErrorResult('copilot', prompt, error);
        }
    }

    /**
     * Add workspace context to prompts
     */
    private async addContext(prompt: string): Promise<string> {
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
    private compareResults(claude: AITestResult, copilot: AITestResult): {
        responseTimeDiff: number;
        lengthDiff: number;
        similarities: string[];
        differences: string[];
    } {
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
    private async displayComparisonResults(
        claude: AITestResult, 
        copilot: AITestResult, 
        comparison: any
    ): Promise<void> {
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
        vscode.window.showInformationMessage(
            `Test completed! ${winner} was faster by ${Math.abs(comparison.responseTimeDiff)}ms`,
            'View Report',
            'Run Another Test'
        ).then(selection => {
            if (selection === 'Run Another Test') {
                vscode.commands.executeCommand('claude-portfolio.runAIComparison');
            }
        });
    }

    /**
     * Create error result
     */
    private createErrorResult(model: 'claude' | 'copilot', prompt: string, error: any): AITestResult {
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
    private loadTestScenarios(): void {
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
    private async saveTestResults(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;

        const resultsPath = vscode.Uri.joinPath(workspaceFolder.uri, '.ai-testing', 'results.json');
        
        try {
            const resultsData = JSON.stringify(this.testResults, null, 2);
            await vscode.workspace.fs.writeFile(resultsPath, Buffer.from(resultsData));
        } catch (error) {
            console.log('Failed to save test results:', error);
        }
    }

    /**
     * Get test scenarios for UI
     */
    getTestScenarios(): TestScenario[] {
        return this.testScenarios;
    }

    /**
     * Get test results history
     */
    getTestResults(): AITestResult[] {
        return this.testResults;
    }

    /**
     * Run a predefined test scenario
     */
    async runTestScenario(scenarioId: string, variables?: Record<string, string>): Promise<void> {
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
    private async replaceVSCodeVariables(text: string): Promise<string> {
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
