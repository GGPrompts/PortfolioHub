# Claude Portfolio VS Code Extension

## Overview

This VS Code extension integrates your Claude Portfolio directly into VS Code, providing:

- 🗂️ **Project Browser**: See all your projects in the sidebar
- 📊 **Dashboard**: Beautiful webview dashboard with project stats
- ⚡ **Quick Commands**: Fast access to common tasks
- 📚 **Cheat Sheet**: Development commands at your fingertips
- 🚀 **One-Click Actions**: Open, run, and browse projects instantly
- 🛡️ **Secure Execution**: All commands validated through VSCodeSecurityService
- 🚀 **ServerToolbar**: Start development servers with one click

## Latest Features (July 2025)

### 🚀 ServerToolbar Integration

The extension now includes a comprehensive server management toolbar:

- **Start All Servers**: Launch both portfolio and VS Code servers simultaneously
- **Portfolio Server**: Start portfolio dev server using VS Code tasks
- **VS Code Server**: Start VS Code web server with Simple Browser integration
- **Real-time Feedback**: Loading indicators and status messages
- **Secure Execution**: All commands use security validation

### 🔒 Complete Security Overhaul

- **Command Injection Protection**: All terminal commands validated
- **Path Sanitization**: Project paths normalized and secured
- **Workspace Trust**: Commands require trusted workspace
- **Command Whitelisting**: Only approved commands can execute
- **Individual Command Execution**: Multi-line commands broken into secure parts

### 🎯 Enhanced Live Previews

- **Simple Browser Integration**: Uses VS Code's Simple Browser instead of problematic iframes
- **Automatic Launch**: Servers automatically open in Simple Browser after startup
- **3D Project Support**: Smart browser routing for pointer lock compatibility
- **Background Process Management**: Proper handling of long-running servers

## Benefits Over iFrame Approach

1. **Native Integration**: Works seamlessly within VS Code
2. **Persistent State**: No more losing workspace when switching tabs
3. **Better Performance**: No iframe overhead or security restrictions
4. **Full VS Code API**: Access to all VS Code features
5. **Keyboard Shortcuts**: Define custom keybindings
6. **Context Menus**: Right-click actions on projects
7. **Status Bar**: Quick access from the status bar

## Installation

### Development Installation
```bash
cd D:\ClaudeWindows\claude-dev-portfolio\vscode-extension\claude-portfolio
npm install
npm run compile
```

### Installing in VS Code
1. Open VS Code
2. Press `Ctrl+Shift+P`
3. Run "Developer: Install Extension from Location"
4. Select the `claude-portfolio` folder

Or use the VS Code Extension Host:
```bash
code --extensionDevelopmentPath=D:\ClaudeWindows\claude-dev-portfolio\vscode-extension\claude-portfolio
```

## Features

### 1. Project Sidebar
- Lists all projects from your manifest
- Shows project status (active/inactive)
- Displays port numbers
- One-click to open project folders

### 2. Dashboard Webview
- Beautiful HTML/CSS dashboard
- Project statistics
- Quick actions for all projects
- Technology overview

### 3. Quick Commands Tree
- Organized by category
- One-click execution
- VS Code, Git, and Claude commands

### 4. Cheat Sheet Tree
- PowerShell commands
- Git commands
- npm commands
- Claude Code commands
- Click to copy or send to terminal

## Usage

### Opening Projects
1. Click on any project in the sidebar
2. Or use `Ctrl+Shift+P` → "Claude Portfolio: Quick Open"
3. Or click project cards in the dashboard

### Running Projects
1. Right-click a project → "Run Project"
2. Or click the play button in the project tree
3. Opens a new terminal with the correct directory

### Dashboard
1. Click the Claude Portfolio status bar item
2. Or use `Ctrl+Shift+P` → "Claude Portfolio: Show Dashboard"
3. See all projects, stats, and quick actions

## Configuration

```json
{
  "claudePortfolio.portfolioPath": "D:\\ClaudeWindows\\claude-dev-portfolio",
  "claudePortfolio.autoStartProjects": false,
  "claudePortfolio.defaultBrowser": "default"
}
```

## Architecture

```
claude-portfolio/
├── src/
│   ├── extension.ts         # Main extension entry
│   ├── projectProvider.ts   # Project tree provider
│   ├── dashboardPanel.ts    # Webview dashboard
│   ├── commandsProvider.ts  # Commands tree
│   └── cheatSheetProvider.ts # Cheat sheet tree
├── media/                   # Webview assets
├── package.json            # Extension manifest
└── tsconfig.json          # TypeScript config
```

## Development

### Building
```bash
npm run compile     # Compile TypeScript
npm run watch      # Watch mode
npm run lint       # Run linter
```

### Testing
Press `F5` in VS Code to launch a new Extension Development Host window.

### Publishing
```bash
vsce package       # Create .vsix file
vsce publish      # Publish to marketplace
```

## Future Enhancements

1. **Project Templates**: Create new projects from templates
2. **Git Integration**: Show git status for each project
3. **Process Management**: Start/stop project servers
4. **Dependency Viewer**: See and manage npm dependencies
5. **AI Integration**: Claude AI prompts directly in VS Code
6. **Snippet Library**: Custom snippets for your projects

## Why This Is Better

Instead of fighting with iframes and web security:
- **Native Experience**: Everything works as expected
- **No State Loss**: Projects stay open, terminals persist
- **Better UX**: Proper keyboard shortcuts, context menus
- **Extensible**: Easy to add new features
- **Shareable**: Package and share with others

This is the VS Code way! 🚀
