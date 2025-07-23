# Claude Development Portfolio - Instructions

## 📋 Documentation Navigation
- **[COMPLETED_FEATURES.md →](COMPLETED_FEATURES.md)** - All completed features and development history
- **[ARCHITECTURE.md →](ARCHITECTURE.md)** - Technical architecture and unified single-app design
- **[README.md](README.md)** - Project overview and quick start guide
- **[vscode-extension/CLAUDE.md →](vscode-extension/CLAUDE.md)** - VS Code extension documentation

---

## Essential Development Guidelines

### ⚠️ **SECURITY & PERFORMANCE REQUIREMENTS**

**🛡️ ALL COMMANDS MUST BE SECURE - NEVER bypass these protections:**

#### Command Execution Security
```typescript
// ✅ SECURE: Always use SecureCommandRunner
import { VSCodeSecurityService } from './securityService';

// For VS Code extension commands
const success = await VSCodeSecurityService.executeSecureCommand(
    command, 
    'Terminal Name', 
    workspaceRoot
);

// For React app commands  
import { SecureCommandRunner } from '../services/securityService';
if (SecureCommandRunner.validateCommand(command)) {
    // Safe to execute
} else {
    // Block dangerous command
    console.error('Command blocked:', command);
}

// ❌ NEVER DO: Direct terminal.sendText() without validation
terminal.sendText(userInput); // DANGEROUS!
```

#### Memory Leak Prevention
```typescript
// ✅ SECURE: Always cleanup intervals
useEffect(() => {
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval); // CRITICAL!
}, []);

// ✅ SECURE: Use React Query for data fetching
const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 30000, // 30s cache
});

// ❌ NEVER DO: Intervals without cleanup
useEffect(() => {
    setInterval(checkStatus, 5000); // MEMORY LEAK!
}, []);
```

#### Path Validation Requirements
```typescript
// ✅ SECURE: Always validate paths
const sanitizedPath = SecureCommandRunner.sanitizePath(
    userPath, 
    workspaceRoot
);

// ❌ NEVER DO: Direct path usage
cd "${userProvidedPath}"; // PATH TRAVERSAL RISK!
```

#### 🚨 **QUICK SECURITY CHECKLIST**
Before adding any new command execution:

- [ ] **Command Validation**: Using `SecureCommandRunner.validateCommand()`?
- [ ] **Path Sanitization**: Using `SecureCommandRunner.sanitizePath()`?
- [ ] **Workspace Trust**: VS Code commands check `requireWorkspaceTrust()`?
- [ ] **Interval Cleanup**: All `setInterval` have `clearInterval` in cleanup?
- [ ] **React Query**: Using for data fetching instead of manual polling?
- [ ] **No Direct terminal.sendText()**: All commands go through security layer?

#### 📚 **Security Services Available**
- `src/services/securityService.ts` - React app security
- `vscode-extension/claude-portfolio/src/securityService.ts` - VS Code extension security  
- `src/hooks/useProjectData.ts` - React Query data management
- `src/utils/optimizedPortManager.ts` - Cached port checking

### Current Status - UNIFIED SINGLE APP ARCHITECTURE
This CLAUDE.md focuses on the **unified single React application** that works seamlessly across all environments. The app uses smart environment detection to provide enhanced features when VS Code is available while maintaining full functionality as a standalone web application.

**🎉 BREAKTHROUGH**: We've eliminated the dual-app confusion and created one beautiful React app that works everywhere!

**Security Status**: ✅ **FULLY HARDENED** - All command injection vulnerabilities fixed (July 22, 2025)
**Architecture Status**: ✅ **UNIFIED SINGLE APP** - One React app + WebSocket bridge to VS Code
**Web App Status**: ✅ **PRODUCTION READY** - Works standalone with clipboard commands  
**VS Code Integration**: ✅ **WEBSOCKET BRIDGE** - Enhanced features via ws://localhost:8123
**Remote Ready**: ✅ **FUTURE-PROOF** - Architecture supports remote server integration

🏗️ **UNIFIED ARCHITECTURE ACHIEVEMENT (January 23, 2025)**:
- ✅ **Eliminated Dual Apps** - One React app replaces embedded webview + standalone web app
- ✅ **WebSocket Bridge Created** - VS Code extension provides service-only bridge at ws://localhost:8123
- ✅ **Smart Environment Detection** - React app adapts features based on VS Code availability
- ✅ **Iframe Issues Resolved** - No more CSP conflicts since app runs in regular browser
- ✅ **Remote Development Ready** - Architecture supports future home server integration
- ✅ **Security Preserved** - All existing security validation maintained and unified

🚀 **CRITICAL MIGRATION COMPLETED (January 23, 2025)**:
- ✅ **Button Audit Complete** - All 78 interactive elements catalogued and 35+ silent failures fixed
- ✅ **Deprecated API Elimination** - All 19+ `window.vsCodePortfolio` references replaced with unified architecture
- ✅ **Component Migration** - 5 critical components (App.tsx, LiveProjectPreview, PortfolioSidebar, ProjectStatusDashboard) fully migrated
- ✅ **VS Code Server Fix** - Security patterns synchronized between React app and VS Code extension, server now starts successfully
- ✅ **Production Ready** - All high-priority functionality working in both VS Code Enhanced and Web Application modes

🔒 **SECURITY FIXES (July 22, 2025)**:
- ✅ Fixed missing secure command handlers in VS Code extension
- ✅ Replaced all direct `terminal.sendText()` calls with `VSCodeSecurityService`
- ✅ Added comprehensive path validation for all project operations
- ✅ Implemented secure project launch methods with workspace trust checks
- 📋 Full security audit results: [SECURITY_AUDIT_RESULTS.md](SECURITY_AUDIT_RESULTS.md)

## 🚀 Optimized Architecture (January 2025)

**CONTEXT EFFICIENCY ACHIEVED!** The portfolio has been restructured to eliminate Claude context bloat:

### Before (Inefficient):
```
claude-dev-portfolio/
├── CLAUDE.md (loaded ✅)
├── projects/
│   ├── ggprompts/CLAUDE.md (loaded ❌)
│   ├── 3d-file-system/CLAUDE.md (loaded ❌)  
│   └── [8+ more projects with CLAUDE.md files]
```

### After (Optimized):
```
D:\ClaudeWindows\
├── claude-dev-portfolio/ (Clean portfolio hub)
│   ├── CLAUDE.md (ONLY this loaded ✅)
│   └── projects/manifest.json (points to external)
└── Projects/ (External projects - context isolated)
    ├── ggprompts/ (independent)
    ├── 3d-file-system/ (independent)
    └── [all projects with isolated contexts]
```

### Benefits Achieved:
- ✅ **Clean Context**: Only portfolio CLAUDE.md loaded at session start
- ✅ **Faster Performance**: Eliminated context processing overhead  
- ✅ **Independent Projects**: Each project maintains its own context
- ✅ **Scalable**: Easy to add new projects without portfolio bloat

### Critical Integration Points

#### CCGlobalCommands Integration
**Slash commands are now available globally!** The ClaudeGlobalCommands system provides 9 core commands and 47+ specialized agents that work from any project directory.

**Quick Start with Slash Commands:**
- `/guide` - Get comprehensive help and overview
- `/agents` - Browse all 47+ AI specialists  
- `/execute <task>` - Quick task execution with intelligent routing
- `/workflows <name>` - Multi-agent automation workflows
- `/senior-engineer` - Code reviews and architecture guidance
- `/documentation` - Generate technical documentation

**Installation Location:** `%USERPROFILE%\.claude\` (Windows)
**Repository Location:** `D:\ClaudeWindows\ClaudeGlobalCommands\`

#### Unified Single App Architecture
The portfolio system now uses **one React application** that adapts to different environments:

**🎯 Single React App** (`src/`):
- **Purpose**: Universal portfolio interface that works everywhere
- **Access**: `npm run dev` → http://localhost:5173 (or auto-assigned port)
- **Smart Detection**: Automatically detects VS Code WebSocket bridge availability
- **Features**: Full portfolio interface with adaptive command execution
- **No iframe Issues**: Runs in regular browser, perfect project previews

**🌉 WebSocket Bridge** (`vscode-extension/` directory):
- **Purpose**: Service-only bridge between React app and VS Code APIs  
- **Access**: Automatically starts at ws://localhost:8123 when VS Code extension loads
- **Features**: Terminal execution, file operations, Live Preview, notifications
- **Documentation**: [VS Code Extension CLAUDE.md](vscode-extension/CLAUDE.md)

**🎨 Environment Modes**:
- **🔗 VS Code Local**: WebSocket bridge connected → Enhanced features (direct terminals, Live Preview)
- **📱 Web Local**: Bridge unavailable → Clipboard mode (commands copy for manual execution)
- **🌍 Remote**: Future → API calls to home server for remote development

#### Recent Enhancements (January 2025)
- **✅ Enhanced Right Sidebar**: 50+ professional developer commands with smart execution
  - Quick Commands panel with VS Code API, Git, Development, and PowerShell categories
  - Context-aware command execution (direct API in VS Code, clipboard in web)
  - Three-panel system: Commands, VS Code Terminals, Live Preview
- **✅ 3D Project Smart Routing**: Automatic browser selection for projects requiring pointer lock
  - Projects with `requires3D: true` automatically open in external browser
  - Regular projects use VS Code Simple Browser or embedded iframe
  - Current 3D projects: 3D Matrix Cards (port 3005), 3D File System (port 3004)

#### Latest Security & Command Execution Fix (July 2025)
- **✅ Resolved "Commands Blocked for Security" Issue**: Implemented secure project execution system
  - Message-passing architecture between React app and VS Code extension
  - Fixed path traversal validation with proper workspace root scope
  - Automatic project status refresh with startup delay
  - Real-time communication bridge for status synchronization
  - All "Run" buttons now work without browser security conflicts

## Active Development Focus

### Current Projects (External Structure)
All projects are now located in `D:\ClaudeWindows\Projects\` for context isolation:

- **3d-matrix-cards-updated**: Three.js interactive card display with cyberpunk aesthetics (`requires3D: true`)
- **matrix-cards-react**: React cyberpunk card components with dynamic animations  
- **sleak-card-updated**: Modern card system with water effects and responsive design
- **ggprompts**: Main AI prompt platform with advanced features
- **ggprompts-style-guide**: Design system documentation and component library
- **ggprompts-professional**: Work-appropriate replica with corporate-friendly interface
- **3d-file-system**: Advanced 3D file system viewer with terminal interface and FPS controls (`requires3D: true`)
- **testproject**: React test application for portfolio integration testing

### Key Development Commands

**🚀 Unified App Quick Start:**
```bash
# Install dependencies
npm install

# Start unified portfolio app (auto-detects VS Code bridge)
npm run dev
# → Runs at http://localhost:5173 (or auto-assigned port)
# → Automatically connects to VS Code WebSocket bridge if available
# → Falls back to clipboard mode if VS Code not available

# Start all external projects
.\scripts\start-all-enhanced.ps1

# Create new external project  
.\scripts\create-project.ps1 -ProjectName "my-new-project" -Description "Project description"
```

**🔌 VS Code Extension Development:**
```bash
# For VS Code WebSocket bridge development:
cd vscode-extension/claude-portfolio
npm run compile
npx vsce package --out extension-name.vsix
code --install-extension extension-name.vsix

# See vscode-extension/CLAUDE.md for detailed extension docs
```

**🎯 Environment Detection:**
```typescript
// The React app automatically detects and adapts:
// 🔗 VS Code bridge available → Enhanced terminal execution
// 📱 Web-only mode → Clipboard-based commands  
// 🌍 Remote mode (future) → API-based commands
```

## Development Workflows

### Enhanced DEV NOTES System Workflow (January 2025)
1. **Note Creation**: DEV NOTES panel opens directly to Matrix Card note editor
2. **Project Selection**: Choose project from dropdown or leave as "General"
3. **Claude Instructions**: Add optional instructions for AI organization (marked with ###)
4. **Note Content**: Write your thoughts in the large letter-sized content area
5. **Save to TO-SORT**: Notes automatically saved to to-sort folder with project context
6. **Organization**: Use "Organize Notes" button to generate Claude prompts for batch sorting
7. **View Organized**: Toggle to "ORGANIZED" view to browse processed notes by project

### Complete Note Organization System
- **To-Sort Folder**: `D:\ClaudeWindows\claude-dev-portfolio\notes\to-sort\`
  - Quick capture with automatic project context and timestamps
  - Claude instructions field for AI-assisted organization
  - Visual indicators: 💾 for saved notes, 🟡 for unsaved
- **Organized Folders**: `D:\ClaudeWindows\claude-dev-portfolio\notes\organized\`
  - Main organized folder for general notes
  - Project-specific folders: `notes/organized/{project}/`
  - Visual indicators: 📋 for organized notes, 🗂️ for folder tags
- **Smart Organization**: Generated prompts include project-specific context and file paths
- **Enhanced Filtering**: View organized notes by "All Projects" or specific project
- **Professional UI**: Toggle between TO-SORT and ORGANIZED views with distinct styling

### Unified Development Workflow  
1. **Launch React App**: `npm run dev` starts the unified portfolio at http://localhost:5173+
2. **VS Code Integration**: Extension automatically starts WebSocket bridge at ws://localhost:8123
3. **Smart Environment Detection**: 
   - React app detects bridge and shows **🔗 VS Code Enhanced** mode
   - Commands execute directly in VS Code terminals
   - Live Preview integration works seamlessly
   - File operations use VS Code APIs
4. **Fallback Mode**: Without VS Code, app shows **📱 Web Application** mode with clipboard commands
5. **No iframe Issues**: App runs in regular browser → Perfect project previews!

## Project Management

### Creating New Projects
```powershell
# Create a new project with automatic setup
.\scripts\create-project.ps1 -ProjectName "my-awesome-project" -Description "Description here"

# The script will:
# - Create project directory from template
# - Automatically update manifest.json and portManager.ts
# - Assign available port automatically (from fallback range)
# - Initialize git repository
# - Create development journal
# - Integrate with DEV NOTES system
```

### Port Assignment for New Projects
When adding new projects to `manifest.json`:
1. **Check current port assignments** in the manifest file
2. **Assign next available port** from the series: 3006, 3007, 3008, 3009, 3010, 5174, 5175, 5176, 5177
3. **Update `src/utils/portManager.ts`** to include the new project in `DEFAULT_PORTS`
4. **Test port detection** to ensure no conflicts with existing services

**Example manifest entry:**
```json
{
  "id": "new-project",
  "title": "New Project",
  "localPort": 3006,
  "buildCommand": "npm run dev",
  "path": "new-project"
}
```

## Unified Architecture Benefits

### ✅ **Problems Solved**
- **🚫 No More Dual App Confusion**: One React app replaces embedded webview + standalone web
- **🎯 iframe Issues Resolved**: No CSP conflicts since app runs in regular browser
- **🔒 Security Streamlined**: Single validation path eliminates conflicts
- **📱 Perfect Previews**: Project iframes work flawlessly in browser environment
- **🌍 Remote Ready**: Architecture supports future home server integration
- **⚡ Performance**: Eliminated context switching between dual environments

### 🔧 **How It Works**
```
React App (localhost:5173) → Smart Detection → Environment Adaptation

🔗 VS Code Available:
   React App → WebSocket (ws://localhost:8123) → VS Code Extension → Terminals

📱 Web Only Mode:  
   React App → Clipboard API → Manual Terminal Execution

🌍 Future Remote:
   React App → HTTPS API → Home Server → Command Execution
```

### 🎨 **Environment Status Indicators**
- **🔗 VS Code Enhanced**: WebSocket bridge connected, full terminal integration
- **📱 Web Application**: Standalone mode, clipboard-based commands
- **🌍 Remote Access**: Future home server API integration
- **❌ Connection Lost**: Automatic fallback to clipboard mode

## Troubleshooting

### 🔍 **Port Detection Issues**
**Problem**: React app shows incorrect project status (e.g., "1/8 running" when more projects are actually running)
**Symptoms**:
- Console spam with `AbortError: signal is aborted without reason`
- Projects showing as offline in React app but online in VS Code sidebar
- Excessive fetch requests to ports (every 5 seconds)

**Root Cause**: 
- Shared `AbortController` causing concurrent port checks to cancel each other
- React Query polling too aggressively (5s interval)
- Multiple fetch requests interfering with browser's connection limits

**Solution Applied** (January 23, 2025):
```typescript
// Fixed in optimizedPortManager.ts
// Before: Single shared AbortController
private checkController?: AbortController; // ❌ Caused conflicts

// After: Individual controllers per port check  
const portController = new AbortController(); // ✅ Isolated checks
```

**React Query Timing Optimized**:
```typescript
// useProjectData.ts - Reduced polling frequency
staleTime: 60 * 1000,        // 60s (was 30s)
refetchInterval: 15 * 1000,  // 15s (was 5s) 
```

**Debug Commands**:
```javascript
// Test individual ports in browser console
fetch('http://localhost:3002', {method: 'GET', mode: 'no-cors'})
  .then(r => console.log('✅ Success:', r.type))
  .catch(e => console.log('❌ Failed:', e));

// Check React Query cache
console.log('Status cache:', queryClient.getQueryData(['projectStatus']));
```

### 🌉 **WebSocket Bridge Issues**
**Problem**: React app shows "📱 Web Application" instead of "🔗 VS Code Enhanced"
**Solution**:
- Ensure VS Code extension is installed and activated
- Check VS Code Output → "Claude Portfolio" for WebSocket bridge startup messages
- Verify no firewall blocking localhost:8123
- Try reloading VS Code window (Ctrl+Shift+P → "Developer: Reload Window")

**Problem**: Commands not executing in VS Code terminals
**Solution**:
- Check WebSocket connection in browser console
- Ensure workspace is trusted in VS Code
- Verify VS Code extension has required permissions
- Check VS Code Output panel for security validation errors

### ⚠️ Security Issues
**Problem**: Command blocked by security validation
**Solution**:
- Check if command is in `ALLOWED_COMMANDS` list in `securityService.ts`
- Verify command doesn't contain dangerous patterns (`;`, `|`, `..`, etc.)
- For npm commands, ensure script name is in `ALLOWED_NPM_SCRIPTS`
- For PowerShell scripts, ensure they're in `scripts/` directory and end with `.ps1`

**Problem**: VS Code workspace trust required
**Solution**:
- Trust the workspace using VS Code's trust dialog
- All command execution requires trusted workspace for security
- Commands will be blocked in untrusted workspaces

**Problem**: Memory leaks or performance issues
**Solution**:
- Check for intervals without cleanup: `useEffect(() => { setInterval(...); return () => clearInterval(...); })`
- Use React Query instead of manual polling: `const { data } = useQuery(...)`
- Check `optimizedPortManager.getCacheStats()` for cache performance

### Common Issues
1. **Port Conflicts**: Use `netstat -ano | findstr :PORT` to check port usage
2. **PowerShell Execution**: Set execution policy with `Set-ExecutionPolicy RemoteSigned`
3. **Git Commands**: Ensure git is installed and accessible from command line

### Port Management Issues
**Problem**: Project showing as "running" when it's not, or incorrect status detection
**Solution**: 
- Check if another service is using the project's assigned port
- Use `netstat -ano | findstr :PORT` to identify process on specific port
- Kill conflicting process: `powershell "Stop-Process -Id PROCESS_ID -Force"`
- Portfolio port (5173) is excluded from project detection to prevent false positives

**Problem**: DEV NOTES system clipboard not working
**Solution**:
- Ensure browser allows clipboard access (HTTPS or localhost required)
- Check browser console for clipboard permission errors
- Try manually copying generated prompts from browser developer tools

### Project Won't Start
```bash
# Check if port is in use
netstat -ano | findstr :3001

# Kill process if needed
taskkill /PID [process-id] /F

# Restart project
cd projects/project-name
npm run dev
```

## Documentation Structure

This CLAUDE.md file focuses on essential development guidelines and current active work. For additional information:

- **[COMPLETED_FEATURES.md](COMPLETED_FEATURES.md)** - All completed VS Code integration work and past achievements
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture, dual-React setup, and component details
- **[README.md](README.md)** - Public documentation and project overview
- **[PLAN.md](PLAN.md)** - Future development roadmap

## File Structure Reference (Optimized)
```
D:\ClaudeWindows\
├── claude-dev-portfolio/       # Portfolio hub (clean context)
│   ├── src/                    # Portfolio React app
│   │   ├── components/         # React components
│   │   ├── utils/              # Port manager, VS Code integration
│   │   └── App.tsx             # Main application
│   ├── projects/               # Configuration only
│   │   ├── manifest.json       # Project configuration (external paths)
│   │   └── dev-journals/       # Development logs
│   ├── scripts/                # PowerShell automation scripts
│   ├── vscode-extension/       # VS Code extension
│   └── docs/                   # Documentation
└── Projects/                   # External projects (context isolated)
    ├── ggprompts/              # Independent project with own CLAUDE.md
    ├── 3d-file-system/         # Independent project with own CLAUDE.md
    ├── matrix-cards-react/     # Independent project
    └── [all other projects]    # Each with isolated context
```