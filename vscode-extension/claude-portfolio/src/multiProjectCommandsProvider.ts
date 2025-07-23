import * as vscode from 'vscode';
import { ProjectProvider } from './projectProvider';
import { PortDetectionService, ProjectStatusInfo } from './services/portDetectionService';

interface BatchCommand {
    label: string;
    command: string;
    icon: string;
    description: string;
    category: string;
    requiresRunning?: boolean;
    requiresStopped?: boolean;
}

export class MultiProjectCommandsProvider implements vscode.TreeDataProvider<BatchCommandItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<BatchCommandItem | undefined | null | void> = new vscode.EventEmitter<BatchCommandItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<BatchCommandItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private commands: BatchCommand[] = [];
    private projectStatuses: ProjectStatusInfo[] = [];
    private portDetectionService = PortDetectionService.getInstance();

    constructor(private projectProvider: ProjectProvider) {
        // Initialize with empty commands, will be populated on first refresh
        this.commands = [];
        this.projectStatuses = [];
        // Don't await in constructor - let first refresh call handle it
        this.updateCommands().catch(error => {
            console.error('Failed to initialize multi-project commands:', error);
        });
    }

    async refresh() {
        await this.updateCommands();
        this._onDidChangeTreeData.fire();
    }

    private async updateCommands() {
        const selectedProjects = this.projectProvider.getSelectedProjectsData();
        
        if (selectedProjects.length === 0) {
            this.commands = [];
            this.projectStatuses = [];
            return;
        }

        // Get enhanced status information with duplicate detection
        this.projectStatuses = await this.portDetectionService.checkProjectStatuses(selectedProjects);
        
        // Filter to only selected projects
        const selectedStatuses = this.projectStatuses.filter(status => 
            selectedProjects.some(p => p.id === status.projectId)
        );

        const runningCount = selectedStatuses.filter(s => s.status === 'active').length;
        const stoppedCount = selectedStatuses.filter(s => s.status === 'inactive').length;
        const multipleCount = selectedStatuses.filter(s => s.status === 'multiple').length;
        
        this.commands = [
            // Server Control
            {
                label: `Start All Selected (${stoppedCount})`,
                command: 'claude-portfolio.batchStartProjects',
                icon: 'play',
                description: `Start ${stoppedCount} stopped projects`,
                category: 'Server Control',
                requiresStopped: true
            },
            {
                label: `Stop All Selected (${runningCount}${multipleCount > 0 ? ` + ${multipleCount} duplicates` : ''})`,
                command: 'claude-portfolio.batchStopProjects',
                icon: 'debug-stop',
                description: `Stop ${runningCount} running projects${multipleCount > 0 ? ` (${multipleCount} have multiple instances)` : ''}`,
                category: 'Server Control',
                requiresRunning: true
            },

            // Browse & Open
            {
                label: `Open All in Browser (${runningCount})`,
                command: 'claude-portfolio.batchOpenBrowser',
                icon: 'globe',
                description: `Open ${runningCount} running projects in browser`,
                category: 'Browse & Open',
                requiresRunning: true
            },
            {
                label: `Add All to Workspace`,
                command: 'claude-portfolio.batchAddToWorkspace',
                icon: 'folder-opened',
                description: `Add ${selectedProjects.length} projects to VS Code workspace`,
                category: 'Browse & Open'
            },

            // Development
            {
                label: `Install Dependencies (All)`,
                command: 'claude-portfolio.batchNpmInstall',
                icon: 'package',
                description: `Run npm install on ${selectedProjects.length} projects`,
                category: 'Development'
            },
            {
                label: `Build All Projects`,
                command: 'claude-portfolio.batchNpmBuild',
                icon: 'tools',
                description: `Run npm run build on ${selectedProjects.length} projects`,
                category: 'Development'
            },
            {
                label: `Test All Projects`,
                command: 'claude-portfolio.batchNpmTest',
                icon: 'beaker',
                description: `Run npm test on ${selectedProjects.length} projects`,
                category: 'Development'
            },

            // Git Operations
            {
                label: `Git Status (All)`,
                command: 'claude-portfolio.batchGitStatus',
                icon: 'git-branch',
                description: `Check git status for ${selectedProjects.length} projects`,
                category: 'Git Operations'
            },
            {
                label: `Git Pull (All)`,
                command: 'claude-portfolio.batchGitPull',
                icon: 'repo-pull',
                description: `Pull latest changes for ${selectedProjects.length} projects`,
                category: 'Git Operations'
            },

            // Portfolio Management
            {
                label: 'Start Portfolio Server',
                command: 'claude-portfolio.startPortfolioServer',
                icon: 'server-environment',
                description: 'Start the main portfolio development server',
                category: 'Portfolio'
            },
            {
                label: 'Start VS Code Server',
                command: 'claude-portfolio.startVSCodeServer',
                icon: 'browser',
                description: 'Start portfolio server and open in Simple Browser',
                category: 'Portfolio'
            },
            {
                label: 'Start All Servers',
                command: 'claude-portfolio.startAllServers',
                icon: 'rocket',
                description: 'Start portfolio and all project servers',
                category: 'Portfolio'
            },
            {
                label: 'Start Projects (Tabbed)',
                command: 'claude-portfolio.startAllProjectsTabbed',
                icon: 'terminal',
                description: 'Start all projects in Windows Terminal tabs',
                category: 'Portfolio'
            },
            {
                label: 'Create New Project',
                command: 'claude-portfolio.createNewProject',
                icon: 'add',
                description: 'Create a new project using template',
                category: 'Portfolio'
            },
            {
                label: 'Check Portfolio Ports',
                command: 'claude-portfolio.checkPortfolioports',
                icon: 'ports-view-icon',
                description: 'Check status of portfolio development ports',
                category: 'Portfolio'
            },

            // Selection Management
            {
                label: `Clear Selection`,
                command: 'claude-portfolio.clearProjectSelection',
                icon: 'clear-all',
                description: `Uncheck all selected projects`,
                category: 'Selection'
            },
            {
                label: `Select All Projects`,
                command: 'claude-portfolio.selectAllProjects',
                icon: 'select-all',
                description: `Check all projects`,
                category: 'Selection'
            },

            // Status & Diagnostics
            {
                label: 'Refresh Status',
                command: 'claude-portfolio.refreshProjects',
                icon: 'refresh',
                description: 'Force refresh project status detection',
                category: 'Diagnostics'
            }
        ].filter(cmd => {
            // Filter commands based on project states
            if (cmd.requiresRunning && runningCount === 0) return false;
            if (cmd.requiresStopped && stoppedCount === 0) return false;
            return true;
        });
    }

    getTreeItem(element: BatchCommandItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: BatchCommandItem): Thenable<BatchCommandItem[]> {
        const selectedCount = this.projectProvider.getSelectedProjects().length;
        
        if (selectedCount === 0) {
            return Promise.resolve([new BatchCommandItem(
                'Select projects to see batch commands',
                '',
                '',
                'info',
                'Use checkboxes above to select multiple projects',
                vscode.TreeItemCollapsibleState.None,
                true
            )]);
        }

        if (!element) {
            const items: BatchCommandItem[] = [];
            
            // Header showing selection count
            items.push(new BatchCommandItem(
                `${selectedCount} Projects Selected`,
                '',
                'Selection',
                'circle-filled',
                `Selected: ${this.projectProvider.getSelectedProjects().join(', ')}`,
                vscode.TreeItemCollapsibleState.None,
                true
            ));

            // Add warnings if any exist
            const projectsWithWarnings = this.projectStatuses.filter(s => s.warnings.length > 0);
            if (projectsWithWarnings.length > 0) {
                items.push(new BatchCommandItem(
                    `⚠️ ${projectsWithWarnings.length} Issues Detected`,
                    '',
                    'Warnings',
                    'warning',
                    'Click to see details',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    true
                ));
            }

            // Group commands by category
            const categories = [...new Set(this.commands.map(c => c.category))];
            items.push(...categories.map(cat => new BatchCommandItem(
                cat,
                '',
                cat,
                'folder',
                `${cat} commands for selected projects`,
                vscode.TreeItemCollapsibleState.Expanded,
                true
            )));

            return Promise.resolve(items);
            
        } else if (element.category === 'Warnings') {
            // Show warning details
            const warningItems: BatchCommandItem[] = [];
            this.projectStatuses.forEach(status => {
                if (status.warnings.length > 0) {
                    warningItems.push(new BatchCommandItem(
                        `${status.projectId}`,
                        '',
                        'Warning',
                        status.status === 'multiple' ? 'error' : 'warning',
                        `${status.warnings.join('; ')}`,
                        vscode.TreeItemCollapsibleState.None,
                        true
                    ));
                }
            });
            return Promise.resolve(warningItems);
            
        } else if (element.isCategory && element.category !== 'Selection' && element.category !== 'Warnings') {
            // Return commands for this category
            const categoryCommands = this.commands.filter(c => c.category === element.category);
            return Promise.resolve(
                categoryCommands.map(cmd => new BatchCommandItem(
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
}

export class BatchCommandItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly commandId: string,
        public readonly category: string,
        public readonly iconName: string,
        public readonly desc: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isCategory: boolean
    ) {
        super(label, collapsibleState);
        
        this.tooltip = this.desc;
        this.iconPath = new vscode.ThemeIcon(iconName);
        
        if (!isCategory && commandId) {
            this.description = this.desc;
            this.contextValue = 'batchCommand';
            
            // Make clickable
            this.command = {
                command: this.commandId,
                title: 'Execute Batch Command',
                arguments: []
            };
        } else if (isCategory) {
            this.contextValue = 'batchCategory';
        } else {
            // Info item
            this.contextValue = 'info';
        }
    }
}