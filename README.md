# Claude Development Portfolio 🚀

A dual-architecture development portfolio system offering both **standalone web application** and **native VS Code extension** experiences for managing and showcasing multiple development projects.

## 🏗️ Dual Architecture Overview

This portfolio system provides **two separate but synchronized React applications**:

### 🌐 Web Version (`localhost:5173`)
- **Purpose**: Standalone portfolio browser and project showcase
- **Command Integration**: Clipboard-based commands for external execution
- **Use Case**: Independent portfolio viewing, presentations, team demos
- **Access**: `npm run dev` → http://localhost:5173

### 🔌 VS Code Extension Version
- **Purpose**: Native VS Code development environment integration  
- **Command Integration**: Direct VS Code API execution (terminals, files, workspace)
- **Use Case**: Active development workflow within VS Code IDE
- **Access**: Activity Bar → Claude Portfolio icon

## ✨ Why Two Versions?

**Different environments, different capabilities:**
- **Web**: Great for showcasing, limited to browser security model
- **VS Code**: Full system access, integrated development experience
- **Shared Codebase**: Same React components with smart environment detection
- **Automatic Fallback**: Code detects context and uses appropriate integration

## 🆕 Latest Breakthrough Features (July 2025)

### 🚀 ServerToolbar - One-Click Development Server Management
- **✅ Start All Servers**: Launch both portfolio and VS Code servers with one click
- **✅ Portfolio Server**: Start portfolio dev server (npm run dev) via VS Code tasks
- **✅ VS Code Server**: Start VS Code web server with Simple Browser integration
- **✅ Real-time Status**: Loading indicators and progress messages
- **✅ Security Compliant**: All commands use VSCodeSecurityService validation
- **✅ Auto-Launch Simple Browser**: Automatically opens live previews after server startup

### 🔒 Complete Security Audit & Fixes
- **✅ Eliminated Command Injection**: All terminal commands now use secure validation
- **✅ Path Sanitization**: Project paths validated and normalized
- **✅ Workspace Trust**: Commands require workspace trust for execution
- **✅ Command Whitelisting**: Only approved commands can be executed
- **✅ Individual Command Execution**: Multi-line commands broken into secure parts

### 🎯 Enhanced VS Code Integration
- **✅ Live Preview Support**: Uses VS Code Simple Browser instead of problematic iframes
- **✅ Task-Based Server Startup**: Leverages VS Code's task system for background processes
- **✅ Secure Message Passing**: All React ↔ VS Code communication validated
- **✅ Enhanced Error Handling**: Clear feedback when security blocks commands
- **✅ Background Process Management**: Proper handling of long-running development servers
- **✅ Synchronized Status Detection**: Identical port checking across both versions
- **✅ Live Preview Support**: Embedded iframe functionality in VS Code webview
- **✅ Project Landing Pages**: Detailed project information with tabbed interface
- **✅ Smart Environment Detection**: Automatic adaptation based on context

### 🏗️ Architecture Improvements
- **✅ Enhanced Content Security Policy**: VS Code webview supports localhost iframes
- **✅ Unified State Management**: Both versions share project data and status logic
- **✅ Robust Error Handling**: Graceful fallbacks for connection issues
- **✅ Fetch API Port Detection**: Reliable server detection replacing image-based checking

## ✨ Core Portfolio Features

### 📊 Project Management
- **🔄 Real-time Project Status** - Automatically detects running development servers
- **🎯 Smart Port Management** - Automatic port detection and conflict resolution
- **⚡ One-Click Launch** - Start all projects with a single PowerShell script
- **📊 Dashboard Analytics** - View project status, technologies used, and portfolio statistics
- **🔍 Project Filtering** - Filter projects by technology, status, or tags

### 🖼️ Visual Experience  
- **📱 Realistic Device Displays** - True-to-life mobile (375×812) and desktop (1920×1080) preview scaling
- **🎯 Collapsible Project Sections** - Hide offline projects to focus on active development
- **🖼️ Inline Project Viewing** - View projects directly in the portfolio with iframe integration
- **📱 Responsive Design** - Adaptive sidebar with collapsed, normal, and expanded states

### 📝 Development Tools
- **📝 Matrix Card Notes** - Professional note-taking system with 3D flip animations and AI organization
- **📚 Development Journals** - Track progress for each project with markdown support
- **🔗 Git Integration** - Update buttons and version control throughout portfolio
- **⌨️ Command Center** - Quick access to 50+ development commands

### 🆕 VS Code Extension Features
- **🗂️ Project Browser** - See all your projects in the VS Code sidebar
- **📊 Integrated Dashboard** - Beautiful webview dashboard within VS Code
- **⚡ Quick Commands** - Fast access to common tasks and Git operations
- **📚 Built-in Cheat Sheet** - Development commands at your fingertips
- **🚀 Context Menus** - Right-click actions on projects
- **⌨️ Keyboard Shortcuts** - Full VS Code keyboard integration
- **📍 Status Bar Access** - Quick dashboard access from status bar

## 🎯 Perfect For

- **Full-stack developers** with multiple active projects
- **Freelancers** showcasing client work  
- **Students** organizing coding projects
- **Teams** managing multiple development environments
- **3D developers** needing proper pointer lock support
- **Anyone** who wants to view all their projects in one place

## 📋 Prerequisites

- Node.js 18+ and npm
- PowerShell (Windows) or Terminal (Mac/Linux)
- Git for version control
- VS Code (for extension features)

## 🚀 Quick Start

### Option 1: Web Portfolio (Standalone)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/GGPrompts/claude-dev-portfolio.git
   cd claude-dev-portfolio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the portfolio:**
   ```bash
   npm run dev
   ```

4. **Visit** `http://localhost:5173` to see your portfolio

### Option 2: VS Code Extension (Recommended for Development) 🆕

1. **Build the extension:**
   ```powershell
   cd vscode-extension\claude-portfolio
   npm install
   npm run compile
   ```

2. **Install in VS Code:**
   ```powershell
   # For development/testing
   code --extensionDevelopmentPath=vscode-extension\claude-portfolio
   
   # For permanent installation
   npm install -g vsce
   vsce package
   code --install-extension claude-portfolio-iframe-fix.vsix
   ```

3. **Use the extension:**
   - Look for Claude Portfolio icon in the activity bar
   - Click projects to open them in workspace
   - Use status bar for dashboard access
   - Right-click projects for quick actions

## 📁 Project Structure

```
claude-dev-portfolio/
├── src/                     # React portfolio application
│   ├── components/          # React components
│   │   ├── ProjectGrid.tsx              # Project grid layout
│   │   ├── ProjectViewer.tsx            # Inline project viewer
│   │   ├── PortfolioSidebar.tsx         # Adaptive left sidebar
│   │   ├── RightSidebar.tsx             # Quick Commands & Cheat Sheet (NEW)
│   │   ├── QuickCommandsPanel.tsx       # 50+ developer commands (NEW)
│   │   ├── EnhancedProjectViewer/       # Project landing pages
│   │   ├── LiveProjectPreview.tsx       # 3D-aware project previews
│   │   └── ProjectStatusDashboard.tsx   # Status management
│   ├── store/              # Zustand state management
│   ├── utils/              # Port management utilities
│   │   └── vsCodeIntegration.ts         # Dual-environment API bridge
│   └── styles/             # CSS and styling
├── projects/               # Your development projects
│   ├── manifest.json       # Project configuration (includes requires3D flags)
│   └── [project-folders]/  # Individual project directories
├── scripts/               # PowerShell automation scripts
├── vscode-extension/      # VS Code extension (COMPLETED)
│   └── claude-portfolio/  
│       ├── src/           # Extension source code
│       │   ├── extension.ts                 # Main entry point
│       │   ├── portfolioWebviewProvider.ts  # Complete webview with API bridge
│       │   ├── projectProvider.ts           # Project tree view (legacy)
│       │   └── commandsProvider.ts          # Quick commands (legacy)
│       ├── portfolio-dist/                  # Built portfolio embedded in extension
│       │   ├── index.html                   # Portfolio HTML
│       │   └── assets/                      # JavaScript & CSS bundles
│       └── package.json                     # Extension manifest
├── docs/                  # Documentation
│   ├── COMPLETED_FEATURES.md    # All completed VS Code integration work
│   ├── ARCHITECTURE.md          # Technical architecture details
│   ├── vscode-workspace-fix.md  # Workspace persistence guide
│   └── terminal-integration-guide.md # Terminal features
└── public/               # Static assets
```

## 🛠️ Adding Projects

### 🚀 Creating New Projects (Automated)

Use the automated script to create a new project with full integration:

```powershell
# Create a new project from template
.\scripts\create-project.ps1 -ProjectName "my-awesome-project" -Description "Description of what it does"

# Optional: Specify a custom port or 3D support
.\scripts\create-project.ps1 -ProjectName "my-3d-project" -Port 3015 -Description "3D project with pointer lock" -Requires3D
```

**Features:**
- ✅ **Automatic Integration** - Updates manifest, port manager, and all necessary files
- ✅ **Template-based** - Creates React + TypeScript + Vite project structure
- ✅ **Git Ready** - Initializes repository with proper commit
- ✅ **3D Support** - Optional `requires3D` flag for projects needing pointer lock
- ✅ **Port Management** - Automatically finds available ports
- ✅ **Dev Journal** - Creates development journal file

### 📁 Adding Existing Projects (Manual)

To add an existing project to the portfolio:

1. **Move your project** to the `projects/` directory
2. **Update** `projects/manifest.json`:
   ```json
   {
     "id": "my-existing-project",
     "title": "My Existing Project",
     "description": "Description of what it does",
     "displayType": "external",
     "localPort": 3010,
     "buildCommand": "npm run dev",
     "path": "my-existing-project",
     "requires3D": false,
     "thumbnail": "thumbnails/my-existing-project.png",
     "tags": ["React", "TypeScript", "Existing"],
     "tech": ["React", "TypeScript", "Vite"],
     "status": "active",
     "devJournal": "projects/dev-journals/my-existing-project.md",
     "features": [
       "Existing codebase",
       "Portfolio integration",
       "Custom features"
     ]
   }
   ```
3. **Add port mapping** in `src/utils/portManager.ts`
4. **Create dev journal** in `projects/dev-journals/my-existing-project.md`
5. **Start your project** and it will appear in the portfolio!

## 🎮 Project Display Types

- **`external`** - Development servers (React, Vue, etc.) with smart browser selection
- **`iframe`** - Static HTML files that can be embedded
- **`embed`** - Interactive content requiring special permissions

**3D Project Support**: Projects with `requires3D: true` automatically open in external browser to support pointer lock functionality.

## 🚀 Automation Scripts

### Start All Projects
```powershell
# Recommended: Start all projects in Windows Terminal tabs
.\scripts\start-all-tabbed.ps1

# Alternative: Start all projects in separate windows
.\scripts\start-all-enhanced.ps1
```

**Features:**
- ✅ Duplicate server detection
- ✅ Smart port management
- ✅ 3D project support
- ✅ Process monitoring

### Kill All Servers
```bash
.\scripts\kill-all-servers.ps1
```

## 🎨 VS Code Extension Deep Dive

### Why Use the Extension?
- **No More iframe Issues**: Workspace state persists perfectly
- **Native Integration**: Projects open in proper VS Code workspace
- **Direct Command Execution**: All commands run natively without clipboard
- **3D Project Support**: Smart browser selection for projects requiring pointer lock
- **Full VS Code Features**: Terminals, debugging, extensions all work
- **Professional Workflow**: Everything in one IDE

### Extension Features

#### Activity Bar Integration
```
🚀 Claude Portfolio
├── 📂 Projects
│   ├── 3D Matrix Cards (Port 3005) [requires3D]
│   ├── GGPrompts (Port 9323)
│   └── [Your Projects]
├── ⚡ Quick Commands
│   ├── VS Code Commands (50+)
│   ├── Git Commands
│   ├── Development Tasks
│   └── PowerShell Operations
└── 📚 Cheat Sheet
    ├── AI Prompts
    ├── PowerShell
    └── Git Operations
```

#### Right Sidebar Panel System
- **Quick Commands**: 50+ professional developer commands
- **VS Code Terminals**: Integrated terminal management
- **Live Preview Controls**: Project preview management
- **Smart Execution**: Context-aware command execution
- **Category Organization**: VS Code, Git, Development, PowerShell sections

#### Dashboard Webview
- Project statistics and overview
- Quick actions to run all servers  
- Technology breakdown
- One-click project opening
- 3D project identification and smart routing

## 🔄 Project Workflow

### Development Workflow
1. **Create/Add Project** - Use automated script or manual setup
2. **Start Development** - Projects automatically detected and managed
3. **Use Quick Commands** - Access 50+ commands via right sidebar
4. **Take Notes** - Use DEV NOTES panel with project-specific context
5. **View Progress** - Monitor status in portfolio dashboard
6. **3D Projects** - Automatic external browser opening for pointer lock support

### Quick Commands Access
```powershell
# Available via right sidebar or direct execution:

# VS Code Commands (execute directly)
- Open Folder, New Terminal, Split Terminal
- Command Palette, Reload Window

# Git Commands (execute directly)  
- git status, pull, push, commit, sync

# Development Commands (execute directly)
- Start Dev Server, Build React App
- Install Dependencies, Kill All Servers

# PowerShell Commands (copy to clipboard)
- Navigate folders, list files, create items
- Process management, port checking
```

## 🔧 Configuration

### Port Management
Default port assignments are in `src/utils/portManager.ts`:
```typescript
export const DEFAULT_PORTS = {
  'ggprompts-style-guide': 3001,
  'matrix-cards': 3002,
  'sleak-card': 3000,
  '3d-file-system': 3004,        // requires3D: true
  '3d-matrix-cards': 3005,       // requires3D: true  
  'ggprompts-professional': 3006,
  'ggprompts': 9323,
  'testproject': 3009
  // Portfolio runs on 5173+ (auto-assigned by Vite)
}
```

### 3D Project Configuration
Projects requiring pointer lock (FPS controls, 3D navigation) should have:
```json
{
  "requires3D": true,
  "description": "...Features FPS controls, 3D navigation..."
}
```
This ensures they open in external browser instead of embedded iframe.

### VS Code Extension Settings
```json
{
  "claudePortfolio.portfolioPath": "D:\\ClaudeWindows\\claude-dev-portfolio",
  "claudePortfolio.autoStartProjects": false,
  "claudePortfolio.defaultBrowser": "external"
}
```

## 📚 Documentation

### 📖 Core Documentation
- **[CLAUDE.md](CLAUDE.md)** - Essential development guidelines and current active work
- **[COMPLETED_FEATURES.md](COMPLETED_FEATURES.md)** - All completed VS Code integration work and past achievements
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture, dual-React setup, and component details
- **[PLAN.md](PLAN.md)** - Future development roadmap

### 🔧 Technical Guides
- **[VS Code Extension Quick Start](vscode-extension/QUICK_START.md)** - Get started with the extension
- **[Terminal Integration](docs/terminal-integration-guide.md)** - xterm.js + node-pty setup
- **[Project Creation](scripts/README.md)** - Automated project scaffolding
- **[Port Management](src/utils/README.md)** - Smart port allocation

### 🛠️ Integration Fixes
- **[Workspace Persistence Guide](docs/vscode-workspace-persistence.md)** - Fix workspace state issues
- **[Console Error Fixes](docs/vscode-integration-fixes.md)** - Silent port checking implementation
- **[Dark Mode Fix](docs/fix-vscode-dark-mode.md)** - Preserve theme settings

## 🛠️ Troubleshooting

### VS Code Extension Issues
- **Extension not loading**: Ensure you've run `npm install` and `npm run compile`
- **Projects not showing**: Check that `manifest.json` exists in the projects folder
- **Dashboard blank**: Verify the extension has access to the portfolio path
- **3D projects not working**: Check external browser is set as default

### Web Portfolio Issues
- **Console errors fixed**: Update to latest version for silent port checking
- **Dark mode persistence**: Use `portfolio-absolute-paths.code-workspace`
- **3D projects won't open**: Verify `requires3D: true` in manifest.json

### Common Fixes
```powershell
# Fix VS Code workspace issues
.\troubleshoot-workspace.ps1

# Kill stuck servers
.\scripts\kill-all-servers.ps1

# Start VS Code with profile
.\launch-vscode-with-profile.ps1

# Check 3D project settings
cat projects\manifest.json | findstr "requires3D"
```

## 🛡️ Security Features

- **Iframe sandboxing** for external projects
- **CORS handling** for development servers
- **Secure port detection** methods
- **3D project isolation** via external browser
- **No credential storage** in the repository

## 📚 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **State Management**: Zustand
- **Styling**: CSS Modules, CSS Variables
- **Animations**: React Spring
- **Build Tool**: Vite
- **VS Code Extension**: TypeScript, VS Code API
- **Package Manager**: npm

## 🌟 Showcase Projects

Current portfolio includes:
- 🎨 **3D Matrix Cards** - Interactive 3D card display with Matrix effects [requires3D]
- 🌐 **GGPrompts** - AI prompt management platform with real-time collaboration
- 📱 **Sleak Card Component** - Modern card system with water effects
- 🗂️ **3D File System Viewer** - Advanced 3D file browser with terminal interface [requires3D]
- 📚 **GGPrompts Style Guide** - Comprehensive design system documentation
- 💼 **GGPrompts Professional** - Work-appropriate version with corporate UI

Perfect for showcasing:
- 🎮 3D applications and games (with proper pointer lock support)
- 🌐 Web applications and SPAs
- 📱 Mobile app prototypes
- 📊 Data visualization projects
- 🤖 AI/ML experiments
- 🎨 Creative coding projects

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/GGPrompts/claude-dev-portfolio/issues)
- **Discussions**: [GitHub Discussions](https://github.com/GGPrompts/claude-dev-portfolio/discussions)
- **Documentation**: Check the `/docs` folder for detailed guides

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies and love for developer productivity
- VS Code extension architecture for seamless IDE integration
- Community feedback that led to the dual-architecture approach
- 3D web development community for pointer lock insights

---

**Made with ❤️ by the Claude Windows Team**

*Transform your development workflow with Claude Portfolio - now with native VS Code integration and smart 3D project support!* 🚀