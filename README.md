# PortfolioHub 🚀

A modern, responsive development portfolio dashboard that allows you to view, manage, and showcase multiple projects in a unified interface.

## ✨ Features

- **🔄 Real-time Project Status** - Automatically detects running development servers
- **📱 Responsive Design** - Adaptive sidebar with collapsed, normal, and expanded states
- **🖼️ Inline Project Viewing** - View projects directly in the portfolio with iframe integration
- **🎯 Smart Port Management** - Automatic port detection and conflict resolution
- **⚡ One-Click Launch** - Start all projects with a single PowerShell script
- **🔍 Project Filtering** - Filter projects by technology, status, or tags
- **📊 Dashboard Analytics** - View project status, technologies used, and portfolio statistics
- **📝 Matrix Card Notes** - Professional note-taking system with 3D flip animations and AI organization

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

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/GGPrompts/PortfolioHub.git
   cd PortfolioHub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the portfolio:**
   ```bash
   npm run dev
   ```

4. **Visit** `http://localhost:3000` to see your portfolio

## 📁 Project Structure

```
PortfolioHub/
├── src/
│   ├── components/          # React components
│   │   ├── ProjectGrid.tsx  # Project grid layout
│   │   ├── ProjectViewer.tsx # Inline project viewer
│   │   ├── PortfolioSidebar.tsx # Adaptive sidebar
│   │   └── ProjectStatusDashboard.tsx # Status management
│   ├── store/              # Zustand state management
│   ├── utils/              # Port management utilities
│   └── styles/             # CSS and styling
├── projects/               # Your development projects
│   ├── manifest.json       # Project configuration
│   └── [project-folders]/  # Individual project directories
├── scripts/               # PowerShell automation scripts
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
  'portfolio': 3000,
  'my-project': 3010,
  // Add your projects here
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

### 📊 Real-time Status Detection
- Automatically detects which projects are running
- Shows port information and server status
- Updates every 5 seconds

### 🖼️ Inline Project Viewing
- External projects load in secure iframes
- Maintains sidebar navigation
- Seamless switching between projects

### 📱 Responsive Design
- Mobile-first approach
- Adaptive sidebar that collapses on mobile
- Smooth animations and transitions

### ⚡ Smart Port Management
- Automatic port conflict resolution
- Fallback port assignments
- Support for custom port configurations

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

Built with modern web technologies and love for developer productivity.

---

**Made with ❤️ by the GGPrompts Team**

*Transform your development workflow with PortfolioHub - where all your projects live in harmony.* 🚀