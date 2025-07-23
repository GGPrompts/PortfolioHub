# Claude Development Portfolio - Project Context

## Project Overview
I'm working on a **dual-environment portfolio system** with three distinct but interconnected components. Please understand the architecture before making any changes.

## 🏗️ **Three Components Explained**

### 1. **VS Code Extension (Native Sidebar)**
- **Location**: `vscode-extension/claude-portfolio/`
- **What it is**: Native VS Code extension with sidebar panels
- **Key Files**: `src/extension.ts`, `src/projectProvider.ts`, `package.json`
- **Features**:
  - Project tree view with checkboxes and status indicators
  - Right-click context menus (Run Project, Open in Browser)
  - Batch operation commands panel
  - **Direct VS Code API access** - commands execute in real VS Code terminals
  - Message passing to embedded React app via `postMessage`

### 2. **VS Code React App (Embedded Webview)**
- **Location**: Main portfolio React app served inside VS Code webview
- **What it is**: Portfolio React app embedded in VS Code extension webview
- **Environment Detection**: `window.vsCodePortfolio?.postMessage` exists
- **Key Features**:
  - Full portfolio interface (project cards, DEV NOTES, etc.)
  - **Message passing to extension** - sends commands via `postMessage`
  - VS Code-specific security restrictions (CSP, no direct terminal access)
  - Shows "🔌 VS Code Extension" environment badge

### 3. **Web React App (Standalone Browser)**
- **Location**: Same React app but accessed via `npm run dev` (port 5173)
- **What it is**: Standalone web version in regular browser
- **Environment Detection**: `window.vsCodePortfolio?.postMessage` is undefined
- **Key Features**:
  - Full portfolio interface (identical to embedded version)
  - **Clipboard-based commands** - copies commands for manual execution
  - No VS Code integration - pure web app
  - Shows "🌐 Web Application" environment badge

## 🔄 **How They Interact**

### **Command Execution Flow**:
```
1. VS Code Extension Panels → Direct terminal execution
2. VS Code React App → postMessage → Extension → Terminal execution  
3. Web React App → Clipboard copy → Manual paste in terminal
```

### **Environment Detection Logic**:
```typescript
export const isVSCodeEnvironment = (): boolean => {
  return !!(window as any).vsCodePortfolio?.postMessage;
};
```

### **Security Architecture**:
- **Shared Security Config**: `src/shared/security-config.ts` - single source of truth
- **VS Code Extension**: Uses `VSCodeSecurityService.executeSecureCommand()`
- **React Apps**: Use `SecureCommandRunner.validateCommand()` before execution

## 📁 **Key File Locations**

### VS Code Extension:
- `vscode-extension/claude-portfolio/src/extension.ts` - Main extension entry
- `vscode-extension/claude-portfolio/src/projectProvider.ts` - Project tree view
- `vscode-extension/claude-portfolio/src/portfolioWebviewProvider.ts` - React app integration
- `vscode-extension/claude-portfolio/package.json` - Extension manifest & commands

### React App (Both Environments):
- `src/App.tsx` - Main React application
- `src/utils/vsCodeIntegration.ts` - Environment detection & command routing
- `src/components/EnvironmentBadge.tsx` - Shows VS Code vs Web indicator
- `src/shared/security-config.ts` - Security validation rules

### Project Configuration:
- `projects/manifest.json` - Project definitions with `displayType` field:
  - `"external"` - Regular projects with dev servers
  - `"vscode-embedded"` - Extension-native projects (always online)

## 🎯 **Important Development Rules**

### **When Working on VS Code Extension**:
- Use TypeScript compilation: `npm run compile`
- Package: `npx vsce package --out extension-name.vsix`
- Install: `code --install-extension extension-name.vsix`
- **Context**: Work in `vscode-extension/claude-portfolio/` directory

### **When Working on React App**:
- Build: `npm run build` (creates `dist/` folder)
- Copy to extension: Copy `dist/*` to `vscode-extension/claude-portfolio/portfolio-dist/`
- **Context**: Work in main portfolio directory

### **Security Considerations**:
- **Never bypass** `SecureCommandRunner.validateCommand()`
- All command patterns must be in `SAFE_COMMAND_PATTERNS`
- VS Code webview has strict CSP - no inline scripts
- Message passing between React app and extension must be validated

## 🔧 **Current Status**
- ✅ **Security**: All command injection vulnerabilities fixed
- ✅ **Architecture**: Modular service layer with 73% code reduction
- ✅ **Integration**: Seamless message passing between components
- ✅ **UX**: Clear environment badges distinguish VS Code vs Web usage

## 🎪 **Common Tasks**
- **Add new project**: Update `projects/manifest.json` and `src/utils/portManager.ts`
- **Add new command**: Update security config, then implement in appropriate component
- **Fix security issue**: Check `shared/security-config.ts` patterns first
- **Debug integration**: Check VS Code Developer Tools and extension console

## 🚀 **Getting Started in New Session**
Please let me know which component you want to work on and I'll provide context-specific guidance!

---

*This document serves as a comprehensive introduction for new Claude sessions working on the portfolio project.*