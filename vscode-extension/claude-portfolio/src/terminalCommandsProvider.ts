import * as vscode from 'vscode';
import { TerminalCleanupService } from './services/terminalCleanupService';
import { VSCodeSecurityService } from './securityService';

interface TerminalCommand {
    label: string;
    command: string;
    icon: string;
    description: string;
    category: string;
    requiresConfirmation?: boolean;
}

export class TerminalCommandsProvider implements vscode.TreeDataProvider<TerminalCommandItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TerminalCommandItem | undefined | null | void> = new vscode.EventEmitter<TerminalCommandItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TerminalCommandItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private commands: TerminalCommand[] = [];
    private cleanupService = TerminalCleanupService.getInstance();

    constructor() {
        this.initializeCommands();
    }

    private initializeCommands(): void {
        this.commands = [
            // Terminal Cleanup Commands
            {
                label: 'Clean Up External Terminals',
                command: 'claude-portfolio.cleanupTerminals',
                icon: 'trash',
                description: 'Close Windows Terminal and PowerShell windows (preserves VS Code terminals)',
                category: 'Cleanup',
                requiresConfirmation: true
            },
            {
                label: 'Schedule Terminal Cleanup',
                command: 'claude-portfolio.scheduleCleanup',
                icon: 'clock',
                description: 'Schedule automatic terminal cleanup after a delay',
                category: 'Cleanup'
            },
            {
                label: 'Cancel Scheduled Cleanup',
                command: 'claude-portfolio.cancelScheduledCleanup',
                icon: 'x',
                description: 'Cancel any pending scheduled cleanup',
                category: 'Cleanup'
            },

            // Terminal Management Commands
            {
                label: 'Close All VS Code Terminals',
                command: 'claude-portfolio.closeVSCodeTerminals',
                icon: 'terminal-kill',
                description: 'Close all VS Code integrated terminals',
                category: 'VS Code Terminals',
                requiresConfirmation: true
            },
            {
                label: 'New Terminal',
                command: 'workbench.action.terminal.new',
                icon: 'terminal',
                description: 'Open a new integrated terminal',
                category: 'VS Code Terminals'
            },
            {
                label: 'Split Active Terminal',
                command: 'workbench.action.terminal.split',
                icon: 'split-horizontal',
                description: 'Split the active terminal',
                category: 'VS Code Terminals'
            },

            // Process Management Commands
            {
                label: 'Kill Node Processes',
                command: 'claude-portfolio.killNodeProcesses',
                icon: 'debug-stop',
                description: 'Kill hanging Node.js development processes',
                category: 'Process Management',
                requiresConfirmation: true
            },
            {
                label: 'Check Running Processes',
                command: 'claude-portfolio.checkRunningProcesses',
                icon: 'list-tree',
                description: 'Show running development processes',
                category: 'Process Management'
            },
            {
                label: 'Port Scanner',
                command: 'claude-portfolio.scanPorts',
                icon: 'ports-view-icon',
                description: 'Scan and display processes using development ports',
                category: 'Process Management'
            },
            {
                label: 'Enhanced Port Scanner',
                command: 'claude-portfolio.scanPortsEnhanced',
                icon: 'search-details',
                description: 'Scan ports with terminal vs standalone context detection',
                category: 'Process Management'
            },
            {
                label: 'Terminal Processes Only',
                command: 'claude-portfolio.scanPortsTerminalOnly',
                icon: 'terminal',
                description: 'Show only processes launched from terminals',
                category: 'Process Management'
            },

            // PowerShell Integration
            {
                label: 'Open PowerShell Here',
                command: 'claude-portfolio.openPowerShellHere',
                icon: 'terminal-powershell',
                description: 'Open PowerShell in portfolio directory',
                category: 'PowerShell'
            },
            {
                label: 'Run PowerShell Script',
                command: 'claude-portfolio.runPowerShellScript',
                icon: 'file-code',
                description: 'Select and run a PowerShell script from scripts/ directory',
                category: 'PowerShell'
            }
        ];
    }

    async refresh(): Promise<void> {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TerminalCommandItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TerminalCommandItem): Thenable<TerminalCommandItem[]> {
        if (!element) {
            // Show categories at root level
            const categories = [...new Set(this.commands.map(c => c.category))];
            const items: TerminalCommandItem[] = [];

            // Add cleanup status info
            const cleanupStatus = this.cleanupService.getCleanupStatus();
            if (cleanupStatus.scheduled) {
                items.push(new TerminalCommandItem(
                    '⏰ Cleanup Scheduled',
                    '',
                    'Status',
                    'clock',
                    'Terminal cleanup is scheduled - click to cancel',
                    vscode.TreeItemCollapsibleState.None,
                    true,
                    'claude-portfolio.cancelScheduledCleanup'
                ));
            }

            // Add terminal count info
            const terminalCount = vscode.window.terminals.length;
            items.push(new TerminalCommandItem(
                `📟 ${terminalCount} VS Code Terminals`,
                '',
                'Status',
                'terminal',
                `${terminalCount} integrated terminals currently open`,
                vscode.TreeItemCollapsibleState.None,
                true
            ));

            // Add categories
            categories.forEach(category => {
                const categoryCommands = this.commands.filter(c => c.category === category);
                const categoryIcon = this.getCategoryIcon(category);
                
                items.push(new TerminalCommandItem(
                    category,
                    '',
                    category,
                    categoryIcon,
                    `${categoryCommands.length} commands available`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    true
                ));
            });

            return Promise.resolve(items);
        } else if (element.isCategory && element.category !== 'Status') {
            // Show commands for this category
            const categoryCommands = this.commands.filter(c => c.category === element.category);
            return Promise.resolve(
                categoryCommands.map(cmd => new TerminalCommandItem(
                    cmd.label,
                    cmd.command,
                    cmd.category,
                    cmd.icon,
                    cmd.description,
                    vscode.TreeItemCollapsibleState.None,
                    false
                ))
            );
        }

        return Promise.resolve([]);
    }

    private getCategoryIcon(category: string): string {
        switch (category) {
            case 'Cleanup': return 'trash';
            case 'VS Code Terminals': return 'terminal';
            case 'Process Management': return 'debug-console';
            case 'PowerShell': return 'terminal-powershell';
            case 'Status': return 'info';
            default: return 'folder';
        }
    }

    /**
     * Register all terminal management commands
     */
    registerCommands(context: vscode.ExtensionContext): void {
        const commands = [
            // New terminal-specific commands not covered by batch commands
            vscode.commands.registerCommand('claude-portfolio.cancelScheduledCleanup', this.cancelScheduledCleanupCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.closeVSCodeTerminals', this.closeVSCodeTerminalsCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.killNodeProcesses', this.killNodeProcessesCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.checkRunningProcesses', this.checkRunningProcessesCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.scanPorts', this.scanPortsCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.scanPortsEnhanced', this.scanPortsEnhancedCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.scanPortsTerminalOnly', this.scanPortsTerminalOnlyCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.openPowerShellHere', this.openPowerShellHereCommand.bind(this)),
            vscode.commands.registerCommand('claude-portfolio.runPowerShellScript', this.runPowerShellScriptCommand.bind(this))
        ];

        commands.forEach(command => context.subscriptions.push(command));
    }

    // Command implementations
    private async cancelScheduledCleanupCommand(): Promise<void> {
        this.cleanupService.cancelScheduledCleanup();
        vscode.window.showInformationMessage('Scheduled terminal cleanup cancelled');
        this.refresh();
    }

    private async closeVSCodeTerminalsCommand(): Promise<void> {
        const terminals = vscode.window.terminals;
        if (terminals.length === 0) {
            vscode.window.showInformationMessage('No VS Code terminals to close');
            return;
        }

        const confirmation = await vscode.window.showWarningMessage(
            `Close all ${terminals.length} VS Code integrated terminals?`,
            { modal: true },
            'Yes', 'No'
        );

        if (confirmation === 'Yes') {
            terminals.forEach(terminal => terminal.dispose());
            vscode.window.showInformationMessage(`Closed ${terminals.length} VS Code terminals`);
            this.refresh();
        }
    }

    private async killNodeProcessesCommand(): Promise<void> {
        try {
            if (!await VSCodeSecurityService.requireWorkspaceTrust('Kill Node processes')) {
                return;
            }

            const confirmation = await vscode.window.showWarningMessage(
                'Kill all Node.js development processes? This will stop running development servers.',
                { modal: true },
                'Yes', 'No'
            );

            if (confirmation !== 'Yes') {
                return;
            }

            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const terminal = vscode.window.createTerminal({
                name: 'Kill Node Processes',
                cwd: workspaceFolder.uri.fsPath
            });

            const command = `powershell -ExecutionPolicy Bypass -File ".\\scripts\\kill-node.ps1" -Force`;
            
            if (!VSCodeSecurityService.validateCommand(command)) {
                vscode.window.showErrorMessage('Command blocked by security validation');
                return;
            }

            terminal.sendText(command);
            terminal.show();
            
            vscode.window.showInformationMessage('Node.js kill script executed');
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error killing processes: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async checkRunningProcessesCommand(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const terminal = vscode.window.createTerminal({
                name: 'Running Processes',
                cwd: workspaceFolder.uri.fsPath
            });

            const command = `powershell -ExecutionPolicy Bypass -File ".\\scripts\\check-processes.ps1" -Verbose`;
            
            terminal.sendText(command);
            terminal.show();
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error checking processes: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async scanPortsCommand(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const terminal = vscode.window.createTerminal({
                name: 'Port Scanner',
                cwd: workspaceFolder.uri.fsPath
            });

            const command = `powershell -ExecutionPolicy Bypass -File ".\\scripts\\scan-ports.ps1" -Verbose`;
            
            terminal.sendText(command);
            terminal.show();
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error scanning ports: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async scanPortsEnhancedCommand(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const terminal = vscode.window.createTerminal({
                name: 'Enhanced Port Scanner',
                cwd: workspaceFolder.uri.fsPath
            });

            const command = `powershell -ExecutionPolicy Bypass -File ".\\scripts\\scan-ports-enhanced.ps1" -ShowContext -Verbose`;
            
            terminal.sendText(command);
            terminal.show();
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error scanning ports: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async scanPortsTerminalOnlyCommand(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const terminal = vscode.window.createTerminal({
                name: 'Terminal Processes Only',
                cwd: workspaceFolder.uri.fsPath
            });

            const command = `powershell -ExecutionPolicy Bypass -File ".\\scripts\\scan-ports-enhanced.ps1" -ShowContext -TerminalOnly -Verbose`;
            
            terminal.sendText(command);
            terminal.show();
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error scanning ports: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async openPowerShellHereCommand(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const terminal = vscode.window.createTerminal({
                name: 'Portfolio PowerShell',
                cwd: workspaceFolder.uri.fsPath,
                shellPath: 'powershell.exe'
            });

            terminal.show();
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error opening PowerShell: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async runPowerShellScriptCommand(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            // Get list of PowerShell scripts
            const scriptsPath = vscode.Uri.joinPath(workspaceFolder.uri, 'scripts');
            
            try {
                const scriptFiles = await vscode.workspace.fs.readDirectory(scriptsPath);
                const ps1Files: vscode.QuickPickItem[] = scriptFiles
                    .filter(([name, type]) => name.endsWith('.ps1') && type === vscode.FileType.File)
                    .map(([name]) => ({ label: name, description: `scripts/${name}` }));

                if (ps1Files.length === 0) {
                    vscode.window.showInformationMessage('No PowerShell scripts found in scripts/ directory');
                    return;
                }

                const selectedScript = await vscode.window.showQuickPick(ps1Files, {
                    placeHolder: 'Select a PowerShell script to run'
                });

                if (selectedScript) {
                    const scriptPath = `.\\scripts\\${selectedScript.label}`;
                    
                    if (!VSCodeSecurityService.validateCommand(scriptPath)) {
                        vscode.window.showErrorMessage('Script execution blocked by security validation');
                        return;
                    }

                    const terminal = vscode.window.createTerminal({
                        name: `Script: ${selectedScript.label}`,
                        cwd: workspaceFolder.uri.fsPath
                    });

                    terminal.sendText(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
                    terminal.show();
                }
                
            } catch (error) {
                vscode.window.showErrorMessage('Could not access scripts directory');
            }
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error running script: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

export class TerminalCommandItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly commandId: string,
        public readonly category: string,
        public readonly iconName: string,
        public readonly desc: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isCategory: boolean,
        public readonly clickCommand?: string
    ) {
        super(label, collapsibleState);
        
        this.tooltip = this.desc;
        this.iconPath = new vscode.ThemeIcon(iconName);
        
        if (!isCategory && (commandId || clickCommand)) {
            this.description = '';
            this.contextValue = 'terminalCommand';
            
            // Make clickable
            this.command = {
                command: clickCommand || commandId,
                title: 'Execute Terminal Command',
                arguments: []
            };
        } else if (isCategory) {
            this.contextValue = 'terminalCategory';
            this.description = this.desc;
        } else {
            // Status/info item
            this.contextValue = 'terminalInfo';
            this.description = '';
        }
    }
}