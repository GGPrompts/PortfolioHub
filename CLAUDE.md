## Recent Problem Solutions

### Console Error Fixes
**Problem**: ERR_CONNECTION_REFUSED spam in console
**Solution**: Replaced fetch() with Image loading for silent port checking
**Files Changed**: 
- `src/utils/portManager.ts`
- `src/components/VSCodeManager.tsx`

### Workspace Persistence
**Problem**: "Workspace does not exist" errors, state loss on tab switch
**Solution**: 
1. Created absolute path workspace files
2. Keep VS Code instances mounted (hide with CSS)
3. Removed problematic folder URL parameters
**Files Changed**:
- `portfolio-absolute-paths.code-workspace`
- `src/components/VSCodeTerminal.tsx`
- `src/components/VSCodeManager.tsx`

### Dark Mode Fix
**Problem**: Theme resets when opening workspace
**Solution**: Removed theme override from workspace settings
**Files Changed**:
- `portfolio-dev.code-workspace`
- `launch-vscode-with-profile.ps1`## Development Workflow Updates

### VS Code Extension Workflow (Recommended)
1. **Install Extension**: Build and install the Claude Portfolio extension
2. **Open VS Code**: Look for the Claude Portfolio icon in activity bar
3. **Manage Projects**: Click projects to open, right-click to run
4. **Use Dashboard**: Click status bar item for beautiful overview
5. **Quick Commands**: Access common tasks from sidebar

### Web Portfolio Workflow (Original)
1. **Start Portfolio**: `npm run dev` in root directory
2. **View Projects**: Navigate to http://localhost:5173
3. **Launch Projects**: Use automation scripts or manual start
4. **VS Code Integration**: Now legacy - use extension instead## Technical Architecture

### Recent Architectural Changes

#### VS Code Extension Architecture
```
vscode-extension/claude-portfolio/
├── src/
│   ├── extension.ts          # Main activation point
│   ├── projectProvider.ts    # Tree view for projects
│   ├── dashboardPanel.ts     # Webview dashboard
│   ├── commandsProvider.ts   # Quick commands tree
│   └── cheatSheetProvider.ts # Development cheat sheet
├── media/                    # Dashboard styling
└── package.json             # Extension manifest
```

#### Port Management Improvements
- Silent port checking using Image loading (no console errors)
- WebSocket fallback for VS Code Server detection
- Graceful handling of connection failures

#### State Persistence Solution
- VS Code instances remain mounted (hidden with CSS)
- No re-rendering when switching tabs
- Workspace state preserved across tab switches# Claude Development Portfolio

## Overview
This is the root directory for all Claude-assisted development projects. The portfolio app serves as a central hub to view, launch, and manage all projects with a clean, professional interface and comprehensive development tools.

## 🆕 Major Updates (January 2024)

### VS Code Extension Integration
The portfolio now includes a native VS Code extension that solves all previous iframe integration issues:

#### What's New:
- **Native VS Code Extension** (`vscode-extension/claude-portfolio/`)
  - Projects appear in VS Code activity bar
  - Beautiful webview dashboard
  - Right-click context menus
  - Persistent workspace state (no more lost tabs!)
  - One-click project management

#### Fixed Issues:
- ✅ Console errors eliminated (silent port checking)
- ✅ Workspace persistence (no more "workspace does not exist")
- ✅ Dark mode preservation
- ✅ State loss when switching tabs

#### Quick Start:
```powershell
cd vscode-extension\claude-portfolio
npm install
npm run compile
code --extensionDevelopmentPath=.
```

## CCGlobalCommands Integration
**Slash commands are now available globally!** The ClaudeGlobalCommands system provides 9 core commands and 47+ specialized agents that work from any project directory.

### Quick Start with Slash Commands:
- `/guide` - Get comprehensive help and overview
- `/agents` - Browse all 47+ AI specialists  
- `/execute <task>` - Quick task execution with intelligent routing
- `/workflows <name>` - Multi-agent automation workflows
- `/senior-engineer` - Code reviews and architecture guidance
- `/documentation` - Generate technical documentation

### Integration with Portfolio Projects:
The slash commands work seamlessly within any project in your portfolio. You can use `/senior-engineer` for code reviews, `/documentation` for generating docs, or `/execute` for quick tasks while working on any project.

**Installation Location:** `%USERPROFILE%\.claude\` (Windows)
**Repository Location:** `D:\ClaudeWindows\ClaudeGlobalCommands\`

## Key Features
- **Notebook-Style Sidebar**: Professional tabs with custom sidebar state icons that slide to panel edges like real notebook dividers
- **Dynamic Panel System**: Order-based panel opening with smooth React Spring animations
- **Live Project Previews**: Real-time iframe displays with realistic device scaling and refresh indicators
- **Professional SVG Icons**: Custom icon library with simplified sidebar representations and comprehensive controls
- **Enhanced Status Bar**: Larger, more readable tech tags and control buttons with refresh indicators
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
│   ├── start-all-enhanced.ps1  # Most robust launcher with comprehensive server detection
│   ├── start-all-tabbed.ps1    # Windows Terminal tabbed version (recommended)
│   ├── create-project.ps1      # Automated project creation with full integration
│   └── kill-all-servers.ps1    # Server management and cleanup
└── docs/                       # Documentation
```

## Quick Start
```bash
# Install dependencies
npm install

# Start portfolio hub (runs on port 5173+, auto-assigned by Vite)
npm run dev

# Start all projects in tabbed Windows Terminal (recommended)
.\scripts\start-all-tabbed.ps1

# Alternative: Start all projects in separate windows
.\scripts\start-all-enhanced.ps1

# Create new project
.\scripts\create-project.ps1 -ProjectName "my-new-project" -Description "Project description"
```

## PowerShell Automation Scripts

### Current Active Scripts

**Project Startup:**
- `start-all-tabbed.ps1` - **Recommended**: Start all projects in Windows Terminal tabs
- `start-all-enhanced.ps1` - Robust launcher with comprehensive server detection

**Project Management:**
- `create-project.ps1` - Automated project creation with full integration
- `kill-all-servers.ps1` - Stop all running development servers

**Utility Scripts:**
- `check-ports.ps1` - Check which ports are in use
- `update-all.ps1` - Update all project repositories

### Script Options

**start-all-tabbed.ps1 / start-all-enhanced.ps1:**
```powershell
# Start all projects
.\scripts\start-all-tabbed.ps1

# Start only portfolio
.\scripts\start-all-tabbed.ps1 -OnlyPortfolio

# Start all except portfolio
.\scripts\start-all-tabbed.ps1 -NoPortfolio

# Force restart all (stop existing first)
.\scripts\start-all-tabbed.ps1 -Force

# Show detailed output
.\scripts\start-all-tabbed.ps1 -Verbose
```

**create-project.ps1:**
```powershell
# Create with automatic port assignment
.\scripts\create-project.ps1 -ProjectName "my-project" -Description "Project description"

# Create with specific port
.\scripts\create-project.ps1 -ProjectName "my-project" -Port 3015 -Description "Custom port project"
```

### Archived Scripts

Outdated scripts have been moved to `scripts/archive/` to avoid confusion:
- `start-all-improved.ps1` - Had emoji rendering issues in PowerShell
- `start-all-*.ps1` - Various intermediate versions
- `launch-and-open.ps1` - Basic launcher without server detection

## User Interface

### Notebook-Style Sidebar
- **Professional tabs** stick out from the left edge of the screen
- **Dynamic positioning** - tabs slide to the right edge of their panels when opened
- **Order-based opening** - panels appear in the order tabs are clicked
- **Click to toggle** - click active tab to close its panel
- **Custom sidebar state icons** for intuitive visual representation:
  - 🔲 `sidebarSmall` for Projects panel (rectangle with narrow vertical line)
  - 🔳 `sidebarLarge` for Dev Notes panel (rectangle with wide vertical line)
  - 💻 `code` for VS Code panel (VS Code icon)

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
- **Auto-sorted project layout** - Projects automatically sorted by status:
  - 🟢 **ONLINE** section shows all running projects at the top
  - 🔴 **OFFLINE** section shows stopped projects at the bottom (above controls)
  - Sections only appear when they contain projects
  - Real-time updates as project status changes
- **Streamlined controls** - Clean selection system with enhanced bottom actions:
  - **Launch Selection** header with All/None buttons for easy project selection
  - **Enhanced bottom controls** with visual command grouping:
    - **Dashboard** - Opens comprehensive project status management
    - **Run** group - "All" and "Selected (count)" buttons for starting projects
    - **Kill** group - "All" and "Selected (count)" buttons for stopping projects
  - **Visual hierarchy** - Kill commands have red labels and icons for destructive action indication
  - **Dynamic selection counts** - Selected buttons show real-time project count

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

### VS Code Server Integration
- **Complete VS Code Server integration** embedded in Portfolio Hub sidebar
- **Multi-tab support** with persistent state across panel minimize/restore
- **Custom profile integration** with "Matt" profile for consistent dark mode and settings
- **Real-time server status detection** with automatic 5-second health checks
- **Smart startup commands** with PowerShell script generation and clipboard integration
- **Professional VS Code terminal component** with iframe embedding and proper styling
- **Tab management system** allowing multiple VS Code instances and easy switching
- **Comprehensive error handling** with connection status indicators and retry mechanisms
- **Seamless workspace loading** with portfolio directory auto-configuration
- **Claude Code extension support** for AI-powered development within VS Code Server

## Current Projects
- **3d-matrix-cards**: Three.js interactive card display with cyberpunk aesthetics
- **matrix-cards**: React cyberpunk card components with dynamic animations
- **sleak-card**: Modern card system with water effects and responsive design
- **ggprompts**: Main AI prompt platform with advanced features
- **ggprompts-style-guide**: Design system documentation and component library
- **ggprompts-professional**: Work-appropriate replica with corporate-friendly interface
- **3d-file-system**: Advanced file system viewer with terminal interface, expandable sidebar, and working 3D card flipping

## Recent Updates (2025-07-21)

### Latest Features (Current Session - Complete VS Code Integration Overhaul)
- **Revolutionary Right Sidebar VS Code Integration**: Complete redesign of VS Code workflow with dedicated sidebar
  - **Draggable right sidebar** with resize functionality that properly adjusts main content margins
  - **Three specialized tabs** with distinct color coding and functions:
    - **⚙️ Commands Tab (Green)**: VS Code Command Palette operations with one-click execution
    - **⌨️ Cheat Sheet Tab (Cyan)**: PowerShell & development commands for Windows workflows  
    - **🔗 AI Prompts Tab (Orange)**: Curated Claude prompts for enhanced development
  - **Auto VS Code Server detection** with automatic portfolio loading when server starts
  - **Professional tab styling** with icon-only design matching left sidebar aesthetic
- **Comprehensive Command System**: Direct VS Code Command Palette integration
  - **Project Navigation**: Open folders, workspaces, and portfolio workspace with direct path copying
  - **VS Code Tab Management**: Create new VS Code instances with automatic numbering
  - **Terminal Operations**: New terminal, split terminal, clear terminal commands
  - **Development Commands**: npm run dev, npm install, git status, git pull with terminal execution
  - **Keyboard shortcuts hint**: Prominent Ctrl+Shift+P instruction for VS Code operations
- **PowerShell & Development Cheat Sheet**: Windows-native command reference
  - **Claude Code Commands**: claude, claude mcp list, claude commit with descriptions
  - **PowerShell Navigation**: Set-Location, Get-ChildItem, directory operations adapted for Windows
  - **Git Workflow**: Complete git command reference for version control
  - **Node.js & npm**: Project setup and development server commands
  - **VS Code Integration**: code . and server startup commands
  - **System Commands**: Process management and port checking utilities
- **AI Prompts Library**: Professional prompt collection for development enhancement
  - **Deep Analysis**: "think hard about this architecture", "ultrathink", security analysis prompts
  - **Multi-Agent Coordination**: Parallel agent deployment, /senior-engineer, /execute commands
  - **Code Quality & Review**: Best practices review, refactoring, error handling prompts
  - **Development Workflow**: Test generation, documentation, performance optimization prompts
  - **Problem Solving**: Debugging, alternative approaches, technical explanation prompts
- **Enhanced User Experience**: Professional styling and functionality improvements
  - **Click-to-copy functionality**: All commands and prompts instantly copyable to clipboard
  - **Organized categories**: Logical grouping with icons and clear descriptions
  - **Scrollable content**: Fixed overflow issues for proper navigation of all content
  - **Responsive design**: Works perfectly on all screen sizes with mobile-friendly layouts
  - **Professional alerts**: Clean confirmation messages showing what was copied
- **Workspace Integration Enhancements**: Improved VS Code workspace handling
  - **Direct workspace access**: One-click opening of portfolio-dev.code-workspace
  - **Window profile settings**: Recommendation to use window.newWindowProfile for consistent experience
  - **Panel layout persistence**: Workspace saves panel positions and sizes for consistent dev environment

### Previous Features (2025-07-21 Earlier)
- **Enhanced Project Status Bar**: Comprehensive improvements to project card status displays:
  - **Larger, more readable text**: Status bar font increased from 12px to 14px for better visibility
  - **Enhanced tech tags**: Moved to status bar center with increased size (9px→12px) and better spacing
  - **Larger control buttons**: Increased from 18px to 28px height with 14px font size for emojis/icons
  - **Visual refresh indicators**: Eye icon with pulse animation shows when projects are refreshing
  - **Better space utilization**: Three-section layout (status | tech tags | controls) with proper spacing
  - **Improved button gaps**: Increased spacing between all interactive elements for better UX
- **Custom Sidebar State Icons**: Replaced generic icons with intuitive sidebar representations:
  - **Projects tab**: Simple rectangle with narrow vertical line (`sidebarSmall`)
  - **DEV NOTES tab**: Simple rectangle with wide vertical line (`sidebarLarge`)  
  - **Clean design**: No fills, consistent stroke width, minimal geometric approach
  - **Visual clarity**: Icons directly represent the sidebar width states they activate
- **Improved Header Refresh**: Fixed portfolio header refresh button to only update status without collapsing sidebars

### Previous Features (2025-07-20)
- **Realistic Device Display System**: Revolutionary preview system with true-to-life device scaling:
  - **Mobile previews**: iPhone 13/14 proportions (375×812px) with proper 9:19.5 aspect ratio
  - **Desktop previews**: Accurate 1920×1080 resolution with 16:9 aspect ratio 
  - **Smart zoom levels**: 25%, 50%, 75%, 100%, and "fit to container" modes
  - **Device bezel effects**: Realistic borders and shadows simulating actual device frames
  - **Viewport injection**: Automatically sets proper viewport meta tags for accurate rendering
  - **Top-left alignment**: All zoom levels consistently start from the top of the page
  - **Desktop-first default**: Projects now default to desktop view for better showcase
- **Collapsible Project Sections**: Major sidebar organization improvement:
  - **Clickable section headers**: Click "🟢 ONLINE" or "🔴 OFFLINE" to collapse/expand
  - **Project count indicators**: Shows number of projects in each section (e.g., "ONLINE (3)")
  - **Animated visual feedback**: Arrows rotate to show collapsed/expanded state
  - **Focus mode capability**: Hide offline projects to focus only on active development
- **Enhanced Styling Consistency**: Professional interface standardization:
  - **Normalized section headers**: Match project item sizing for unified appearance
  - **Updated status display**: Modern fonts matching rest of interface instead of monospace
  - **Professional refresh icon**: SVG refreshCw icon instead of emoji
  - **Consistent typography**: System fonts throughout for professional appearance

### Previous Features (2025-07-18)
- **Streamlined Project Interface**: Major redesign of Projects panel for better workflow:
  - **Auto-sorted layout** - Online projects at top, offline projects at bottom above controls
  - **Enhanced bottom controls** with visual command grouping (Dashboard | Run | Kill)
  - **Dynamic selection counts** - "Selected (3)" buttons show real-time project count
  - **Removed clutter** - Eliminated middle Launch Selection script buttons for cleaner interface
  - **Visual hierarchy** - Red styling for Kill commands (headers, icons) and delete buttons
  - **Consistent theming** - Destructive actions clearly marked with red indicators
- **Fixed Card Clipping Issues**: Resolved hover animation problems throughout the interface:
  - **Removed problematic transforms** - Eliminated translateY effects causing card top cutoff
  - **Improved hover feedback** - Enhanced shadows and borders without clipping
  - **System-wide fixes** - Applied to sidebar, main content, and note cards
- **Eye Toggle Enhancement**: Improved live preview controls:
  - **Consistent styling** - Eye toggle matches refresh button without inheriting animations
  - **Proper SVG handling** - Fixed Vite parsing issues with proper file extensions
  - **Better placement** - Positioned next to refresh button for logical grouping
- **Header Layout Consistency**: Fixed header height and positioning issues:
  - Unified header styles between portfolio and project pages using same CSS classes
  - Proper green border line positioning at bottom of header
  - Consistent 80px header height with proper content spacing
  - Removed absolute positioning conflicts and padding issues
  - Content now starts properly below header with 40px spacing
- **Project Navigation Improvements**: Enhanced "View Project" functionality:
  - "View Project" button now opens projects within portfolio viewer instead of new tab
  - Dedicated "Open in New Tab" (↗️) button remains for external viewing
  - Better user experience with consistent navigation patterns
- **DEV NOTES Enhancement**: Smart note type system for better organization:
  - **Note Type Dropdown**: 8 predefined note types with context-specific instructions:
    - General Note, Add to CLAUDE.md, Add to Commands, Bug Fix
    - Visual/UI Adjustment, Feature Request, Research Topic, Code Refactor
  - **Dynamic Instructions**: Auto-populated Claude instructions based on selected note type
  - **Vertical Header Layout**: Project and Type dropdowns stacked vertically to prevent width issues
  - **Smart Field Sizing**: Optimized text area heights (50px instructions, 200px content) with auto-expand
  - **Modal Size Optimization**: Increased modal height to 700px for better content display
- **Professional Matrix Card Notes System**: Complete redesign of DEV NOTES with Matrix Card aesthetics:
  - Professional 3D flip card interface with cyberpunk green/cyan theme
  - Separate fields for Claude instructions (### marked) and note content
  - Project dropdown selection with automatic folder path integration
  - Enhanced placeholder text with bright teal color and comprehensive instructions
  - Letter-sized proportions (700px height) for better writing experience
  - Flip animation to preview formatted markdown output
  - Default to new note interface for immediate productivity
- **Universal Note Capture System**: Streamlined workflow for quick idea capture:
  - Notes automatically saved to to-sort folder for later organization
  - Project-specific context with exact folder paths provided to Claude
  - One-click organization prompt generation for batch processing
  - Smart metadata including project paths, timestamps, and Claude instructions
  - Clipboard integration with context-aware Claude prompts
  - **Red delete icons** for clear destructive action indication in to-sort folder
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

### VS Code Server Integration Workflow
1. **Server Management**: Use Portfolio Hub VS Code panel for complete server lifecycle
   - **Status Monitoring**: Real-time server status with green/red indicators
   - **One-Click Startup**: "Start Server" button copies optimized PowerShell commands
   - **Matt Profile Integration**: Automatic dark mode and portfolio workspace loading
   - **Server Health Checks**: Automatic status detection every 5 seconds
2. **Multi-Tab Development**: Professional VS Code tab management system
   - **Primary Instance**: "Open VS Code" creates main development environment
   - **Additional Tabs**: "New Tab 1/2/3" for parallel development workflows
   - **Tab Persistence**: VS Code instances maintained across panel minimize/restore
   - **Project Selection**: Dropdown to quickly switch between portfolio projects
3. **Development Environment**: Optimized VS Code Server configuration
   - **Matt Profile**: Custom profile with dark theme and development settings
   - **Claude Code Extension**: AI-powered development assistance within VS Code
   - **Workspace Auto-Loading**: Portfolio directory and project structure pre-configured
   - **Terminal Integration**: PowerShell terminals with proper working directory
4. **Professional Integration**: Seamless Portfolio Hub + VS Code workflow
   - **Third Sidebar Panel**: 800px VS Code panel with proper tab positioning
   - **Consistent Styling**: Cyberpunk theme integration with Portfolio Hub design
   - **Error Handling**: Comprehensive connection status and retry mechanisms
   - **Responsive Design**: Optimized for various screen sizes and layouts

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
- **Portfolio**: Runs on port 5173+ (Vite auto-assigns next available port, excluded from project detection)
- **Projects**: Assigned specific ports to avoid conflicts:
  - GGPrompts Style Guide: 3001
  - Matrix Cards: 3002
  - Sleak Card: 3003
  - 3D File System: 3004
  - 3D Matrix Cards: 3005
  - GGPrompts Professional: 3006
  - GGPrompts Main: 9323
- **Conflict Detection**: Portfolio port excluded from project status detection
- **Fallback Ports**: 3007-3010, 5174-5177 (automatically assigned if defaults are taken)
- **Status Accuracy**: Only actual project ports are monitored for online/offline status

### Component Architecture
```
src/components/
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
2. **Grid Performance**: Reduce project count or optimize grid layout on older hardware
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
