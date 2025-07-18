# Claude Development Portfolio

## Overview
This is the root directory for all Claude-assisted development projects. The portfolio app serves as a central hub to view, launch, and manage all projects with a clean, professional interface and comprehensive development tools.

## Key Features
- **Notebook-Style Sidebar**: Professional tabs that slide to panel edges like real notebook dividers
- **Dynamic Panel System**: Order-based panel opening with smooth React Spring animations
- **Live Project Previews**: Real-time iframe displays with monitor-style UI and status indicators
- **Professional SVG Icons**: Custom icon library adapted from GGPrompts design system
- **Status Dashboard**: Comprehensive project management with real-time port detection
- **Smart Port Management**: Automatic port allocation and conflict resolution
- **Development Journals**: Track progress for each project with markdown support
- **PowerShell Automation**: Scripts for project management and lifecycle operations

## Structure
```
claude-dev-portfolio/
├── src/                        # Portfolio React app
│   ├── components/             # React components
│   │   ├── PortfolioSidebar.tsx         # Notebook-style sidebar with dynamic tabs
│   │   ├── ProjectGrid.tsx              # Project card grid layout
│   │   ├── LiveProjectPreview.tsx       # Monitor-style project displays
│   │   ├── ProjectStatusDashboard.tsx   # Comprehensive status management
│   │   ├── SvgIcon.jsx                  # Professional icon library
│   │   └── GitUpdateButton.tsx          # Git integration component
│   ├── store/                  # State management (Zustand)
│   ├── utils/                  # Port manager, project launcher
│   └── App.tsx                 # Main application with dynamic sidebar width
├── projects/                   # All development projects
│   ├── manifest.json           # Project configuration and metadata
│   ├── dev-journals/           # Development logs for each project
│   ├── 3d-matrix-cards/        # Three.js interactive card display
│   ├── matrix-cards/           # React cyberpunk card components
│   ├── sleak-card/             # Modern card system with water effects
│   ├── ggprompts/              # Main AI prompt platform
│   ├── ggprompts-style-guide/  # Design system documentation
│   └── 3d-file-system/         # 3D file system explorer
├── scripts/                    # PowerShell automation scripts
│   ├── start-all-improved.ps1  # Enhanced project launcher (no auto-browser)
│   └── create-project.ps1      # Create new project from template
└── docs/                       # Documentation
```

## Quick Start
```bash
# Install dependencies
npm install

# Start portfolio hub (runs on port 3000)
npm run dev

# Start all projects automatically (no browser auto-launch)
.\scripts\start-all-improved.ps1

# Create new project
.\scripts\create-project.ps1 -ProjectName "my-new-project" -Description "Project description"
```

## User Interface

### Notebook-Style Sidebar
- **Professional tabs** stick out from the left edge of the screen
- **Dynamic positioning** - tabs slide to the right edge of their panels when opened
- **Order-based opening** - panels appear in the order tabs are clicked
- **Click to toggle** - click active tab to close its panel
- **SVG icons** for professional appearance:
  - 📄 `fileText` for Projects panel
  - ✏️ `edit` for Dev Journals panel

### Status Dashboard
- Accessible via **Dashboard** button in Projects panel
- **Real-time port detection** shows actual running status
- **Individual project controls** (start/stop/open)
- **Batch operations** (Start All/Kill All)
- **Smart command generation** with clipboard integration

### Project Management
- **Smart port allocation** - Projects use ports 3000-3099 with conflict resolution
- **No auto-browser opening** - Clean startup without surprise windows
- **Live status indicators** - Green dots for running, red for stopped
- **Click to open** - Running projects open in new tabs when clicked

## Current Projects
- **3d-matrix-cards**: Three.js interactive card display with cyberpunk aesthetics
- **matrix-cards**: React cyberpunk card components with dynamic animations
- **sleak-card**: Modern card system with water effects and responsive design
- **ggprompts**: Main AI prompt platform with advanced features
- **ggprompts-style-guide**: Design system documentation and component library

## Recent Updates (2025-07-18)
- **Notebook-Style Sidebar**: Complete redesign with professional tabs that stick to panel edges
- **Dynamic Panel System**: Order-based panel opening with smooth React Spring animations
- **Professional SVG Icons**: Replaced emojis with custom icon library from GGPrompts design system
- **Status Dashboard**: Comprehensive project management with real-time port detection
- **Smart Port Management**: Automatic port allocation and conflict resolution (ports 3000-3099)
- **Enhanced UX**: No auto-browser launching, clean startup, perfect tab alignment
- **Dynamic Width Management**: Main content adjusts properly to sidebar changes

## Development Workflow

### Creating New Projects
```bash
# Create a new project with automatic setup
.\scripts\create-project.ps1 -ProjectName "my-awesome-project" -Description "Description here"

# The script will:
# - Create project directory from template
# - Assign available port automatically
# - Initialize git repository
# - Create development journal
# - Provide manifest.json entry to copy
```

### Git Integration
The portfolio includes comprehensive git update functionality:
- **Portfolio Update**: Updates the main portfolio application
- **Project Updates**: Updates individual projects in their directories
- **Global Update**: Updates portfolio and all projects in sequence
- **Secure Commands**: Uses clipboard-based command copying for security

### 3D View Controls
- **Mouse**: Click and drag to rotate the camera around projects
- **Wheel**: Zoom in and out of the 3D scene
- **Projects**: Click on project screens to view them in the main display
- **Performance**: Optimized rendering with reduced rotation speed and improved materials

### Project Status Monitoring
Each project card displays:
- **Live Preview**: Real-time iframe showing the running application
- **Status Indicator**: Green for running, red for stopped, yellow for loading
- **Server Info**: Port number and build command
- **Quick Actions**: Git updates, project management buttons

## Architecture Details

### Port Management
- **Portfolio**: Runs on port 5173 (Vite dev server)
- **Projects**: Auto-assigned ports starting from 3000 (3001, 3002, 3003, etc.)
- **Conflict Detection**: Automatic port assignment prevents conflicts
- **Range**: Projects use ports 3000-3099 for organized management

### Component Architecture
```
src/components/
├── ThreeProjectPreview.tsx     # 3D scene with Three.js
├── LiveProjectPreview.tsx      # Monitor-style project cards
├── PortfolioSidebar.tsx        # Navigation and journal panel
├── GitUpdateButton.tsx         # Git integration component
├── ProjectGrid.tsx             # Traditional grid layout
└── [other components]/         # Additional UI components
```

### State Management
- **React Spring**: Animations and transitions
- **Local State**: Component-specific state management
- **Project Data**: Loaded from `projects/manifest.json`
- **Real-time Updates**: Live status monitoring for all projects

## Troubleshooting

### Common Issues
1. **Port Conflicts**: Use `netstat -ano | findstr :PORT` to check port usage
2. **3D Performance**: Reduce project count or disable 3D view on older hardware
3. **PowerShell Execution**: Set execution policy with `Set-ExecutionPolicy RemoteSigned`
4. **Git Commands**: Ensure git is installed and accessible from command line

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

### 3D View Issues
- **Screens Facing Wrong Direction**: Fixed in recent update (screens now face outward)
- **Too Bright/Green**: Switched to MeshBasicMaterial for better visibility
- **Performance**: Reduced rotation speed and optimized rendering

### Git Update Problems
- **Commands Not Working**: Try copying from clipboard manually
- **Permission Issues**: Run as administrator if needed
- **Repository Issues**: Ensure git remotes are properly configured

## Future Development

See `PLAN.md` for detailed future development roadmap including:
- GitHub integration buttons
- VS Code integration
- Enhanced project management
- Advanced 3D controls
- Documentation improvements

For detailed next steps and implementation plans, refer to the comprehensive development plan in `PLAN.md`.
