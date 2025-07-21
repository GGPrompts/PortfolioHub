## 🌟 Future Enhancements

### VS Code Extension Roadmap
- **AI Integration**: Claude prompts directly in VS Code
- **Project Templates**: Create projects from extension
- **Git Status**: Show repository status in project tree
- **Dependency Viewer**: Manage npm packages visually
- **Process Manager**: Start/stop servers from VS Code
- **Snippet Library**: Project-specific code snippets

### Portfolio Enhancements
- **Cloud Sync**: Backup project configurations
- **Team Collaboration**: Share portfolio setups
- **Performance Metrics**: Track build times and sizes
- **Docker Integration**: Containerized project support## 📚 Documentation

### New Guides
- **[VS Code Extension Quick Start](vscode-extension/QUICK_START.md)** - Get started with the extension
- **[Workspace Persistence Guide](docs/vscode-workspace-persistence.md)** - Fix workspace state issues
- **[Console Error Fixes](docs/vscode-integration-fixes.md)** - Silent port checking implementation
- **[Dark Mode Fix](docs/fix-vscode-dark-mode.md)** - Preserve theme settings

### Existing Guides
- **[Terminal Integration](docs/terminal-integration-guide.md)** - xterm.js + node-pty setup
- **[Project Creation](scripts/README.md)** - Automated project scaffolding
- **[Port Management](src/utils/README.md)** - Smart port allocation## 🛠️ Troubleshooting

### VS Code Extension Issues
- **Extension not loading**: Ensure you've run `npm install` and `npm run compile`
- **Projects not showing**: Check that `manifest.json` exists in the projects folder
- **Dashboard blank**: Verify the extension has access to the portfolio path

### Web Portfolio Issues
- **Console errors fixed**: Update to latest version for silent port checking
- **Dark mode persistence**: Use `portfolio-absolute-paths.code-workspace`
- **Workspace not opening**: See `docs/vscode-workspace-fix.md`

### Common Fixes
```powershell
# Fix VS Code workspace issues
.\troubleshoot-workspace.ps1

# Kill stuck servers
.\scripts\kill-all-servers.ps1

# Start VS Code with profile
.\launch-vscode-with-profile.ps1
```# Claude Windows Portfolio Hub 🚀

A modern, AI-powered development portfolio dashboard with VS Code integration, allowing you to view, manage, and showcase multiple projects in a unified interface.

## 🆕 What's New

### VS Code Extension Integration 🎉
- **Native VS Code Experience**: New extension replaces problematic iframe integration
- **Persistent Workspace**: No more losing state when switching tabs
- **Sidebar Integration**: Projects, commands, and cheat sheets in the activity bar
- **Beautiful Dashboard**: Webview with project statistics and quick actions
- **One-Click Actions**: Open, run, and browse projects directly from VS Code

### Recent Improvements
- **Fixed Console Errors**: Silent port checking eliminates ERR_CONNECTION_REFUSED spam
- **Workspace Persistence**: Multiple workspace files with absolute paths
- **Enhanced UI**: Better instructions and troubleshooting guides
- **Dark Mode Fix**: Workspace no longer overrides profile theme settings

## ✨ Features

### Core Portfolio Features
- **🔄 Real-time Project Status** - Automatically detects running development servers
- **📱 Realistic Device Displays** - True-to-life mobile (375×812) and desktop (1920×1080) preview scaling
- **🎯 Collapsible Project Sections** - Hide offline projects to focus on active development
- **🖼️ Inline Project Viewing** - View projects directly in the portfolio with iframe integration
- **🎯 Smart Port Management** - Automatic port detection and conflict resolution
- **⚡ One-Click Launch** - Start all projects with a single PowerShell script
- **🔍 Project Filtering** - Filter projects by technology, status, or tags
- **📊 Dashboard Analytics** - View project status, technologies used, and portfolio statistics
- **📝 Matrix Card Notes** - Professional note-taking system with 3D flip animations and AI organization
- **📱 Responsive Design** - Adaptive sidebar with collapsed, normal, and expanded states

### New VS Code Extension Features
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
- **Anyone** who wants to view all their projects in one place

## 📋 Prerequisites

- Node.js 18+ and npm
- PowerShell (Windows) or Terminal (Mac/Linux)
- Git for version control

## 🚀 Quick Start

### Option 1: Web Portfolio (Original)

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

### Option 2: VS Code Extension (Recommended) 🆕

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
   code --install-extension claude-portfolio-0.0.1.vsix
   ```

3. **Use the extension:**
   - Look for Claude Portfolio icon in the activity bar
   - Click projects to open them in workspace
   - Use status bar for dashboard access
   - Right-click projects for quick actions

## 📁 Project Structure

```
claudeWindows-portfolio/
├── src/                     # React portfolio application
│   ├── components/          # React components
│   │   ├── ProjectGrid.tsx  # Project grid layout
│   │   ├── ProjectViewer.tsx # Inline project viewer
│   │   ├── PortfolioSidebar.tsx # Adaptive sidebar
│   │   ├── VSCodeManager.tsx # VS Code integration (legacy)
│   │   └── ProjectStatusDashboard.tsx # Status management
│   ├── store/              # Zustand state management
│   ├── utils/              # Port management utilities
│   └── styles/             # CSS and styling
├── projects/               # Your development projects
│   ├── manifest.json       # Project configuration
│   └── [project-folders]/  # Individual project directories
├── scripts/               # PowerShell automation scripts
├── vscode-extension/      # VS Code extension (NEW)
│   └── claude-portfolio/  
│       ├── src/           # Extension source code
│       │   ├── extension.ts # Main entry point
│       │   ├── projectProvider.ts # Project tree view
│       │   ├── dashboardPanel.ts # Webview dashboard
│       │   └── commandsProvider.ts # Quick commands
│       ├── media/         # Dashboard assets
│       └── package.json   # Extension manifest
├── docs/                  # Documentation
│   ├── vscode-workspace-fix.md # Workspace persistence guide
│   ├── vscode-integration-fixes.md # Console error fixes
│   └── terminal-integration-guide.md # Terminal features
└── public/               # Static assets
```

## 🛠️ Adding Projects

### 🚀 Creating New Projects (Automated)

Use the automated script to create a new project with full integration:

```powershell
# Create a new project from template
.\scripts\create-project.ps1 -ProjectName "my-awesome-project" -Description "Description of what it does"

# Optional: Specify a custom port
.\scripts\create-project.ps1 -ProjectName "my-project" -Port 3015 -Description "Custom port project"
```

**Features:**
- ✅ **Automatic Integration** - Updates manifest, port manager, and all necessary files
- ✅ **Template-based** - Creates React + TypeScript + Vite project structure
- ✅ **Git Ready** - Initializes repository with proper commit
- ✅ **DEV NOTES Ready** - Immediately available in project dropdown
- ✅ **Validation** - Performs 6 integration checks to ensure everything works
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
3. **Add port mapping** in `src/utils/portManager.ts`:
   ```typescript
   export const DEFAULT_PORTS = {
     // ... existing ports
     'my-existing-project': 3010
   };
   ```
4. **Create dev journal** in `projects/dev-journals/my-existing-project.md`
5. **Start your project** and it will appear in the portfolio!

## 🎮 Project Display Types

- **`external`** - Development servers (React, Vue, etc.)
- **`iframe`** - Static HTML files that can be embedded
- **`embed`** - Interactive content requiring special permissions

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
- ✅ Separate terminal windows
- ✅ No auto-opening browsers
- ✅ Process monitoring

### Kill All Servers
```bash
.\scripts\kill-all-servers.ps1
```

## 🎨 VS Code Extension Deep Dive 🆕

### Why Use the Extension?
- **No More iFrame Issues**: Workspace state persists perfectly
- **Native Integration**: Projects open in proper VS Code workspace
- **Better Performance**: No embedded browser overhead
- **Full VS Code Features**: Terminals, debugging, extensions all work
- **Professional Workflow**: Everything in one IDE

### Extension Features

#### Activity Bar Integration
```
🚀 Claude Portfolio
├── 📂 Projects
│   ├── 3D Matrix Cards (Port 3005)
│   ├── GGPrompts (Port 9323)
│   └── [Your Projects]
├── ⚡ Quick Commands
│   ├── VS Code Commands
│   ├── Git Commands
│   └── Portfolio Commands
└── 📚 Cheat Sheet
    ├── PowerShell
    ├── Git
    └── npm
```

#### Dashboard Webview
- Project statistics and overview
- Quick actions to run all servers
- Technology breakdown
- One-click project opening

#### Smart Project Management
- Right-click to run projects
- Automatic terminal creation
- Port status tracking
- Workspace folder integration

### Configuration
```json
{
  "claudePortfolio.portfolioPath": "D:\\ClaudeWindows\\claude-dev-portfolio",
  "claudePortfolio.autoStartProjects": false,
  "claudePortfolio.defaultBrowser": "default"
}
```

## 🎨 Sidebar States

| State | Width | Description |
|-------|-------|-------------|
| **Collapsed** | 48px | Icon bar only |
| **Normal** | 256px | Standard sidebar with project info |
| **Expanded** | 816px | Detailed project view with stats |

## 📝 Matrix Card Notes System

### Overview
The portfolio includes a professional note-taking system with Matrix Card aesthetics featuring 3D flip animations, project-specific context, and AI-assisted organization.

### Features
- **🎴 3D Flip Cards** - Professional cyberpunk-themed interface with smooth animations
- **📋 Universal Capture** - Quickly capture ideas, features, and thoughts
- **🤖 AI Instructions** - Add context for Claude to organize notes automatically
- **🗂️ Smart Organization** - Auto-save to to-sort folder for batch processing
- **📁 Project Context** - Link notes to specific projects with automatic folder paths
- **🎨 Letter-sized Design** - Optimal proportions for comfortable writing

### Workflow
1. **Open DEV NOTES** - Click the ✏️ Edit tab in the sidebar
2. **Select Project** - Choose from dropdown or use "General" for non-project notes
3. **Add Instructions** - Optional Claude instructions for AI organization
4. **Write Content** - Use the large content area for your thoughts
5. **Preview** - Flip the card to see formatted markdown output
6. **Save** - Automatically saves to `notes/to-sort/` folder
7. **Organize** - Use "🗂️ Organize Notes" to batch process all saved notes

### Note Organization
Notes are saved with full context including:
- Project paths and metadata
- Timestamps and Claude instructions
- Smart prompts for AI-assisted organization
- Flexible destinations (dev journals, CLAUDE.md, README, etc.)

## 🔄 Project Workflow

### Complete Integration Features
Once a project is added (via script or manually), it's automatically integrated with:

- **📊 Portfolio Grid** - Visual project cards with live previews
- **📝 DEV NOTES System** - Project available in Matrix Card notes dropdown
- **🔍 Real-time Status** - Automatic port detection and running status
- **📁 File Organization** - Development journals and project-specific context
- **🔧 Smart Port Management** - Conflict detection and automatic assignment
- **🌐 Live Previews** - Iframe integration with mobile/desktop view toggles

### Development Workflow
1. **Create/Add Project** - Use automated script or manual setup
2. **Start Development** - `npm run dev` in project directory
3. **Take Notes** - Use DEV NOTES panel with project-specific context
4. **View Progress** - Monitor status in portfolio dashboard
5. **Organize Ideas** - Notes automatically include project paths for Claude

### Quick Commands
```powershell
# Create new project
.\scripts\create-project.ps1 -ProjectName "new-idea" -Description "Quick prototype"

# Start all projects in tabs (recommended)
.\scripts\start-all-tabbed.ps1

# Kill all servers
.\scripts\kill-all-servers.ps1
```

## 🔧 Configuration

### Port Management
Default port assignments are in `src/utils/portManager.ts`:
```typescript
export const DEFAULT_PORTS = {
  'ggprompts-style-guide': 3001,
  'matrix-cards': 3002,
  'sleak-card': 3003,
  '3d-file-system': 3004,
  '3d-matrix-cards': 3005,
  'ggprompts-professional': 3006,
  'ggprompts-main': 9323
  // Portfolio runs on 5173+ (auto-assigned by Vite)
}
```

### Manifest Configuration
Each project in `projects/manifest.json` supports:
- `displayType`: How to display the project
- `localPort`: Development server port
- `buildCommand`: Command to start the project
- `tech`: Array of technologies used
- `tags`: Array of tags for filtering
- `status`: Project status (active, archived, experimental)

## 🔍 Key Features Deep Dive

### 📱 Realistic Device Display System
- **True Mobile Previews**: iPhone 13/14 proportions (375×812px) with proper 9:19.5 aspect ratio
- **Desktop Accuracy**: 1920×1080 resolution with 16:9 aspect ratio for realistic desktop viewing
- **Smart Zoom Levels**: 25%, 50%, 75%, 100%, and "fit to container" modes
- **Device Bezel Effects**: Realistic borders and shadows simulating actual device frames
- **Viewport Injection**: Automatically sets proper viewport meta tags for accurate rendering
- **Top-Left Alignment**: All zoom levels consistently start from the top of the page

### 🎯 Collapsible Project Organization
- **Section Headers**: Click "🟢 ONLINE" or "🔴 OFFLINE" to collapse/expand sections
- **Project Counts**: Shows number of projects in each section (e.g., "ONLINE (3)")
- **Visual Indicators**: Animated arrows rotate to show collapsed/expanded state
- **Focus Mode**: Hide offline projects to focus only on active development
- **Consistent Styling**: Section headers match project item sizing for unified appearance

### 📊 Real-time Status Detection
- Automatically detects which projects are running
- Shows port information and server status
- Updates every 5 seconds
- Excludes portfolio port (5173) from project detection

### 🖼️ Inline Project Viewing
- External projects load in secure iframes
- Maintains sidebar navigation
- Seamless switching between projects
- Desktop view as default with mobile toggle option

### 📱 Responsive Design
- Mobile-first approach
- Adaptive sidebar that collapses on mobile
- Smooth animations and transitions
- Professional SVG icons throughout interface

### ⚡ Smart Port Management
- Automatic port conflict resolution
- Fallback port assignments (3006-3010, 5174-5177)
- Support for custom port configurations
- Portfolio auto-detection starting from port 5173

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Development Workflow

1. **Local Development:**
   ```bash
   npm run dev        # Start portfolio
   npm run build      # Build for production
   npm run preview    # Preview production build
   ```

2. **Adding Projects:**
   - Add project to `projects/` directory
   - Update `manifest.json`
   - Configure port in `portManager.ts`

3. **Testing:**
   - Test all sidebar states
   - Verify project launching
   - Check mobile responsiveness

## 🛡️ Security Features

- **Iframe sandboxing** for external projects
- **CORS handling** for development servers
- **Secure port detection** methods
- **No credential storage** in the repository

## 📚 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **State Management**: Zustand
- **Styling**: CSS Modules, CSS Variables
- **Animations**: React Spring
- **Build Tool**: Vite
- **Package Manager**: npm

## 🌟 Showcase

Perfect for showcasing:
- 🎨 Creative coding projects
- 🌐 Web applications
- 📱 Mobile app prototypes
- 🎮 Game development
- 📊 Data visualization projects
- 🤖 AI/ML experiments

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/GGPrompts/PortfolioHub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/GGPrompts/PortfolioHub/discussions)
- **Documentation**: Check the `/docs` folder for detailed guides
  - **Terminal Integration**: See `docs/terminal-integration-guide.md` for xterm.js + node-pty implementation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies and love for developer productivity
- VS Code extension architecture for seamless IDE integration
- Community feedback that led to the extension approach

---

**Made with ❤️ by the Claude Windows Team**

*Transform your development workflow with Claude Portfolio - now with native VS Code integration!* 🚀