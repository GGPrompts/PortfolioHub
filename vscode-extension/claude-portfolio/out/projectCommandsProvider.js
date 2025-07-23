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
exports.ProjectCommandItem = exports.ProjectCommandsProvider = void 0;
const vscode = __importStar(require("vscode"));
class ProjectCommandsProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.selectedProject = null;
        this.commands = [];
        this.updateCommands();
    }
    setSelectedProject(project) {
        this.selectedProject = project;
        this.updateCommands();
        this._onDidChangeTreeData.fire();
    }
    clearSelection() {
        this.selectedProject = null;
        this.commands = [];
        this._onDidChangeTreeData.fire();
    }
    updateCommands() {
        if (!this.selectedProject) {
            this.commands = [];
            return;
        }
        const isRunning = this.selectedProject.status === 'active';
        this.commands = [
            // Server Control
            {
                label: isRunning ? 'Stop Server' : 'Start Server',
                command: isRunning ? 'claude-portfolio.stopProject' : 'claude-portfolio.runProject',
                icon: isRunning ? 'debug-stop' : 'play',
                description: isRunning ? `Stop ${this.selectedProject.title}` : `Start ${this.selectedProject.title}`,
                category: 'Server Control'
            },
            // Browse & Open
            {
                label: 'Open in Browser',
                command: 'claude-portfolio.openProjectInBrowser',
                icon: 'globe',
                description: 'Open in VS Code Simple Browser',
                category: 'Browse & Open',
                requiresRunning: true
            },
            {
                label: 'Open External Browser',
                command: 'claude-portfolio.openProjectInExternalBrowser',
                icon: 'link-external',
                description: 'Open in system default browser',
                category: 'Browse & Open',
                requiresRunning: true
            },
            {
                label: 'Open in VS Code',
                command: 'claude-portfolio.openProject',
                icon: 'folder-opened',
                description: 'Add to VS Code workspace',
                category: 'Browse & Open'
            },
            // Development
            {
                label: 'Install Dependencies',
                command: 'claude-portfolio.npmInstall',
                icon: 'package',
                description: 'Run npm install',
                category: 'Development'
            },
            {
                label: 'Build Project',
                command: 'claude-portfolio.npmBuild',
                icon: 'tools',
                description: 'Run npm run build',
                category: 'Development'
            },
            {
                label: 'Run Tests',
                command: 'claude-portfolio.npmTest',
                icon: 'beaker',
                description: 'Run npm test',
                category: 'Development'
            },
            // Git Operations
            {
                label: 'Git Status',
                command: 'claude-portfolio.gitStatus',
                icon: 'git-branch',
                description: 'Check git status',
                category: 'Git Operations'
            },
            {
                label: 'Git Pull',
                command: 'claude-portfolio.gitPull',
                icon: 'repo-pull',
                description: 'Pull latest changes',
                category: 'Git Operations'
            },
            {
                label: 'Git Commit',
                command: 'claude-portfolio.gitCommit',
                icon: 'git-commit',
                description: 'Commit changes',
                category: 'Git Operations'
            },
            // AI Assistants
            {
                label: 'Open Claude',
                command: 'claude-portfolio.openAIAssistant',
                icon: 'sparkle',
                description: 'Start Claude Code for this project',
                category: 'AI Assistants'
            },
            {
                label: 'Open Copilot',
                command: 'workbench.action.openChat',
                icon: 'comment-discussion',
                description: 'GitHub Copilot Chat (Ctrl+Alt+I)',
                category: 'AI Assistants'
            }
        ].filter(cmd => {
            // Filter commands based on project status
            if (cmd.requiresRunning && !isRunning)
                return false;
            if ('requiresStopped' in cmd && cmd.requiresStopped && isRunning)
                return false;
            return true;
        });
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!this.selectedProject) {
            return Promise.resolve([new ProjectCommandItem('Select a project to see commands', '', '', 'info', 'Select a project from the Projects view above', vscode.TreeItemCollapsibleState.None, true)]);
        }
        if (!element) {
            // Group commands by category
            const categories = [...new Set(this.commands.map(c => c.category))];
            return Promise.resolve(categories.map(cat => new ProjectCommandItem(cat, '', cat, 'folder', `${cat} commands for ${this.selectedProject.title}`, vscode.TreeItemCollapsibleState.Expanded, true)));
        }
        else if (element.isCategory) {
            // Return commands for this category
            const categoryCommands = this.commands.filter(c => c.category === element.label);
            return Promise.resolve(categoryCommands.map(cmd => new ProjectCommandItem(cmd.label, cmd.command, cmd.category, cmd.icon, cmd.description, vscode.TreeItemCollapsibleState.None, false, this.selectedProject)));
        }
        return Promise.resolve([]);
    }
}
exports.ProjectCommandsProvider = ProjectCommandsProvider;
class ProjectCommandItem extends vscode.TreeItem {
    constructor(label, commandId, category, iconName, desc, collapsibleState, isCategory, project) {
        super(label, collapsibleState);
        this.label = label;
        this.commandId = commandId;
        this.category = category;
        this.iconName = iconName;
        this.desc = desc;
        this.collapsibleState = collapsibleState;
        this.isCategory = isCategory;
        this.project = project;
        this.tooltip = this.desc;
        this.iconPath = new vscode.ThemeIcon(iconName);
        if (!isCategory && commandId) {
            this.description = this.desc;
            this.contextValue = 'projectCommand';
            // Make clickable - pass project data to commands that need it
            this.command = {
                command: this.commandId,
                title: 'Execute Command',
                arguments: this.project ? [this.project] : []
            };
        }
        else if (isCategory) {
            this.contextValue = 'commandCategory';
        }
        else {
            // Info item
            this.contextValue = 'info';
        }
    }
}
exports.ProjectCommandItem = ProjectCommandItem;
//# sourceMappingURL=projectCommandsProvider.js.map