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
        
        // Always check all projects for warnings/multi-instance detection
        const allProjects = this.projectProvider.getAllProjectsData();
        this.projectStatuses = await this.portDetectionService.checkProjectStatuses(allProjects);

        const selectedStatuses = this.projectStatuses.filter(status => 
            selectedProjects.some(p => p.id === status.projectId)
        );

        const runningCount = selectedStatuses.filter(s => s.status === 'active').length;
        const stoppedCount = selectedStatuses.filter(s => s.status === 'inactive').length;
        const multipleCount = selectedStatuses.filter(s => s.status === 'multiple').length;
        
        // Define checkbox-affected commands (these are the core batch operations)
        const batchOperations = [
            // Server Control (checkbox-affected)
            {
                label: `Start All Selected (${stoppedCount})`,
                command: 'claude-portfolio.batchStartProjects',
                icon: 'play',
                description: `Start ${stoppedCount} stopped projects`,
                category: 'Batch Operations',
                requiresStopped: true
            },
            {
                label: `Stop All Selected (${runningCount}${multipleCount > 0 ? ` + ${multipleCount} duplicates` : ''})`,
                command: 'claude-portfolio.batchStopProjects',
                icon: 'debug-stop',
                description: `Stop ${runningCount} running projects${multipleCount > 0 ? ` (${multipleCount} have multiple instances)` : ''}`,
                category: 'Batch Operations',
                requiresRunning: true
            },

            // Development (checkbox-affected)
            {
                label: `Install Dependencies (All)`,
                command: 'claude-portfolio.batchNpmInstall',
                icon: 'package',
                description: `Run npm install on ${selectedProjects.length} projects`,
                category: 'Batch Operations'
            },
            {
                label: `Build All Projects`,
                command: 'claude-portfolio.batchNpmBuild',
                icon: 'tools',
                description: `Run npm run build on ${selectedProjects.length} projects`,
                category: 'Batch Operations'
            },
            {
                label: `Test All Projects`,
                command: 'claude-portfolio.batchNpmTest',
                icon: 'beaker',
                description: `Run npm test on ${selectedProjects.length} projects`,
                category: 'Batch Operations'
            },

            // Workspace Management (checkbox-affected) - removed non-functioning Add All to Workspace

            // Git Operations (checkbox-affected)
            {
                label: `Git Status (All)`,
                command: 'claude-portfolio.batchGitStatus',
                icon: 'git-branch',
                description: `Check git status for ${selectedProjects.length} projects`,
                category: 'Batch Operations'
            },
            {
                label: `Git Pull (All)`,
                command: 'claude-portfolio.batchGitPull',
                icon: 'repo-pull',
                description: `Pull latest changes for ${selectedProjects.length} projects`,
                category: 'Batch Operations'
            }

        ];

        // Define other commands that are NOT checkbox-affected (for separate review)
        const otherCommands = [
            // Portfolio Management (NOT checkbox-affected)
            {
                label: 'Start Portfolio Server',
                command: 'claude-portfolio.startPortfolioServer',
                icon: 'server-environment',
                description: 'Start the main portfolio development server',
                category: 'Other Commands'
            },
            {
                label: 'Start VS Code Server',
                command: 'claude-portfolio.startVSCodeServer',
                icon: 'browser',
                description: 'Start portfolio server and open in Simple Browser',
                category: 'Other Commands'
            },
            {
                label: 'Start All Servers',
                command: 'claude-portfolio.startAllServers',
                icon: 'rocket',
                description: 'Start portfolio and all project servers',
                category: 'Other Commands'
            },
            {
                label: 'Start Projects (Tabbed)',
                command: 'claude-portfolio.startAllProjectsTabbed',
                icon: 'terminal',
                description: 'Start all projects in Windows Terminal tabs',
                category: 'Other Commands'
            },
            {
                label: 'Create New Project',
                command: 'claude-portfolio.createNewProject',
                icon: 'add',
                description: 'Create a new project using template',
                category: 'Other Commands'
            },
            {
                label: 'Check Portfolio Ports',
                command: 'claude-portfolio.checkPortfolioports',
                icon: 'ports-view-icon',
                description: 'Check status of portfolio development ports',
                category: 'Other Commands'
            },

            // Portfolio Development Commands (NOT checkbox-affected)
            {
                label: 'Build React App',
                command: 'claude-portfolio.buildReact',
                icon: 'package',
                description: 'Build the React portfolio app (npm run build)',
                category: 'Other Commands'
            },
            {
                label: 'Install Dependencies',
                command: 'claude-portfolio.npmInstall',
                icon: 'cloud-download',
                description: 'Install npm dependencies (npm install)',
                category: 'Other Commands'
            },
            {
                label: 'Kill All Servers',
                command: 'claude-portfolio.killAllServers',
                icon: 'debug-stop',
                description: 'Kill all running development servers',
                category: 'Other Commands'
            },
            {
                label: 'Start All Projects',
                command: 'claude-portfolio.startAllProjects',
                icon: 'run-all',
                description: 'Start all project development servers',
                category: 'Other Commands'
            },

            // Terminal Management Commands (NEW)
            {
                label: 'Clean Up Terminals',
                command: 'claude-portfolio.cleanupTerminals',
                icon: 'trash',
                description: 'Close external terminal windows (preserves VS Code terminals)',
                category: 'Other Commands'
            },
            {
                label: 'Schedule Terminal Cleanup',
                command: 'claude-portfolio.scheduleCleanup',
                icon: 'clock',
                description: 'Schedule automatic terminal cleanup after delay',
                category: 'Other Commands'
            },

            // VS Code Commands (NOT checkbox-affected) - Keep only essential ones
            {
                label: 'Reload Window',
                command: 'workbench.action.reloadWindow',
                icon: 'refresh',
                description: 'Reload VS Code window',
                category: 'Other Commands'
            },

            // Selection Management buttons moved to top-level (removed from Batch Operations to avoid duplication)
        ];

        // Combine the commands - include both batch operations and other commands
        this.commands = [...batchOperations, ...otherCommands].filter(cmd => {
            // Filter commands based on project states (only apply to batch operations)
            if ('requiresRunning' in cmd && cmd.requiresRunning && runningCount === 0) return false;
            if ('requiresStopped' in cmd && cmd.requiresStopped && stoppedCount === 0) return false;
            return true;
        });
    }

    getTreeItem(element: BatchCommandItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: BatchCommandItem): Thenable<BatchCommandItem[]> {
        const selectedCount = this.projectProvider.getSelectedProjects().length;

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

            // Add selection management buttons right after the header
            items.push(new BatchCommandItem(
                `Select All Projects`,
                'claude-portfolio.selectAllProjects',
                'SelectionAction',
                'check',
                'Check all projects for batch operations',
                vscode.TreeItemCollapsibleState.None,
                false
            ));
            
            items.push(new BatchCommandItem(
                `Clear Selection`,
                'claude-portfolio.clearProjectSelection',
                'SelectionAction',
                'clear-all',
                'Uncheck all selected projects',
                vscode.TreeItemCollapsibleState.None,
                false
            ));

            // Add warnings if any exist
            const projectsWithWarnings = this.projectStatuses.filter(s => s.warnings.length > 0);
            if (projectsWithWarnings.length > 0) {
                items.push(new BatchCommandItem(
                    `⚠️ ${projectsWithWarnings.length} Multi Instances`,
                    '',
                    'Warnings',
                    'warning',
                    'Multiple instances running on same ports - click to see details',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    true
                ));
            }

            // Show Batch Operations as primary category, Other Commands for review
            const allCategories = [...new Set(this.commands.map(c => c.category))];
            const primaryCategories = ['Batch Operations'];
            const otherCategories = allCategories.filter(cat => !primaryCategories.includes(cat));
            
            // Add primary categories (always show)
            primaryCategories.forEach(cat => {
                if (allCategories.includes(cat)) {
                    const description = cat === 'Batch Operations' ? 'Commands that work on selected projects' : `${cat} commands`;
                    
                    items.push(new BatchCommandItem(
                        cat,
                        '',
                        cat,
                        'folder',
                        description,
                        vscode.TreeItemCollapsibleState.Expanded,
                        true
                    ));
                }
            });

            // Add other categories for review (collapsed by default)
            otherCategories.forEach(cat => {
                items.push(new BatchCommandItem(
                    `🔍 ${cat} (Review)`,
                    '',
                    cat,
                    'folder',
                    `${cat} - commands to review for keeping or removing`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    true
                ));
            });

            return Promise.resolve(items);
            
        } else if (element.category === 'Warnings') {
            // Show warning details
            const warningItems: BatchCommandItem[] = [];
            this.projectStatuses.forEach(status => {
                if (status.warnings.length > 0) {
                    // Format warnings for better readability
                    const formattedWarnings = status.warnings.map((warning, index) => {
                        // Add bullet points and clean up spacing
                        return `• ${warning.trim()}`;
                    }).join('\n');
                    
                    warningItems.push(new BatchCommandItem(
                        `${status.projectId}`,
                        '',
                        'Warning',
                        status.status === 'multiple' ? 'error' : 'warning',
                        formattedWarnings,
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
                categoryCommands.map(cmd => {
                    // Add contextual info for commands in review sections
                    const isReviewCommand = !['Batch Operations'].includes(cmd.category);
                    const description = isReviewCommand ? 
                        `⚠️ REVIEW: ${cmd.description}` : 
                        cmd.description;
                    
                    return new BatchCommandItem(
                        cmd.label,
                        cmd.command,
                        cmd.category,
                        cmd.icon,
                        description,
                        vscode.TreeItemCollapsibleState.None,
                        false
                    );
                })
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