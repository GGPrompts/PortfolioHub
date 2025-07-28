# Claude Dev Portfolio VS Code Extension

## Terminal System Integration

This VS Code extension provides seamless terminal integration for the Claude Dev Portfolio application.

### Features

- **WebSocket Server**: Runs on port 3002 for real-time terminal communication
- **Terminal Management**: Create, manage, and control VS Code terminals from the web app
- **Command Execution**: Execute commands in VS Code terminals remotely
- **Status Monitoring**: Real-time terminal status updates

### Installation

1. Open the extension folder in VS Code
2. Run `npm install` to install dependencies
3. Press `F5` to launch the extension in a new VS Code window

### Commands

- `Claude Dev: Show Terminal Panel` - Focus on the terminal panel
- `Claude Dev: Create New Terminal` - Create a new terminal instance
- `Claude Dev: Restart WebSocket Server` - Restart the WebSocket server

### Configuration

Configure the extension in VS Code settings:

```json
{
  "claudedev.terminalPort": 3002,
  "claudedev.defaultShell": "",
  "claudedev.autoConnect": true
}
```

### WebSocket API

The extension exposes a WebSocket server that accepts the following commands:

#### Create Terminal
```json
{
  "type": "terminal_command",
  "command": "create",
  "sessionId": "unique-session-id",
  "shell": "powershell",
  "cwd": "C:\\projects"
}
```

#### Send Input
```json
{
  "type": "terminal_command",
  "command": "write",
  "sessionId": "session-id",
  "input": "npm run dev\n"
}
```

#### Kill Terminal
```json
{
  "type": "terminal_command",
  "command": "kill",
  "sessionId": "session-id"
}
```

### Development

To modify the extension:

1. Make changes to the source files
2. Run `npm run compile` to build
3. Reload the extension host window (`Ctrl+R`)

### Debugging

- Check the VS Code Output panel for "Claude Dev Portfolio"
- Enable verbose logging in the extension settings
- Use VS Code's built-in debugger with the provided launch configuration

### Troubleshooting

**WebSocket connection issues:**
- Ensure port 3002 is not in use
- Check firewall settings
- Verify the extension is running

**Terminal creation fails:**
- Check VS Code terminal permissions
- Ensure shell path is valid
- Verify workspace trust settings
