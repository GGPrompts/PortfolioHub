# Claude Development Portfolio - Project Context

## Project Overview
I'm working on a **unified single React application** with smart environment detection and WebSocket bridge integration. The architecture has been revolutionized to eliminate dual-app confusion while providing seamless VS Code integration.

## 🎯 **Unified Architecture Explained**

### 1. **Single React Application (Universal)**
- **Location**: `src/` - One React app that works everywhere
- **Access**: `npm run dev` → http://localhost:5173+ (auto-assigned port)
- **What it is**: Universal portfolio interface that adapts to different environments
- **Key Features**:
  - **Smart Environment Detection** - automatically detects VS Code bridge availability
  - **Perfect iframe Previews** - no CSP conflicts since app runs in regular browser
  - **Progressive Enhancement** - enhanced features with VS Code, works standalone without
  - **Beautiful Styling** - your custom React UI preserved exactly as designed

### 2. **WebSocket Bridge Service (VS Code Extension)**
- **Location**: `vscode-extension/claude-portfolio/`
- **What it is**: Service-only VS Code extension that provides API bridge
- **Bridge Address**: `ws://localhost:8123` (automatically starts with extension)
- **Key Files**: `src/services/websocketBridge.ts`, `src/extension.ts`
- **Features**:
  - **Terminal Execution** - React app commands execute in real VS Code terminals
  - **Live Preview Integration** - opens projects in VS Code Live Preview
  - **File Operations** - save/delete files through VS Code file system API
  - **Native Notifications** - VS Code notifications from React app
  - **Project Management** - start/stop projects with workspace integration

## 🔄 **How They Interact**

### **Command Execution Flow**:
```
1. VS Code Extension Panels → Direct terminal execution (native VS Code API)
2. React App (with bridge) → WebSocket → Extension → Terminal execution  
3. React App (standalone) → Clipboard copy → Manual paste in terminal
```

### **Environment Detection Logic**:
```typescript
// Smart WebSocket bridge detection
class EnvironmentBridge {
  async initialize(): Promise<EnvironmentMode> {
    const connected = await this.tryConnectToVSCode(); // ws://localhost:8123
    return connected ? 'vscode-local' : 'web-local';
  }
}
```

### **Security Architecture**:
- **WebSocket Bridge Security**: All bridge messages validated through existing security services
- **VS Code Extension**: Uses `VSCodeSecurityService.executeSecureCommand()`
- **React App**: Uses `SecureCommandRunner.validateCommand()` before execution
- **Command Validation**: Whitelist-based patterns with dangerous command blocking

## 📁 **Key File Locations**

### VS Code Extension:
- `vscode-extension/claude-portfolio/src/extension.ts` - Main extension entry with WebSocket bridge startup
- `vscode-extension/claude-portfolio/src/services/websocketBridge.ts` - WebSocket bridge service (ws://localhost:8123)
- `vscode-extension/claude-portfolio/src/projectProvider.ts` - Project tree view
- `vscode-extension/claude-portfolio/package.json` - Extension manifest & commands

### React App (Universal):
- `src/App.tsx` - Main React application (works everywhere)
- `src/services/environmentBridge.ts` - Smart environment detection & WebSocket client
- `src/utils/vsCodeIntegration.ts` - Unified command execution API
- `src/components/EnvironmentStatus.tsx` - Connection status indicator (🔗 VS Code Enhanced vs 📱 Web Application)

### Project Configuration:
- `projects/manifest.json` - Project definitions with port configuration
- External projects located in `D:\ClaudeWindows\Projects\` for context isolation
- Portfolio uses auto-assigned Vite port (typically 5173+)

## 🎯 **Important Development Rules**

### **When Working on VS Code Extension**:
- Use TypeScript compilation: `npm run compile`
- Package: `npx vsce package --out claude-portfolio-unified-architecture.vsix`
- Install: `code --install-extension claude-portfolio-unified-architecture.vsix`
- **Context**: Work in `vscode-extension/claude-portfolio/` directory
- **WebSocket Bridge**: Automatically starts on extension activation at ws://localhost:8123

### **When Working on React App**:
- Start: `npm run dev` (auto-detects VS Code bridge if available)
- Build: `npm run build` (creates `dist/` folder for deployment)
- **Context**: Work in main portfolio directory
- **Bridge Detection**: App automatically adapts to VS Code availability

### **Security Considerations**:
- **Never bypass** `SecureCommandRunner.validateCommand()` or `VSCodeSecurityService.executeSecureCommand()`
- All WebSocket bridge messages validated through existing security services
- Command patterns must be in whitelisted `SAFE_COMMAND_PATTERNS`
- WebSocket communication secured with message validation

## 🔧 **Current Status**
- ✅ **Unified Architecture**: Single React app with WebSocket bridge integration completed
- ✅ **Security**: All command injection vulnerabilities fixed with enterprise-grade validation
- ✅ **WebSocket Bridge**: Service-only VS Code extension provides clean API bridge (ws://localhost:8123)
- ✅ **Smart Detection**: App automatically adapts features based on VS Code availability
- ✅ **Performance**: Eliminated dual-app confusion and iframe CSP conflicts

## 🎪 **Common Tasks**
- **Add new project**: Update `projects/manifest.json` and `src/utils/portManager.ts`
- **Add new command**: Update security validation, then implement in appropriate component
- **Test WebSocket bridge**: Check VS Code Output → "Claude Portfolio" for bridge status
- **Debug connection**: Check browser console for WebSocket connection messages
- **Fix security issue**: Check security service patterns first

## 🚀 **Getting Started in New Session**
Please let me know which component you want to work on and I'll provide context-specific guidance!

---

*This document serves as a comprehensive introduction for new Claude sessions working on the portfolio project.*