# 🚀 Claude Dev Portfolio Terminal System

## Overview

The Claude Dev Portfolio Terminal System is a modern, persistent terminal implementation that integrates seamlessly with VS Code and provides a rich terminal experience in the web application.

## Key Features

- **Persistent Terminal Sessions**: Up to 6 concurrent terminal sessions with full state persistence
- **VS Code Integration**: Direct integration with VS Code terminals via WebSocket
- **Modern React Components**: Built with React 18, TypeScript, and modern patterns
- **Zustand State Management**: Efficient state management with persistence
- **Real-time Communication**: WebSocket-based communication for instant updates
- **Cross-platform Support**: Works on Windows, macOS, and Linux

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Application                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ PersistentTerms │  │ Terminal Store  │              │
│  │   Component     │  │   (Zustand)     │              │
│  └────────┬────────┘  └────────┬────────┘              │
│           │                     │                        │
│           └──────────┬──────────┘                       │
│                      │                                   │
│  ┌───────────────────▼───────────────────┐              │
│  │    Terminal WebSocket Service         │              │
│  │    (Port 3002)                       │              │
│  └───────────────────┬───────────────────┘              │
└──────────────────────┼──────────────────────────────────┘
                       │ WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                VS Code Extension                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Terminal Handler│  │ WebSocket Server│              │
│  └────────┬────────┘  └────────┬────────┘              │
│           │                     │                        │
│           └──────────┬──────────┘                       │
│                      │                                   │
│  ┌───────────────────▼───────────────────┐              │
│  │        VS Code Terminal API           │              │
│  └───────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites
- Node.js 18+ and npm
- VS Code (latest version)
- Windows PowerShell or Unix shell

### Quick Install

```powershell
# From the project root
cd scripts
./install-terminal.ps1
```

### Manual Installation

1. **Install React App Dependencies**
   ```bash
   npm install
   ```

2. **Install VS Code Extension Dependencies**
   ```bash
   cd vscode-extension
   npm install
   ```

3. **Install Terminal Dependencies**
   ```bash
   npm install xterm xterm-addon-fit xterm-addon-web-links
   npm install @xterm/xterm @xterm/addon-fit @xterm/addon-web-links
   npm install zustand
   ```

## Usage

### Starting the System

```powershell
# Start all components
cd scripts
./start-terminal-system.ps1

# Start only React app
./start-terminal-system.ps1 -ReactOnly

# Start only VS Code extension
./start-terminal-system.ps1 -VSCodeOnly
```

### Testing the System

```powershell
cd scripts
./test-terminal-system.ps1
```

## Components

### React Components

#### PersistentTerminals
Main container component that manages all terminal sessions.

```jsx
import PersistentTerminals from './components/PersistentTerminals';

// In your app
<PersistentTerminals />
```

#### TerminalInstance
Individual terminal component with xterm.js integration.

#### TerminalTabs
Tab management for switching between terminal sessions.

### Hooks

#### useTerminalSessions
Custom hook for managing terminal sessions with Zustand.

```jsx
const {
  sessions,
  activeSession,
  createSession,
  removeSession,
  setActiveSession
} = useTerminalSessions();
```

### Services

#### terminalWebSocketService
WebSocket service for communication with VS Code.

```javascript
import { terminalWebSocketService } from './services/terminal/terminalWebSocketService';

// Connect to VS Code
terminalWebSocketService.connect();

// Send command
terminalWebSocketService.sendCommand(sessionId, 'ls -la');
```

### VS Code Extension

#### Commands
- `claudedev.showTerminalPanel`: Show terminal panel
- `claudedev.createTerminal`: Create new terminal
- `claudedev.restartServer`: Restart WebSocket server

#### Configuration
```json
{
  "claudedev.terminalPort": 3002,
  "claudedev.defaultShell": "",
  "claudedev.autoConnect": true
}
```

## API Reference

### WebSocket Messages

#### Client → Server

```typescript
// Create terminal
{
  type: 'terminal_command',
  command: 'create',
  sessionId: string,
  shell?: string,
  cwd?: string
}

// Send input
{
  type: 'terminal_command',
  command: 'write',
  sessionId: string,
  input: string
}

// Kill terminal
{
  type: 'terminal_command',
  command: 'kill',
  sessionId: string
}
```

#### Server → Client

```typescript
// Terminal output
{
  type: 'terminal_output',
  sessionId: string,
  data: string
}

// Terminal closed
{
  type: 'terminal_closed',
  sessionId: string
}

// Error
{
  type: 'error',
  error: string
}
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if port 3002 is available
   - Ensure VS Code extension is running
   - Verify firewall settings

2. **Terminal Not Displaying**
   - Check browser console for errors
   - Verify xterm.css is loaded
   - Ensure terminal dimensions are set

3. **Commands Not Working**
   - Verify shell path is correct
   - Check terminal permissions
   - Ensure WebSocket is connected

### Debug Mode

Enable debug logging:
```powershell
./start-terminal-system.ps1 -Debug
```

Check logs in:
- Browser DevTools Console
- VS Code Output Panel (Claude Dev)
- Terminal output

## Development

### Adding New Terminal Features

1. **Update Terminal Store**
   ```javascript
   // In terminalStore.js
   newFeature: (sessionId, data) => {
     // Implementation
   }
   ```

2. **Add WebSocket Handler**
   ```javascript
   // In terminalHandlers.js
   case 'new_feature':
     return this.handleNewFeature(data);
   ```

3. **Update Component**
   ```jsx
   // In TerminalInstance.jsx
   const handleNewFeature = () => {
     // Implementation
   };
   ```

### Testing

Run the test suite:
```bash
npm test
```

Run terminal-specific tests:
```powershell
./test-terminal-system.ps1
```

## Performance

### Optimizations
- Terminal output buffering
- Debounced resize events
- Lazy loading of terminal instances
- Efficient state updates with Zustand

### Limits
- Maximum 6 concurrent sessions
- 1000 lines of history per session
- 30fps terminal refresh rate

## Security

### Best Practices
- Sanitize all terminal input
- Validate WebSocket messages
- Use secure WebSocket (wss://) in production
- Implement rate limiting

### Permissions
- Terminal runs with user permissions
- No elevated privileges by default
- Respects VS Code workspace trust

## Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes
4. Add tests
5. Submit pull request

## License

MIT License - See LICENSE file for details
