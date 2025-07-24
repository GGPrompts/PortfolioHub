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
exports.BatchCommandItem = exports.MultiProjectCommandsProvider = void 0;
const vscode = __importStar(require("vscode"));
const portDetectionService_1 = require("./services/portDetectionService");
class MultiProjectCommandsProvider {
    constructor(projectProvider) {
        this.projectProvider = projectProvider;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.commands = [];
        this.projectStatuses = [];
        this.portDetectionService = portDetectionService_1.PortDetectionService.getInstance();
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
    async updateCommands() {
        const selectedProjects = this.projectProvider.getSelectedProjectsData();
        // Always get project statuses, even if none selected
        if (selectedProjects.length > 0) {
            // Get enhanced status information with duplicate detection
            this.projectStatuses = await this.portDetectionService.checkProjectStatuses(selectedProjects);
            // Filter to only selected projects
            const selectedStatuses = this.projectStatuses.filter(status => selectedProjects.some(p => p.id === status.projectId));
        }
        else {
            this.projectStatuses = [];
        }
        const selectedStatuses = this.projectStatuses.filter(status => selectedProjects.some(p => p.id === status.projectId));
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
            // VS Code Commands (NOT checkbox-affected) - Keep only essential ones
            {
                label: 'Reload Window',
                command: 'workbench.action.reloadWindow',
                icon: 'refresh',
                description: 'Reload VS Code window',
                category: 'Other Commands'
            },
            // Selection Management (keep these - they manage checkboxes)
            {
                label: `Clear Selection`,
                command: 'claude-portfolio.clearProjectSelection',
                icon: 'clear-all',
                description: `Uncheck all selected projects`,
                category: 'Batch Operations'
            },
            {
                label: `Select All Projects`,
                command: 'claude-portfolio.selectAllProjects',
                icon: 'select-all',
                description: `Check all projects`,
                category: 'Batch Operations'
            }
        ];
        // Combine the commands - include both batch operations and other commands
        this.commands = [...batchOperations, ...otherCommands].filter(cmd => {
            // Filter commands based on project states (only apply to batch operations)
            if ('requiresRunning' in cmd && cmd.requiresRunning && runningCount === 0)
                return false;
            if ('requiresStopped' in cmd && cmd.requiresStopped && stoppedCount === 0)
                return false;
            return true;
        });
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        const selectedCount = this.projectProvider.getSelectedProjects().length;
        if (!element) {
            const items = [];
            // Header showing selection count
            items.push(new BatchCommandItem(`${selectedCount} Projects Selected`, '', 'Selection', 'circle-filled', `Selected: ${this.projectProvider.getSelectedProjects().join(', ')}`, vscode.TreeItemCollapsibleState.None, true));
            // Add warnings if any exist
            const projectsWithWarnings = this.projectStatuses.filter(s => s.warnings.length > 0);
            if (projectsWithWarnings.length > 0) {
                items.push(new BatchCommandItem(`⚠️ ${projectsWithWarnings.length} Issues Detected`, '', 'Warnings', 'warning', 'Click to see details', vscode.TreeItemCollapsibleState.Collapsed, true));
            }
            // Show Batch Operations as primary category, Other Commands for review
            const allCategories = [...new Set(this.commands.map(c => c.category))];
            const primaryCategories = ['Batch Operations'];
            const otherCategories = allCategories.filter(cat => !primaryCategories.includes(cat));
            // Add primary categories (always show)
            primaryCategories.forEach(cat => {
                if (allCategories.includes(cat)) {
                    const description = cat === 'Batch Operations' ? 'Commands that work on selected projects' : `${cat} commands`;
                    items.push(new BatchCommandItem(cat, '', cat, 'folder', description, vscode.TreeItemCollapsibleState.Expanded, true));
                }
            });
            // Add other categories for review (collapsed by default)
            otherCategories.forEach(cat => {
                items.push(new BatchCommandItem(`🔍 ${cat} (Review)`, '', cat, 'folder', `${cat} - commands to review for keeping or removing`, vscode.TreeItemCollapsibleState.Collapsed, true));
            });
            return Promise.resolve(items);
        }
        else if (element.category === 'Warnings') {
            // Show warning details
            const warningItems = [];
            this.projectStatuses.forEach(status => {
                if (status.warnings.length > 0) {
                    warningItems.push(new BatchCommandItem(`${status.projectId}`, '', 'Warning', status.status === 'multiple' ? 'error' : 'warning', `${status.warnings.join('; ')}`, vscode.TreeItemCollapsibleState.None, true));
                }
            });
            return Promise.resolve(warningItems);
        }
        else if (element.isCategory && element.category !== 'Selection' && element.category !== 'Warnings') {
            // Return commands for this category
            const categoryCommands = this.commands.filter(c => c.category === element.category);
            return Promise.resolve(categoryCommands.map(cmd => {
                // Add contextual info for commands in review sections
                const isReviewCommand = !['Batch Operations'].includes(cmd.category);
                const description = isReviewCommand ?
                    `⚠️ REVIEW: ${cmd.description}` :
                    cmd.description;
                return new BatchCommandItem(cmd.label, cmd.command, cmd.category, cmd.icon, description, vscode.TreeItemCollapsibleState.None, false);
            }));
        }
        return Promise.resolve([]);
    }
}
exports.MultiProjectCommandsProvider = MultiProjectCommandsProvider;
class BatchCommandItem extends vscode.TreeItem {
    constructor(label, commandId, category, iconName, desc, collapsibleState, isCategory) {
        super(label, collapsibleState);
        this.label = label;
        this.commandId = commandId;
        this.category = category;
        this.iconName = iconName;
        this.desc = desc;
        this.collapsibleState = collapsibleState;
        this.isCategory = isCategory;
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
        }
        else if (isCategory) {
            this.contextValue = 'batchCategory';
        }
        else {
            // Info item
            this.contextValue = 'info';
        }
    }
}
exports.BatchCommandItem = BatchCommandItem;
//# sourceMappingURL=multiProjectCommandsProvider.js.map