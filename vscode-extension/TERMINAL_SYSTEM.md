# Terminal System Architecture

## Overview

The VS Code extension now supports multi-terminal functionality with workbranch isolation, providing real terminal processes accessible via WebSocket from the React application. This system uses `node-pty` for native terminal processes and `xterm.js` for the frontend terminal interface.

## Architecture Components

### 1. Terminal Service (`src/services/terminalService.ts`)

**Purpose**: Core terminal lifecycle management and WebSocket communication
**Port**: `ws://localhost:8002`

**Key Features**:
- **Multi-terminal sessions** with unique session IDs
- **Workbranch isolation** - terminals are scoped to specific workbranches
- **Cross-platform support** - PowerShell, CMD (Windows), Bash (Linux/macOS)
- **Real terminal processes** via node-pty integration
- **Session persistence** with automatic cleanup of inactive sessions
- **WebSocket communication** for real-time terminal I/O

**Session Management**:
```typescript
interface TerminalSession {
    id: string;                    // Unique session identifier
    workbranchId: string;          // Workbranch isolation scope
    shell: 'powershell' | 'bash' | 'cmd';
    ptyProcess: pty.IPty;          // Native terminal process
    webSocket?: WebSocket;         // Client connection
    workingDirectory: string;      // Terminal working directory
    createdAt: Date;
    lastActivity: Date;
    title: string;
}
```

### 2. Terminal Security Service (`src/services/terminalSecurityService.ts`)

**Purpose**: Enhanced security validation for terminal commands

**Security Layers**:
- **Command validation** - Whitelist/blacklist approach
- **Risk assessment** - Critical, High, Medium, Low risk levels
- **Workbranch permissions** - Ensure commands are scoped appropriately
- **Input sanitization** - Remove dangerous characters and patterns
- **Context-aware validation** - Different rules for different shell types

**Critical Security Patterns Blocked**:
- System destruction commands (`rm -rf /`, `format c:`)
- Network manipulation (`netsh`, malicious downloads)
- Registry tampering (dangerous `reg` commands)
- Service manipulation (`sc delete`, stopping security services)
- PowerShell execution policy bypass

### 3. WebSocket Bridge Integration (`src/services/websocketBridge.ts`)

**Purpose**: Integrate terminal service with existing VS Code ↔ React communication

**Enhanced Features**:
- **Terminal capabilities** advertised to React app
- **Unified message handling** for project + terminal operations
- **Automatic service startup** - Terminal service starts with WebSocket bridge
- **Service coordination** - Proper shutdown sequence

**New Message Types**:
- `terminal-create` - Create new terminal session
- `terminal-destroy` - Destroy terminal session
- `terminal-command` - Execute command in session
- `terminal-resize` - Resize terminal dimensions  
- `terminal-data` - Send raw data to terminal
- `terminal-status` - Get service status
- `terminal-list-sessions` - List sessions by workbranch

### 4. VS Code Commands (`src/commands/terminalCommands.ts`)

**Purpose**: VS Code Command Palette integration for terminal management

**Available Commands**:
- `Claude Portfolio: Create Terminal Session` - Interactive session creation
- `Claude Portfolio: List Terminal Sessions` - Browse and manage sessions
- `Claude Portfolio: Terminal Service Status` - Service health monitoring
- `Claude Portfolio: Create Workbranch` - New workbranch with terminal
- `Claude Portfolio: Switch Workbranch` - Change active workbranch
- `Claude Portfolio: Validate Terminal Command` - Security validation testing
- `Claude Portfolio: Attach to Terminal Session` - Get connection info

### 5. React Terminal Grid (`src/components/TerminalGrid.tsx`)

**Purpose**: Frontend multi-terminal interface using xterm.js

**Features**:
- **Grid layout** - Configurable columns and maximum terminals
- **Real-time communication** - WebSocket connection to terminal service
- **Terminal management** - Create, destroy, resize terminals
- **Visual indicators** - Connection status, active session highlighting
- **Workbranch support** - Each terminal tagged with workbranch ID

## Usage Examples

### Creating a Terminal Session (VS Code)

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "Claude Portfolio: Create Terminal Session"
3. Enter workbranch ID (e.g., `feature-ui-redesign`)
4. Select shell type (PowerShell, CMD, Bash)
5. Optional: Set terminal title
6. Session created with unique ID

### Connecting from React App

```typescript
// Connect to terminal service
const ws = new WebSocket('ws://localhost:8002');

// Create terminal session
ws.send(JSON.stringify({
    type: 'create',
    workbranchId: 'main',
    shell: 'powershell',
    title: 'Main Terminal'
}));

// Handle terminal output
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'output') {
        // Write to xterm.js terminal
        terminal.write(message.data);
    }
};

// Send user input
terminal.onData((data) => {
    ws.send(JSON.stringify({
        type: 'data',
        sessionId: 'session_id_here',
        data: data
    }));
});
```

### Workbranch Isolation Example

```bash
# Terminal 1 - workbranch: main
PS D:\ClaudeWindows\workbranches\main> npm start

# Terminal 2 - workbranch: feature-auth
PS D:\ClaudeWindows\workbranches\feature-auth> npm run dev

# Terminal 3 - workbranch: bugfix-login
PS D:\ClaudeWindows\workbranches\bugfix-login> npm test
```

## Security Model

### Command Validation Pipeline

1. **Input Validation** - Check for null/empty commands
2. **Dangerous Pattern Detection** - Block critical security risks
3. **Risk Assessment** - Categorize command risk level
4. **Base Security Validation** - Use existing VS Code security service
5. **Workbranch Permissions** - Ensure command scope is appropriate
6. **Shell-Specific Validation** - PowerShell/Bash/CMD specific rules
7. **Input Sanitization** - Clean and limit command length

### Workbranch Security

- **Isolated working directories** - Each workbranch has separate filesystem scope
- **Permission validation** - Workbranch IDs must match allowed patterns
- **Path traversal protection** - Prevent commands from escaping workbranch scope
- **Process isolation** - Each terminal runs in separate process context

### Session Security

- **Ownership verification** - Only session owner can send commands
- **Connection authentication** - WebSocket connection required for access
- **Automatic cleanup** - Inactive sessions automatically destroyed
- **Resource limits** - Maximum number of concurrent sessions

## Installation & Setup

### 1. Install Dependencies

```bash
# Run installation script
cd D:\ClaudeWindows\claude-dev-portfolio\vscode-extension
.\install-terminal-dependencies.ps1

# Or install manually
cd claude-portfolio
npm install
npm run compile
```

### 2. VS Code Extension Setup

1. Reload VS Code window after installation
2. Terminal service starts automatically with WebSocket bridge
3. Verify with "Claude Portfolio: Terminal Service Status"

### 3. React App Integration

```bash
# Install xterm.js dependencies (if not already installed)
cd D:\ClaudeWindows\claude-dev-portfolio
npm install xterm xterm-addon-fit xterm-addon-webgl
```

### 4. Usage Verification

1. **VS Code Commands**: Test terminal creation via Command Palette
2. **WebSocket Connection**: Verify `ws://localhost:8002` is accessible
3. **React Integration**: Use TerminalGrid component in your React app
4. **Security Testing**: Use "Validate Terminal Command" to test security

## Network Architecture

```
React App (localhost:5173)
    ↓ WebSocket
VS Code Bridge (localhost:8123) 
    ↓ Internal API
Terminal Service (localhost:8002)
    ↓ node-pty
Native Terminal Processes
```

**Communication Flow**:
1. React connects to both WebSocket services
2. Project operations → Bridge service (8123)
3. Terminal operations → Terminal service (8002)
4. Terminal service manages real shell processes
5. Real-time I/O via WebSocket streams

## Troubleshooting

### Common Issues

**1. node-pty Build Errors**
```bash
# Install Windows build tools
npm install -g windows-build-tools

# Rebuild node-pty
npm rebuild node-pty
```

**2. WebSocket Connection Failed**
- Check VS Code extension is loaded and active
- Verify no firewall blocking localhost:8002
- Restart VS Code if terminal service isn't starting

**3. Terminal Output Not Displaying**
- Verify session ID is correct in WebSocket messages
- Check browser console for xterm.js errors
- Ensure terminal element is properly attached to DOM

**4. Security Validation Too Strict**
- Use "Validate Terminal Command" to test specific commands
- Check allowed patterns in `terminalSecurityService.ts`
- Review security logs in VS Code Output → "Claude Portfolio"

### Debug Commands

```javascript
// Browser console - test WebSocket connection
const ws = new WebSocket('ws://localhost:8002');
ws.onopen = () => console.log('Terminal service connected');

// VS Code Output panel - view detailed logs
// View → Output → Select "Claude Portfolio"
```

## Future Enhancements

1. **Persistent Sessions** - Sessions survive VS Code restart
2. **Session Sharing** - Multiple React clients connect to same session
3. **Command History** - Store and replay command history per workbranch
4. **Terminal Themes** - Customizable color schemes and fonts
5. **Performance Monitoring** - Track resource usage per session
6. **Remote Support** - Connect to terminals on remote servers
7. **Plugin System** - Extensible terminal addons and middleware

## API Reference

### Terminal Service WebSocket API

**Connection**: `ws://localhost:8002`

**Message Format**:
```typescript
interface TerminalMessage {
    type: 'create' | 'destroy' | 'command' | 'resize' | 'data';
    sessionId?: string;
    workbranchId?: string;
    shell?: 'powershell' | 'bash' | 'cmd';
    command?: string;
    data?: string;
    cols?: number;
    rows?: number;
    title?: string;
    cwd?: string;
}
```

**Response Format**:
```typescript
interface TerminalResponse {
    type: 'created' | 'destroyed' | 'output' | 'error' | 'status';
    sessionId?: string;
    success: boolean;
    message?: string;
    error?: string;
    data?: any;
}
```

### VS Code Extension API

Access terminal service via extension:

```typescript
// Get terminal service instance
const extension = vscode.extensions.getExtension('claude-dev.claude-portfolio');
const terminalService = extension?.exports?.terminalService;

// Create session programmatically
const response = await terminalService.createSession('my-workbranch', 'powershell');
```

This terminal system provides a robust, secure, and scalable foundation for multi-terminal support in the Claude Portfolio project, enabling powerful development workflows across multiple workbranches.