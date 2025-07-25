# Terminal Service - Comprehensive WebSocket Terminal System

## Overview

The Terminal Service provides a comprehensive WebSocket-based terminal system at port 8002 using node-pty for cross-platform terminal emulation. It works independently of VS Code, providing full terminal functionality for the React application.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │◄──►│ WebSocket Service │◄──►│ Terminal Service│
│  (Port 5173)    │    │   (Port 8123)     │    │   (Port 8002)   │
│                 │    │   VS Code Bridge  │    │  Standalone PTY │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                 ▲                       ▲
                                 │                       │
                       ┌─────────▼───────┐    ┌─────────▼────────┐
                       │ VS Code Terminal│    │ node-pty Sessions│
                       │    Integration  │    │ Cross-Platform   │
                       └─────────────────┘    └──────────────────┘
```

## Key Features

### 🔧 **Core Functionality**
- **Multi-session Management**: Create and manage multiple terminal sessions with workbranch isolation
- **Real-time Output Streaming**: Bidirectional WebSocket communication for live terminal interaction
- **Cross-platform Shells**: Support for PowerShell, Bash, CMD, and Zsh across Windows, Linux, and macOS
- **Session Persistence**: Sessions persist across WebSocket reconnections with automatic cleanup
- **Resource Management**: Configurable limits and automatic cleanup of inactive sessions

### 🛡️ **Security Features**
- **Command Validation**: Comprehensive security filtering with dangerous pattern detection
- **Path Validation**: Directory traversal prevention and workspace boundary enforcement
- **Workbranch Isolation**: Sessions are isolated by workbranch ID for multi-user safety
- **Rate Limiting**: Prevents command spam and resource abuse
- **Audit Logging**: Complete security event logging with severity classification

### 📡 **WebSocket Protocol**
- **Message-based Communication**: Structured JSON protocol for all operations
- **Request/Response Correlation**: Message IDs for tracking request-response pairs
- **Error Handling**: Comprehensive error responses with actionable information
- **Heartbeat Management**: Connection health monitoring with automatic reconnection support

## File Structure

```
src/services/terminal-service/
├── index.ts              # Main TerminalService class and configuration
├── TerminalSession.ts    # node-pty wrapper with enhanced functionality
├── SessionManager.ts     # Multi-session coordination and lifecycle
├── SecurityService.ts    # Command validation and security enforcement
├── MessageRouter.ts      # WebSocket message routing and handling
├── MESSAGE_PROTOCOL.md   # Complete WebSocket protocol specification
├── example-server.ts     # Demonstration server implementation
└── README.md            # This documentation file
```

## Quick Start

### 1. **Basic Usage**

```typescript
import { TerminalService } from './services/terminal-service';

// Create and configure service
const service = new TerminalService({
    port: 8002,
    host: 'localhost',
    workspaceRoot: '/path/to/workspace',
    maxSessions: 50,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    enableSecurity: true,
    allowedOrigins: ['http://localhost:5173']
});

// Start the service
const started = await service.start();
if (!started) {
    console.error('Failed to start Terminal Service');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    await service.stop();
});
```

### 2. **WebSocket Client Connection**

```typescript
// Connect to the service
const ws = new WebSocket('ws://localhost:8002');

ws.onopen = () => {
    console.log('Connected to Terminal Service');
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received:', message);
};

// Create a terminal session
const createMessage = {
    type: 'terminal-create',
    id: 'create-req-123',
    data: {
        workbranchId: 'main-branch',
        shell: 'powershell',
        title: 'My Terminal',
        cols: 80,
        rows: 24
    }
};

ws.send(JSON.stringify(createMessage));
```

### 3. **Running the Example Server**

```bash
# Install dependencies (already done in main project)
npm install

# Run the example server
npx ts-node src/services/terminal-service/example-server.ts

# Or compile and run
npm run build
node dist/services/terminal-service/example-server.js
```

## Integration with React App

### 1. **Replace Existing WebSocket Service**

The terminal service can work alongside or replace the existing `terminalWebSocketService.ts`:

```typescript
// src/services/terminalService.ts
import { TerminalService } from './terminal-service';

export class IntegratedTerminalService {
    private standaloneService: TerminalService;
    private vscodeService: any; // Existing VS Code bridge
    
    constructor() {
        this.standaloneService = new TerminalService({
            port: 8002,
            workspaceRoot: process.cwd(),
            enableSecurity: true
        });
    }
    
    async start() {
        // Start standalone service
        await this.standaloneService.start();
        
        // Keep existing VS Code bridge for fallback
        // this.vscodeService.connect();
    }
    
    async createTerminal(workbranchId: string, options: any) {
        // Try standalone service first, fallback to VS Code bridge
        try {
            return await this.createStandaloneTerminal(workbranchId, options);
        } catch (error) {
            console.warn('Standalone service unavailable, using VS Code bridge');
            return await this.createVSCodeTerminal(workbranchId, options);
        }
    }
}
```

### 2. **Update Terminal Grid Integration**

```typescript
// src/components/CenterArea/TerminalGrid.tsx
import { useEffect, useState } from 'react';

export function TerminalGrid() {
    const [terminals, setTerminals] = useState([]);
    const [ws, setWs] = useState<WebSocket | null>(null);
    
    useEffect(() => {
        // Connect to standalone terminal service
        const websocket = new WebSocket('ws://localhost:8002');
        
        websocket.onopen = () => {
            console.log('Connected to Terminal Service');
            setWs(websocket);
            
            // Request terminal list
            websocket.send(JSON.stringify({
                type: 'terminal-list',
                id: 'list-' + Date.now()
            }));
        };
        
        websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            if (message.type === 'terminal-list-response') {
                setTerminals(message.data.sessions);
            } else if (message.type === 'terminal-output') {
                // Handle real-time output
                updateTerminalOutput(message.sessionId, message.data.output);
            }
        };
        
        return () => {
            websocket.close();
        };
    }, []);
    
    const createTerminal = (workbranchId: string) => {
        if (!ws) return;
        
        ws.send(JSON.stringify({
            type: 'terminal-create',
            id: 'create-' + Date.now(),
            data: {
                workbranchId,
                shell: 'powershell',
                title: `Terminal - ${workbranchId}`
            }
        }));
    };
    
    // Render terminal grid with real-time updates...
}
```

### 3. **Chat Integration**

```typescript
// src/components/ChatInterface.tsx
export function ChatInterface() {
    const sendCommandToTerminal = async (command: string, workbranchId: string) => {
        const ws = new WebSocket('ws://localhost:8002');
        
        await new Promise(resolve => {
            ws.onopen = resolve;
        });
        
        // Create session if needed
        ws.send(JSON.stringify({
            type: 'terminal-create',
            id: 'chat-create-' + Date.now(),
            data: { workbranchId, shell: 'powershell' }
        }));
        
        // Wait for session creation response
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            if (message.type === 'terminal-create-response' && message.success) {
                // Execute command
                ws.send(JSON.stringify({
                    type: 'terminal-command',
                    id: 'chat-cmd-' + Date.now(),
                    sessionId: message.data.sessionId,
                    command
                }));
            } else if (message.type === 'terminal-output') {
                // Stream output to chat
                addChatMessage({
                    type: 'terminal',
                    content: message.data.output,
                    timestamp: Date.now()
                });
            }
        };
    };
}
```

## Configuration Options

### Service Configuration

```typescript
interface TerminalServiceConfig {
    port: number;                    // WebSocket server port (default: 8002)
    host: string;                    // Host to bind to (default: 'localhost')
    workspaceRoot: string;           // Root directory for workbranch isolation
    maxSessions: number;             // Maximum concurrent sessions (default: 50)
    sessionTimeout: number;          // Session inactivity timeout in ms (default: 30min)
    enableSecurity: boolean;         // Enable security validation (default: true)
    allowedOrigins: string[];        // CORS allowed origins
}
```

### Security Configuration

```typescript
interface SecurityConfig {
    workspaceRoot: string;           // Workspace boundary for path validation
    enabled: boolean;                // Enable/disable security validation
    allowDangerousCommands: boolean; // Allow potentially dangerous commands
    maxCommandLength: number;        // Maximum command length (default: 1000)
    allowedExecutables: string[];    // Additional allowed executables
    blockedPatterns: RegExp[];       // Custom blocked command patterns
    logSecurityEvents: boolean;      // Enable security audit logging
}
```

## Security Features

### Command Validation
The service blocks dangerous commands including:
- System destructive commands (`rm -rf /`, `format c:`)
- Network listeners (`nc -l`, `netcat -l`)
- Privilege escalation (`sudo`, `su`)
- Command injection patterns (`;`, `||`, `&&`, backticks)
- Path traversal attempts (`../`, `..\\`)
- Registry modification (Windows `reg` commands)

### Workbranch Isolation
- Each terminal session is associated with a workbranch ID
- Sessions are isolated in separate working directories
- Path validation ensures operations stay within workspace boundaries
- Cross-workbranch access is prevented

### Rate Limiting
- Commands are rate-limited per workbranch (default: 30 identical commands per minute)
- Helps prevent automated abuse and resource exhaustion
- Configurable limits with graceful degradation

## Monitoring and Debugging

### Service Statistics
```typescript
// Get comprehensive service statistics
const stats = await fetch('ws://localhost:8002', {
    method: 'POST',
    body: JSON.stringify({
        type: 'service-stats',
        id: 'stats-' + Date.now()
    })
});
```

### Security Audit
```typescript
// Get security audit log
const audit = await fetch('ws://localhost:8002', {
    method: 'POST', 
    body: JSON.stringify({
        type: 'security-audit',
        id: 'audit-' + Date.now()
    })
});
```

### Debug Logging
Enable comprehensive logging:
```typescript
const service = new TerminalService({
    // ... other config
    logLevel: 'debug' // 'error' | 'warn' | 'info' | 'debug'
});
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using port 8002
   netstat -ano | findstr :8002
   
   # Kill the process
   taskkill /PID [process-id] /F
   ```

2. **node-pty Installation Issues**
   ```bash
   # Rebuild node-pty for your platform
   npm rebuild node-pty --build-from-source
   
   # Or use the provided script
   npm run setup:node-pty
   ```

3. **WebSocket Connection Failures**
   - Check Windows Firewall settings
   - Verify allowed origins configuration
   - Ensure no proxy interference

4. **Terminal Sessions Not Starting**
   - Check working directory permissions
   - Verify shell availability (`powershell.exe`, `bash`, etc.)
   - Review security audit logs for blocked commands

### Debugging Commands

```bash
# Test node-pty installation
npm run test:node-pty

# Check build environment
npm run verify:build-env

# Run with debug logging
DEBUG=terminal-service node src/services/terminal-service/example-server.js
```

## Performance Considerations

### Resource Usage
- Each terminal session uses ~10-20MB memory
- Output buffers are limited to 1MB per session to prevent memory leaks
- Sessions are automatically cleaned up after inactivity timeout
- WebSocket connections use per-message compression for efficiency

### Scalability
- Service supports up to 50 concurrent sessions by default
- Can be increased based on system resources
- Sessions are distributed across available CPU cores
- Database integration possible for session persistence

### Optimization Tips
1. Set appropriate session timeouts to prevent resource leaks
2. Use workbranch isolation to limit resource usage per project
3. Monitor memory usage and adjust limits accordingly
4. Consider clustering for high-load scenarios

## Future Enhancements

### Planned Features
- **Session Persistence**: Save/restore sessions across service restarts
- **File Transfer**: Upload/download files through WebSocket
- **Process Management**: Advanced process control and monitoring
- **Plugin System**: Extensible architecture for custom functionality
- **Multi-user Support**: User authentication and session sharing
- **Cloud Integration**: Remote terminal execution in cloud environments

### API Extensions
- RESTful HTTP API alongside WebSocket for simple operations
- GraphQL endpoint for complex queries and subscriptions
- gRPC interface for high-performance integrations
- Event streaming for real-time monitoring dashboards

## License and Contributing

This terminal service is part of the Claude Development Portfolio project. Contributions welcome!

For detailed protocol specifications, see [MESSAGE_PROTOCOL.md](./MESSAGE_PROTOCOL.md).