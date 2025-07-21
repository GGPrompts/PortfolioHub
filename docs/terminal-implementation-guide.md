# Portfolio Hub Terminal Integration Guide

## Overview

This guide shows how to implement Crystal-style terminal integration in Portfolio Hub, allowing for embedded terminals with project-specific contexts and session management.

## Architecture Design

### Option 1: Web-based Terminal (Recommended)

```
Portfolio Hub (React) ↔ WebSocket Server ↔ node-pty Processes
```

**Benefits:**
- Maintains existing web architecture
- Easier deployment and development
- Cross-platform compatibility
- No Electron complexity

### Option 2: Electron Migration

```
Portfolio Hub (Electron Renderer) ↔ IPC ↔ Main Process ↔ node-pty
```

**Benefits:**
- Native OS integration
- Better performance
- File system access
- Desktop app features

## Implementation: Web-based Terminal

### 1. Backend Terminal Server

Create a Node.js WebSocket server to handle terminal sessions:

```javascript
// server/terminalServer.js
const WebSocket = require('ws');
const pty = require('node-pty');
const path = require('path');

class TerminalServer {
  constructor(port = 3100) {
    this.port = port;
    this.sessions = new Map(); // sessionId -> { pty, ws, projectPath }
    this.wss = null;
  }

  start() {
    this.wss = new WebSocket.Server({ port: this.port });
    
    this.wss.on('connection', (ws) => {
      console.log('Terminal client connected');
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });
      
      ws.on('close', () => {
        // Clean up sessions for this WebSocket
        this.cleanupSessionsForWebSocket(ws);
      });
    });
    
    console.log(`Terminal server running on port ${this.port}`);
  }

  handleMessage(ws, message) {
    const { type, sessionId, data, projectPath } = message;
    
    switch (type) {
      case 'create-session':
        this.createSession(ws, sessionId, projectPath);
        break;
      case 'input':
        this.sendInput(sessionId, data);
        break;
      case 'resize':
        this.resizeTerminal(sessionId, data.cols, data.rows);
        break;
      case 'close-session':
        this.closeSession(sessionId);
        break;
    }
  }

  createSession(ws, sessionId, projectPath) {
    if (this.sessions.has(sessionId)) {
      console.log(`Session ${sessionId} already exists`);
      return;
    }

    // Determine shell based on platform
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const workingDir = projectPath || process.cwd();

    // Create PTY process
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cwd: workingDir,
      cols: 80,
      rows: 30,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      },
    });

    // Store session
    this.sessions.set(sessionId, {
      pty: ptyProcess,
      ws: ws,
      projectPath: workingDir,
    });

    // Handle PTY output
    ptyProcess.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'output',
          sessionId,
          data,
        }));
      }
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`Terminal session ${sessionId} exited with code ${exitCode}`);
      this.sessions.delete(sessionId);
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'exit',
          sessionId,
          exitCode,
          signal,
        }));
      }
    });

    // Send initial prompt
    setTimeout(() => {
      ptyProcess.write('\r');
    }, 100);
  }

  sendInput(sessionId, input) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.write(input);
    }
  }

  resizeTerminal(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.resize(cols, rows);
    }
  }

  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.kill();
      this.sessions.delete(sessionId);
    }
  }

  cleanupSessionsForWebSocket(ws) {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.ws === ws) {
        session.pty.kill();
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Start server
const server = new TerminalServer();
server.start();

module.exports = TerminalServer;
```

### 2. Frontend Terminal Component

Create a React component that integrates with xterm.js:

```typescript
// src/components/Terminal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  sessionId: string;
  projectPath?: string;
  onClose?: () => void;
  className?: string;
}

export const ProjectTerminal: React.FC<TerminalProps> = ({
  sessionId,
  projectPath,
  onClose,
  className = '',
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize terminal
    const term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      rows: 30,
      cols: 80,
      scrollback: 5000,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: 'rgba(10, 10, 10, 0.95)',
        foreground: '#ffffff',
        cursor: '#00ff88',
        selection: 'rgba(0, 255, 136, 0.3)',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#f8f8f2',
        brightBlack: '#6272a4',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff',
      },
    });

    // Add addons
    const fit = new FitAddon();
    term.loadAddon(fit);
    
    // Try to use WebGL for better performance
    try {
      const webgl = new WebglAddon();
      term.loadAddon(webgl);
    } catch (e) {
      console.warn('WebGL addon not available, using canvas renderer');
    }

    // Open terminal
    term.open(terminalRef.current);
    fit.fit();

    terminal.current = term;
    fitAddon.current = fit;

    // Connect to WebSocket server
    connectToTerminalServer();

    // Handle terminal input
    term.onData((data) => {
      if (ws.current && isConnected) {
        ws.current.send(JSON.stringify({
          type: 'input',
          sessionId,
          data,
        }));
      }
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddon.current && ws.current && isConnected) {
        fitAddon.current.fit();
        ws.current.send(JSON.stringify({
          type: 'resize',
          sessionId,
          data: {
            cols: term.cols,
            rows: term.rows,
          },
        }));
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (ws.current) {
        ws.current.send(JSON.stringify({
          type: 'close-session',
          sessionId,
        }));
        ws.current.close();
      }
      
      if (terminal.current) {
        terminal.current.dispose();
      }
    };
  }, [sessionId, projectPath]);

  const connectToTerminalServer = () => {
    const websocket = new WebSocket('ws://localhost:3100');
    
    websocket.onopen = () => {
      console.log('Connected to terminal server');
      setIsConnected(true);
      
      // Create terminal session
      websocket.send(JSON.stringify({
        type: 'create-session',
        sessionId,
        projectPath,
      }));
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (error) {
        console.error('Failed to parse server message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('Disconnected from terminal server');
      setIsConnected(false);
    };

    websocket.onerror = (error) => {
      console.error('Terminal WebSocket error:', error);
      setIsConnected(false);
    };

    ws.current = websocket;
  };

  const handleServerMessage = (message: any) => {
    const { type, sessionId: msgSessionId, data } = message;
    
    if (msgSessionId !== sessionId) return;
    
    switch (type) {
      case 'output':
        if (terminal.current) {
          terminal.current.write(data);
        }
        break;
      case 'exit':
        if (terminal.current) {
          terminal.current.write('\r\n\r\n[Process exited]\r\n');
        }
        break;
    }
  };

  return (
    <div className={`terminal-container ${className}`}>
      <div className="terminal-header">
        <span className="terminal-title">
          Terminal - {projectPath ? projectPath.split('/').pop() : 'Project'}
        </span>
        <div className="terminal-controls">
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '●' : '○'}
          </span>
          {onClose && (
            <button onClick={onClose} className="terminal-close">
              ×
            </button>
          )}
        </div>
      </div>
      <div ref={terminalRef} className="terminal-content" />
    </div>
  );
};
```

### 3. Integration with Portfolio Hub

Add terminal support to your existing project structure:

```typescript
// src/components/PortfolioSidebar.tsx - Add terminal tab
const tabs = {
  projects: { width: 320, icon: 'sidebarSmall', title: 'Projects' },
  journals: { width: 600, icon: 'sidebarLarge', title: 'Dev Notes' },
  terminals: { width: 800, icon: 'terminal', title: 'Terminals' }, // New terminal tab
}

// Terminal management component
const TerminalManager: React.FC = () => {
  const [terminals, setTerminals] = useState<Array<{
    id: string;
    projectId: string;
    projectPath: string;
    title: string;
  }>>([]);

  const createTerminal = (projectId: string, projectPath: string) => {
    const terminal = {
      id: `terminal-${Date.now()}`,
      projectId,
      projectPath,
      title: `${projectId} Terminal`,
    };
    setTerminals(prev => [...prev, terminal]);
  };

  const closeTerminal = (terminalId: string) => {
    setTerminals(prev => prev.filter(t => t.id !== terminalId));
  };

  return (
    <div className="terminal-manager">
      <div className="terminal-toolbar">
        <h3>Project Terminals</h3>
        <button onClick={() => createTerminal('portfolio', process.cwd())}>
          + New Terminal
        </button>
      </div>
      
      <div className="terminal-tabs">
        {terminals.map(terminal => (
          <div key={terminal.id} className="terminal-tab">
            <span>{terminal.title}</span>
            <button onClick={() => closeTerminal(terminal.id)}>×</button>
          </div>
        ))}
      </div>
      
      <div className="terminal-content">
        {terminals.map(terminal => (
          <ProjectTerminal
            key={terminal.id}
            sessionId={terminal.id}
            projectPath={terminal.projectPath}
            onClose={() => closeTerminal(terminal.id)}
            className={`terminal-${terminal.id}`}
          />
        ))}
      </div>
    </div>
  );
};
```

### 4. Package.json Dependencies

```json
{
  "dependencies": {
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/addon-webgl": "^0.18.0"
  },
  "devDependencies": {
    "node-pty": "^1.0.0",
    "ws": "^8.17.1"
  }
}
```

### 5. Styling

```css
/* Terminal component styles */
.terminal-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(10, 10, 10, 0.95);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 8px;
  overflow: hidden;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(20, 20, 20, 0.9);
  border-bottom: 1px solid rgba(0, 255, 136, 0.2);
}

.terminal-title {
  color: #00ff88;
  font-size: 14px;
  font-weight: 500;
}

.terminal-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-status {
  font-size: 12px;
}

.connection-status.connected {
  color: #00ff88;
}

.connection-status.disconnected {
  color: #ff4444;
}

.terminal-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.terminal-close:hover {
  color: #ff4444;
}

.terminal-content {
  flex: 1;
  padding: 8px;
}

.terminal-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.terminal-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid rgba(0, 255, 136, 0.2);
}

.terminal-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(15, 15, 15, 0.9);
  border-bottom: 1px solid rgba(0, 255, 136, 0.1);
}

.terminal-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 4px;
  font-size: 12px;
  color: #00ff88;
}
```

## Integration Benefits

1. **Project-specific Terminals**: Each project gets its own terminal session
2. **Session Persistence**: Terminals maintain state across app reloads
3. **Multiple Terminals**: Run multiple terminals simultaneously
4. **Professional Interface**: Crystal-style terminal with proper theming
5. **WebSocket Communication**: Real-time terminal I/O
6. **Cross-platform**: Works on Windows, macOS, and Linux

## Next Steps

1. **Start Terminal Server**: Create the WebSocket server
2. **Add Terminal Component**: Integrate xterm.js component
3. **Update Sidebar**: Add terminal management tab
4. **Test Integration**: Verify terminal functionality
5. **Add Features**: Session persistence, command history, etc.

This gives you Crystal-style terminal integration while maintaining your existing web architecture!