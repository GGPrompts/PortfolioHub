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
exports.CheatItem = exports.CheatSheetProvider = void 0;
const vscode = __importStar(require("vscode"));
class CheatSheetProvider {
    constructor() {
        this.items = [
            // PowerShell
            { label: 'Navigate to folder', command: 'Set-Location "D:\\ClaudeWindows"', description: 'Change directory', category: 'PowerShell' },
            { label: 'List files', command: 'Get-ChildItem', description: 'List directory contents', category: 'PowerShell' },
            { label: 'Create folder', command: 'New-Item -ItemType Directory -Name "folder"', description: 'Create new directory', category: 'PowerShell' },
            { label: 'Delete folder', command: 'Remove-Item -Recurse -Force "folder"', description: 'Delete directory', category: 'PowerShell' },
            { label: 'Open Explorer', command: 'explorer.exe .', description: 'Open current folder in Explorer', category: 'PowerShell' },
            // Git
            { label: 'Check status', command: 'git status', description: 'Show working tree status', category: 'Git' },
            { label: 'Stage all', command: 'git add .', description: 'Stage all changes', category: 'Git' },
            { label: 'Commit', command: 'git commit -m "message"', description: 'Commit with message', category: 'Git' },
            { label: 'New branch', command: 'git checkout -b feature-branch', description: 'Create and switch branch', category: 'Git' },
            { label: 'Push', command: 'git push origin main', description: 'Push to remote', category: 'Git' },
            // npm
            { label: 'Install deps', command: 'npm install', description: 'Install dependencies', category: 'npm' },
            { label: 'Start dev', command: 'npm run dev', description: 'Start development server', category: 'npm' },
            { label: 'Build', command: 'npm run build', description: 'Build for production', category: 'npm' },
            { label: 'Create React app', command: 'npx create-react-app myapp', description: 'Create new React app', category: 'npm' },
            // Claude Code
            { label: 'Start Claude', command: 'claude', description: 'Start Claude Code session', category: 'Claude Code' },
            { label: 'List MCP servers', command: 'claude mcp list', description: 'List configured MCP servers', category: 'Claude Code' },
            { label: 'AI commit', command: 'claude commit', description: 'AI-assisted git commit', category: 'Claude Code' }
        ];
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            const categories = [...new Set(this.items.map(i => i.category))];
            return Promise.resolve(categories.map(cat => new CheatItem(cat, '', '', vscode.TreeItemCollapsibleState.Expanded, true)));
        }
        else if (element.isCategory) {
            const categoryItems = this.items.filter(i => i.category === element.label);
            return Promise.resolve(categoryItems.map(item => new CheatItem(item.label, item.command, item.description, vscode.TreeItemCollapsibleState.None, false)));
        }
        return Promise.resolve([]);
    }
}
exports.CheatSheetProvider = CheatSheetProvider;
class CheatItem extends vscode.TreeItem {
    constructor(label, cmd, desc, collapsibleState, isCategory) {
        super(label, collapsibleState);
        this.label = label;
        this.cmd = cmd;
        this.desc = desc;
        this.collapsibleState = collapsibleState;
        this.isCategory = isCategory;
        if (!isCategory) {
            this.tooltip = `${this.cmd}\n${this.desc}`;
            this.description = this.cmd;
            this.contextValue = 'cheatItem';
            this.iconPath = new vscode.ThemeIcon('terminal');
            // Copy command on click
            this.command = {
                command: 'claude-portfolio.copyCheatCommand',
                title: 'Copy Command',
                arguments: [this.cmd]
            };
        }
        else {
            this.contextValue = 'category';
            this.iconPath = new vscode.ThemeIcon('book');
        }
    }
}
exports.CheatItem = CheatItem;
//# sourceMappingURL=cheatSheetProvider.js.map