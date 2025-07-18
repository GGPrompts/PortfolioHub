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

# Start portfolio hub (runs on port 5173)
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
  - ✏️ `edit` for Dev Notes panel

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
- **Online/Offline Separation** - Projects automatically grouped by status:
  - 🟢 **ONLINE** section shows all running projects at the top
  - 🔴 **OFFLINE** section shows stopped projects below
  - Sections only appear when they contain projects
  - Real-time updates as project status changes

### DEV NOTES System
- **Multi-purpose note taking** integrated into the sidebar
- **Three note types** for different use cases:
  - 📝 **Note**: General development thoughts, feature ideas, architecture notes
  - 🤖 **Prompt**: Claude prompt templates for future use
  - ⌨️ **Command**: Commands, scripts, and code snippets
- **Flexible output destinations**:
  - 📓 **Dev Journal**: Add to project's dev journal file
  - 🤖 **CLAUDE.md**: Add to project or root CLAUDE.md instructions
  - 📋 **README**: Add to project README.md
  - 🗂️ **Notes File**: Save to dedicated NOTES.md file
  - 📋 **Copy Claude Prompt**: Generate and copy Claude prompt with context
- **Smart clipboard integration**: All actions copy appropriate Claude prompts
- **Context-aware**: Automatically includes project context in prompts
- **Markdown formatting**: Notes are automatically formatted with timestamps

## Current Projects
- **3d-matrix-cards**: Three.js interactive card display with cyberpunk aesthetics
- **matrix-cards**: React cyberpunk card components with dynamic animations
- **sleak-card**: Modern card system with water effects and responsive design
- **ggprompts**: Main AI prompt platform with advanced features
- **ggprompts-style-guide**: Design system documentation and component library
- **3d-file-system**: Advanced file system viewer with terminal interface, expandable sidebar, and working 3D card flipping

## Recent Updates (2025-07-18)

### Latest Features (Current Session)
- **Professional Matrix Card Notes System**: Complete redesign of DEV NOTES with Matrix Card aesthetics:
  - Professional 3D flip card interface with cyberpunk green/cyan theme
  - Separate fields for Claude instructions (### marked) and note content
  - Project dropdown selection with automatic folder path integration
  - Enhanced placeholder text with bright teal color and comprehensive instructions
  - Letter-sized proportions (600px height) for better writing experience
  - Flip animation to preview formatted markdown output
  - Default to new note interface for immediate productivity
- **Universal Note Capture System**: Streamlined workflow for quick idea capture:
  - Notes automatically saved to to-sort folder for later organization
  - Project-specific context with exact folder paths provided to Claude
  - One-click organization prompt generation for batch processing
  - Smart metadata including project paths, timestamps, and Claude instructions
  - Clipboard integration with context-aware Claude prompts
- **Enhanced Header System**: Compact, professional header design:
  - Square refresh icon button with hover animations
  - Dropdown menu for grouped actions (consistent across main and project headers)
  - Proper spacing fixes to prevent content overlap with header borders
  - Cyan "Organize Notes" button with distinct styling
  - Responsive behavior for all screen sizes
- **Terminal Integration Documentation**: Added comprehensive guide:
  - Complete xterm.js + node-pty architecture documentation
  - Electron and web app implementation examples  
  - Crystal app analysis and integration possibilities
  - Security considerations and performance optimization
  - Created `docs/terminal-integration-guide.md` for reference
  - Ready for future integration of terminal functionality into portfolio
- **Project Management Improvements**: 
  - Cleaned up project titles (removed "Terminal Interface" from 3D File System)
  - Fixed port assignments and improved status detection
  - Enhanced PowerShell scripts with proper portfolio port (5173)

### Previous Major Updates
- **Notebook-Style Sidebar**: Complete redesign with professional tabs that stick to panel edges
- **Dynamic Panel System**: Order-based panel opening with smooth React Spring animations
- **Professional SVG Icons**: Replaced emojis with custom icon library from GGPrompts design system
- **Status Dashboard**: Comprehensive project management with real-time port detection
- **Smart Port Management**: Dedicated port assignments with conflict prevention
- **Enhanced UX**: No auto-browser launching, clean startup, perfect tab alignment
- **Dynamic Width Management**: Main content adjusts properly to sidebar changes
- **Online/Offline Project Separation**: Projects automatically grouped by running status for cleaner workflow
- **Consistent Header Heights**: All panel headers (PROJECTS, DEV NOTES, My Project Portfolio) aligned with uniform 80px height
- **Improved Visual Polish**: Fixed search bar spacing, removed unnecessary UI elements, standardized styling

## Development Workflow

### Matrix Card Notes System Workflow
1. **Default Interface**: DEV NOTES panel opens directly to Matrix Card note editor
2. **Project Selection**: Choose project from dropdown or leave as "General"
3. **Claude Instructions**: Add optional instructions for AI organization (marked with ###)
4. **Note Content**: Write your thoughts in the large letter-sized content area
5. **Preview**: Flip the card to see formatted markdown output with metadata
6. **Save**: Notes automatically saved to to-sort folder with project context
7. **Organization**: Use "Organize Notes" button to generate Claude prompts for batch sorting

### Note Organization System
- **To-Sort Folder**: `D:\ClaudeWindows\claude-dev-portfolio\notes\to-sort\`
- **Automatic Metadata**: Project paths, timestamps, and Claude instructions included
- **Smart Organization**: Generated prompts include project-specific context and file paths
- **Flexible Destinations**: Notes can be moved to dev journals, CLAUDE.md, README, or topic folders

### Example Matrix Card Notes Workflows

**Workflow 1: Project-Specific Feature Idea**
1. Open DEV NOTES panel (automatically opens to Matrix Card editor)
2. Select **Matrix Cards** from project dropdown
3. Add Claude Instructions: `Help me implement this feature in the Matrix Cards project`
4. Write Note: `Add a new card type that displays code snippets with syntax highlighting. This would be great for showcasing code examples and technical documentation.`
5. Preview by flipping the card to see formatted output
6. Save - automatically includes project path: `D:\ClaudeWindows\claude-dev-portfolio\projects\matrix-cards`

**Workflow 2: General Development Thought**
1. Keep project dropdown as "General (No Project)"
2. Add Claude Instructions: `Organize this into the appropriate project or create a new research folder`
3. Write Note: `Research terminal integration patterns for web applications. Look into xterm.js + node-pty architecture.`
4. Save to to-sort folder for later organization

**Workflow 3: Batch Organization**
1. After accumulating several notes, click **🗂️ Organize Notes**
2. Claude prompt automatically generated with instructions to:
   - Review all notes in to-sort folder
   - Extract Claude instructions (marked with ###)
   - Move notes to appropriate project dev journals
   - Update CLAUDE.md files with relevant instructions
   - Create topic-based folders for general notes

## Project Management

### Creating New Projects
```bash
# Create a new project with automatic setup
.\scripts\create-project.ps1 -ProjectName "my-awesome-project" -Description "Description here"

# The script will:
# - Create project directory from template
# - Assign available port automatically (from fallback range)
# - Initialize git repository
# - Create development journal
# - Provide manifest.json entry to copy
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
- **Portfolio**: Runs on port 5173 (Vite dev server, excluded from project detection)
- **Projects**: Assigned specific ports to avoid conflicts:
  - GGPrompts Style Guide: 3001
  - Matrix Cards: 3002
  - Sleak Card: 3003
  - 3D File System: 3004
  - 3D Matrix Cards: 3005
  - GGPrompts Main: 9323
- **Conflict Detection**: Portfolio port excluded from project status detection
- **Fallback Ports**: 3006-3010, 5174-5177 (automatically assigned if defaults are taken)
- **Status Accuracy**: Only actual project ports are monitored for online/offline status

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

### Port Management Issues
**Problem**: Project showing as "running" when it's not, or incorrect status detection
**Solution**: 
- Check if another service is using the project's assigned port
- Use `netstat -ano | findstr :PORT` to identify process on specific port
- Kill conflicting process: `powershell "Stop-Process -Id PROCESS_ID -Force"`
- Portfolio port (5173) is excluded from project detection to prevent false positives

**Problem**: Portfolio won't start or uses wrong port
**Solution**:
- Ensure port 5173 is free: `netstat -ano | findstr :5173`
- If port is taken, kill the process or change `vite.config.ts` port setting
- Vite will automatically try next available port if 5173 is occupied

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
