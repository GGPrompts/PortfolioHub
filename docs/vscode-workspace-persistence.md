# VS Code Workspace Persistence Solution

## The Problem
When switching between tabs in the VS Code integration (e.g., clicking the gear settings tab then returning), VS Code Server returns to the landing page with no folders open. This happens because:

1. The iframe was being unmounted and remounted when switching tabs
2. VS Code Server web doesn't persist workspace state between loads
3. URL parameters don't directly support opening workspaces in VS Code Server

## The Solution Implemented

### 1. **Keep All Instances Mounted**
Instead of unmounting VS Code instances when switching tabs, all instances now remain mounted but hidden. This preserves the VS Code state including:
- Open folders
- Open files
- Terminal sessions
- Editor state

```jsx
// All instances render but only active one is visible
{instances.map(instance => (
  <div
    key={instance.id}
    style={{ display: activeInstanceId === instance.id ? 'block' : 'none' }}
  >
    <VSCodeTerminal />
  </div>
))}
```

### 2. **Absolute Path Workspaces**
Updated workspace files to use absolute paths instead of relative ones:
- `portfolio-absolute-paths.code-workspace` - Primary workspace with absolute paths
- `portfolio-dev.code-workspace` - Updated to use absolute paths

### 3. **Visual Indicators**
Added a notice bar that shows when VS Code loads, reminding users how to open the workspace if needed.

## How It Works Now

1. **First Load**: When you create a VS Code tab, it loads VS Code Server
2. **Open Workspace**: Use `Ctrl+Shift+P` → "File: Open Workspace from File" → Select `portfolio-absolute-paths.code-workspace`
3. **Switch Tabs**: Click on Commands (⚙️), Cheat Sheet, or other tabs
4. **Return**: Click back on your VS Code tab - it's still there with workspace open!

## Benefits

- ✅ No more losing workspace when switching tabs
- ✅ Terminal sessions persist
- ✅ Open files remain open
- ✅ Folder structure stays loaded
- ✅ Better performance (no reload needed)

## Manual Workspace Opening

If you still need to open the workspace manually:

1. **Quick Command**: Press `Ctrl+Shift+P` in VS Code
2. **Type**: "File: Open Workspace from File"
3. **Navigate**: Go to `D:\ClaudeWindows\claude-dev-portfolio`
4. **Select**: Choose `portfolio-absolute-paths.code-workspace`

## Troubleshooting

If workspaces still don't persist:

1. **Use the troubleshoot script**:
   ```powershell
   .\troubleshoot-workspace.ps1
   ```

2. **Save your own workspace**:
   - Open all desired folders manually
   - File → Save Workspace As...
   - Save as "my-workspace.code-workspace"

3. **Check VS Code Server is running**:
   - Look for green dot (●) in the UI
   - If red, click "Start Server"

## Technical Notes

- VS Code Server uses iframes which don't support cross-origin communication
- The `folder` URL parameter opens a single folder but not workspaces
- Keeping instances mounted uses more memory but provides better UX
- Each VS Code instance maintains its own state independently
