# Fix VS Code Dark Mode in Workspace

## The Issue
When opening a workspace in VS Code Server, dark mode turns off even though you're logged into a profile with dark mode enabled.

## Solutions

### Solution 1: Remove Theme Override from Workspace
I've already updated `portfolio-dev.code-workspace` to remove the theme setting. This allows your profile theme to take precedence.

### Solution 2: Use Profile-Aware Launch Script
Use the new launch script that explicitly loads your profile:

```powershell
# Default profile
.\launch-vscode-with-profile.ps1

# Or specify your profile name
.\launch-vscode-with-profile.ps1 -Profile "YourProfileName"
```

### Solution 3: Manual VS Code Settings

1. **In VS Code Server (browser):**
   - Press `Ctrl+Shift+P`
   - Type "Preferences: Open User Settings (JSON)"
   - Add/verify these settings:
   ```json
   {
     "workbench.colorTheme": "Default Dark+",
     "window.autoDetectColorScheme": false
   }
   ```

2. **Enable Settings Sync:**
   - Click on the account icon (bottom left)
   - Turn on "Settings Sync"
   - Make sure "Theme" is checked in sync options

### Solution 4: Force Theme via URL Parameters
When accessing VS Code Server, you can add URL parameters:
```
http://localhost:8080/?theme=dark
```

### Solution 5: Profile-Specific Workspace
Use the alternative workspace file that explicitly inherits profile settings:
```powershell
# In VS Code
File → Open Workspace from File → Select "portfolio-profile-aware.code-workspace"
```

## Why This Happens

1. **Workspace settings override user settings** - This is by design in VS Code
2. **VS Code Server profile loading** - Sometimes doesn't fully load profile settings
3. **Settings sync delay** - Profile settings might not sync immediately

## Verification Steps

1. Check current profile:
   - In VS Code: Click account icon → Check which profile is active

2. Verify theme persistence:
   - Close VS Code Server
   - Restart using the profile-aware script
   - Open workspace
   - Theme should remain dark

3. Check settings precedence:
   - User Settings (lowest priority)
   - Profile Settings 
   - Workspace Settings (highest priority)

## Quick Fix Command
Copy and run this in PowerShell to start VS Code Server with proper profile support:

```powershell
cd D:\ClaudeWindows\claude-dev-portfolio
.\launch-vscode-with-profile.ps1
```

Then in VS Code Server:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "Preferences: Color Theme"
3. Select your dark theme
4. It should now persist across workspace opens
