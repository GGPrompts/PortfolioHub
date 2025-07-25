# Terminal Service WebSocket Message Protocol

This document defines the WebSocket message protocol for the Terminal Service running on port 8002.

## Message Structure

All messages are JSON objects with the following base structure:

```typescript
interface WebSocketMessage {
    type: string;           // Message type identifier
    id?: string;            // Optional message ID for request/response correlation
    sessionId?: string;     // Terminal session identifier
    terminalId?: string;    // Alternative session identifier (for compatibility)
    workbranchId?: string;  // Workbranch isolation identifier
    projectId?: string;     // Optional project context
    command?: string;       // Command to execute
    data?: any;            // Message-specific data payload
    success?: boolean;      // Response success indicator
    message?: string;       // Human-readable message
    error?: string;         // Error message for failed operations
    timestamp?: number;     // Message timestamp (Unix milliseconds)
}
```

## Connection Flow

### 1. Initial Connection
Client connects to `ws://localhost:8002`

### 2. Connection Confirmation
Server sends initial capabilities message:

```json
{
    "type": "connected",
    "success": true,
    "message": "Connected to Terminal Service",
    "data": {
        "shells": ["powershell", "bash", "cmd"],
        "workbranchIsolation": true,
        "sessionPersistence": true,
        "crossPlatform": true,
        "realTimeOutput": true,
        "securityValidation": true,
        "multiSession": true
    },
    "timestamp": 1641234567890
}
```

## Message Types

### Terminal Management

#### Create Terminal Session
**Request:**
```json
{
    "type": "terminal-create",
    "id": "create-req-123",
    "data": {
        "workbranchId": "main-branch",
        "projectId": "my-project",
        "shell": "powershell",
        "title": "My Terminal",
        "cwd": "./projects/my-project",
        "env": {
            "NODE_ENV": "development"
        },
        "cols": 80,
        "rows": 24
    }
}
```

**Response:**
```json
{
    "type": "terminal-create-response",
    "id": "create-req-123",
    "success": true,
    "message": "Terminal session created successfully",
    "data": {
        "sessionId": "main-branch_1641234567890_1",
        "workbranchId": "main-branch",
        "shell": "powershell",
        "projectId": "my-project",
        "title": "My Terminal"
    },
    "timestamp": 1641234567890
}
```

#### Destroy Terminal Session
**Request:**
```json
{
    "type": "terminal-destroy",
    "id": "destroy-req-123",
    "sessionId": "main-branch_1641234567890_1"
}
```

**Response:**
```json
{
    "type": "terminal-destroy-response",
    "id": "destroy-req-123",
    "success": true,
    "message": "Terminal session destroyed successfully",
    "data": {
        "sessionId": "main-branch_1641234567890_1"
    },
    "timestamp": 1641234567890
}
```

### Command Execution

#### Execute Command
**Request:**
```json
{
    "type": "terminal-command",
    "id": "cmd-req-123",
    "sessionId": "main-branch_1641234567890_1",
    "command": "npm run dev"
}
```

**Response:**
```json
{
    "type": "terminal-command-response",
    "id": "cmd-req-123",
    "success": true,
    "message": "Command executed successfully",
    "data": {
        "sessionId": "main-branch_1641234567890_1",
        "command": "npm run dev"
    },
    "timestamp": 1641234567890
}
```

#### Send Raw Data
**Request:**
```json
{
    "type": "terminal-data",
    "id": "data-req-123",
    "sessionId": "main-branch_1641234567890_1",
    "data": {
        "data": "y\n"
    }
}
```

**Response:**
```json
{
    "type": "terminal-data-response",
    "id": "data-req-123",
    "success": true,
    "message": "Data sent successfully",
    "data": {
        "sessionId": "main-branch_1641234567890_1",
        "dataLength": 2
    },
    "timestamp": 1641234567890
}
```

### Terminal Control

#### Resize Terminal
**Request:**
```json
{
    "type": "terminal-resize",
    "id": "resize-req-123",
    "sessionId": "main-branch_1641234567890_1",
    "data": {
        "cols": 120,
        "rows": 30
    }
}
```

**Response:**
```json
{
    "type": "terminal-resize-response",
    "id": "resize-req-123",
    "success": true,
    "message": "Terminal resized successfully",
    "data": {
        "sessionId": "main-branch_1641234567890_1",
        "cols": 120,
        "rows": 30
    },
    "timestamp": 1641234567890
}
```

### Output Streaming

#### Terminal Output (Server-Initiated)
```json
{
    "type": "terminal-output",
    "sessionId": "main-branch_1641234567890_1",
    "terminalId": "main-branch_1641234567890_1",
    "data": {
        "output": "Starting development server...\n"
    },
    "timestamp": 1641234567890
}
```

#### Terminal Exit (Server-Initiated)
```json
{
    "type": "terminal-exit",
    "sessionId": "main-branch_1641234567890_1",
    "terminalId": "main-branch_1641234567890_1",
    "data": {
        "exitCode": 0,
        "signal": null
    },
    "timestamp": 1641234567890
}
```

### Session Management

#### List Terminal Sessions
**Request:**
```json
{
    "type": "terminal-list",
    "id": "list-req-123",
    "data": {
        "workbranchId": "main-branch"
    }
}
```

**Response:**
```json
{
    "type": "terminal-list-response",
    "id": "list-req-123",
    "success": true,
    "message": "Terminals listed successfully",
    "data": {
        "sessions": [
            {
                "sessionId": "main-branch_1641234567890_1",
                "workbranchId": "main-branch",
                "projectId": "my-project",
                "shell": "powershell",
                "title": "My Terminal",
                "status": "running",
                "createdAt": "2022-01-03T12:34:56.789Z",
                "lastActivity": "2022-01-03T12:36:45.123Z",
                "dimensions": {
                    "cols": 80,
                    "rows": 24
                }
            }
        ],
        "count": 1
    },
    "timestamp": 1641234567890
}
```

#### Get Terminal Status
**Request:**
```json
{
    "type": "terminal-status",
    "id": "status-req-123",
    "sessionId": "main-branch_1641234567890_1"
}
```

**Response:**
```json
{
    "type": "terminal-status-response",
    "id": "status-req-123",
    "success": true,
    "message": "Status retrieved successfully",
    "data": {
        "sessionId": "main-branch_1641234567890_1",
        "workbranchId": "main-branch",
        "status": "running",
        "pid": 12345,
        "lastActivity": "2022-01-03T12:36:45.123Z",
        "dimensions": {
            "cols": 80,
            "rows": 24
        },
        "totalOutput": 1024,
        "commandCount": 5
    },
    "timestamp": 1641234567890
}
```

#### Get Terminal Output Buffer
**Request:**
```json
{
    "type": "terminal-output",
    "id": "output-req-123",
    "sessionId": "main-branch_1641234567890_1"
}
```

**Response:**
```json
{
    "type": "terminal-output-response",
    "id": "output-req-123",
    "success": true,
    "message": "Output retrieved successfully",
    "data": {
        "sessionId": "main-branch_1641234567890_1",
        "output": "Welcome to PowerShell...\nPS C:\\workspace\\projects\\my-project> npm run dev\nStarting development server...\n",
        "outputLength": 128
    },
    "timestamp": 1641234567890
}
```

### Service Management

#### Get Service Status
**Request:**
```json
{
    "type": "service-status",
    "id": "service-req-123"
}
```

**Response:**
```json
{
    "type": "service-status-response",
    "id": "service-req-123",
    "success": true,
    "message": "Service status retrieved successfully",
    "data": {
        "sessionStats": {
            "totalSessions": 3,
            "runningSessions": 2,
            "terminatedSessions": 1,
            "errorSessions": 0,
            "sessionsByWorkbranch": {
                "main-branch": 2,
                "feature-branch": 1
            },
            "sessionsByShell": {
                "powershell": 2,
                "bash": 1
            },
            "totalOutput": 4096,
            "totalCommands": 15,
            "oldestSession": "2022-01-03T12:30:00.000Z",
            "newestSession": "2022-01-03T12:35:00.000Z"
        },
        "serverInfo": {
            "platform": "win32",
            "nodeVersion": "v18.15.0",
            "uptime": 3600,
            "memory": {
                "rss": 50331648,
                "heapTotal": 20971520,
                "heapUsed": 15728640,
                "external": 1048576
            }
        }
    },
    "timestamp": 1641234567890
}
```

#### Get Service Statistics
**Request:**
```json
{
    "type": "service-stats",
    "id": "stats-req-123"
}
```

**Response:**
```json
{
    "type": "service-stats-response",
    "id": "stats-req-123",
    "success": true,
    "message": "Service stats retrieved successfully",
    "data": {
        "sessions": {
            "totalSessions": 3,
            "runningSessions": 2,
            "terminatedSessions": 1,
            "errorSessions": 0
        },
        "security": {
            "totalEvents": 10,
            "eventsByType": {
                "command_blocked": 5,
                "path_violation": 3,
                "workbranch_violation": 1,
                "resource_limit": 1
            },
            "eventsBySeverity": {
                "low": 2,
                "medium": 5,
                "high": 2,
                "critical": 1
            },
            "topBlockedCommands": [
                {"command": "rm -rf /", "count": 3},
                {"command": "shutdown /s", "count": 2}
            ],
            "topViolatingWorkbranches": [
                {"workbranchId": "test-branch", "count": 5},
                {"workbranchId": "main-branch", "count": 3}
            ]
        },
        "timestamp": "2022-01-03T12:36:45.123Z"
    },
    "timestamp": 1641234567890
}
```

### Security Management

#### Get Security Audit
**Request:**
```json
{
    "type": "security-audit",
    "id": "audit-req-123"
}
```

**Response:**
```json
{
    "type": "security-audit-response",
    "id": "audit-req-123",
    "success": true,
    "message": "Security audit retrieved successfully",
    "data": {
        "auditLog": [
            {
                "timestamp": "2022-01-03T12:35:00.000Z",
                "type": "command_blocked",
                "command": "rm -rf /",
                "workbranchId": "test-branch",
                "reason": "Dangerous recursive deletion",
                "severity": "critical",
                "sessionId": "test-branch_1641234567890_2"
            }
        ],
        "stats": {
            "totalEvents": 10,
            "eventsByType": {
                "command_blocked": 5
            }
        },
        "timestamp": "2022-01-03T12:36:45.123Z"
    },
    "timestamp": 1641234567890
}
```

### Utility Messages

#### Ping/Pong
**Request:**
```json
{
    "type": "ping",
    "id": "ping-req-123"
}
```

**Response:**
```json
{
    "type": "ping-response",
    "id": "ping-req-123",
    "success": true,
    "message": "pong",
    "data": {
        "timestamp": 1641234567890,
        "uptime": 3600
    },
    "timestamp": 1641234567890
}
```

## Error Responses

All failed operations return an error response with `success: false`:

```json
{
    "type": "terminal-create-response",
    "id": "create-req-123",
    "success": false,
    "message": "Operation failed",
    "error": "Maximum sessions reached: 50",
    "data": {
        "errorType": "resource_limit"
    },
    "timestamp": 1641234567890
}
```

### Common Error Types:
- `validation_error`: Invalid message format or missing required fields
- `session_not_found`: Specified session does not exist
- `permission_denied`: Operation not allowed for this client
- `security_violation`: Command blocked by security validation
- `resource_limit`: Service limits exceeded (max sessions, rate limiting)
- `internal_error`: Server-side error during operation
- `shell_unavailable`: Requested shell not available on platform
- `workbranch_invalid`: Invalid workbranch ID format

## Integration Points

### ChatInterface Integration
Terminal output is automatically routed to the ChatInterface when commands are executed:

```json
{
    "type": "terminal-output",
    "sessionId": "main-branch_1641234567890_1",
    "data": {
        "output": "Command output for chat integration",
        "routeToChat": true,
        "chatContext": {
            "command": "npm run test",
            "workbranchId": "main-branch",
            "projectId": "my-project"
        }
    }
}
```

### TerminalGrid Integration
Status updates are broadcast to update terminal grid displays:

```json
{
    "type": "terminal-status-update",
    "data": {
        "sessions": [
            {
                "sessionId": "main-branch_1641234567890_1",
                "status": "running",
                "title": "My Terminal",
                "lastActivity": "2022-01-03T12:36:45.123Z"
            }
        ]
    }
}
```

### VS Code Bridge Coordination
The service coordinates with the existing VS Code bridge on port 8123:

```json
{
    "type": "bridge-coordination",
    "data": {
        "availableAt": "ws://localhost:8002",
        "capabilities": ["realtime-output", "workbranch-isolation"],
        "fallbackBridge": "ws://localhost:8123"
    }
}
```

## Security Considerations

1. **Command Validation**: All commands are validated against security patterns before execution
2. **Workbranch Isolation**: Sessions are isolated by workbranch ID for security
3. **Path Validation**: File paths are validated to prevent directory traversal
4. **Rate Limiting**: Commands are rate-limited per workbranch to prevent abuse
5. **Audit Logging**: All security events are logged for monitoring
6. **Session Ownership**: Only the WebSocket that created a session can control it

## Connection Management

- **Heartbeat**: Server sends ping frames every 30 seconds
- **Reconnection**: Clients should implement exponential backoff reconnection
- **Session Cleanup**: Inactive sessions are automatically cleaned up after 30 minutes
- **Graceful Shutdown**: Server sends close frame with code 1000 during shutdown