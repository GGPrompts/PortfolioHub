/**
 * Terminal Commands - VS Code commands for terminal management
 * 
 * This class provides VS Code command palette integration for the terminal service,
 * allowing users to create, manage, and interact with terminals through VS Code.
 */

import * as vscode from 'vscode';
import { TerminalService } from '../services/terminalService';
import { TerminalSecurityService } from '../services/terminalSecurityService';

export class TerminalCommands {
    private terminalService: TerminalService;

    constructor(terminalService: TerminalService) {
        this.terminalService = terminalService;
    }

    /**
     * Register all terminal-related commands
     */
    registerCommands(context: vscode.ExtensionContext): void {
        // Terminal session management
        const createTerminalCommand = vscode.commands.registerCommand(
            'claudePortfolio.terminal.create',
            () => this.createTerminalSession()
        );

        const listTerminalsCommand = vscode.commands.registerCommand(
            'claudePortfolio.terminal.list',
            () => this.listTerminalSessions()
        );

        const destroyTerminalCommand = vscode.commands.registerCommand(
            'claudePortfolio.terminal.destroy',
            () => this.destroyTerminalSession()
        );

        // Terminal service status
        const terminalStatusCommand = vscode.commands.registerCommand(
            'claudePortfolio.terminal.status',
            () => this.showTerminalStatus()
        );

        // Workbranch management
        const createWorkbranchCommand = vscode.commands.registerCommand(
            'claudePortfolio.workbranch.create',
            () => this.createWorkbranch()
        );

        const switchWorkbranchCommand = vscode.commands.registerCommand(
            'claudePortfolio.workbranch.switch',
            () => this.switchWorkbranch()
        );

        // Terminal security
        const validateCommandCommand = vscode.commands.registerCommand(
            'claudePortfolio.terminal.validateCommand',
            () => this.validateCommand()
        );

        // Advanced terminal operations
        const attachToSessionCommand = vscode.commands.registerCommand(
            'claudePortfolio.terminal.attach',
            () => this.attachToSession()
        );

        // Register all commands
        context.subscriptions.push(
            createTerminalCommand,
            listTerminalsCommand,
            destroyTerminalCommand,
            terminalStatusCommand,
            createWorkbranchCommand,
            switchWorkbranchCommand,
            validateCommandCommand,
            attachToSessionCommand
        );

        console.log('✅ Terminal commands registered');
    }

    /**
     * Create a new terminal session
     */
    private async createTerminalSession(): Promise<void> {
        try {
            // Get workbranch ID from user
            const workbranchId = await vscode.window.showInputBox({
                prompt: 'Enter workbranch ID (e.g., main, feature-xyz, task-123)',
                placeHolder: 'main',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Workbranch ID is required';
                    }
                    if (!TerminalSecurityService.checkWorkbranchPermissions(value.trim())) {
                        return 'Invalid workbranch ID format';
                    }
                    return null;
                }
            });

            if (!workbranchId) {
                return;
            }

            // Select shell type
            const shell = await vscode.window.showQuickPick(
                [
                    { label: 'PowerShell', value: 'powershell', description: 'Windows PowerShell' },
                    { label: 'Command Prompt', value: 'cmd', description: 'Windows Command Prompt' },
                    { label: 'Bash', value: 'bash', description: 'Bash shell (if available)' }
                ],
                {
                    title: 'Select Shell Type',
                    placeHolder: 'Choose the shell for your terminal session'
                }
            );

            if (!shell) {
                return;
            }

            // Optional: Get title for the terminal
            const title = await vscode.window.showInputBox({
                prompt: 'Enter terminal title (optional)',
                placeHolder: `Terminal - ${workbranchId}`,
                value: `Terminal - ${workbranchId}`
            });

            // Create the terminal session
            const response = await this.terminalService.createSession(
                workbranchId.trim(),
                shell.value as 'powershell' | 'bash' | 'cmd',
                undefined,
                title || `Terminal - ${workbranchId}`,
                undefined
            );

            if (response.success && response.data) {
                vscode.window.showInformationMessage(
                    `✅ Terminal session created: ${response.data.sessionId}`,
                    'Show Status',
                    'Connect to React App'
                ).then(choice => {
                    if (choice === 'Show Status') {
                        this.showTerminalStatus();
                    } else if (choice === 'Connect to React App') {
                        vscode.window.showInformationMessage(
                            '💡 Terminal is available at ws://localhost:8002. Connect from your React app using the session ID: ' + response.data.sessionId
                        );
                    }
                });
            } else {
                vscode.window.showErrorMessage(`❌ Failed to create terminal session: ${response.message || 'Unknown error'}`);
            }

        } catch (error) {
            console.error('Failed to create terminal session:', error);
            vscode.window.showErrorMessage(`❌ Error creating terminal session: ${error}`);
        }
    }

    /**
     * List all terminal sessions
     */
    private async listTerminalSessions(): Promise<void> {
        try {
            const status = this.terminalService.getStatus();

            if (status.sessions === 0) {
                vscode.window.showInformationMessage('📋 No terminal sessions are currently active');
                return;
            }

            // Create quick pick items for each session
            const sessionItems = status.activeSessions.map(session => ({
                label: `$(terminal) ${session.title}`,
                description: `${session.shell} | ${session.workbranchId}`,
                detail: `Created: ${session.createdAt.toLocaleString()} | Last activity: ${session.lastActivity.toLocaleString()}`,
                session: session
            }));

            const selectedSession = await vscode.window.showQuickPick(sessionItems, {
                title: `Terminal Sessions (${status.sessions} active)`,
                placeHolder: 'Select a terminal session to manage',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selectedSession) {
                // Show session management options
                const action = await vscode.window.showQuickPick([
                    { label: '$(info) Show Details', value: 'details' },
                    { label: '$(copy) Copy Session ID', value: 'copy' },
                    { label: '$(link-external) Connect Info', value: 'connect' },
                    { label: '$(trash) Destroy Session', value: 'destroy' }
                ], {
                    title: `Manage Terminal Session: ${selectedSession.session.title}`,
                    placeHolder: 'Choose an action'
                });

                if (action) {
                    await this.handleSessionAction(selectedSession.session, action.value);
                }
            }

        } catch (error) {
            console.error('Failed to list terminal sessions:', error);
            vscode.window.showErrorMessage(`❌ Error listing terminal sessions: ${error}`);
        }
    }

    /**
     * Handle session management actions
     */
    private async handleSessionAction(session: any, action: string): Promise<void> {
        switch (action) {
            case 'details':
                const details = [
                    `Session ID: ${session.id}`,
                    `Workbranch: ${session.workbranchId}`,
                    `Shell: ${session.shell}`,
                    `Title: ${session.title}`,
                    `Created: ${session.createdAt.toLocaleString()}`,
                    `Last Activity: ${session.lastActivity.toLocaleString()}`
                ].join('\n');

                vscode.window.showInformationMessage(details, { modal: true });
                break;

            case 'copy':
                await vscode.env.clipboard.writeText(session.id);
                vscode.window.showInformationMessage(`📋 Session ID copied to clipboard: ${session.id}`);
                break;

            case 'connect':
                const connectInfo = `Connect to terminal from React app:\n\nWebSocket: ws://localhost:8002\nSession ID: ${session.id}\nWorkbranch: ${session.workbranchId}`;
                vscode.window.showInformationMessage(connectInfo, { modal: true });
                break;

            case 'destroy':
                const confirm = await vscode.window.showWarningMessage(
                    `⚠️ Are you sure you want to destroy terminal session "${session.title}"?`,
                    { modal: true },
                    'Yes, Destroy',
                    'Cancel'
                );

                if (confirm === 'Yes, Destroy') {
                    const response = await this.terminalService.destroySession(session.id);
                    if (response.success) {
                        vscode.window.showInformationMessage(`✅ Terminal session destroyed: ${session.title}`);
                    } else {
                        vscode.window.showErrorMessage(`❌ Failed to destroy terminal session: ${response.message}`);
                    }
                }
                break;
        }
    }

    /**
     * Destroy a terminal session
     */
    private async destroyTerminalSession(): Promise<void> {
        try {
            const status = this.terminalService.getStatus();

            if (status.sessions === 0) {
                vscode.window.showInformationMessage('📋 No terminal sessions to destroy');
                return;
            }

            // Create quick pick items for sessions to destroy
            const sessionItems = status.activeSessions.map(session => ({
                label: `$(trash) ${session.title}`,
                description: `${session.shell} | ${session.workbranchId}`,
                detail: `Session ID: ${session.id}`,
                sessionId: session.id,
                title: session.title
            }));

            const selectedSession = await vscode.window.showQuickPick(sessionItems, {
                title: 'Destroy Terminal Session',
                placeHolder: 'Select a terminal session to destroy',
                matchOnDescription: true
            });

            if (selectedSession) {
                const confirm = await vscode.window.showWarningMessage(
                    `⚠️ Are you sure you want to destroy "${selectedSession.title}"?`,
                    { modal: true },
                    'Yes, Destroy',
                    'Cancel'
                );

                if (confirm === 'Yes, Destroy') {
                    const response = await this.terminalService.destroySession(selectedSession.sessionId);
                    if (response.success) {
                        vscode.window.showInformationMessage(`✅ Terminal session destroyed: ${selectedSession.title}`);
                    } else {
                        vscode.window.showErrorMessage(`❌ Failed to destroy terminal session: ${response.message}`);
                    }
                }
            }

        } catch (error) {
            console.error('Failed to destroy terminal session:', error);
            vscode.window.showErrorMessage(`❌ Error destroying terminal session: ${error}`);
        }
    }

    /**
     * Show terminal service status
     */
    private async showTerminalStatus(): Promise<void> {
        try {
            const status = this.terminalService.getStatus();

            const statusMessage = [
                `🖥️ Terminal Service Status`,
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                `Running: ${status.running ? '✅ Yes' : '❌ No'}`,
                `Port: ${status.port}`,
                `Active Sessions: ${status.sessions}`,
                `Connected Clients: ${status.clients}`,
                ``,
                `📋 Active Sessions:`,
                ...status.activeSessions.map(session => 
                    `  • ${session.title} (${session.workbranchId}) - ${session.shell}`
                )
            ].join('\n');

            const choice = await vscode.window.showInformationMessage(
                statusMessage,
                { modal: true },
                'Refresh',
                'Create Session',
                'List Sessions'
            );

            if (choice === 'Refresh') {
                await this.showTerminalStatus();
            } else if (choice === 'Create Session') {
                await this.createTerminalSession();
            } else if (choice === 'List Sessions') {
                await this.listTerminalSessions();
            }

        } catch (error) {
            console.error('Failed to get terminal status:', error);
            vscode.window.showErrorMessage(`❌ Error getting terminal status: ${error}`);
        }
    }

    /**
     * Create a new workbranch
     */
    private async createWorkbranch(): Promise<void> {
        try {
            const workbranchId = await vscode.window.showInputBox({
                prompt: 'Enter new workbranch ID (e.g., feature-new-ui, task-123, bugfix-auth)',
                placeHolder: 'my-workbranch',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Workbranch ID is required';
                    }
                    if (!TerminalSecurityService.checkWorkbranchPermissions(value.trim())) {
                        return 'Invalid workbranch ID format (use alphanumeric, hyphens, underscores only)';
                    }
                    return null;
                }
            });

            if (!workbranchId) {
                return;
            }

            // Check if workbranch already has sessions
            const status = this.terminalService.getStatus();
            const existingSessions = status.activeSessions.filter(session => 
                session.workbranchId === workbranchId.trim()
            );

            if (existingSessions.length > 0) {
                const choice = await vscode.window.showWarningMessage(
                    `⚠️ Workbranch "${workbranchId}" already has ${existingSessions.length} active session(s). Continue?`,
                    'Yes, Create Another',
                    'Switch to Existing',
                    'Cancel'
                );

                if (choice === 'Switch to Existing') {
                    await this.switchWorkbranch();
                    return;
                } else if (choice !== 'Yes, Create Another') {
                    return;
                }
            }

            // Create terminal session for the new workbranch
            const response = await this.terminalService.createSession(
                workbranchId.trim(),
                'powershell',
                undefined,
                `Terminal - ${workbranchId}`,
                undefined
            );

            if (response.success && response.data) {
                vscode.window.showInformationMessage(
                    `✅ Workbranch "${workbranchId}" created with terminal session: ${response.data.sessionId}`,
                    'Show Status',
                    'Open Connection Info'
                ).then(choice => {
                    if (choice === 'Show Status') {
                        this.showTerminalStatus();
                    } else if (choice === 'Open Connection Info') {
                        vscode.window.showInformationMessage(
                            `💡 Terminal available at ws://localhost:8002\nSession ID: ${response.data.sessionId}\nWorkbranch: ${workbranchId}`
                        );
                    }
                });
            } else {
                vscode.window.showErrorMessage(`❌ Failed to create workbranch: ${response.message || 'Unknown error'}`);
            }

        } catch (error) {
            console.error('Failed to create workbranch:', error);
            vscode.window.showErrorMessage(`❌ Error creating workbranch: ${error}`);
        }
    }

    /**
     * Switch to existing workbranch
     */
    private async switchWorkbranch(): Promise<void> {
        try {
            const status = this.terminalService.getStatus();

            if (status.sessions === 0) {
                vscode.window.showInformationMessage('📋 No workbranches available (no active sessions)');
                return;
            }

            // Get unique workbranch IDs
            const workbranches = [...new Set(status.activeSessions.map(session => session.workbranchId))];
            
            if (workbranches.length === 0) {
                vscode.window.showInformationMessage('📋 No workbranches available');
                return;
            }

            // Create workbranch items with session counts
            const workbranchItems = workbranches.map(workbranchId => {
                const sessions = status.activeSessions.filter(session => session.workbranchId === workbranchId);
                return {
                    label: `$(git-branch) ${workbranchId}`,
                    description: `${sessions.length} session(s)`,
                    detail: sessions.map(s => `${s.title} (${s.shell})`).join(', '),
                    workbranchId: workbranchId
                };
            });

            const selectedWorkbranch = await vscode.window.showQuickPick(workbranchItems, {
                title: 'Switch to Workbranch',
                placeHolder: 'Select a workbranch to switch to',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selectedWorkbranch) {
                // Show workbranch sessions
                const workbranchSessions = status.activeSessions.filter(
                    session => session.workbranchId === selectedWorkbranch.workbranchId
                );

                const sessionItems = workbranchSessions.map(session => ({
                    label: `$(terminal) ${session.title}`,
                    description: session.shell,
                    detail: `Session ID: ${session.id} | Created: ${session.createdAt.toLocaleDateString()}`,
                    sessionId: session.id
                }));

                const selectedSession = await vscode.window.showQuickPick(sessionItems, {
                    title: `Workbranch: ${selectedWorkbranch.workbranchId}`,
                    placeHolder: 'Select a terminal session to connect to',
                });

                if (selectedSession) {
                    vscode.window.showInformationMessage(
                        `🔗 Connect to terminal session:\n\nWebSocket: ws://localhost:8002\nSession ID: ${selectedSession.sessionId}\nWorkbranch: ${selectedWorkbranch.workbranchId}`,
                        'Copy Session ID'
                    ).then(choice => {
                        if (choice === 'Copy Session ID') {
                            vscode.env.clipboard.writeText(selectedSession.sessionId);
                        }
                    });
                }
            }

        } catch (error) {
            console.error('Failed to switch workbranch:', error);
            vscode.window.showErrorMessage(`❌ Error switching workbranch: ${error}`);
        }
    }

    /**
     * Validate a command for security
     */
    private async validateCommand(): Promise<void> {
        try {
            const command = await vscode.window.showInputBox({
                prompt: 'Enter command to validate',
                placeHolder: 'npm start'
            });

            if (!command) {
                return;
            }

            // Get workbranch context (optional)
            const workbranchId = await vscode.window.showInputBox({
                prompt: 'Enter workbranch ID for context (optional)',
                placeHolder: 'main',
                value: 'main'
            });

            const context = {
                workbranchId: workbranchId || 'main',
                workingDirectory: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(),
                shell: 'powershell' as const,
                sessionId: 'validation-context'
            };

            // Generate security report
            const report = TerminalSecurityService.generateSecurityReport(command, context);

            const reportText = [
                `🔒 Command Security Validation`,
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                `Command: ${report.command}`,
                `Valid: ${report.validation.valid ? '✅ Yes' : '❌ No'}`,
                `Risk Level: ${this.getRiskLevelEmoji(report.validation.riskLevel)} ${report.validation.riskLevel.toUpperCase()}`,
                ``,
                `${report.securityNote}`,
                ``,
                `📋 Recommendations:`,
                ...report.recommendations.map(rec => `  • ${rec}`)
            ].join('\n');

            if (report.validation.valid && report.validation.sanitizedCommand) {
                vscode.window.showInformationMessage(
                    reportText,
                    { modal: true },
                    'Copy Sanitized Command'
                ).then(choice => {
                    if (choice === 'Copy Sanitized Command') {
                        vscode.env.clipboard.writeText(report.validation.sanitizedCommand!);
                    }
                });
            } else {
                vscode.window.showWarningMessage(reportText, { modal: true });
            }

        } catch (error) {
            console.error('Failed to validate command:', error);
            vscode.window.showErrorMessage(`❌ Error validating command: ${error}`);
        }
    }

    /**
     * Attach to existing terminal session
     */
    private async attachToSession(): Promise<void> {
        try {
            const sessionId = await vscode.window.showInputBox({
                prompt: 'Enter terminal session ID to attach to',
                placeHolder: 'main_1234567890_1',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Session ID is required';
                    }
                    return null;
                }
            });

            if (!sessionId) {
                return;
            }

            // Check if session exists
            const session = this.terminalService.getSession(sessionId.trim());
            
            if (!session) {
                vscode.window.showErrorMessage(`❌ Terminal session not found: ${sessionId}`);
                return;
            }

            // Show connection information
            const connectionInfo = [
                `🔗 Terminal Session Connection Info`,
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
                `Session ID: ${session.id}`,
                `Workbranch: ${session.workbranchId}`,
                `Shell: ${session.shell}`,
                `Title: ${session.title}`,
                `Working Directory: ${session.workingDirectory}`,
                ``,
                `🌐 WebSocket Connection:`,
                `ws://localhost:8002`,
                ``,
                `📱 Connect from React App:`,
                `Use the session ID to attach xterm.js terminal`
            ].join('\n');

            vscode.window.showInformationMessage(
                connectionInfo,
                { modal: true },
                'Copy Session ID',
                'Copy WebSocket URL'
            ).then(choice => {
                if (choice === 'Copy Session ID') {
                    vscode.env.clipboard.writeText(session.id);
                } else if (choice === 'Copy WebSocket URL') {
                    vscode.env.clipboard.writeText('ws://localhost:8002');
                }
            });

        } catch (error) {
            console.error('Failed to attach to session:', error);
            vscode.window.showErrorMessage(`❌ Error attaching to session: ${error}`);
        }
    }

    /**
     * Get emoji for risk level
     */
    private getRiskLevelEmoji(riskLevel: string): string {
        switch (riskLevel) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '❓';
        }
    }
}