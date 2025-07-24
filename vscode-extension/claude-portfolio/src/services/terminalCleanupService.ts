import * as vscode from 'vscode';
import * as path from 'path';
import { VSCodeSecurityService } from '../securityService';

/**
 * Terminal Cleanup Service - Manages automatic terminal cleanup after operations
 */
export class TerminalCleanupService {
    private static instance: TerminalCleanupService;
    private cleanupQueue: Set<string> = new Set();
    private cleanupTimer: NodeJS.Timeout | null = null;

    public static getInstance(): TerminalCleanupService {
        if (!TerminalCleanupService.instance) {
            TerminalCleanupService.instance = new TerminalCleanupService();
        }
        return TerminalCleanupService.instance;
    }

    /**
     * Schedule terminal cleanup after a delay
     * @param delaySeconds Seconds to wait before cleanup
     * @param onlyExternal Only close external terminals, preserve VS Code integrated
     */
    public scheduleCleanup(delaySeconds: number = 10, onlyExternal: boolean = true): void {
        console.log(`🧹 Scheduling terminal cleanup in ${delaySeconds} seconds (external only: ${onlyExternal})`);
        
        // Clear any existing timer
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
        }

        this.cleanupTimer = setTimeout(() => {
            this.performCleanup(onlyExternal);
        }, delaySeconds * 1000);
    }

    /**
     * Perform immediate terminal cleanup
     * @param onlyExternal Only close external terminals
     */
    public async performCleanup(onlyExternal: boolean = true): Promise<void> {
        try {
            const portfolioPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!portfolioPath) {
                console.warn('❌ Cannot perform cleanup: No workspace folder found');
                return;
            }

            // Validate workspace trust
            if (!await VSCodeSecurityService.requireWorkspaceTrust('Terminal cleanup')) {
                return;
            }

            const scriptPath = path.join(portfolioPath, 'scripts', 'enhanced-cleanup.ps1');
            const args = onlyExternal ? ['-OnlyExternal', '-DelaySeconds 0'] : ['-DelaySeconds 0'];
            
            const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" ${args.join(' ')}`;

            // Validate the command
            if (!VSCodeSecurityService.validateCommand(command)) {
                console.warn('❌ Terminal cleanup command blocked by security service');
                return;
            }

            // Execute cleanup in a hidden terminal
            const terminal = vscode.window.createTerminal({
                name: 'Terminal Cleanup',
                hideFromUser: true
            });

            terminal.sendText(command);
            
            // Close the cleanup terminal after a short delay
            setTimeout(() => {
                terminal.dispose();
            }, 3000);

            console.log('✅ Terminal cleanup initiated');
            
        } catch (error) {
            console.error('❌ Failed to perform terminal cleanup:', error);
            vscode.window.showErrorMessage(`Terminal cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Add command execution with auto-cleanup
     * @param terminal VS Code terminal to execute command in
     * @param command Command to execute
     * @param autoCleanup Whether to schedule cleanup after execution
     * @param cleanupDelay Seconds to wait before cleanup
     */
    public async executeWithCleanup(
        terminal: vscode.Terminal, 
        command: string, 
        autoCleanup: boolean = true,
        cleanupDelay: number = 10
    ): Promise<void> {
        try {
            // Validate command first
            if (!VSCodeSecurityService.validateCommand(command)) {
                throw new Error('Command blocked by security validation');
            }

            // Execute the command
            terminal.sendText(command);
            
            // Schedule cleanup if requested
            if (autoCleanup) {
                this.scheduleCleanup(cleanupDelay, true);
            }

            console.log(`🚀 Executed command with cleanup scheduled: ${command}`);
            
        } catch (error) {
            console.error('❌ Failed to execute command with cleanup:', error);
            throw error;
        }
    }

    /**
     * Clean specific project terminals by name pattern
     * @param projectName Name pattern to match terminals
     */
    public async cleanupProjectTerminals(projectName?: string): Promise<void> {
        if (!projectName) {
            return this.performCleanup(true);
        }

        try {
            // Find and close terminals matching the project name
            const terminals = vscode.window.terminals.filter(terminal => 
                terminal.name.toLowerCase().includes(projectName.toLowerCase())
            );

            if (terminals.length > 0) {
                console.log(`🧹 Closing ${terminals.length} terminals for project: ${projectName}`);
                terminals.forEach(terminal => {
                    terminal.dispose();
                });
            }

            // Also run general external cleanup
            this.performCleanup(true);
            
        } catch (error) {
            console.error('❌ Failed to cleanup project terminals:', error);
        }
    }

    /**
     * Cancel scheduled cleanup
     */
    public cancelScheduledCleanup(): void {
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
            console.log('🔄 Cancelled scheduled terminal cleanup');
        }
    }

    /**
     * Get cleanup status
     */
    public getCleanupStatus(): { scheduled: boolean; queueSize: number } {
        return {
            scheduled: this.cleanupTimer !== null,
            queueSize: this.cleanupQueue.size
        };
    }
}