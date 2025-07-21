# Portfolio Hub VS Code Extension Development Guide

## Overview

This guide details how to convert the Claude Development Portfolio into a VS Code extension while preserving all live development capabilities and enhancing functionality with native OS integration.

## Table of Contents

1. [Project Architecture](#project-architecture)
2. [Setup & Scaffolding](#setup--scaffolding)
3. [Development Workflow](#development-workflow)
4. [Core Implementation](#core-implementation)
5. [Terminal Integration](#terminal-integration)
6. [Command Execution](#command-execution)
7. [File System Operations](#file-system-operations)
8. [Webview Development](#webview-development)
9. [Production Build](#production-build)
10. [Testing & Debugging](#testing--debugging)
11. [Publishing](#publishing)

## Project Architecture

### Current vs Extension Structure

```
Current:
claude-dev-portfolio/
├── src/                    # React components
├── projects/              # Project directories
├── scripts/               # PowerShell automation
└── package.json           # Portfolio package

Extension:
portfolio-vscode-extension/
├── src/
│   ├── extension.ts       # Main extension code
│   ├── webview/          # Webview management
│   ├── terminals/        # Terminal integration
│   ├── commands/         # Command handlers
│   └── utils/            # Utilities
├── media/                # Extension assets
├── package.json          # Extension manifest
└── webpack.config.js     # Bundling config
```

### Benefits of Extension Architecture

- **Preserved Live Development**: Your existing `npm run dev` workflow remains unchanged
- **Enhanced Command Execution**: Direct PowerShell script execution without clipboard
- **Native Terminal Integration**: Embedded terminals with project-specific positioning
- **File System Access**: Direct note saving and project creation
- **Workspace Integration**: Automatic project detection and management

## Setup & Scaffolding

### 1. Initial Extension Setup

```bash
# Install Yeoman and VS Code Extension generator
npm install -g yo generator-code

# Create new extension
yo code

# Choose:
# ? What type of extension do you want to create? New Extension (TypeScript)
# ? What's the name of your extension? Portfolio Hub
# ? What's the identifier of your extension? portfolio-hub
# ? What's the description of your extension? Claude Development Portfolio Management
# ? Initialize a git repository? Yes
# ? Bundle the source code with webpack? Yes
# ? Package manager? npm
```

### 2. Project Structure Setup

```bash
cd portfolio-hub
mkdir -p src/webview src/terminals src/commands src/utils media
```

### 3. Package.json Configuration

```json
{
  "name": "portfolio-hub",
  "displayName": "Portfolio Hub",
  "description": "Claude Development Portfolio Management",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Other"],
  "activationEvents": [
    "onCommand:portfolioHub.openDashboard",
    "workspaceContains:projects/manifest.json"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "portfolioHub.openDashboard",
        "title": "Open Portfolio Dashboard",
        "category": "Portfolio Hub"
      },
      {
        "command": "portfolioHub.startAllProjects",
        "title": "Start All Projects",
        "category": "Portfolio Hub"
      },
      {
        "command": "portfolioHub.createProject",
        "title": "Create New Project",
        "category": "Portfolio Hub"
      },
      {
        "command": "portfolioHub.refreshStatus",
        "title": "Refresh Project Status",
        "category": "Portfolio Hub"
      }
    ],
    "keybindings": [
      {
        "command": "portfolioHub.openDashboard",
        "key": "ctrl+shift+p ctrl+p",
        "when": "workspaceFolder"
      }
    ],
    "menus": {
      "commandPalette": [
        {
          "command": "portfolioHub.openDashboard",
          "when": "workspaceContains:projects/manifest.json"
        }
      ]
    }
  }
}
```

## Development Workflow

### Hybrid Development Setup

Your development workflow preserves the live reload experience:

```bash
# Terminal 1: Portfolio React App (unchanged)
cd claude-dev-portfolio
npm run dev  # Vite server on localhost:5173

# Terminal 2: Extension Development
cd portfolio-vscode-extension
npm run watch  # Extension auto-reloads

# Terminal 3: Test Projects (unchanged)
cd claude-dev-portfolio/projects/matrix-cards
npm run dev  # localhost:3002
```

### Extension Development Script

```json
{
  "scripts": {
    "dev": "concurrently \"npm run watch\" \"npm run serve:portfolio\"",
    "watch": "webpack --mode development --watch",
    "serve:portfolio": "cd ../claude-dev-portfolio && npm run dev",
    "compile": "webpack",
    "package": "webpack --mode production --devtool hidden-source-map",
    "test": "npm run compile && node ./out/test/runTest.js"
  }
}
```

## Core Implementation

### 1. Main Extension File (src/extension.ts)

```typescript
import * as vscode from 'vscode';
import { PortfolioWebviewProvider } from './webview/PortfolioWebviewProvider';
import { TerminalManager } from './terminals/TerminalManager';
import { CommandManager } from './commands/CommandManager';
import { ProjectManager } from './utils/ProjectManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('Portfolio Hub extension is now active!');

    // Initialize managers
    const projectManager = new ProjectManager();
    const terminalManager = new TerminalManager();
    const webviewProvider = new PortfolioWebviewProvider(context.extensionUri, projectManager);
    const commandManager = new CommandManager(projectManager, terminalManager, webviewProvider);

    // Register webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'portfolioHub.dashboard',
            webviewProvider
        )
    );

    // Register commands
    const commands = [
        vscode.commands.registerCommand('portfolioHub.openDashboard', () => {
            webviewProvider.show();
        }),
        vscode.commands.registerCommand('portfolioHub.startAllProjects', () => {
            commandManager.startAllProjects();
        }),
        vscode.commands.registerCommand('portfolioHub.createProject', () => {
            commandManager.createProject();
        }),
        vscode.commands.registerCommand('portfolioHub.refreshStatus', () => {
            commandManager.refreshProjectStatus();
        })
    ];

    context.subscriptions.push(...commands);

    // Auto-detect portfolio workspace
    if (vscode.workspace.workspaceFolders) {
        projectManager.detectPortfolioWorkspace();
    }
}

export function deactivate() {}
```

### 2. Project Manager (src/utils/ProjectManager.ts)

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface Project {
    id: string;
    title: string;
    path: string;
    localPort: number;
    buildCommand: string;
    description: string;
    tech: string[];
    displayType: string;
}

export class ProjectManager {
    private projects: Project[] = [];
    private portfolioRoot: string = '';
    
    constructor() {
        this.detectPortfolioWorkspace();
    }

    public async detectPortfolioWorkspace(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        for (const folder of workspaceFolders) {
            const manifestPath = path.join(folder.uri.fsPath, 'projects', 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                this.portfolioRoot = folder.uri.fsPath;
                await this.loadProjects();
                break;
            }
        }
    }

    public async loadProjects(): Promise<Project[]> {
        const manifestPath = path.join(this.portfolioRoot, 'projects', 'manifest.json');
        
        try {
            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);
            this.projects = manifest.projects || [];
            return this.projects;
        } catch (error) {
            console.error('Failed to load projects:', error);
            return [];
        }
    }

    public getProjects(): Project[] {
        return this.projects;
    }

    public getProject(id: string): Project | undefined {
        return this.projects.find(p => p.id === id);
    }

    public getPortfolioRoot(): string {
        return this.portfolioRoot;
    }

    public async createProject(name: string, description: string): Promise<void> {
        const scriptPath = path.join(this.portfolioRoot, 'scripts', 'create-project.ps1');
        
        const terminal = vscode.window.createTerminal({
            name: 'Create Project',
            cwd: this.portfolioRoot
        });

        terminal.sendText(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}" -ProjectName "${name}" -Description "${description}"`);
        terminal.show();
    }

    public async checkProjectStatus(project: Project): Promise<boolean> {
        return new Promise((resolve) => {
            const net = require('net');
            const server = net.createServer();
            
            server.listen(project.localPort, () => {
                server.close(() => resolve(false)); // Port available = not running
            });
            
            server.on('error', () => resolve(true)); // Port in use = running
        });
    }
}
```

## Terminal Integration

### Terminal Manager (src/terminals/TerminalManager.ts)

```typescript
import * as vscode from 'vscode';
import { Project } from '../utils/ProjectManager';

export class TerminalManager {
    private projectTerminals = new Map<string, vscode.Terminal>();

    public createProjectTerminal(project: Project): vscode.Terminal {
        // Close existing terminal if it exists
        const existingTerminal = this.projectTerminals.get(project.id);
        if (existingTerminal) {
            existingTerminal.dispose();
        }

        // Create new terminal
        const terminal = vscode.window.createTerminal({
            name: `🚀 ${project.title}`,
            cwd: path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, 'projects', project.path),
            location: vscode.TerminalLocation.Editor
        });

        this.projectTerminals.set(project.id, terminal);
        return terminal;
    }

    public startProject(project: Project): void {
        const terminal = this.createProjectTerminal(project);
        terminal.sendText(project.buildCommand);
        terminal.show();
    }

    public stopProject(projectId: string): void {
        const terminal = this.projectTerminals.get(projectId);
        if (terminal) {
            terminal.sendText('\u0003'); // Send Ctrl+C
        }
    }

    public startAllProjects(projects: Project[]): void {
        projects.forEach((project, index) => {
            const terminal = this.createProjectTerminal(project);
            terminal.sendText(project.buildCommand);
            
            // Arrange terminals in grid layout
            if (index > 0) {
                vscode.commands.executeCommand('workbench.action.moveEditorToNextGroup');
            }
        });
    }

    public executeCommand(projectId: string, command: string): void {
        const terminal = this.projectTerminals.get(projectId);
        if (terminal) {
            terminal.sendText(command);
            terminal.show();
        }
    }

    public executePowerShellScript(scriptPath: string, args: string[] = []): vscode.Terminal {
        const terminal = vscode.window.createTerminal({
            name: 'Portfolio Script',
            cwd: vscode.workspace.workspaceFolders![0].uri.fsPath
        });

        const command = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}" ${args.join(' ')}`;
        terminal.sendText(command);
        terminal.show();
        
        return terminal;
    }

    public dispose(): void {
        this.projectTerminals.forEach(terminal => terminal.dispose());
        this.projectTerminals.clear();
    }
}
```

### Advanced Terminal Layouts

```typescript
export class TerminalLayoutManager {
    public createDevelopmentLayout(projects: Project[]): void {
        const layouts = {
            single: vscode.ViewColumn.One,
            dual: [vscode.ViewColumn.One, vscode.ViewColumn.Two],
            quad: [
                vscode.ViewColumn.One, vscode.ViewColumn.Two, 
                vscode.ViewColumn.Three, vscode.ViewColumn.Four
            ]
        };

        const layout = projects.length <= 2 ? layouts.dual : layouts.quad;
        
        projects.slice(0, 4).forEach((project, index) => {
            const terminal = vscode.window.createTerminal({
                name: project.title,
                cwd: this.getProjectPath(project),
                location: { 
                    location: vscode.TerminalLocation.Editor, 
                    group: layout[index] || vscode.ViewColumn.One 
                }
            });
            
            terminal.sendText(project.buildCommand);
        });
    }

    public createSideBySideLayout(): void {
        // Left: Portfolio dashboard (webview)
        vscode.commands.executeCommand('portfolioHub.openDashboard');
        
        // Right: Active project terminal
        vscode.commands.executeCommand('workbench.action.focusNextGroup');
    }
}
```

## Command Execution

### Command Manager (src/commands/CommandManager.ts)

```typescript
import * as vscode from 'vscode';
import { ProjectManager, Project } from '../utils/ProjectManager';
import { TerminalManager } from '../terminals/TerminalManager';
import { PortfolioWebviewProvider } from '../webview/PortfolioWebviewProvider';

export class CommandManager {
    constructor(
        private projectManager: ProjectManager,
        private terminalManager: TerminalManager,
        private webviewProvider: PortfolioWebviewProvider
    ) {}

    public async startAllProjects(): Promise<void> {
        const projects = this.projectManager.getProjects();
        this.terminalManager.startAllProjects(projects);
        
        // Update webview
        this.webviewProvider.postMessage({
            type: 'projectsStarted',
            projects: projects.map(p => p.id)
        });
    }

    public async createProject(): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter project name',
            placeHolder: 'my-awesome-project'
        });

        if (!name) return;

        const description = await vscode.window.showInputBox({
            prompt: 'Enter project description',
            placeHolder: 'A cool new project'
        });

        if (!description) return;

        await this.projectManager.createProject(name, description);
        
        vscode.window.showInformationMessage(`Project "${name}" created successfully!`);
    }

    public async refreshProjectStatus(): Promise<void> {
        const projects = this.projectManager.getProjects();
        const statuses = await Promise.all(
            projects.map(async (project) => ({
                id: project.id,
                running: await this.projectManager.checkProjectStatus(project)
            }))
        );

        this.webviewProvider.postMessage({
            type: 'statusUpdate',
            statuses
        });
    }

    public async executeGitCommand(command: string, projectId?: string): Promise<void> {
        const cwd = projectId 
            ? path.join(this.projectManager.getPortfolioRoot(), 'projects', projectId)
            : this.projectManager.getPortfolioRoot();

        const terminal = vscode.window.createTerminal({
            name: 'Git Operation',
            cwd
        });

        terminal.sendText(command);
        terminal.show();
    }

    public async saveNote(content: string, project?: string): Promise<void> {
        const portfolioRoot = this.projectManager.getPortfolioRoot();
        const notePath = project 
            ? path.join(portfolioRoot, 'projects', project, 'dev-journal.md')
            : path.join(portfolioRoot, 'notes', 'to-sort', `note-${Date.now()}.md`);

        const noteContent = `\n\n## ${new Date().toLocaleString()}\n\n${content}`;
        
        try {
            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(notePath),
                Buffer.from(noteContent, 'utf8')
            );
            
            vscode.window.showInformationMessage('Note saved successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save note: ${error}`);
        }
    }
}
```

## Webview Development

### Webview Provider (src/webview/PortfolioWebviewProvider.ts)

```typescript
import * as vscode from 'vscode';
import { ProjectManager } from '../utils/ProjectManager';

export class PortfolioWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'portfolioHub.dashboard';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly projectManager: ProjectManager
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'executeCommand':
                    await this.handleCommand(data.command);
                    break;
                case 'saveNote':
                    await this.handleSaveNote(data.content, data.project);
                    break;
                case 'refreshStatus':
                    await this.handleRefreshStatus();
                    break;
            }
        });
    }

    public show() {
        if (this._view) {
            this._view.show?.(true);
        }
    }

    public postMessage(message: any) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Check if development server is running
        const isDevelopment = this.isDevServerRunning();
        
        if (isDevelopment) {
            // Development mode: Point to live dev server
            return this.getDevModeHtml();
        } else {
            // Production mode: Use bundled assets
            return this.getProductionHtml(webview);
        }
    }

    private isDevServerRunning(): boolean {
        // Simple check - in real implementation, you'd ping the server
        return process.env.NODE_ENV === 'development';
    }

    private getDevModeHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Portfolio Hub</title>
            <style>
                body, html { margin: 0; padding: 0; overflow: hidden; }
                iframe { width: 100%; height: 100vh; border: none; }
            </style>
        </head>
        <body>
            <iframe 
                src="http://localhost:5173"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups">
            </iframe>
            <script>
                // Enhanced communication with your React app
                const vscode = acquireVsCodeApi();
                
                window.addEventListener('message', (event) => {
                    if (event.origin !== 'http://localhost:5173') return;
                    
                    // Forward messages from React app to VS Code
                    vscode.postMessage(event.data);
                });
                
                // Listen for VS Code messages and forward to React app
                window.addEventListener('message', (event) => {
                    const iframe = document.querySelector('iframe');
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage(event.data, 'http://localhost:5173');
                    }
                });
            </script>
        </body>
        </html>`;
    }

    private getProductionHtml(webview: vscode.Webview): string {
        // In production, serve bundled React app
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css')
        );

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Portfolio Hub</title>
            <link href="${styleUri}" rel="stylesheet">
        </head>
        <body>
            <div id="root"></div>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    private async handleCommand(command: string): Promise<void> {
        // Execute commands via VS Code API
        await vscode.commands.executeCommand(command);
    }

    private async handleSaveNote(content: string, project?: string): Promise<void> {
        // Direct file system access
        const portfolioRoot = this.projectManager.getPortfolioRoot();
        const notePath = project 
            ? `${portfolioRoot}/projects/${project}/dev-journal.md`
            : `${portfolioRoot}/notes/to-sort/note-${Date.now()}.md`;

        try {
            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(notePath),
                Buffer.from(`\n\n${content}`, 'utf8')
            );
            
            this.postMessage({
                type: 'noteSaved',
                success: true,
                path: notePath
            });
        } catch (error) {
            this.postMessage({
                type: 'noteSaved',
                success: false,
                error: error.message
            });
        }
    }

    private async handleRefreshStatus(): Promise<void> {
        const projects = this.projectManager.getProjects();
        const statuses = await Promise.all(
            projects.map(async (project) => ({
                id: project.id,
                running: await this.projectManager.checkProjectStatus(project)
            }))
        );

        this.postMessage({
            type: 'statusUpdate',
            statuses
        });
    }
}
```

### Enhanced React App Integration

In your existing React app, add VS Code extension detection:

```typescript
// src/hooks/useVSCodeExtension.ts
import { useState, useEffect } from 'react';

interface VSCodeAPI {
  postMessage: (message: any) => void;
  setState: (state: any) => void;
  getState: () => any;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VSCodeAPI;
  }
}

export const useVSCodeExtension = () => {
  const [vscode, setVscode] = useState<VSCodeAPI | null>(null);
  const [isInVSCode, setIsInVSCode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.acquireVsCodeApi) {
      const api = window.acquireVsCodeApi();
      setVscode(api);
      setIsInVSCode(true);

      // Listen for messages from VS Code
      window.addEventListener('message', (event) => {
        handleVSCodeMessage(event.data);
      });
    }
  }, []);

  const executeCommand = (command: string) => {
    if (vscode) {
      vscode.postMessage({ type: 'executeCommand', command });
    }
  };

  const saveNote = (content: string, project?: string) => {
    if (vscode) {
      vscode.postMessage({ type: 'saveNote', content, project });
    }
  };

  const refreshStatus = () => {
    if (vscode) {
      vscode.postMessage({ type: 'refreshStatus' });
    }
  };

  const handleVSCodeMessage = (message: any) => {
    switch (message.type) {
      case 'statusUpdate':
        // Update your project status state
        break;
      case 'noteSaved':
        // Handle note save confirmation
        break;
    }
  };

  return {
    isInVSCode,
    executeCommand,
    saveNote,
    refreshStatus
  };
};
```

## File System Operations

### Enhanced File Operations

```typescript
// src/utils/FileSystemManager.ts
import * as vscode from 'vscode';
import * as path from 'path';

export class FileSystemManager {
    constructor(private portfolioRoot: string) {}

    public async saveNote(content: string, project?: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `note-${timestamp}.md`;
        
        const notePath = project 
            ? path.join(this.portfolioRoot, 'projects', project, 'dev-journal.md')
            : path.join(this.portfolioRoot, 'notes', 'to-sort', fileName);

        const noteContent = this.formatNote(content, project);
        
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(notePath),
            Buffer.from(noteContent, 'utf8')
        );

        return notePath;
    }

    public async createProject(name: string, description: string): Promise<void> {
        const projectPath = path.join(this.portfolioRoot, 'projects', name);
        
        // Create project directory
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(projectPath));
        
        // Copy template files
        await this.copyTemplate(projectPath);
        
        // Update manifest.json
        await this.updateManifest(name, description);
        
        // Initialize git repository
        await this.initializeGitRepo(projectPath);
    }

    public async readManifest(): Promise<any> {
        const manifestPath = path.join(this.portfolioRoot, 'projects', 'manifest.json');
        const manifestContent = await vscode.workspace.fs.readFile(vscode.Uri.file(manifestPath));
        return JSON.parse(manifestContent.toString());
    }

    public async updateManifest(projectName: string, description: string): Promise<void> {
        const manifest = await this.readManifest();
        
        // Find next available port
        const usedPorts = manifest.projects.map(p => p.localPort);
        const newPort = this.findAvailablePort(usedPorts);
        
        // Add new project
        manifest.projects.push({
            id: projectName.toLowerCase().replace(/\s+/g, '-'),
            title: projectName,
            path: projectName,
            localPort: newPort,
            buildCommand: 'npm run dev',
            description: description,
            tech: ['React', 'TypeScript'],
            displayType: 'external'
        });

        const manifestPath = path.join(this.portfolioRoot, 'projects', 'manifest.json');
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(manifestPath),
            Buffer.from(JSON.stringify(manifest, null, 2), 'utf8')
        );
    }

    private formatNote(content: string, project?: string): string {
        const timestamp = new Date().toLocaleString();
        const projectInfo = project ? `**Project**: ${project}` : '**Project**: General';
        
        return `## ${timestamp}\n\n${projectInfo}\n\n${content}\n\n---\n`;
    }

    private findAvailablePort(usedPorts: number[]): number {
        const basePort = 3000;
        for (let i = 0; i < 100; i++) {
            const port = basePort + i;
            if (!usedPorts.includes(port)) {
                return port;
            }
        }
        return 3100; // Fallback
    }

    private async copyTemplate(projectPath: string): Promise<void> {
        const templatePath = path.join(this.portfolioRoot, 'project-template');
        
        if (await this.pathExists(templatePath)) {
            await vscode.workspace.fs.copy(
                vscode.Uri.file(templatePath),
                vscode.Uri.file(projectPath),
                { overwrite: true }
            );
        }
    }

    private async pathExists(path: string): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(path));
            return true;
        } catch {
            return false;
        }
    }

    private async initializeGitRepo(projectPath: string): Promise<void> {
        const terminal = vscode.window.createTerminal({
            name: 'Git Init',
            cwd: projectPath
        });

        terminal.sendText('git init');
        terminal.sendText('git add .');
        terminal.sendText('git commit -m "Initial commit"');
    }
}
```

## Production Build

### Webpack Configuration

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  target: 'node',
  mode: 'none',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log"
  }
};
```

### Build Scripts

```json
{
  "scripts": {
    "vscode:prepublish": "npm run package",
    "compile": "webpack",
    "watch": "webpack --watch",
    "package": "webpack --mode production --devtool hidden-source-map",
    "compile-tests": "tsc -p . --outDir out",
    "watch-tests": "tsc -p . -w --outDir out",
    "pretest": "npm run compile-tests && npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js"
  }
}
```

### Bundle React App for Production

```bash
# Build your React app for production
cd claude-dev-portfolio
npm run build

# Copy dist files to extension media folder
cp -r dist/* ../portfolio-vscode-extension/media/
```

## Testing & Debugging

### Launch Configuration (.vscode/launch.json)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
      ],
      "preLaunchTask": "${workspaceFolder}/npm: watch"
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
      ],
      "outFiles": [
        "${workspaceFolder}/out/test/**/*.js"
      ],
      "preLaunchTask": "${workspaceFolder}/npm: watch"
    }
  ]
}
```

### Test Setup

```typescript
// src/test/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import { ProjectManager } from '../../utils/ProjectManager';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Project Manager loads projects', async () => {
        const projectManager = new ProjectManager();
        const projects = await projectManager.loadProjects();
        
        assert.ok(Array.isArray(projects));
        assert.ok(projects.length > 0);
    });

    test('Command registration', async () => {
        const commands = await vscode.commands.getCommands(true);
        const portfolioCommands = commands.filter(cmd => cmd.startsWith('portfolioHub.'));
        
        assert.ok(portfolioCommands.length > 0);
        assert.ok(portfolioCommands.includes('portfolioHub.openDashboard'));
    });
});
```

## Publishing

### Package Extension

```bash
# Install vsce (Visual Studio Code Extension manager)
npm install -g vsce

# Package extension
vsce package

# This creates portfolio-hub-0.0.1.vsix
```

### Publish to Marketplace

```bash
# Get publisher token from https://dev.azure.com
vsce login your-publisher-name

# Publish extension
vsce publish

# Or publish specific version
vsce publish 1.0.0
```

### Private Distribution

```bash
# Package for private distribution
vsce package

# Install locally
code --install-extension portfolio-hub-0.0.1.vsix
```

## Migration Checklist

### Phase 1: Basic Extension
- [ ] Set up extension scaffolding
- [ ] Create webview that points to localhost:5173
- [ ] Implement basic command registration
- [ ] Test live development workflow

### Phase 2: Enhanced Features
- [ ] Add terminal integration
- [ ] Implement PowerShell script execution
- [ ] Add file system operations for notes
- [ ] Create project management commands

### Phase 3: Advanced Integration
- [ ] Add real-time status monitoring
- [ ] Implement advanced terminal layouts
- [ ] Add workspace integration
- [ ] Create comprehensive testing

### Phase 4: Production Ready
- [ ] Bundle React app for production
- [ ] Optimize extension performance
- [ ] Add comprehensive error handling
- [ ] Prepare for marketplace publication

## Best Practices

### Performance
- Use lazy loading for heavy operations
- Implement efficient file watching
- Cache project data appropriately
- Dispose of resources properly

### User Experience  
- Provide clear status indicators
- Use appropriate VS Code UI patterns
- Handle errors gracefully
- Maintain consistent theming

### Security
- Validate all user inputs
- Use secure command execution
- Implement proper file permissions
- Sanitize file paths

### Maintainability
- Use TypeScript for type safety
- Implement comprehensive logging
- Follow VS Code extension guidelines
- Document all APIs thoroughly

## Conclusion

This guide provides a comprehensive roadmap for converting your Portfolio Hub into a VS Code extension while preserving all existing functionality and adding powerful native capabilities. The extension will enhance your development workflow by providing seamless integration between your portfolio management and code editing environments.

The key benefits include:
- **Preserved live development** with your existing React hot reload
- **Enhanced command execution** without clipboard dependencies  
- **Native terminal integration** with project-specific positioning
- **Direct file system access** for notes and project creation
- **Workspace-aware** project detection and management

Start with Phase 1 to maintain your current workflow while gradually adding the enhanced features that make the extension truly powerful.