# Changelog

All notable changes to the Claude Windows Portfolio Hub will be documented in this file.

## [2.2.0] - 2025-07-23 - Enhanced Port Detection & Network Diagnostics

### 🚀 Major Features Added

#### Enhanced Port Detection System
- **Smart Auto-Increment Detection**: Added comprehensive port detection for Vite dev servers (5173→5174→5175→etc.)
- **Cache Management**: Implemented cache clearing with `refreshAll()` method for accurate port status
- **Multi-Range Port Scanning**: Enhanced detection across React (3000-3010), Vite (5173-5180), and custom port ranges
- **Actual vs Configured Port Resolution**: New `detectActualPort()` method finds running instances on auto-incremented ports
- **Enhanced Project Status**: `getEnhancedProjectStatus()` provides comprehensive port and process information

#### Network Diagnostics Integration
- **PowerShell Command Support**: Added support for `netstat -ano | Select-String ":300[0-9]"` diagnostic commands
- **Network Process Detection**: Enhanced security patterns to allow legitimate network diagnostic operations
- **Port Range Analysis**: New `getPortRangeStatus()` method for debugging port conflicts
- **Process Information**: Integrated process name and PID detection with port usage analysis

### 🔧 Configuration Fixes

#### Port Configuration Corrections
- **Fixed Portfolio Port**: Corrected manifest.json portfolio port from 5175 to 5173 (Vite default)
- **Smart Port Resolution**: Portfolio now correctly detects on Vite's default 5173 with fallback detection
- **Improved Port Allocation**: Enhanced port assignment for new projects with automatic conflict resolution

### 🛡️ Security Enhancements

#### Network Command Support
- **Enhanced SAFE_COMMAND_PATTERNS**: Added comprehensive network diagnostic command patterns
- **PowerShell Network Commands**: Added support for `netstat`, `findstr`, and `Select-String` operations
- **Port Scanning Security**: Secured port range checking with validated patterns
- **Cross-Platform Compatibility**: Network commands work across PowerShell and Command Prompt contexts

### 🐛 Bug Fixes

#### Port Detection Issues
- **Fixed Port Conflicts**: Enhanced detection prevents false positives from portfolio self-detection
- **Eliminated Cache Staleness**: Refresh operations now clear cache for accurate real-time status
- **Improved Status Accuracy**: Multiple detection methods ensure accurate project status reporting
- **Network Diagnostic Blocking**: Resolved security blocking of legitimate `netstat` and `Select-String` commands

#### VS Code Extension Improvements
- **Enhanced Refresh Functionality**: Manual refresh now uses enhanced port detection with cache clearing
- **Smart Status Updates**: Project status updates include actual port detection and process information
- **Better Error Messages**: Improved feedback when commands are blocked or fail execution
- **Provider Communication**: Enhanced cross-provider communication with port detection integration

### 📚 Documentation Updates
- **Updated VS Code Extension CLAUDE.md**: Comprehensive documentation of enhanced port detection features
- **Enhanced Troubleshooting**: Added port detection troubleshooting section with detailed solutions
- **Architecture Documentation**: Updated PortDetectionService documentation with new methods
- **Security Documentation**: Added network diagnostic command support to security achievements

## [2.1.0] - 2025-07-22 - ServerToolbar & Security Update

### 🚀 Major Features Added

#### ServerToolbar Component
- **One-Click Server Management**: Added comprehensive toolbar for starting development servers
- **Start All Servers**: Launch both portfolio and VS Code servers simultaneously  
- **Portfolio Server Button**: Starts portfolio dev server using VS Code tasks
- **VS Code Server Button**: Starts VS Code web server with Simple Browser integration
- **Real-time Status**: Loading indicators, progress messages, and user feedback
- **Responsive Design**: Matrix-themed styling that adapts to mobile/desktop modes

#### Enhanced VS Code Extension Integration
- **Task-Based Server Startup**: Leverages VS Code's task system for background processes
- **Simple Browser Auto-Launch**: Automatically opens live previews after server startup
- **Secure Message Passing**: All React ↔ VS Code communication properly validated
- **Background Process Management**: Proper handling of long-running development servers

### 🔒 Security Enhancements

#### Complete Security Audit & Fixes
- **Eliminated Command Injection**: All terminal commands now use secure validation
- **Path Sanitization**: Project paths validated and normalized before execution
- **Workspace Trust Validation**: All commands require workspace trust for execution  
- **Command Whitelisting**: Only approved commands can be executed
- **Individual Command Execution**: Multi-line commands broken into secure validated parts

#### Enhanced Security Service
- **VSCodeSecurityService**: Comprehensive security validation for all command execution
- **Path Validation**: Directory traversal prevention and path normalization
- **Error Handling**: Clear feedback when security blocks commands
- **PowerShell Security**: Secure execution of PowerShell commands with validation

### 🐛 Critical Bug Fixes

#### Server Startup Issues
- **Fixed Multi-line Command Blocking**: Commands now execute individually through security service
- **Fixed Missing Message Handlers**: Added handlers for `server:startAll`, `server:startPortfolio`, `server:start`
- **Fixed Background Process Handling**: Long-running processes now use VS Code tasks instead of direct terminal execution
- **Fixed Security Blocking**: Commands no longer blocked by security validation when properly structured

#### VS Code Extension Issues
- **Fixed Message Passing**: React components now properly communicate with VS Code extension
- **Fixed Command Execution**: All project launch commands now use secure execution methods
- **Fixed Path Handling**: Project paths properly resolved and validated
- **Fixed Terminal Output**: Commands execute in appropriate terminals with proper feedback

### 📚 Documentation Updates
- **Updated README**: Current feature set and security information
- **Security Audit Results**: Comprehensive documentation of security fixes
- **VS Code Extension README**: Updated with ServerToolbar and security features

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
