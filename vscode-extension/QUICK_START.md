# Quick Start - Claude Portfolio VS Code Extension

## Why a VS Code Extension?

Your suggestion was brilliant! Instead of fighting with iframes and web limitations, a VS Code extension provides:
- ✅ **Native integration** - No more state loss when switching tabs
- ✅ **Persistent workspace** - Everything stays open
- ✅ **Better UX** - Proper sidebars, keyboard shortcuts, context menus
- ✅ **No security issues** - No iframe restrictions
- ✅ **Extensible** - Easy to add new features

## Installation Steps

### 1. Build the Extension
```powershell
cd D:\ClaudeWindows\claude-dev-portfolio\vscode-extension\claude-portfolio
npm install
npm run compile
```

### 2. Install in VS Code

**Option A: Extension Development Host (for testing)**
```powershell
# This opens a new VS Code window with the extension loaded
code --extensionDevelopmentPath=D:\ClaudeWindows\claude-dev-portfolio\vscode-extension\claude-portfolio
```

**Option B: Install from VSIX (permanent)**
```powershell
# First, install vsce (VS Code Extension manager)
npm install -g vsce

# Package the extension
cd D:\ClaudeWindows\claude-dev-portfolio\vscode-extension\claude-portfolio
vsce package

# Install the .vsix file
code --install-extension claude-portfolio-0.0.1.vsix
```

## Features

### 1. Activity Bar Icon
- New Claude Portfolio icon in the activity bar (left sidebar)
- Shows three views:
  - **Projects**: All your portfolio projects
  - **Quick Commands**: Common VS Code and Git commands
  - **Cheat Sheet**: Development command reference

### 2. Project Management
- Click any project to open it in the workspace
- Right-click for options:
  - Run Project (starts dev server)
  - Open in Browser
- Projects show their port numbers and status

### 3. Dashboard Webview
- Click "Claude Portfolio" in the status bar
- Or use Command Palette: "Claude Portfolio: Show Dashboard"
- Beautiful overview of all projects
- Quick actions to run all servers

### 4. Command Palette Integration
- Press `Ctrl+Shift+P`
- Type "Claude" to see all commands:
  - Quick Open Project
  - Show Dashboard
  - Refresh Projects

## Benefits Over the Previous Approach

1. **No More iFrame Issues**
   - Workspace stays open
   - No "workspace does not exist" errors
   - State persists perfectly

2. **Better Integration**
   - Projects appear in Explorer
   - Terminals are native VS Code terminals
   - Full keyboard shortcut support

3. **Extensibility**
   - Easy to add AI features
   - Can integrate with Claude Code
   - Custom snippets and templates

4. **Professional Workflow**
   - Everything in one place
   - No browser tab switching
   - Proper development environment

## Next Steps

1. **Test the extension** using the development host
2. **Customize** the features you want
3. **Add more functionality**:
   - AI prompt integration
   - Project templates
   - Dependency management
   - Git status indicators

This is exactly what you needed - a proper VS Code integration that doesn't rely on hacky iframe solutions! 🚀

## Screenshot (What You'll See)

```
VS Code Window
├── 📁 Activity Bar
│   └── 🚀 Claude Portfolio (new icon)
│       ├── 📂 Projects
│       │   ├── 3D Matrix Cards (Port 3005) ▶️
│       │   ├── GGPrompts (Port 9323) ▶️
│       │   └── ... more projects
│       ├── ⚡ Quick Commands
│       │   ├── VS Code Commands
│       │   ├── Git Commands
│       │   └── Claude Commands
│       └── 📚 Cheat Sheet
│           ├── PowerShell
│           ├── Git
│           └── npm
├── 📊 Editor Area (Dashboard when opened)
└── 📍 Status Bar
    └── 🚀 Claude Portfolio (click for dashboard)
```

Your idea to use a VS Code extension instead of embedded iframes was perfect - this is the right way to integrate with VS Code!
