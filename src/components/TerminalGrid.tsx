/**
 * Terminal Grid Component - Multi-terminal interface for workbranch support
 * 
 * This component provides a grid-based terminal interface that connects to the
 * VS Code extension's terminal service via WebSocket for real terminal processes.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebglAddon } from 'xterm-addon-webgl';
import 'xterm/css/xterm.css';

interface TerminalSession {
    id: string;
    workbranchId: string;
    title: string;
    shell: 'powershell' | 'bash' | 'cmd';
    terminal: Terminal;
    fitAddon: FitAddon;
    webglAddon?: WebglAddon;
    connected: boolean;
    element: HTMLDivElement | null;
}

interface TerminalGridProps {
    maxTerminals?: number;
    gridColumns?: number;
    className?: string;
}

export const TerminalGrid: React.FC<TerminalGridProps> = ({
    maxTerminals = 6,
    gridColumns = 2,
    className = ''
}) => {
    const [sessions, setSessions] = useState<Map<string, TerminalSession>>(new Map());
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [terminalService, setTerminalService] = useState<WebSocket | null>(null);
    const [serviceStatus, setServiceStatus] = useState<{
        connected: boolean;
        error?: string;
    }>({ connected: false });
    
    const terminalContainerRef = useRef<HTMLDivElement>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

    /**
     * Connect to terminal service WebSocket
     */
    const connectToTerminalService = useCallback(() => {
        try {
            const ws = new WebSocket('ws://localhost:8002');
            
            ws.onopen = () => {
                console.log('🔗 Connected to terminal service');
                setServiceStatus({ connected: true });
                setTerminalService(ws);
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleTerminalMessage(message);
                } catch (error) {
                    console.error('Failed to parse terminal message:', error);
                }
            };

            ws.onclose = () => {
                console.log('❌ Terminal service connection closed');
                setServiceStatus({ connected: false });
                setTerminalService(null);
                
                // Attempt to reconnect after 3 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    connectToTerminalService();
                }, 3000);
            };

            ws.onerror = (error) => {
                console.error('Terminal service WebSocket error:', error);
                setServiceStatus({ 
                    connected: false, 
                    error: 'Failed to connect to terminal service' 
                });
            };

        } catch (error) {
            console.error('Failed to connect to terminal service:', error);
            setServiceStatus({ 
                connected: false, 
                error: 'Terminal service unavailable' 
            });
        }
    }, []);

    /**
     * Handle messages from terminal service
     */
    const handleTerminalMessage = useCallback((message: any) => {
        const { type, sessionId, data } = message;

        switch (type) {
            case 'connected':
                console.log('✅ Terminal service capabilities:', message.capabilities);
                break;

            case 'created':
                if (message.success && message.data) {
                    console.log(`✅ Terminal session created: ${message.data.sessionId}`);
                }
                break;

            case 'output':
                if (sessionId && data) {
                    const session = sessions.get(sessionId);
                    if (session && session.terminal) {
                        session.terminal.write(data);
                    }
                }
                break;

            case 'exit':
                if (sessionId) {
                    console.log(`🚪 Terminal session exited: ${sessionId}`);
                    removeTerminalSession(sessionId);
                }
                break;

            case 'error':
                console.error('Terminal service error:', message.error);
                break;

            default:
                console.log('Unknown terminal message type:', type);
        }
    }, [sessions]);

    /**
     * Create a new terminal session
     */
    const createTerminalSession = useCallback(async (
        workbranchId: string, 
        shell: 'powershell' | 'bash' | 'cmd' = 'powershell',
        title?: string
    ) => {
        if (!terminalService || terminalService.readyState !== WebSocket.OPEN) {
            console.error('Terminal service not connected');
            return null;
        }

        if (sessions.size >= maxTerminals) {
            console.warn(`Maximum terminals (${maxTerminals}) reached`);
            return null;
        }

        // Create xterm.js terminal
        const terminal = new Terminal({
            rows: 24,
            cols: 80,
            theme: {
                background: '#1e1e1e',
                foreground: '#ffffff',
                cursor: '#ffffff',
                selection: '#264f78'
            },
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: 14,
            cursorBlink: true,
            allowTransparency: true
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);

        // Try to enable WebGL acceleration
        let webglAddon: WebglAddon | undefined;
        try {
            webglAddon = new WebglAddon();
            terminal.loadAddon(webglAddon);
        } catch (error) {
            console.warn('WebGL addon not supported, falling back to canvas renderer');
        }

        // Request terminal session from VS Code extension
        const createMessage = {
            type: 'create',
            workbranchId,
            shell,
            title: title || `Terminal - ${workbranchId}`,
            cwd: undefined // Will use workbranch default
        };

        terminalService.send(JSON.stringify(createMessage));

        // Handle terminal input
        terminal.onData((data) => {
            if (terminalService && terminalService.readyState === WebSocket.OPEN) {
                terminalService.send(JSON.stringify({
                    type: 'data',
                    sessionId: 'pending', // Will be updated when session is created
                    data
                }));
            }
        });

        // Create session object (sessionId will be updated when response arrives)
        const sessionId = `temp_${Date.now()}`;
        const session: TerminalSession = {
            id: sessionId,
            workbranchId,
            title: title || `Terminal - ${workbranchId}`,
            shell,
            terminal,
            fitAddon,
            webglAddon,
            connected: false,
            element: null
        };

        setSessions(prev => new Map(prev).set(sessionId, session));
        setActiveSessionId(sessionId);

        return sessionId;
    }, [terminalService, sessions.size, maxTerminals]);

    /**
     * Remove a terminal session
     */
    const removeTerminalSession = useCallback((sessionId: string) => {
        const session = sessions.get(sessionId);
        if (session) {
            // Clean up terminal resources
            session.terminal.dispose();
            
            // Remove from sessions
            setSessions(prev => {
                const newSessions = new Map(prev);
                newSessions.delete(sessionId);
                return newSessions;
            });

            // Update active session
            if (activeSessionId === sessionId) {
                const remainingSessions = Array.from(sessions.keys()).filter(id => id !== sessionId);
                setActiveSessionId(remainingSessions.length > 0 ? remainingSessions[0] : null);
            }

            // Notify terminal service
            if (terminalService && terminalService.readyState === WebSocket.OPEN) {
                terminalService.send(JSON.stringify({
                    type: 'destroy',
                    sessionId
                }));
            }
        }
    }, [sessions, activeSessionId, terminalService]);

    /**
     * Attach terminal to DOM element
     */
    const attachTerminal = useCallback((sessionId: string, element: HTMLDivElement) => {
        const session = sessions.get(sessionId);
        if (session && element) {
            session.element = element;
            session.terminal.open(element);
            session.fitAddon.fit();

            // Handle resize
            const resizeObserver = new ResizeObserver(() => {
                session.fitAddon.fit();
                
                // Notify terminal service of resize
                if (terminalService && terminalService.readyState === WebSocket.OPEN) {
                    const { rows, cols } = session.terminal;
                    terminalService.send(JSON.stringify({
                        type: 'resize',
                        sessionId: session.id,
                        rows,
                        cols
                    }));
                }
            });

            resizeObserver.observe(element);

            // Store cleanup function
            element.dataset.cleanup = 'true';
            
            return () => {
                resizeObserver.disconnect();
            };
        }
    }, [sessions, terminalService]);

    /**
     * Initialize terminal service connection
     */
    useEffect(() => {
        connectToTerminalService();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (terminalService) {
                terminalService.close();
            }
        };
    }, [connectToTerminalService]);

    /**
     * Clean up sessions on unmount
     */
    useEffect(() => {
        return () => {
            sessions.forEach((session) => {
                session.terminal.dispose();
            });
        };
    }, []);

    /**
     * Calculate grid layout
     */
    const gridLayout = {
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gap: '10px',
        height: '100%',
        width: '100%'
    };

    const sessionsArray = Array.from(sessions.values());

    return (
        <div className={`terminal-grid ${className}`} style={{ height: '100%', width: '100%' }}>
            {/* Terminal Service Status */}
            <div className="terminal-status" style={{ 
                padding: '10px', 
                background: serviceStatus.connected ? '#28a745' : '#dc3545',
                color: 'white',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>
                    {serviceStatus.connected ? '🔗 Terminal Service Connected' : '❌ Terminal Service Disconnected'}
                    {serviceStatus.error && ` - ${serviceStatus.error}`}
                </span>
                <div>
                    <button 
                        onClick={() => createTerminalSession('main')}
                        disabled={!serviceStatus.connected || sessions.size >= maxTerminals}
                        style={{ 
                            marginRight: '10px', 
                            padding: '4px 8px',
                            fontSize: '11px',
                            background: '#007acc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                        }}
                    >
                        + New Terminal
                    </button>
                    <span>{sessions.size}/{maxTerminals} terminals</span>
                </div>
            </div>

            {/* Terminal Grid */}
            <div className="terminal-container" style={gridLayout} ref={terminalContainerRef}>
                {sessionsArray.map((session, index) => (
                    <div 
                        key={session.id}
                        className={`terminal-session ${activeSessionId === session.id ? 'active' : ''}`}
                        style={{
                            border: activeSessionId === session.id ? '2px solid #007acc' : '1px solid #333',
                            borderRadius: '4px',
                            background: '#1e1e1e',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                        onClick={() => setActiveSessionId(session.id)}
                    >
                        {/* Terminal Header */}
                        <div 
                            className="terminal-header"
                            style={{
                                background: '#2d2d30',
                                padding: '8px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '12px',
                                color: '#cccccc'
                            }}
                        >
                            <span>
                                <span style={{ marginRight: '8px' }}>
                                    {session.shell === 'powershell' ? '📘' : 
                                     session.shell === 'bash' ? '🖥️' : '⚫'}
                                </span>
                                {session.title}
                                <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                                    ({session.workbranchId})
                                </span>
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeTerminalSession(session.id);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#cccccc',
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                    borderRadius: '2px'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Terminal Content */}
                        <div 
                            className="terminal-content"
                            style={{ 
                                flex: 1, 
                                padding: '4px',
                                background: '#1e1e1e'
                            }}
                            ref={(el) => {
                                if (el && !el.dataset.cleanup) {
                                    attachTerminal(session.id, el);
                                }
                            }}
                        />
                    </div>
                ))}

                {/* Add Terminal Placeholder */}
                {sessions.size < maxTerminals && (
                    <div 
                        className="add-terminal-placeholder"
                        style={{
                            border: '2px dashed #555',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: '#252526',
                            minHeight: '200px'
                        }}
                        onClick={() => {
                            const workbranchId = prompt('Enter workbranch ID:', 'main');
                            if (workbranchId) {
                                createTerminalSession(workbranchId.trim());
                            }
                        }}
                    >
                        <div style={{ textAlign: 'center', color: '#888' }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>+</div>
                            <div>Add Terminal</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Empty State */}
            {sessions.size === 0 && (
                <div 
                    className="empty-state"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '300px',
                        color: '#888',
                        textAlign: 'center'
                    }}
                >
                    <div>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖥️</div>
                        <h3>No Terminal Sessions</h3>
                        <p>Click "New Terminal" to create your first terminal session</p>
                        {!serviceStatus.connected && (
                            <p style={{ color: '#dc3545', fontSize: '14px' }}>
                                Terminal service is not connected. Ensure VS Code extension is running.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TerminalGrid;