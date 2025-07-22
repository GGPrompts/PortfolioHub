# Technical Architecture - Portfolio System

## 📋 Documentation Navigation
- **[← COMPLETED_FEATURES.md](COMPLETED_FEATURES.md)** - All completed VS Code integration work
- **[← CLAUDE.md](CLAUDE.md)** - Essential development guidelines and current work
- **[README.md](README.md)** - Project overview and quick start guide

---

## System Overview

The Claude Development Portfolio is a dual-architecture React application that provides both standalone web access and integrated VS Code extension functionality. The system maintains a single codebase with smart environment detection for seamless operation across both contexts.

## Architecture Patterns

### Dual-React Application Architecture

The portfolio implements a sophisticated dual-architecture pattern where the same React codebase serves two distinct environments:

1. **Web Application** (`npm run dev` → http://localhost:5173)
2. **VS Code Extension Webview** (Activity Bar integration)

### Smart Environment Detection

**Core Detection Logic** (`src/utils/vsCodeIntegration.ts`):
```typescript
export function isVSCodeEnvironment(): boolean {
  return typeof window !== 'undefined' && 
         window.location.protocol === 'vscode-webview:';
}
```

This detection enables automatic API selection:
- **VS Code Context**: Direct terminal execution, file operations, workspace management
- **Web Context**: Clipboard-based operations, browser APIs, external navigation

## Component Architecture

### Primary Components Structure

```
src/components/
├── PortfolioSidebar.tsx         # Main left navigation with dynamic panels
├── RightSidebar.tsx             # NEW: Quick Commands & Cheat Sheet system
├── QuickCommandsPanel.tsx       # NEW: 50+ developer commands with smart execution
├── LiveProjectPreview.tsx       # Project cards with 3D-aware iframe previews
├── ProjectStatusDashboard.tsx   # Comprehensive project management
├── ProjectViewer.tsx            # Individual project display
├── GitUpdateButton.tsx          # Version control integration
├── SvgIcon.jsx                  # Professional icon library
├── VSCodeManager.tsx            # VS Code Server integration (web version)
└── EnhancedProjectViewer/       # Project landing pages
    ├── EnhancedProjectViewer.tsx
    ├── ProjectInfo.tsx
    ├── ProjectReadme.tsx
    ├── ProjectCommands.tsx
    └── ProjectClaude.tsx
```

### State Management Architecture

**Primary State Management**: React hooks with local component state
**Global State**: Project data loaded from `projects/manifest.json`
**Real-time Updates**: Port detection and status monitoring every 5 seconds

### API Integration Layer

**VS Code Integration Utility** (`src/utils/vsCodeIntegration.ts`):
```
├── Environment Detection
│   └── isVSCodeEnvironment()
├── Command Execution
│   ├── executeCommand()          # Direct terminal execution
│   └── executeCommandWeb()       # Clipboard fallback
├── File Operations
│   ├── saveFile()               # Direct VS Code API
│   ├── readFile()               # File system access
│   └── updateGitRepo()          # Git operations
├── User Interface
│   ├── showNotification()       # VS Code notifications
│   ├── copyToClipboard()        # Smart clipboard handling
│   └── openInBrowser()          # Simple Browser integration
├── Workspace Management
│   ├── addToWorkspace()         # Project workspace addition
│   └── focusTerminal()          # Terminal focus management
└── Project Operations
    ├── startProject()           # Development server startup
    ├── stopProject()            # Server termination
    ├── checkProjectStatus()     # Port detection
    └── openInExternalBrowser()  # NEW: 3D project smart routing
```

## Enhanced Sidebar Architecture (January 2025)

### Right Sidebar System

**New Three-Panel Architecture** (`RightSidebar.tsx`):
```
Right Sidebar (800px width)
├── Tab Navigation System
│   ├── Quick Commands Tab    # 50+ developer commands
│   ├── VS Code Terminals Tab # Integrated terminal management
│   └── Live Preview Tab      # Project preview controls
├── Panel Content System
│   ├── QuickCommandsPanel    # Command execution with smart routing
│   ├── VSCodeManager         # Terminal interface (web version)  
│   └── PreviewManager        # Project preview management
└── Smart Execution Layer
    ├── VS Code API Integration  # Direct command execution
    ├── Clipboard Fallback      # Web version command copying
    └── Context-Aware Routing   # Environment-specific behavior
```

**Command Categories** (`QuickCommandsPanel.tsx`):
- **VS Code Commands**: Direct API execution (Open Folder, New Terminal, Command Palette)
- **Git Operations**: Integrated git commands (status, pull, push, commit, sync)
- **Development Tasks**: Project lifecycle (Start Dev, Build, Install Dependencies)
- **PowerShell Operations**: System commands (navigation, file management, process control)
- **AI Prompts**: Development workflow enhancement templates

### 3D Project Routing Architecture

**Smart Browser Selection Logic** (`LiveProjectPreview.tsx`):
```typescript
// Automatic 3D project detection and routing
if ((project as any).requires3D) {
  // Force external browser for 3D projects that need pointer lock
  openInExternalBrowser(url, 'Requires pointer lock for 3D navigation')
} else {
  // Use Simple Browser for regular projects
  openInBrowser(url)
}
```

**3D Project Configuration** (`manifest.json`):
```json
{
  "id": "3d-matrix-cards",
  "requires3D": true,
  "description": "...Features FPS controls, 3D navigation..."
}
```

**Browser Selection Matrix**:
- **3D Projects** (`requires3D: true`): External browser (pointer lock support)
- **Regular Projects**: VS Code Simple Browser or embedded iframe
- **Fallback Handling**: Graceful degradation for unsupported environments

## VS Code Extension Architecture

### Extension Entry Point

**Main Activation** (`vscode-extension/claude-portfolio/src/extension.ts`):
- Registers portfolio webview provider
- Sets up command palette integration
- Manages extension lifecycle

### Webview Provider System

**Core Provider** (`portfolioWebviewProvider.ts`):
```typescript
class PortfolioWebviewProvider implements vscode.WebviewViewProvider {
  // Message handling between VS Code API and React portfolio
  private handleMessage(message: any): void {
    switch (message.command) {
      case 'executeTerminalCommand':
        // Direct terminal execution
      case 'showNotification':
        // VS Code notification display
      case 'openInBrowser':
        // Simple Browser integration
      // ... 10+ additional commands
    }
  }
}
```

### Asset Management

**Build Integration**:
- Portfolio React app built to `portfolio-dist/` directory
- Assets embedded directly in VS Code extension package
- Dynamic hash-based cache busting for updates

### Communication Protocol

**Message-Based API Bridge**:
```typescript
// React → VS Code Extension
postMessage({
  command: 'executeTerminalCommand',
  text: 'npm run dev',
  cwd: '/path/to/project'
});

// VS Code Extension → React
webview.postMessage({
  command: 'projectStatusUpdate',
  projectId: 'matrix-cards',
  status: 'running',
  port: 3002
});
```

## Project Management System

### Port Management Architecture

**Port Allocation Strategy**:
- **Portfolio**: Auto-assigned by Vite (typically 5173+)
- **Projects**: Fixed assignments with fallback ranges
- **Detection**: Fetch API with HEAD requests for reliability
- **Conflict Resolution**: Automatic fallback to alternative ports

**Port Configuration** (`src/utils/portManager.ts`):
```typescript
export const DEFAULT_PORTS = {
  'ggprompts-style-guide': 3001,
  'matrix-cards': 3002,
  'sleak-card': 3003,
  '3d-file-system': 3004,
  '3d-matrix-cards': 3005,
  'ggprompts-professional': 3006,
  'ggprompts': 9323
};

export const FALLBACK_PORTS = [3007, 3008, 3009, 3010, 5174, 5175, 5176, 5177];
```

### Project Lifecycle Management

**PowerShell Automation Scripts**:
- `start-all-tabbed.ps1` - Windows Terminal tabbed startup
- `start-all-enhanced.ps1` - Comprehensive server detection
- `create-project.ps1` - Automated project scaffolding
- `kill-all-servers.ps1` - Server cleanup and termination

### Project Configuration Schema

**Manifest Structure** (`projects/manifest.json`):
```json
{
  "projects": [
    {
      "id": "matrix-cards",
      "title": "Matrix Cards",
      "description": "React cyberpunk card components",
      "localPort": 3002,
      "buildCommand": "npm run dev",
      "path": "matrix-cards",
      "techStack": ["React", "TypeScript", "Vite"],
      "status": "active",
      "lastUpdated": "2025-01-22"
    }
  ]
}
```

## User Interface Architecture

### Sidebar System Architecture

**Dynamic Panel Management**:
- **Tab-based Navigation**: Professional notebook-style tabs
- **Order-based Opening**: Panels appear in click order
- **State Management**: CSS-based visibility with React state
- **Width Management**: Dynamic adjustment (400px, 600px, 800px)

**Panel Types**:
1. **Projects Panel** (400px): Project grid and management controls
2. **DEV NOTES Panel** (600px): Matrix Card note-taking interface
3. **VS Code Panel** (800px): Embedded VS Code Server integration

### Status Display System

**Real-time Status Architecture**:
- **Live Detection**: 5-second polling intervals
- **Visual Indicators**: Green/red status dots with count badges
- **Section Organization**: Auto-sorted ONLINE/OFFLINE sections
- **Collapsible Sections**: Click headers to expand/collapse

### Device Preview System

**Realistic Device Scaling**:
- **Mobile Previews**: iPhone 13/14 proportions (375×812px, 9:19.5 aspect ratio)
- **Desktop Previews**: Full HD resolution (1920×1080px, 16:9 aspect ratio)
- **Zoom Levels**: 25%, 50%, 75%, 100%, and "fit to container"
- **Viewport Injection**: Automatic meta tag insertion for accurate rendering

## Development Workflow Architecture

### Note Management System

**Matrix Card Notes Architecture**:
- **3D Flip Interface**: Professional cyberpunk-themed note cards
- **Dual Fields**: Separate Claude instructions and note content
- **Project Context**: Automatic folder path integration
- **Metadata Generation**: Timestamps, project paths, AI instructions
- **Organization System**: To-sort folder with batch processing capabilities

**File Organization**:
```
notes/
├── to-sort/                     # Incoming notes for organization
│   ├── note-2025-01-22-001.md
│   └── note-2025-01-22-002.md
└── organized/                   # Processed notes by category
    ├── project-specific/
    ├── architecture/
    └── research/
```

### Development Journal Integration

**Journal Architecture**:
- **Project-Specific Logs**: `projects/dev-journals/{project-name}.md`
- **Automated Timestamps**: ISO format with local timezone
- **Claude Integration**: Context-aware prompt generation
- **Markdown Formatting**: Consistent structure with metadata headers

## Integration Points

### CCGlobalCommands Integration

**Slash Command System**:
- **Installation Location**: `%USERPROFILE%\.claude\` (Windows)
- **Repository Location**: `D:\ClaudeWindows\ClaudeGlobalCommands\`
- **Core Commands**: `/guide`, `/agents`, `/execute`, `/workflows`, `/senior-engineer`
- **Agent Directory**: 47+ specialized AI assistants

### Git Integration Architecture

**Version Control Workflow**:
- **Portfolio Updates**: Main application repository management
- **Project Updates**: Individual project repository handling
- **Command Generation**: Smart git command creation with context
- **Security Model**: Clipboard-based execution for safety

### VS Code Server Integration

**Multi-Tab Architecture**:
- **Primary Instance**: Main development environment
- **Additional Tabs**: Parallel development workflows (Tab 1, Tab 2, Tab 3)
- **State Persistence**: Instances maintained across panel changes
- **Profile Integration**: "Matt" profile with dark theme and settings

## Performance Considerations

### Asset Loading Strategy

**Optimization Techniques**:
- **Code Splitting**: Component-level lazy loading
- **Asset Bundling**: Vite-based optimization
- **Cache Management**: Hash-based asset versioning
- **Image Optimization**: SVG icons for scalability

### Memory Management

**Resource Optimization**:
- **Virtual Scrolling**: Large project lists (not yet implemented)
- **Component Unmounting**: Proper cleanup for iframe previews
- **State Cleanup**: Event listener removal on component unmount
- **iframe Management**: Controlled loading and unloading

## Security Architecture

### Content Security Policy

**VS Code Webview CSP**:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'none'; 
               script-src 'unsafe-inline' 'unsafe-eval'; 
               style-src 'unsafe-inline'; 
               img-src data: https:; 
               frame-src http://localhost:*;">
```

**Web Application CSP**:
- Standard browser security model
- HTTPS enforcement for production
- Localhost exemptions for development

### Command Execution Security

**VS Code Context**:
- Direct API execution through extension host
- Sandboxed terminal execution
- File system access through VS Code APIs

**Web Context**:
- Clipboard-based command sharing
- No direct system access
- User confirmation for sensitive operations

## Deployment Architecture

### VS Code Extension Packaging

**Build Process**:
1. **Portfolio Build**: `npm run build` → `portfolio-dist/`
2. **Extension Compilation**: TypeScript → JavaScript
3. **Asset Embedding**: Portfolio files copied to extension package
4. **VSIX Creation**: VS Code extension packaging
5. **Installation**: `.\reinstall.ps1` automation script

### Web Application Deployment

**Development Deployment**:
- **Vite Dev Server**: Hot module replacement
- **Port Auto-Assignment**: Conflict resolution
- **Live Reload**: File change detection

**Production Considerations**:
- **Static Build**: `npm run build`
- **Asset Optimization**: Minification and compression
- **Environment Variables**: Configuration management

## Troubleshooting Architecture

### Error Handling Strategy

**Graceful Degradation**:
- **API Failures**: Fallback to alternative methods
- **Port Conflicts**: Automatic port reassignment
- **Network Issues**: Retry logic with exponential backoff
- **VS Code Integration**: Web fallback when extension unavailable

### Debugging Infrastructure

**Development Tools**:
- **Console Logging**: Environment-specific debug output
- **Error Boundaries**: React error containment
- **Status Monitoring**: Real-time system health checks
- **Performance Metrics**: Component render timing (development mode)

This architecture enables a robust, scalable development portfolio system that seamlessly operates across multiple environments while maintaining a single, maintainable codebase.