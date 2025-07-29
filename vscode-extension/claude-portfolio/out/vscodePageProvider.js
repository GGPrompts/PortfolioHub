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
exports.VSCodePageItem = exports.VSCodePageProvider = void 0;
const vscode = __importStar(require("vscode"));
class VSCodePageProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Return the VS Code pages
            return Promise.resolve([
                new VSCodePageItem('Portfolio Dashboard', 'View project status and management dashboard', 'claude-portfolio.showDashboard', vscode.TreeItemCollapsibleState.None, 'dashboard'),
                new VSCodePageItem('Command Cheat Sheet', 'Windows command reference for Claude Code development', 'claude-portfolio.openCheatSheet', vscode.TreeItemCollapsibleState.None, 'cheatsheet'),
                // Temporary MCP controls for testing
                new VSCodePageItem('MCP Security Toggle', 'Toggle MCP security validation level', 'claude-portfolio.toggleMCPSecurity', vscode.TreeItemCollapsibleState.None, 'mcp-security'),
                new VSCodePageItem('Check MCP Status', 'Check MCP server status', 'claude-portfolio.checkMCPStatus', vscode.TreeItemCollapsibleState.None, 'mcp-status'),
                new VSCodePageItem('Test MCP Tools', 'Test MCP server connectivity', 'claude-portfolio.testMCPTools', vscode.TreeItemCollapsibleState.None, 'mcp-test')
            ]);
        }
        return Promise.resolve([]);
    }
}
exports.VSCodePageProvider = VSCodePageProvider;
class VSCodePageItem extends vscode.TreeItem {
    constructor(label, description, commandId, collapsibleState, pageType) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.commandId = commandId;
        this.collapsibleState = collapsibleState;
        this.pageType = pageType;
        this.tooltip = description;
        this.description = description;
        // Set the command to execute when clicked
        this.command = {
            command: commandId,
            title: label,
            arguments: []
        };
        // Set context value for menu items
        this.contextValue = pageType;
        // Set icons
        switch (pageType) {
            case 'dashboard':
                this.iconPath = new vscode.ThemeIcon('dashboard');
                break;
            case 'cheatsheet':
                this.iconPath = new vscode.ThemeIcon('book');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('file');
        }
    }
}
exports.VSCodePageItem = VSCodePageItem;
//# sourceMappingURL=vscodePageProvider.js.map