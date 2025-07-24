# ServerToolbar Quick Reference

## 🚀 One-Click Server Management

The ServerToolbar provides instant access to start your development servers directly from the portfolio interface.

### Toolbar Location
- **Web Version**: Above the project grid on the main portfolio page
- **VS Code Extension**: Integrated within the portfolio webview

### Available Buttons

#### 🚀 Start All Servers
- **Function**: Launches both portfolio and VS Code servers simultaneously
- **Process**: 
  1. Starts portfolio dev server using VS Code task
  2. Waits 3 seconds
  3. Starts VS Code web server
  4. Automatically opens Simple Browser after 10 seconds
- **Best For**: Complete development environment setup

#### 💼 Portfolio Server
- **Function**: Starts only the portfolio development server
- **Process**: Uses VS Code's "Start Portfolio Dev Server" task
- **Access**: Portfolio available at http://localhost:5173
- **Best For**: Working on portfolio features only

#### ⚡ VS Code Server
- **Function**: Starts VS Code web server for remote access
- **Process**: 
  1. Kills existing code-tunnel processes
  2. Changes to portfolio directory
  3. Starts VS Code serve-web on port 8080
  4. Opens Simple Browser automatically
- **Access**: VS Code web interface at http://localhost:8080
- **Best For**: Remote development or sharing live VS Code session

### Status Indicators

#### Loading States
- **Button Changes**: Shows spinner and "Starting..." text
- **Status Messages**: Real-time feedback below buttons
- **Duration**: Buttons disabled during startup process

#### Success Messages
- **Portfolio**: "Portfolio server starting! Check terminal for progress"
- **VS Code**: "VS Code Server starting on port 8080!"
- **All Servers**: "Servers starting in background - check terminal for progress"

#### Error Handling
- **Security Blocked**: "Command execution was blocked for security reasons"
- **Task Not Found**: Falls back to manual task creation
- **General Errors**: "Failed to start servers - check console for details"

### Security Features

#### Command Validation
- All commands validated through VSCodeSecurityService
- Only whitelisted commands can execute
- Path sanitization prevents directory traversal
- Workspace trust required for execution

#### Safe Execution
- Multi-line commands broken into individual validated parts
- Commands execute with minimal permissions
- Error messages when security blocks execution
- Clear feedback about what's happening

### Troubleshooting

#### Common Issues

**"Command execution was blocked for security reasons"**
- Ensure workspace is trusted in VS Code
- Check that commands are in the whitelist
- Verify working directory permissions

**"Portfolio server starting! Check terminal for progress"**
- Look for "Start Portfolio Dev Server" terminal tab
- Check for npm errors or port conflicts
- Ensure dependencies are installed (`npm install`)

**"VS Code Server should be ready now. Open it in Simple Browser?"**
- Click "Open Simple Browser" for embedded view
- Click "Open External Browser" to open in default browser
- Click "Later" to dismiss the notification

#### Manual Alternatives

If ServerToolbar buttons don't work:

**Portfolio Server (Manual)**
```bash
cd "D:\ClaudeWindows\claude-dev-portfolio"
npm run dev
```

**VS Code Server (Manual)**
```bash
cd "D:\ClaudeWindows\claude-dev-portfolio"
code serve-web --port 8080 --host 0.0.0.0 --without-connection-token
```

**Check Running Servers**
```powershell
netstat -ano | findstr ":3000\|:8080\|:5173"
```

### Tips for Best Experience

#### Development Workflow
1. Use "Start All Servers" for complete setup
2. Portfolio dev server auto-reloads on changes
3. VS Code server provides live coding environment
4. Simple Browser keeps everything in VS Code

#### Performance Optimization
- Only start servers you need
- Use individual buttons for targeted development
- Check terminal output for startup progress
- Close unused servers to free resources

#### Integration Benefits
- No need to switch between applications
- Live preview directly in VS Code
- Synchronized development environment
- Professional server management interface

---

**Quick Access**: Press `Ctrl+Shift+P` → "Open Portfolio" to access ServerToolbar in VS Code extension.
