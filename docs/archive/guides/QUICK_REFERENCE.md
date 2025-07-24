# Claude Portfolio - Quick Reference Guide

## 🚀 What's New & How to Use It

### VS Code Extension (The Big Update!)

Instead of fighting with iframes and losing your workspace every time you switch tabs, we now have a proper VS Code extension!

#### Installation (2 minutes)
```powershell
cd D:\ClaudeWindows\claude-dev-portfolio\vscode-extension\claude-portfolio
npm install
npm run compile
code --extensionDevelopmentPath=.
```

#### What You'll See
```
VS Code
├── 🚀 Claude Portfolio (new icon in activity bar)
│   ├── 📂 Projects (all your portfolio projects)
│   ├── ⚡ Quick Commands (VS Code, Git, Portfolio)
│   └── 📚 Cheat Sheet (PowerShell, Git, npm)
└── Status Bar: "🚀 Claude Portfolio" (click for dashboard)
```

### Fixed Issues

| Problem | Solution | Result |
|---------|----------|---------|
| Console spam (ERR_CONNECTION_REFUSED) | Silent port checking with Image loading | Clean console ✅ |
| "Workspace does not exist" | Removed folder URL params | No more errors ✅ |
| Lost workspace on tab switch | Keep instances mounted | State persists ✅ |
| Dark mode resets | Removed theme from workspace | Theme preserved ✅ |

### Quick Commands

#### VS Code Extension Commands
- `Ctrl+Shift+P` → "Claude Portfolio: Show Dashboard"
- `Ctrl+Shift+P` → "Claude Portfolio: Quick Open"
- Right-click any project → "Run Project" or "Open in Browser"

#### PowerShell Helpers
```powershell
# Troubleshoot workspace issues
.\troubleshoot-workspace.ps1

# Start VS Code with profile (preserves dark mode)
.\launch-vscode-with-profile.ps1

# Helper for workspace setup
.\vscode-workspace-helper.ps1
```

### File Locations

#### New Files
- `vscode-extension/claude-portfolio/` - The VS Code extension
- `portfolio-absolute-paths.code-workspace` - Workspace with fixed paths
- `docs/vscode-workspace-persistence.md` - How persistence works
- `docs/vscode-integration-fixes.md` - Console error fixes
- `CHANGELOG.md` - Complete version history

#### Updated Files
- `src/utils/portManager.ts` - Silent port checking
- `src/components/VSCodeManager.tsx` - Console noise removed
- `README.md` - Complete documentation update

### Workflows

#### Old Way (Web + iFrame)
1. Open portfolio website
2. Click VS Code tab
3. Lose workspace when switching tabs 😢
4. See console errors
5. Manually reopen workspace

#### New Way (VS Code Extension)
1. Open VS Code
2. Click Claude Portfolio in sidebar
3. Everything just works! 🎉
4. Clean console
5. Persistent state

### Tips & Tricks

1. **Project Management**
   - Click any project in sidebar to open it
   - Right-click for more options
   - Projects show port numbers and status

2. **Dashboard**
   - Click status bar item
   - See all projects at a glance
   - Quick actions to run servers

3. **Commands & Cheat Sheet**
   - Built into the sidebar
   - Click to execute or copy
   - Organized by category

### Troubleshooting

**Extension not showing?**
- Make sure you compiled: `npm run compile`
- Check the Extensions view in VS Code

**Projects not loading?**
- Verify `manifest.json` exists in projects folder
- Check extension settings for correct path

**Want the old way back?**
- Web portfolio still works at http://localhost:5173
- VS Code integration there is now legacy

### Why This Is Better

| Feature | iFrame Version | Extension Version |
|---------|---------------|-------------------|
| Workspace State | Lost on tab switch | Always persists |
| Console Errors | Lots of red errors | Clean & quiet |
| Performance | iframe overhead | Native VS Code |
| Features | Limited by security | Full VS Code API |
| User Experience | Hacky workarounds | Professional |

### Next Steps

1. Install the extension (if you haven't already)
2. Explore the new features
3. Delete the old VS Code web integration (optional)
4. Enjoy a better development experience!

---

Remember: Your original web portfolio still works perfectly for showcasing projects. The VS Code extension is specifically for managing your development workflow within VS Code itself. Best of both worlds! 🚀
