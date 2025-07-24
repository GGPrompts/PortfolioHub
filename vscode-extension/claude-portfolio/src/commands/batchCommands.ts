import * as vscode from 'vscode';
import { ProjectService } from '../services/projectService';
import { ConfigurationService } from '../services/configurationService';
import { ProjectProvider } from '../projectProvider';
import { TerminalCleanupService } from '../services/terminalCleanupService';

/**
 * Multi-project batch operation commands
 */
export class BatchCommands {
    private cleanupService = TerminalCleanupService.getInstance();

    constructor(
        private projectService: ProjectService,
        private configService: ConfigurationService,
        private projectProvider: ProjectProvider
    ) {}

    /**
     * Register all batch commands
     */
    registerCommands(context: vscode.ExtensionContext): void {
        const commands = [
            vscode.commands.registerCommand('claude-portfolio.batchStartProjects', this.batchStartProjectsCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.batchStopProjects', this.batchStopProjectsCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.batchOpenBrowser', this.batchOpenBrowserCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.startAllProjects', this.startAllProjectsCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.killAllServers', this.killAllServersCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.cleanupTerminals', this.cleanupTerminalsCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.scheduleCleanup', this.scheduleCleanupCommand.bind(this))
        ];

        commands.forEach(command => context.subscriptions.push(command));
    }

    /**
     * Start selected projects in batch
     */
    private async batchStartProjectsCommand(): Promise<void> {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjectsData();
            
            if (selectedProjects.length === 0) {
                vscode.window.showInformationMessage('No projects selected. Select projects using checkboxes first.');
                return;
            }

            // Show confirmation if enabled
            if (this.configService.isBatchOperationConfirmationEnabled()) {
                const confirmation = await vscode.window.showInformationMessage(
                    `Start ${selectedProjects.length} selected project(s)?`,
                    { modal: true },
                    'Yes', 'No'
                );
                
                if (confirmation !== 'Yes') {
                    return;
                }
            }

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Starting ${selectedProjects.length} projects...`,
                cancellable: false
            }, async (progress) => {
                const results = await this.projectService.batchStartProjects(selectedProjects);
                
                // Report progress and results
                let successCount = 0;
                let failureCount = 0;
                
                results.forEach((result, index) => {
                    const project = selectedProjects[index];
                    const progressPercent = ((index + 1) / results.length) * 100;
                    
                    progress.report({
                        increment: 100 / results.length,
                        message: `${project.title}: ${result.success ? 'Started' : 'Failed'}`
                    });
                    
                    if (result.success) {
                        successCount++;
                        console.log(`✅ Started: ${project.title}`);
                    } else {
                        failureCount++;
                        console.error(`❌ Failed to start: ${project.title} - ${result.error || result.message}`);
                    }
                });

                // Show summary
                const summary = `Batch start complete: ${successCount} succeeded, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                } else {
                    vscode.window.showInformationMessage(summary);
                }
            });

            // Clear selections after batch operation
            this.projectProvider.clearSelection();
            
        } catch (error) {
            const message = `Error in batch start: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Batch start command error:', error);
        }
    }

    /**
     * Stop selected projects in batch
     */
    private async batchStopProjectsCommand(): Promise<void> {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjectsData();
            
            if (selectedProjects.length === 0) {
                vscode.window.showInformationMessage('No projects selected. Select projects using checkboxes first.');
                return;
            }

            // Show confirmation if enabled
            if (this.configService.isBatchOperationConfirmationEnabled()) {
                const confirmation = await vscode.window.showInformationMessage(
                    `Stop ${selectedProjects.length} selected project(s)?`,
                    { modal: true },
                    'Yes', 'No'
                );
                
                if (confirmation !== 'Yes') {
                    return;
                }
            }

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Stopping ${selectedProjects.length} projects...`,
                cancellable: false
            }, async (progress) => {
                const results = await this.projectService.batchStopProjects(selectedProjects);
                
                // Report progress and results
                let successCount = 0;
                let failureCount = 0;
                
                results.forEach((result, index) => {
                    const project = selectedProjects[index];
                    
                    progress.report({
                        increment: 100 / results.length,
                        message: `${project.title}: ${result.success ? 'Stopped' : 'Failed'}`
                    });
                    
                    if (result.success) {
                        successCount++;
                        console.log(`✅ Stopped: ${project.title}`);
                    } else {
                        failureCount++;
                        console.error(`❌ Failed to stop: ${project.title} - ${result.error || result.message}`);
                    }
                });

                // Show summary
                const summary = `Batch stop complete: ${successCount} succeeded, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                } else {
                    vscode.window.showInformationMessage(summary);
                }
            });

            // Clear selections after batch operation
            this.projectProvider.clearSelection();
            
        } catch (error) {
            const message = `Error in batch stop: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Batch stop command error:', error);
        }
    }

    /**
     * Open selected projects in browser (batch)
     */
    private async batchOpenBrowserCommand(): Promise<void> {
        try {
            const selectedProjects = this.projectProvider.getSelectedProjectsData();
            
            if (selectedProjects.length === 0) {
                vscode.window.showInformationMessage('No projects selected. Select projects using checkboxes first.');
                return;
            }

            // Show confirmation if enabled
            if (this.configService.isBatchOperationConfirmationEnabled()) {
                const confirmation = await vscode.window.showInformationMessage(
                    `Open ${selectedProjects.length} selected project(s) in browser?`,
                    { modal: true },
                    'Yes', 'No'
                );
                
                if (confirmation !== 'Yes') {
                    return;
                }
            }

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Opening ${selectedProjects.length} projects in browser...`,
                cancellable: false
            }, async (progress) => {
                const results = await this.projectService.batchOpenBrowser(selectedProjects);
                
                // Report progress and results
                let successCount = 0;
                let failureCount = 0;
                
                results.forEach((result, index) => {
                    const project = selectedProjects[index];
                    
                    progress.report({
                        increment: 100 / results.length,
                        message: `${project.title}: ${result.success ? 'Opened' : 'Failed'}`
                    });
                    
                    if (result.success) {
                        successCount++;
                        console.log(`✅ Opened in browser: ${project.title}`);
                    } else {
                        failureCount++;
                        console.error(`❌ Failed to open: ${project.title} - ${result.error || result.message}`);
                    }
                });

                // Show summary
                const summary = `Batch browser open complete: ${successCount} succeeded, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                } else {
                    vscode.window.showInformationMessage(summary);
                }
            });

            // Clear selections after batch operation
            this.projectProvider.clearSelection();
            
        } catch (error) {
            const message = `Error in batch browser open: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Batch browser open command error:', error);
        }
    }

    /**
     * Start all projects (not just selected ones)
     */
    private async startAllProjectsCommand(): Promise<void> {
        try {
            const allProjects = await this.projectProvider.getProjects();
            
            if (allProjects.length === 0) {
                vscode.window.showInformationMessage('No projects found');
                return;
            }

            // Show confirmation
            const confirmation = await vscode.window.showInformationMessage(
                `Start all ${allProjects.length} projects? This may consume significant system resources.`,
                { modal: true },
                'Yes', 'No'
            );
            
            if (confirmation !== 'Yes') {
                return;
            }

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Starting all ${allProjects.length} projects...`,
                cancellable: false
            }, async (progress) => {
                const results = await this.projectService.batchStartProjects(allProjects);
                
                // Report progress and results
                let successCount = 0;
                let failureCount = 0;
                
                results.forEach((result, index) => {
                    const project = allProjects[index];
                    
                    progress.report({
                        increment: 100 / results.length,
                        message: `${project.title}: ${result.success ? 'Started' : 'Failed'}`
                    });
                    
                    if (result.success) {
                        successCount++;
                    } else {
                        failureCount++;
                        console.error(`❌ Failed to start: ${project.title} - ${result.error || result.message}`);
                    }
                });

                // Show summary
                const summary = `Start all complete: ${successCount} succeeded, ${failureCount} failed`;
                if (failureCount > 0) {
                    vscode.window.showWarningMessage(summary);
                } else {
                    vscode.window.showInformationMessage(summary);
                }
            });
            
        } catch (error) {
            const message = `Error starting all projects: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Start all projects command error:', error);
        }
    }

    /**
     * Kill all development servers
     */
    private async killAllServersCommand(): Promise<void> {
        try {
            // Show confirmation
            const confirmation = await vscode.window.showWarningMessage(
                'Kill ALL development servers on ports 3000-3099, 5000-5999, 8000-8099, 9000-9999?',
                { modal: true },
                'Yes', 'No'
            );
            
            if (confirmation !== 'Yes') {
                return;
            }

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Killing all development servers...',
                cancellable: false
            }, async (progress) => {
                const portRanges = [
                    { start: 3000, end: 3099 },
                    { start: 5000, end: 5999 },
                    { start: 8000, end: 8099 },
                    { start: 9000, end: 9999 }
                ];

                let killedCount = 0;
                let totalPorts = 0;

                // Count total ports to scan for progress
                portRanges.forEach(range => {
                    totalPorts += (range.end - range.start + 1);
                });

                let processedPorts = 0;

                for (const range of portRanges) {
                    for (let port = range.start; port <= range.end; port++) {
                        try {
                            // Use netstat to find process using this port
                            const success = await this.killProcessOnPort(port);
                            if (success) {
                                killedCount++;
                                console.log(`🔪 Killed process on port ${port}`);
                            }
                        } catch (error) {
                            // Ignore individual port errors
                        }

                        processedPorts++;
                        const progressPercent = (processedPorts / totalPorts) * 100;
                        progress.report({
                            increment: 100 / totalPorts,
                            message: `Scanning port ${port}... (${killedCount} killed)`
                        });
                    }
                }

                const summary = `Killed ${killedCount} development server process(es)`;
                if (killedCount > 0) {
                    vscode.window.showInformationMessage(summary);
                } else {
                    vscode.window.showInformationMessage('No development servers found to kill');
                }
            });
            
        } catch (error) {
            const message = `Error killing servers: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Kill all servers command error:', error);
        }
    }

    /**
     * Helper method to kill process on specific port
     */
    private async killProcessOnPort(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            
            // Find process using netstat
            const netstat = spawn('netstat', ['-ano'], { shell: true });
            let output = '';

            netstat.stdout.on('data', (data: Buffer) => {
                output += data.toString();
            });

            netstat.on('close', async (code: number) => {
                if (code !== 0) {
                    resolve(false);
                    return;
                }

                // Parse netstat output for this port
                const lines = output.split('\n');
                for (const line of lines) {
                    const match = line.match(new RegExp(`^\\s*TCP\\s+.*:${port}\\s+.*LISTENING\\s+(\\d+)`));
                    if (match) {
                        const pid = parseInt(match[1]);
                        try {
                            // Kill the process
                            const taskkill = spawn('taskkill', ['/F', '/PID', pid.toString()], { shell: true });
                            taskkill.on('close', (killCode: number) => {
                                resolve(killCode === 0);
                            });
                            return;
                        } catch (error) {
                            resolve(false);
                            return;
                        }
                    }
                }
                resolve(false);
            });

            netstat.on('error', () => {
                resolve(false);
            });
        });
    }

    /**
     * Clean up external terminals (preserve VS Code integrated terminals)
     */
    private async cleanupTerminalsCommand(): Promise<void> {
        try {
            // Show confirmation
            const confirmation = await vscode.window.showInformationMessage(
                'Clean up external terminal windows? (VS Code integrated terminals will be preserved)',
                { modal: true },
                'Yes', 'No'
            );
            
            if (confirmation !== 'Yes') {
                return;
            }

            await this.cleanupService.performCleanup(true);
            vscode.window.showInformationMessage('External terminals cleaned up successfully');
            
        } catch (error) {
            const message = `Error cleaning terminals: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Terminal cleanup command error:', error);
        }
    }

    /**
     * Schedule automatic terminal cleanup after delay
     */
    private async scheduleCleanupCommand(): Promise<void> {
        try {
            // Ask user for delay time
            const delayInput = await vscode.window.showInputBox({
                prompt: 'Enter delay in seconds before cleanup (default: 10)',
                value: '10',
                validateInput: (value) => {
                    const num = parseInt(value);
                    if (isNaN(num) || num < 0 || num > 300) {
                        return 'Please enter a number between 0 and 300';
                    }
                    return null;
                }
            });

            if (delayInput === undefined) {
                return; // User cancelled
            }

            const delaySeconds = parseInt(delayInput) || 10;
            
            this.cleanupService.scheduleCleanup(delaySeconds, true);
            vscode.window.showInformationMessage(
                `Terminal cleanup scheduled in ${delaySeconds} seconds. External terminals will be closed automatically.`
            );
            
        } catch (error) {
            const message = `Error scheduling cleanup: ${error instanceof Error ? error.message : String(error)}`;
            vscode.window.showErrorMessage(message);
            console.error('Schedule cleanup command error:', error);
        }
    }
}