# Terminal Integration Guide

## Overview

This guide covers how to integrate terminal functionality into web applications and Electron apps, based on the architecture used by Crystal and other modern development tools. We'll explore the xterm.js + node-pty stack that powers terminal interfaces in applications like VS Code, Crystal, and many other developer tools.

## Architecture Overview

### Core Components

**Frontend (Terminal UI)**
- **xterm.js**: Terminal emulator that runs in the browser
- **Addons**: Extended functionality (fit, search, web links, etc.)
- **React/Vue Components**: Framework wrappers for terminal integration

**Backend (Process Management)**
- **node-pty**: Creates pseudo-terminals (PTY) for actual shell processes
- **IPC Bridge**: Communication layer between frontend and backend
- **Process Spawning**: Manages shell processes and command execution

**Communication Flow**
```
User Input → xterm.js → IPC → node-pty → Shell Process
Shell Output → node-pty → IPC → xterm.js → Terminal Display
```

## Technology Stack

### Frontend Dependencies

```json
{
  "dependencies": {
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/addon-search": "^0.15.0",
    "@xterm/addon-web-links": "^0.11.0",
    "@xterm/addon-unicode11": "^0.8.0"
  }
}
```

### Backend Dependencies

```json
{
  "dependencies": {
    "@homebridge/node-pty-prebuilt-multiarch": "^0.11.14",
    // Alternative: "node-pty": "^1.0.0"
  }
}
```

## Implementation Approaches

### 1. Electron App Integration

**Main Process (Backend)**
```javascript
// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const pty = require('@homebridge/node-pty-prebuilt-multiarch');
const os = require('os');

let terminals = new Map();

// Create terminal session
ipcMain.handle('terminal-create', async (event, id, options = {}) => {
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
  const terminal = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: options.cols || 80,
    rows: options.rows || 24,
    cwd: options.cwd || process.cwd(),
    env: process.env
  });

  terminals.set(id, terminal);

  // Forward terminal output to renderer
  terminal.on('data', (data) => {
    event.sender.send('terminal-data', id, data);
  });

  terminal.on('exit', (code) => {
    terminals.delete(id);
    event.sender.send('terminal-exit', id, code);
  });

  return { pid: terminal.pid };
});

// Send input to terminal
ipcMain.handle('terminal-input', async (event, id, input) => {
  const terminal = terminals.get(id);
  if (terminal) {
    terminal.write(input);
  }
});

// Resize terminal
ipcMain.handle('terminal-resize', async (event, id, cols, rows) => {
  const terminal = terminals.get(id);
  if (terminal) {
    terminal.resize(cols, rows);
  }
});
```

**Renderer Process (Frontend)**
```javascript
// Terminal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

const TerminalComponent = ({ terminalId, cwd, onExit }) => {
  const terminalRef = useRef(null);
  const [terminal, setTerminal] = useState(null);
  const [fitAddon, setFitAddon] = useState(null);

  useEffect(() => {
    // Create terminal instance
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#ffffff40'
      },
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
    });

    // Create addons
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();

    // Load addons
    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(webLinksAddon);

    // Open terminal in DOM
    term.open(terminalRef.current);
    fitAddon.fit();

    setTerminal(term);
    setFitAddon(fitAddon);

    // Create backend terminal session
    window.electronAPI.createTerminal(terminalId, {
      cols: term.cols,
      rows: term.rows,
      cwd: cwd
    });

    // Handle terminal input
    term.onData((data) => {
      window.electronAPI.sendToTerminal(terminalId, data);
    });

    // Handle terminal resize
    term.onResize(({ cols, rows }) => {
      window.electronAPI.resizeTerminal(terminalId, cols, rows);
    });

    // Listen for terminal output
    window.electronAPI.onTerminalData((id, data) => {
      if (id === terminalId) {
        term.write(data);
      }
    });

    // Listen for terminal exit
    window.electronAPI.onTerminalExit((id, code) => {
      if (id === terminalId) {
        onExit?.(code);
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      window.electronAPI.destroyTerminal(terminalId);
    };
  }, [terminalId, cwd, onExit]);

  return (
    <div 
      ref={terminalRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        backgroundColor: '#1e1e1e'
      }} 
    />
  );
};

export default TerminalComponent;
```

**Preload Script**
```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  createTerminal: (id, options) => ipcRenderer.invoke('terminal-create', id, options),
  sendToTerminal: (id, input) => ipcRenderer.invoke('terminal-input', id, input),
  resizeTerminal: (id, cols, rows) => ipcRenderer.invoke('terminal-resize', id, cols, rows),
  destroyTerminal: (id) => ipcRenderer.invoke('terminal-destroy', id),
  
  onTerminalData: (callback) => ipcRenderer.on('terminal-data', (event, id, data) => callback(id, data)),
  onTerminalExit: (callback) => ipcRenderer.on('terminal-exit', (event, id, code) => callback(id, code))
});
```

### 2. Web App Integration (Server-Side)

**Server (Node.js/Express)**
```javascript
// server.js
const express = require('express');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');

const app = express();
const server = require('http').createServer(app);
const io = new Server(server);

let terminals = new Map();

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('terminal-create', ({ id, options = {} }) => {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const terminal = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: options.cwd || process.cwd(),
      env: process.env
    });

    terminals.set(id, terminal);

    terminal.on('data', (data) => {
      socket.emit('terminal-data', { id, data });
    });

    terminal.on('exit', (code) => {
      terminals.delete(id);
      socket.emit('terminal-exit', { id, code });
    });

    socket.emit('terminal-created', { id, pid: terminal.pid });
  });

  socket.on('terminal-input', ({ id, input }) => {
    const terminal = terminals.get(id);
    if (terminal) {
      terminal.write(input);
    }
  });

  socket.on('terminal-resize', ({ id, cols, rows }) => {
    const terminal = terminals.get(id);
    if (terminal) {
      terminal.resize(cols, rows);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    // Clean up terminals for this client
    terminals.forEach((terminal, id) => {
      terminal.kill();
      terminals.delete(id);
    });
  });
});

server.listen(3000, () => {
  console.log('Terminal server running on port 3000');
});
```

**Client (React)**
```javascript
// WebTerminal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

const WebTerminal = ({ terminalId, cwd, serverUrl = 'http://localhost:3000' }) => {
  const terminalRef = useRef(null);
  const [terminal, setTerminal] = useState(null);
  const [socket, setSocket] = useState(null);
  const [fitAddon, setFitAddon] = useState(null);

  useEffect(() => {
    // Create socket connection
    const socketConnection = io(serverUrl);
    setSocket(socketConnection);

    // Create terminal instance
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff'
      },
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    setTerminal(term);
    setFitAddon(fitAddon);

    // Create server-side terminal
    socketConnection.emit('terminal-create', {
      id: terminalId,
      options: {
        cols: term.cols,
        rows: term.rows,
        cwd: cwd
      }
    });

    // Handle terminal input
    term.onData((data) => {
      socketConnection.emit('terminal-input', { id: terminalId, input: data });
    });

    // Handle terminal resize
    term.onResize(({ cols, rows }) => {
      socketConnection.emit('terminal-resize', { id: terminalId, cols, rows });
    });

    // Listen for terminal output
    socketConnection.on('terminal-data', ({ id, data }) => {
      if (id === terminalId) {
        term.write(data);
      }
    });

    // Listen for terminal exit
    socketConnection.on('terminal-exit', ({ id, code }) => {
      if (id === terminalId) {
        term.write(`\r\n\r\n[Process exited with code ${code}]\r\n`);
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      socketConnection.disconnect();
    };
  }, [terminalId, cwd, serverUrl]);

  return (
    <div 
      ref={terminalRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        backgroundColor: '#1e1e1e'
      }} 
    />
  );
};

export default WebTerminal;
```

## Integration Options for Portfolio Projects

### Option 1: 3D File System Terminal

Add a terminal panel to your 3D file system that allows:
- Navigation commands (`cd`, `ls`, `pwd`)
- File operations (`cp`, `mv`, `rm`, `mkdir`)
- Real-time sync with 3D visualization
- Script execution within the file system context

**Implementation:**
```javascript
// In 3D File System project
import TerminalComponent from './TerminalComponent';

const FileSystemWithTerminal = () => {
  const [currentPath, setCurrentPath] = useState('/');
  
  return (
    <div className="file-system-container">
      <div className="3d-viewer">
        {/* Existing 3D file system */}
      </div>
      <div className="terminal-panel">
        <TerminalComponent 
          terminalId="file-system-terminal"
          cwd={currentPath}
          onPathChange={setCurrentPath}
        />
      </div>
    </div>
  );
};
```

### Option 2: Portfolio Terminal Panel

Add a terminal to your portfolio sidebar for:
- Project management commands
- Git operations
- Build script execution
- Log monitoring

**Implementation:**
```javascript
// In PortfolioSidebar.tsx
const tabs = {
  projects: { width: 320, icon: 'fileText', title: 'Projects' },
  journals: { width: 600, icon: 'edit', title: 'Dev Notes' },
  terminal: { width: 700, icon: 'terminal', title: 'Terminal' }  // New tab
};
```

### Option 3: New Terminal-Focused Project

Create a dedicated terminal project that showcases:
- Multiple terminal sessions
- Tab management
- Custom shell profiles
- SSH connections
- Script management

## Advanced Features

### Terminal Themes

```javascript
const themes = {
  dark: {
    background: '#1e1e1e',
    foreground: '#ffffff',
    cursor: '#ffffff',
    cursorAccent: '#000000',
    selection: '#ffffff40',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5'
  },
  light: {
    background: '#ffffff',
    foreground: '#000000',
    cursor: '#000000',
    cursorAccent: '#ffffff',
    selection: '#00000040'
  }
};
```

### Custom Commands

```javascript
// Add custom commands to terminal
const customCommands = {
  'portfolio-start': () => {
    return 'Starting all portfolio projects...\n';
  },
  'portfolio-status': () => {
    return 'Checking project status...\n';
  },
  'git-sync': () => {
    return 'Syncing all git repositories...\n';
  }
};

// In terminal data handler
terminal.onData((data) => {
  if (data.trim() in customCommands) {
    terminal.write(customCommands[data.trim()]());
    return;
  }
  // Send to actual shell
  window.electronAPI.sendToTerminal(terminalId, data);
});
```

### Multi-Session Management

```javascript
// Terminal session manager
class TerminalManager {
  constructor() {
    this.sessions = new Map();
    this.activeSession = null;
  }

  createSession(id, options) {
    const session = new TerminalSession(id, options);
    this.sessions.set(id, session);
    return session;
  }

  switchSession(id) {
    this.activeSession = this.sessions.get(id);
    return this.activeSession;
  }

  closeSession(id) {
    const session = this.sessions.get(id);
    if (session) {
      session.dispose();
      this.sessions.delete(id);
    }
  }
}
```

## Security Considerations

### Input Sanitization

```javascript
// Sanitize terminal input
const sanitizeInput = (input) => {
  // Remove dangerous characters
  return input.replace(/[;&|`$()]/g, '');
};

// Validate commands
const allowedCommands = ['ls', 'pwd', 'cd', 'cat', 'echo'];
const validateCommand = (command) => {
  const cmd = command.trim().split(' ')[0];
  return allowedCommands.includes(cmd);
};
```

### Restricted Shell Environment

```javascript
// Create restricted shell environment
const createRestrictedTerminal = (id, options) => {
  const terminal = pty.spawn('bash', ['--restricted'], {
    name: 'xterm-color',
    cols: options.cols || 80,
    rows: options.rows || 24,
    cwd: options.cwd || '/safe/directory',
    env: {
      PATH: '/safe/bin:/usr/safe/bin',
      SHELL: '/bin/rbash'
    }
  });
  
  return terminal;
};
```

## Performance Optimization

### Virtual Scrolling

```javascript
// Enable virtual scrolling for large outputs
const terminal = new Terminal({
  scrollback: 1000,
  windowsMode: os.platform() === 'win32',
  macOptionIsMeta: true,
  drawBoldTextInBrightColors: false
});
```

### Output Buffering

```javascript
// Buffer terminal output for better performance
class OutputBuffer {
  constructor(terminal, flushInterval = 16) {
    this.terminal = terminal;
    this.buffer = '';
    this.flushInterval = flushInterval;
    this.flushTimer = null;
  }

  write(data) {
    this.buffer += data;
    
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flush();
      }, this.flushInterval);
    }
  }

  flush() {
    if (this.buffer) {
      this.terminal.write(this.buffer);
      this.buffer = '';
    }
    this.flushTimer = null;
  }
}
```

## Testing

### Unit Tests

```javascript
// Test terminal component
import { render, screen } from '@testing-library/react';
import TerminalComponent from './TerminalComponent';

describe('TerminalComponent', () => {
  it('renders terminal container', () => {
    render(<TerminalComponent terminalId="test" />);
    const terminalElement = screen.getByRole('terminal');
    expect(terminalElement).toBeInTheDocument();
  });

  it('handles terminal input', () => {
    const mockSendToTerminal = jest.fn();
    window.electronAPI = { sendToTerminal: mockSendToTerminal };
    
    render(<TerminalComponent terminalId="test" />);
    // Simulate terminal input
    // Test that input is sent to backend
  });
});
```

### Integration Tests

```javascript
// Test terminal backend
const pty = require('node-pty');

describe('Terminal Backend', () => {
  it('creates terminal process', async () => {
    const terminal = pty.spawn('echo', ['hello'], {
      name: 'xterm-color',
      cols: 80,
      rows: 24
    });

    const output = await new Promise((resolve) => {
      terminal.on('data', (data) => {
        resolve(data);
      });
    });

    expect(output).toContain('hello');
    terminal.kill();
  });
});
```

## Deployment Considerations

### Electron Packaging

```javascript
// Include node-pty in electron build
// package.json
{
  "build": {
    "extraFiles": [
      {
        "from": "node_modules/@homebridge/node-pty-prebuilt-multiarch/build",
        "to": "build",
        "filter": ["**/*"]
      }
    ]
  }
}
```

### Web App Deployment

```javascript
// Handle node-pty in production
const isProd = process.env.NODE_ENV === 'production';
const pty = isProd ? require('node-pty') : require('node-pty-prebuilt-multiarch');
```

## Conclusion

Terminal integration adds powerful capabilities to web applications and desktop tools. The xterm.js + node-pty stack provides a robust foundation for building terminal interfaces that can handle real shell processes, custom commands, and complex workflows.

Key benefits include:
- **Native Terminal Experience**: Full terminal emulation with proper keyboard handling
- **Real Process Integration**: Actual shell processes, not just command simulation
- **Customizable UI**: Themes, addons, and custom functionality
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Performance**: Optimized for handling large outputs and multiple sessions

This architecture is battle-tested in production applications like VS Code, Crystal, and many other developer tools, making it a reliable choice for adding terminal capabilities to your projects.

## Next Steps

1. **Choose Integration Point**: Decide which project would benefit most from terminal integration
2. **Start Small**: Begin with basic terminal display and input/output
3. **Add Features**: Gradually add custom commands, themes, and advanced functionality
4. **Test Thoroughly**: Ensure proper cleanup and error handling
5. **Document Usage**: Create user guides for terminal features

The terminal integration guide provides a solid foundation for adding this powerful capability to your development portfolio.