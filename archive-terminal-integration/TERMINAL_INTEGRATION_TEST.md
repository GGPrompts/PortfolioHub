# Terminal Integration Test Guide

## Prerequisites
1. React app running on http://localhost:5173
2. VS Code with the extension loaded

## Testing Steps

### 1. Start the VS Code Extension
1. Open VS Code
2. Navigate to `D:\ClaudeWindows\claude-dev-portfolio\vscode-extension`
3. Press `F5` to launch the extension in debug mode
4. You should see "Claude Dev Portfolio VS Code Extension is now active!" in the debug console

### 2. Test Terminal Integration in React App
1. Open browser to http://localhost:5173
2. Look for the terminal icon in the right sidebar
3. Click the terminal icon to open the Terminals panel
4. Click "New Terminal" to create a session

### 3. Verify Features
- [ ] Terminal sessions persist on page reload
- [ ] Multiple terminals can be created (up to 6)
- [ ] Terminal tabs show session names
- [ ] Copy/Paste functionality works
- [ ] Terminal output displays correctly
- [ ] Commands execute properly

### 4. WebSocket Connection
Check browser console for:
- "WebSocket connected to VS Code extension"
- No connection errors

### 5. VS Code Integration
In VS Code:
- Check Output panel for "Claude Dev Portfolio"
- Verify WebSocket server is running on port 3002
- Test terminal commands from the web interface

## Troubleshooting

If terminals don't connect:
1. Ensure VS Code extension is running (F5)
2. Check port 3002 is not blocked
3. Verify no firewall issues
4. Check browser console for errors

## Expected Result
- Terminals work seamlessly between web app and VS Code
- Sessions persist across reloads
- All terminal features function correctly
