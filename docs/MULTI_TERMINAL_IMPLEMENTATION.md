# Multi-Terminal Implementation Guide

## Overview

The Claude Development Portfolio now features a powerful multi-terminal system using xterm.js that connects React terminals to real VS Code terminals via WebSocket. This enables running commands across multiple terminals simultaneously from a chat interface.

## Architecture

```
React App (xterm.js terminals)
    ↓
terminalWebSocketService.ts
    ↓
WebSocket (ws://localhost:8123)
    ↓
websocketBridge.ts (VS Code Extension)
    ↓
terminalService.ts
    ↓
VS Code Terminal API
```

## Key Components

### 1. Terminal Grid (`src/components/CenterArea/`)

The terminal grid system supports multiple layouts:
- **Single**: One full-size terminal
- **Split**: Two side-by-side terminals
- **Triple**: Two top, one bottom spanning full width
- **Quad**: 2x2 grid of terminals
- **Custom**: User-defined arrangements

### 2. xterm.js Integration (`hooks/useXtermIntegration.ts`)

Each terminal is a full xterm.js instance with:
- **Theme**: Dark VS Code theme matching the portfolio
- **Add-ons**: FitAddon for responsive sizing, WebLinksAddon for clickable links
- **WebSocket Bridge**: Bi-directional communication with VS Code
- **Fallback Mode**: Local echo when VS Code is unavailable

### 3. Chat Interface (`ChatInterface.tsx`)

Send commands to multiple terminals:
- **Terminal Selection**: Click terminals or use presets (All, Projects, Tools, Running)
- **Quick Commands**: Pre-defined commands for common tasks
- **Message History**: Track sent commands and their status
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for multiline

### 4. WebSocket Service (`terminalWebSocketService.ts`)

Manages communication between React and VS Code:
- **Auto-reconnection**: Handles connection drops gracefully
- **Session Management**: Create/destroy terminal sessions
- **Message Routing**: Routes output to correct terminals
- **Status Updates**: Real-time terminal status

### 5. VS Code Integration (`websocketBridge.ts`)

The VS Code extension provides:
- **Terminal Creation**: Creates real VS Code terminals
- **Command Execution**: Runs commands in proper environment
- **Output Streaming**: Sends terminal output back to React
- **Session Persistence**: Maintains sessions across refreshes

## Features

### Multi-Workbranch Support

Test different CLAUDE.md configurations in parallel:
```javascript
// Each terminal can have a different workbranch
const terminal1 = addTerminal('main', 'portfolio');
const terminal2 = addTerminal('feature', 'ggprompts');
const terminal3 = addTerminal('experimental');
```

### Terminal States

- **🟢 Running**: Connected to VS Code, executing commands
- **🟡 Connecting**: Establishing WebSocket connection
- **⚪ Idle**: Connected but no active processes
- **🔴 Error**: Connection failed or terminal crashed
- **⚫ Disconnected**: No VS Code connection

### Performance Controls

New `PerformanceSettings.tsx` component allows:
- **Toggle Port Checking**: Enable/disable port status checks
- **Toggle Live Previews**: Enable/disable iframe previews
- **Adjust Polling Intervals**: 1s to 1 minute, or disabled
- **Persist Settings**: Saved in localStorage

## Usage

### Basic Terminal Operations

```typescript
// Add a new terminal
addTerminal(workbranchId: string, projectId?: string)

// Remove a terminal
removeTerminal(terminalId: string)

// Select terminals
selectTerminal(terminalId: string, selected: boolean)
selectAllTerminals()
deselectAllTerminals()

// Send command to selected terminals
sendMessage(content: string, targets?: string[])
```

### Keyboard Shortcuts

- **Ctrl+A**: Select all terminals
- **Ctrl+N**: Add new terminal
- **Ctrl+`**: Toggle chat interface
- **Escape**: Deselect all terminals

### Chat Commands

1. Select terminals by clicking or using selection presets
2. Type command in chat input
3. Press Enter to send to all selected terminals
4. View real-time output in each terminal

## WebSocket Protocol

### Client → Server Messages

```typescript
// Create terminal session
{
  type: 'terminal-create',
  data: {
    workbranchId: string,
    projectId?: string,
    shell?: string,
    title?: string
  }
}

// Send command
{
  type: 'terminal-command',
  data: {
    sessionId: string,
    command: string
  }
}

// Send keystroke data
{
  type: 'terminal-data',
  data: {
    sessionId: string,
    data: string
  }
}
```

### Server → Client Messages

```typescript
// Terminal output
{
  type: 'terminal-output',
  terminalId: string,
  data: string
}

// Status update
{
  type: 'terminal-status',
  terminalId: string,
  data: {
    status: 'connected' | 'disconnected' | 'error'
  }
}
```

## Error Handling

### Connection Failures

- Automatic reconnection with exponential backoff
- Falls back to local echo mode
- User notification of connection status

### Terminal Crashes

- Graceful cleanup of terminal resources
- Status update to 'error' state
- Option to recreate terminal

## Security Considerations

- All commands validated by VS Code security service
- No direct shell access from browser
- WebSocket restricted to localhost only
- Terminal sessions isolated by workbranch

## Performance Optimizations

### Caching

- Terminal output buffered to reduce renders
- WebSocket messages batched when possible
- DOM updates throttled during heavy output

### Resource Management

- Terminals disposed when removed
- WebSocket connections pooled
- Inactive terminals can be minimized

## Troubleshooting

### Terminal Not Connecting

1. Check VS Code extension is running
2. Verify WebSocket server on port 8123
3. Check browser console for errors
4. Try refreshing the page

### Commands Not Executing

1. Ensure terminal is selected
2. Check terminal status (must be green)
3. Verify VS Code has workspace trust
4. Check security service logs

### Performance Issues

1. Reduce number of active terminals
2. Disable port checking in settings
3. Increase polling intervals
4. Clear terminal scrollback buffers

## Future Enhancements

- Terminal tabs for better organization
- Persistent terminal sessions across VS Code restarts
- Terminal sharing between users
- Command history and autocomplete
- Terminal recording and playback
