/**
 * Claude Security Integration Example
 * 
 * This file demonstrates how to integrate Claude-specific security validation
 * with the enhanced SecurityService for AI-originated terminal commands.
 */

import SecurityService, { 
    ClaudeSecurityUtils, 
    ClaudeCommandContext, 
    ClaudeSecurityConfig,
    SecurityValidationResult 
} from './SecurityService';

/**
 * Example: Setting up Claude Security Service
 */
export class ClaudeSecurityExample {
    private securityService: SecurityService;
    private claudeSessionId: string;

    constructor(workspaceRoot: string) {
        // Create Claude-specific security configuration
        const config: ClaudeSecurityConfig = ClaudeSecurityUtils.createClaudeSecurityConfig(workspaceRoot);
        
        // Customize configuration for specific needs
        config.claudeRateLimiting = {
            commandsPerMinute: 15,  // Allow slightly higher rate for development
            commandsPerHour: 150,
            maxConcurrentSessions: 3
        };
        config.claudeAuditLevel = 'full';
        
        this.securityService = new SecurityService(config);
        this.claudeSessionId = ClaudeSecurityUtils.generateClaudeSessionId();
        
        console.log(`🤖 Claude Security Integration initialized with session: ${this.claudeSessionId}`);
    }

    /**
     * Example: Validating AI-generated commands from Claude
     */
    async validateAIGeneratedCommand(command: string, workbranchId: string): Promise<boolean> {
        console.log(`\n🔍 Validating AI-generated command: ${command}`);

        // Create Claude context for AI-generated command
        const claudeContext: ClaudeCommandContext = SecurityService.createClaudeContext(
            this.claudeSessionId,
            'ai_generated',
            'vs_code_extension',
            {
                model: 'claude-3-sonnet',
                confidence: 0.85,
                tokenCount: 120,
                contextLength: 3500,
                promptHash: ClaudeSecurityUtils.hashPrompt('Build and deploy the project'),
                conversationId: 'conv-123'
            },
            '1.0.0'
        );

        // Validate with Claude-specific security
        const result: SecurityValidationResult = this.securityService.validateClaudeCommand(
            command,
            workbranchId,
            claudeContext
        );

        if (!result.valid) {
            console.error(`❌ Command blocked: ${result.reason}`);
            if (result.suggestion) {
                console.log(`💡 Suggestion: ${result.suggestion}`);
            }
            return false;
        }

        console.log(`✅ Command validated successfully`);
        return true;
    }

    /**
     * Example: Validating user-originated commands through Claude
     */
    async validateUserCommand(command: string, workbranchId: string): Promise<boolean> {
        console.log(`\n👤 Validating user-originated command: ${command}`);

        const claudeContext: ClaudeCommandContext = SecurityService.createClaudeContext(
            this.claudeSessionId,
            'user_originated',
            'claude_desktop',
            {
                model: 'claude-3-sonnet',
                conversationId: 'conv-123'
            }
        );

        const result = this.securityService.validateClaudeCommand(
            command,
            workbranchId,
            claudeContext
        );

        return result.valid;
    }

    /**
     * Example: Detect potentially dangerous AI patterns
     */
    analyzeCommandForAIRisks(command: string): void {
        console.log(`\n🧠 Analyzing command for AI-generation patterns: ${command}`);

        const analysis = ClaudeSecurityUtils.detectPotentialAIGeneration(command);
        
        console.log(`AI Generation Likelihood: ${analysis.isLikelyAI ? 'HIGH' : 'LOW'}`);
        console.log(`Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
        
        if (analysis.indicators.length > 0) {
            console.log(`Risk Indicators: ${analysis.indicators.join(', ')}`);
        }
    }

    /**
     * Example: Monitor Claude session activity
     */
    monitorClaudeSession(): void {
        console.log(`\n📊 Claude Session Monitoring:`);
        
        const sessionDetails = this.securityService.getClaudeSessionDetails(this.claudeSessionId);
        if (sessionDetails) {
            console.log(`Session Active: ${sessionDetails.active}`);
            console.log(`Total Commands: ${sessionDetails.commands}`);
            console.log(`Session Duration: ${Math.round(sessionDetails.duration / 1000)}s`);
            console.log(`Rate Limit Status: ${sessionDetails.rateLimitStatus.perMinute}/min, ${sessionDetails.rateLimitStatus.perHour}/hour`);
        }

        const overallStats = this.securityService.getSecurityStats();
        console.log(`\n📈 Claude Security Statistics:`);
        console.log(`Total Claude Events: ${overallStats.claudeSpecific.claudeEvents}`);
        console.log(`Claude Event Types:`, overallStats.claudeSpecific.claudeEventsByType);
        console.log(`Claude Command Types:`, overallStats.claudeSpecific.claudeCommandTypes);
    }

    /**
     * Example: Test various command scenarios
     */
    async runSecurityTests(): Promise<void> {
        console.log(`\n🧪 Running Claude Security Integration Tests\n`);

        const workbranchId = 'test-branch';
        
        // Test 1: Safe AI-generated command
        await this.validateAIGeneratedCommand('npm run build', workbranchId);
        
        // Test 2: Potentially dangerous AI command
        await this.validateAIGeneratedCommand('rm -rf node_modules && npm install && git add . && git commit -m "fix"', workbranchId);
        
        // Test 3: AI hallucination detection
        await this.validateAIGeneratedCommand('claude-install --auto-setup --magic-deploy', workbranchId);
        
        // Test 4: OS context confusion
        await this.validateAIGeneratedCommand('sudo apt-get install nodejs', workbranchId);
        
        // Test 5: Complex command chain
        await this.validateAIGeneratedCommand('cd project && npm install && npm run build && npm test && git add . && git commit && git push', workbranchId);
        
        // Test 6: User command through Claude
        await this.validateUserCommand('git status', workbranchId);
        
        // Analyze patterns
        this.analyzeCommandForAIRisks('for file in *.js; do rm "$file"; done');
        this.analyzeCommandForAIRisks('npm run dev');
        
        // Monitor session
        this.monitorClaudeSession();
    }

    /**
     * Example: Cleanup and maintenance
     */
    performMaintenance(): void {
        console.log(`\n🧹 Performing Claude security maintenance:`);
        
        // Clean up inactive sessions
        this.securityService.cleanupInactiveClaudeSessions();
        
        // Get final statistics
        const claudeStats = this.securityService.getClaudeSessionStats();
        console.log(`Active Claude sessions: ${claudeStats.activeSessions}`);
        console.log(`Total Claude commands processed: ${claudeStats.totalCommands}`);
        console.log(`Average commands per session: ${claudeStats.averageCommandsPerSession.toFixed(1)}`);
    }
}

/**
 * Example usage and integration patterns
 */
export class ClaudeIntegrationPatterns {
    
    /**
     * Pattern 1: VS Code Extension Integration
     */
    static integrateWithVSCodeExtension(workspaceRoot: string) {
        const example = new ClaudeSecurityExample(workspaceRoot);
        
        // In your VS Code extension's terminal command handler:
        /*
        const claudeContext = SecurityService.createClaudeContext(
            'vs-code-session-' + Date.now(),
            'ai_generated',
            'vs_code_extension',
            { model: 'claude-3-sonnet' }
        );
        
        const isValid = securityService.validateClaudeCommand(
            userCommand,
            currentWorkbranch,
            claudeContext
        );
        
        if (isValid.valid) {
            terminal.sendText(userCommand);
        } else {
            vscode.window.showErrorMessage(`Command blocked: ${isValid.reason}`);
        }
        */
    }
    
    /**
     * Pattern 2: Web Application Integration
     */
    static integrateWithWebApp(workspaceRoot: string) {
        const example = new ClaudeSecurityExample(workspaceRoot);
        
        // In your web application's command execution handler:
        /*
        const claudeContext = SecurityService.createClaudeContext(
            sessionStorage.getItem('claudeSessionId'),
            'user_originated',
            'claude_web',
            { conversationId: getCurrentConversationId() }
        );
        
        const validation = securityService.validateClaudeCommand(
            command,
            currentWorkspace,
            claudeContext
        );
        
        if (!validation.valid) {
            showSecurityWarning(validation.reason, validation.suggestion);
            return;
        }
        
        executeCommand(command);
        */
    }
    
    /**
     * Pattern 3: Rate Limiting and Session Management
     */
    static implementRateLimiting() {
        // Set up periodic cleanup
        /*
        setInterval(() => {
            securityService.cleanupInactiveClaudeSessions();
        }, 15 * 60 * 1000); // Every 15 minutes
        
        // Monitor for abuse
        setInterval(() => {
            const stats = securityService.getSecurityStats();
            if (stats.claudeSpecific.claudeEvents > 1000) {
                console.warn('High Claude activity detected - review security logs');
            }
        }, 60 * 1000); // Every minute
        */
    }
}

/**
 * Quick demo function
 */
export async function runClaudeSecurityDemo(workspaceRoot: string = process.cwd()): Promise<void> {
    console.log('🚀 Starting Claude Security Integration Demo\n');
    
    const example = new ClaudeSecurityExample(workspaceRoot);
    await example.runSecurityTests();
    example.performMaintenance();
    
    console.log('\n✅ Claude Security Integration Demo completed!');
}

// Uncomment to run demo:
// runClaudeSecurityDemo();