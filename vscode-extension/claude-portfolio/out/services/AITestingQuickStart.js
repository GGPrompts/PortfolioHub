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
exports.AITestingQuickStart = exports.SAMPLE_TEST_PROMPTS = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Sample test prompts for getting started with AI model comparison
 */
exports.SAMPLE_TEST_PROMPTS = [
    {
        category: 'Code Review',
        prompt: 'Review this TypeScript function for best practices and potential improvements:\n\n```typescript\nfunction processData(data: any) {\n    let result = [];\n    for (let i = 0; i < data.length; i++) {\n        if (data[i].active) {\n            result.push(data[i].name.toUpperCase());\n        }\n    }\n    return result;\n}\n```',
        description: 'Test AI code review capabilities'
    },
    {
        category: 'Architecture',
        prompt: 'Design a scalable REST API architecture for a multi-tenant SaaS application with user authentication, data isolation, and real-time features.',
        description: 'Test architectural thinking and design patterns'
    },
    {
        category: 'Debugging',
        prompt: 'This React component is not updating when props change. Identify the issue and provide a fix:\n\n```jsx\nfunction UserProfile({ userId }) {\n    const [user, setUser] = useState(null);\n    \n    useEffect(() => {\n        fetchUser(userId).then(setUser);\n    }, []);\n    \n    return <div>{user?.name}</div>;\n}\n```',
        description: 'Test debugging and React knowledge'
    },
    {
        category: 'Documentation',
        prompt: 'Write comprehensive documentation for a VS Code extension that provides AI-powered code suggestions. Include installation, configuration, and usage examples.',
        description: 'Test documentation writing skills'
    },
    {
        category: 'Performance',
        prompt: 'Optimize this database query for better performance:\n\n```sql\nSELECT u.*, p.title, p.content, c.comment_text\nFROM users u\nJOIN posts p ON u.id = p.user_id\nJOIN comments c ON p.id = c.post_id\nWHERE u.created_at > \'2023-01-01\'\nORDER BY u.created_at DESC;\n```',
        description: 'Test database optimization knowledge'
    }
];
/**
 * Quick start wizard for AI model testing
 */
class AITestingQuickStart {
    constructor(testingService) {
        this.testingService = testingService;
    }
    async showQuickStartWizard() {
        const action = await vscode.window.showQuickPick([
            {
                label: '🚀 Run Sample Comparison',
                description: 'Try a pre-made test to see how it works',
                detail: 'Best for first-time users'
            },
            {
                label: '💡 Custom Prompt Test',
                description: 'Enter your own prompt to test',
                detail: 'Test with your specific use case'
            },
            {
                label: '📝 Selected Code Test',
                description: 'Test with currently selected code',
                detail: 'Requires code selection in editor'
            },
            {
                label: '📚 View Testing Guide',
                description: 'Learn about AI model testing features',
                detail: 'Read the comprehensive guide'
            }
        ], {
            placeHolder: 'Choose how you want to start testing AI models',
            ignoreFocusOut: true
        });
        if (!action)
            return;
        switch (action.label) {
            case '🚀 Run Sample Comparison':
                await this.runSampleTest();
                break;
            case '💡 Custom Prompt Test':
                await this.runCustomTest();
                break;
            case '📝 Selected Code Test':
                await this.runSelectedCodeTest();
                break;
            case '📚 View Testing Guide':
                await this.showTestingGuide();
                break;
        }
    }
    async runSampleTest() {
        const selectedSample = await vscode.window.showQuickPick(exports.SAMPLE_TEST_PROMPTS.map(sample => ({
            label: `${sample.category}`,
            description: sample.description,
            detail: sample.prompt.substring(0, 100) + '...',
            sample
        })), {
            placeHolder: 'Choose a sample test to run',
            ignoreFocusOut: true
        });
        if (selectedSample) {
            await this.testingService.runComparativeTest(selectedSample.sample.prompt, {
                includeContext: true,
                category: selectedSample.sample.category.toLowerCase(),
                saveResults: true
            });
        }
    }
    async runCustomTest() {
        const prompt = await vscode.window.showInputBox({
            prompt: 'Enter your prompt to test with both Claude and Copilot',
            placeHolder: 'e.g., "Explain the differences between REST and GraphQL APIs"',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length < 10) {
                    return 'Please enter a prompt with at least 10 characters';
                }
                return null;
            }
        });
        if (prompt) {
            await this.testingService.runComparativeTest(prompt, {
                includeContext: true,
                saveResults: true
            });
        }
    }
    async runSelectedCodeTest() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Please open a file and select some code first');
            return;
        }
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        if (!selectedText.trim()) {
            vscode.window.showWarningMessage('Please select some code first');
            return;
        }
        const testType = await vscode.window.showQuickPick([
            'Explain this code',
            'Review for bugs and improvements',
            'Suggest refactoring',
            'Generate documentation',
            'Optimize for performance',
            'Add error handling',
            'Convert to different language/framework'
        ], {
            placeHolder: 'What should the AIs do with your selected code?'
        });
        if (testType) {
            const prompt = `${testType}:\n\n\`\`\`${editor.document.languageId}\n${selectedText}\n\`\`\``;
            await this.testingService.runComparativeTest(prompt, {
                includeContext: true,
                category: 'coding',
                saveResults: true
            });
        }
    }
    async showTestingGuide() {
        // Open the testing guide
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const guideUri = vscode.Uri.joinPath(workspaceFolders[0].uri, 'vscode-extension/claude-portfolio/src/docs/AI_TESTING_GUIDE.md');
            try {
                await vscode.commands.executeCommand('markdown.showPreview', guideUri);
            }
            catch {
                // Fallback: open as text file
                const doc = await vscode.workspace.openTextDocument(guideUri);
                await vscode.window.showTextDocument(doc);
            }
        }
    }
    /**
     * Show tips for effective AI testing
     */
    async showTestingTips() {
        const tips = `
# 🧪 AI Testing Pro Tips

## Getting Better Results

### 1. Prompt Design
- Be specific about what you want
- Include relevant context
- Ask for explanations, not just answers
- Test edge cases and corner scenarios

### 2. Comparison Strategy
- Use identical prompts for fair comparison
- Test multiple variations of the same question
- Include both simple and complex scenarios
- Document patterns you discover

### 3. Evaluation Criteria
- **Speed**: Which AI responds faster?
- **Accuracy**: Which gives more correct information?
- **Depth**: Which provides more thorough explanations?
- **Practicality**: Which gives more actionable advice?
- **Context**: Which better understands your specific situation?

### 4. Use Cases by Category

**Claude Max tends to excel at:**
- Long-form explanations
- Creative writing and brainstorming
- Complex reasoning tasks
- Detailed analysis

**GitHub Copilot Pro tends to excel at:**
- Code completion and generation
- Quick code fixes
- Programming-specific tasks
- Integration with VS Code workflow

### 5. Testing Workflow
1. Start with sample tests to learn the system
2. Create your own test scenarios based on your work
3. Build a library of useful prompts
4. Track which AI works best for which tasks
5. Develop your personal AI usage strategy

Ready to start testing? Use Ctrl+Alt+T to begin!
        `;
        const doc = await vscode.workspace.openTextDocument({
            content: tips,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
    }
}
exports.AITestingQuickStart = AITestingQuickStart;
//# sourceMappingURL=AITestingQuickStart.js.map