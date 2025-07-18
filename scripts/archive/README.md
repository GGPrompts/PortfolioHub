# Archived PowerShell Scripts

This directory contains outdated PowerShell scripts that have been superseded by more robust versions.

## Archived Scripts

### Startup Scripts (Replaced by `start-all-enhanced.ps1` and `start-all-tabbed.ps1`)

- **start-all-improved.ps1** - Early version with emoji issues in PowerShell
- **start-all-final.ps1** - Intermediate version
- **start-all-fixed.ps1** - Intermediate version
- **start-all-powershell.ps1** - Basic version
- **start-all-working.ps1** - Intermediate version
- **start-all.ps1** - Original basic version
- **launch-and-open.ps1** - Basic launcher
- **run-projects.ps1** - Basic project runner

## Current Active Scripts

Use these scripts instead:

- **start-all-enhanced.ps1** - Most robust version with comprehensive server detection
- **start-all-tabbed.ps1** - Windows Terminal tabbed version
- **create-project.ps1** - Automated project creation with full integration
- **kill-all-servers.ps1** - Server management

## Issues with Archived Scripts

- **Emoji rendering issues** - PowerShell commands failed due to emoji symbols
- **Limited port detection** - Basic port checking without process management
- **No force restart** - Couldn't handle already running servers
- **Browser auto-opening** - Would open browsers automatically
- **No status reporting** - Limited feedback on server status

## Migration Notes

All functionality from archived scripts has been incorporated into the current active scripts with improvements:

- Better error handling
- Comprehensive process management
- Force restart capabilities
- Enhanced status reporting
- Browser auto-opening prevention
- Proper environment variable handling