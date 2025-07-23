# Claude Development Portfolio - Instructions

## 📋 Documentation Navigation
- **[COMPLETED_FEATURES.md →](COMPLETED_FEATURES.md)** - All completed VS Code integration work and past achievements
- **[ARCHITECTURE.md →](ARCHITECTURE.md)** - Technical architecture, dual-React setup, and component details
- **[README.md](README.md)** - Project overview and quick start guide

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

### Current Status
This is the root directory for all Claude-assisted development projects. The portfolio app serves as a central hub to view, launch, and manage all projects with a clean, professional interface and comprehensive development tools.

**Security Status**: ✅ **FULLY HARDENED** - All command injection vulnerabilities fixed (July 22, 2025)
**Portfolio Status**: ✅ **VS Code Extension Integration COMPLETED** - See [COMPLETED_FEATURES.md](COMPLETED_FEATURES.md) for details
**Architecture Status**: ✅ **ENTERPRISE-GRADE REFACTORING COMPLETED** - Modular architecture implemented (January 23, 2025)

🏗️ **LATEST ARCHITECTURE OVERHAUL (January 23, 2025)**:
- ✅ **987-line extension.ts reduced to 268 lines** (73% code reduction!)
- ✅ **Service Layer Created** - PortDetectionService, ProjectService, ConfigurationService
- ✅ **Command Handlers Modularized** - ProjectCommands, BatchCommands, SelectionCommands, WorkspaceCommands
- ✅ **100% Functional Parity** - All existing functionality preserved with clean architecture
- ✅ **Production Ready** - Enterprise-grade modular design with dependency injection

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

#### VS Code Extension Quick Reference
- **Extension Location**: `vscode-extension/claude-portfolio/`
- **Current Package**: `claude-portfolio-iframe-fix.vsix` (installed and working)
- **Key Integration File**: `src/utils/vsCodeIntegration.ts`
- **Reinstall Script**: `.\reinstall.ps1`

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

**Quick Start:**
```bash
# Install dependencies
npm install

# Start portfolio hub (runs on port 5173+, auto-assigned by Vite)
npm run dev

# Start all projects in tabbed Windows Terminal (recommended)
.\scripts\start-all-tabbed.ps1

# Create new project
.\scripts\create-project.ps1 -ProjectName "my-new-project" -Description "Project description"
```

**PowerShell Script Options:**
```powershell
# Start all projects
.\scripts\start-all-tabbed.ps1

# Start only portfolio
.\scripts\start-all-tabbed.ps1 -OnlyPortfolio

# Force restart all (stop existing first)
.\scripts\start-all-tabbed.ps1 -Force
```

## Development Workflows

### Matrix Card Notes System Workflow
1. **Default Interface**: DEV NOTES panel opens directly to Matrix Card note editor
2. **Project Selection**: Choose project from dropdown or leave as "General"
3. **Claude Instructions**: Add optional instructions for AI organization (marked with ###)
4. **Note Content**: Write your thoughts in the large letter-sized content area
5. **Save**: Notes automatically saved to to-sort folder with project context
6. **Organization**: Use "Organize Notes" button to generate Claude prompts for batch sorting

### Note Organization System
- **To-Sort Folder**: `D:\ClaudeWindows\claude-dev-portfolio\notes\to-sort\`
- **Automatic Metadata**: Project paths, timestamps, and Claude instructions included
- **Smart Organization**: Generated prompts include project-specific context and file paths
- **Flexible Destinations**: Notes can be moved to dev journals, CLAUDE.md, README, or topic folders

### VS Code Extension Development Workflow
1. **Launch VS Code**: Extension auto-loads with Claude Portfolio icon in activity bar
2. **Access Projects**: Three panels - Projects, Commands, Cheat Sheet
3. **Direct Actions**: 
   - Click project titles → Add to workspace or view landing page
   - Right-click projects → Start/Stop/Open in browser
   - All commands execute directly in VS Code terminals
4. **Live Previews**: Embedded iframe previews with proper CSP
5. **Integrated Experience**: No clipboard needed - everything runs natively

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

## Troubleshooting

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