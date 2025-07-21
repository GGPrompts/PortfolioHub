# Changelog

All notable changes to the Claude Windows Portfolio Hub will be documented in this file.

## [2.0.0] - 2024-01-20

### 🎉 Major Release: VS Code Extension

#### Added
- **VS Code Extension** - Complete native VS Code integration
  - Activity bar with project browser, commands, and cheat sheet
  - Beautiful webview dashboard with project statistics
  - Right-click context menus for projects
  - Status bar integration
  - Persistent workspace state (no more lost tabs!)
  - One-click project opening, running, and browsing

#### Fixed
- **Console Errors** - Eliminated ERR_CONNECTION_REFUSED spam
  - Implemented silent port checking using Image loading
  - Removed unnecessary console.log statements
  - WebSocket checking for VS Code Server status
  
- **Workspace Persistence** - Fixed "workspace does not exist" errors
  - Created multiple workspace files with absolute paths
  - Removed problematic folder URL parameters
  - Added comprehensive troubleshooting guides

- **Dark Mode** - Theme no longer resets when opening workspace
  - Removed theme override from workspace settings
  - Created profile-aware workspace configuration
  - Added launch script with profile support

#### Changed
- Port checking now uses Image loading instead of fetch (silent failures)
- VS Code instances remain mounted when switching tabs (preserves state)
- Updated documentation with VS Code extension instructions
- Improved error messages and user guidance

#### Deprecated
- iframe-based VS Code integration (replaced by native extension)

## [1.5.0] - 2024-01-19

### VS Code Web Integration

#### Added
- VS Code Server integration with web-based terminals
- Multi-tab VS Code instances
- Commands panel with common VS Code operations
- PowerShell cheat sheet
- Claude AI prompts panel
- Workspace automation features

#### Known Issues
- Workspace state loss when switching tabs (fixed in 2.0.0)
- Console errors from port checking (fixed in 2.0.0)
- Dark mode persistence issues (fixed in 2.0.0)

## [1.4.0] - 2024-01-18

### Enhanced Project Management

#### Added
- Automated project creation script
- Smart port allocation system
- Development journal integration
- Project validation checks

#### Changed
- Improved manifest.json structure
- Better error handling for missing projects

## [1.3.0] - 2024-01-17

### UI/UX Improvements

#### Added
- Collapsible project sections (ONLINE/OFFLINE)
- Realistic device preview scaling
- Matrix Card notes system
- 3D flip animations

#### Changed
- Sidebar now has three states: collapsed, normal, expanded
- Improved responsive design
- Better project status indicators

## [1.2.0] - 2024-01-16

### Core Features

#### Added
- Real-time project status detection
- Inline project viewing with iframes
- Project filtering by technology
- Dashboard analytics
- PowerShell automation scripts

#### Changed
- Migrated from vanilla JS to React + TypeScript
- Implemented Zustand for state management
- Added Vite for faster builds

## [1.1.0] - 2024-01-15

### Initial Portfolio Features

#### Added
- Basic project grid layout
- Port management system
- Simple project launcher
- Responsive design

## [1.0.0] - 2024-01-14

### Initial Release

#### Added
- Basic portfolio structure
- Project manifest system
- Simple web interface

---

## Version History Summary

- **2.0.0** - VS Code Extension & Major Fixes
- **1.5.0** - VS Code Web Integration
- **1.4.0** - Enhanced Project Management
- **1.3.0** - UI/UX Improvements
- **1.2.0** - Core Features
- **1.1.0** - Initial Portfolio Features
- **1.0.0** - Initial Release

## Upgrade Guide

### From 1.x to 2.0

1. **Install the VS Code Extension**:
   ```powershell
   cd vscode-extension\claude-portfolio
   npm install
   npm run compile
   code --extensionDevelopmentPath=.
   ```

2. **Update your workflow**:
   - Use the VS Code extension instead of web-based VS Code integration
   - Projects now open directly in your workspace
   - No more iframe limitations!

3. **Clean up**:
   - The web portfolio still works perfectly
   - VS Code integration in the web UI is now legacy
   - Consider removing VSCodeManager component if not needed

### Benefits of Upgrading
- ✅ No more workspace state loss
- ✅ Native VS Code experience
- ✅ Better performance
- ✅ Full IDE features
- ✅ Clean console (no errors)
