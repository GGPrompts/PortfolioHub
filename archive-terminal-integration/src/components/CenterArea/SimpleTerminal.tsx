import React, { useState, useRef, useEffect } from 'react';
import { environmentBridge } from '../../services/environmentBridge';
import styles from './SimpleTerminal.module.css';

interface SimpleTerminalProps {
  terminalId: string;
  title: string;
  workbranchId: string;
  projectId?: string;
  onCommand?: (command: string) => void;
  onClose?: (terminalId: string) => void;
}

interface CommandExecution {
  command: string;
  timestamp: Date;
  status: 'executing' | 'success' | 'error';
  output?: string;
}

export default function SimpleTerminal({ 
  terminalId, 
  title, 
  workbranchId, 
  projectId, 
  onCommand,
  onClose
}: SimpleTerminalProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<CommandExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [realTerminalId, setRealTerminalId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const addLine = (line: string) => {
    setLines(prev => [...prev, line]);
    // Auto-scroll to bottom
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 10);
  };

  const handleCommand = async (command: string) => {
    if (command.trim()) {
      const timestamp = new Date();
      const execution: CommandExecution = {
        command,
        timestamp,
        status: 'executing'
      };
      
      // Add command to history
      setCommandHistory(prev => [...prev, execution]);
      setIsExecuting(true);
      
      try {
        if (isConnected && realTerminalId) {
          // Execute in dedicated real terminal session
          try {
            const response = await environmentBridge.sendMessage({
              type: 'terminal:command',
              terminalId: realTerminalId,
              command: command
            });
            
            if (response.success) {
              execution.status = 'success';
              execution.output = 'Command executed in dedicated terminal';
              addLine(`📤 Command sent: ${command}`);
            } else {
              execution.status = 'error';
              execution.output = response.error || 'Command execution failed';
              addLine(`❌ Command failed: ${execution.output}`);
            }
          } catch (terminalError) {
            // Fallback to Environment Bridge if terminal session fails
            console.warn('Terminal session command failed, falling back to bridge:', terminalError);
            const success = await environmentBridge.executeCommand(command, projectId ? `${projectId}` : undefined);
            execution.status = success ? 'success' : 'error';
            execution.output = success ? 'Command executed via bridge fallback' : 'Command execution failed';
            
            if (success) {
              addLine(`📋 Command executed via bridge: ${command}`);
            } else {
              addLine(`❌ Command failed - check VS Code terminal for error details`);
            }
          }
        } else if (onCommand) {
          // Web mode - use Environment Bridge
          const success = await environmentBridge.executeCommand(command, projectId ? `${projectId}` : undefined);
          execution.status = success ? 'success' : 'error';
          execution.output = success ? 'Command executed via bridge' : 'Command execution failed';
          
          if (success) {
            addLine(`📋 Command copied to clipboard: ${command}`);
          } else {
            addLine(`❌ Command failed - check clipboard for manual execution`);
          }
        } else {
          execution.status = 'error';
          execution.output = 'No terminal connection available';
          addLine(`⚠️ No terminal connection - commands cannot be executed`);
        }
      } catch (error) {
        execution.status = 'error';
        execution.output = error instanceof Error ? error.message : 'Unknown error';
        addLine(`❌ Error: ${execution.output}`);
      } finally {
        setIsExecuting(false);
      }
      
      // Update command history
      setCommandHistory(prev => prev.map(cmd => 
        cmd.timestamp === execution.timestamp ? execution : cmd
      ));
      
      setCurrentInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isExecuting) {
      handleCommand(currentInput);
    } else if (e.key === 'ArrowUp' && commandHistory.length > 0) {
      // Command history navigation
      const lastCommand = commandHistory[commandHistory.length - 1];
      if (lastCommand) {
        setCurrentInput(lastCommand.command);
      }
    }
  };

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    // Auto-focus when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Initialize terminal connection with real terminal session
    const initializeTerminal = async () => {
      try {
        addLine('🔍 Detecting environment...');
        
        // Initialize environment bridge to detect VS Code connection
        const mode = await environmentBridge.initialize();
        
        if (mode === 'vscode-local') {
          addLine('🚀 VS Code bridge detected - creating real terminal session...');
          
          // Create a unique terminal session via WebSocket bridge
          try {
            const response = await environmentBridge.sendMessage({
              type: 'terminal:create',
              workbranchId: workbranchId,
              projectId: projectId,
              shell: 'powershell'
            });
            
            if (response.success && response.data?.terminalId) {
              const currentTerminalId = response.data.terminalId;
              setRealTerminalId(currentTerminalId);
              setIsConnected(true);
              
              addLine(`✅ Real terminal created: ${currentTerminalId.slice(-8)}`);
              addLine(`🌿 Working directory: ${projectId ? `Project ${projectId}` : `Workbranch ${workbranchId}`}`);
              addLine('💡 Commands will execute in dedicated VS Code terminal');
              addLine('');
              
              // Set up real-time output listener
              const handleTerminalOutput = (event: any) => {
                const message = event.detail;
                if (message.type === 'terminal:output' && message.terminalId === currentTerminalId) {
                  // Process real terminal output
                  const outputLines = message.data.split('\n');
                  outputLines.forEach((line: string) => {
                    if (line.trim()) {
                      addLine(line);
                    }
                  });
                }
              };
              
              window.addEventListener('terminal-message', handleTerminalOutput);
              
              // Store cleanup function
              return () => {
                window.removeEventListener('terminal-message', handleTerminalOutput);
                // Destroy terminal session on cleanup
                if (currentTerminalId) {
                  environmentBridge.sendMessage({
                    type: 'terminal:destroy',
                    terminalId: currentTerminalId
                  }).catch(console.error);
                }
              };
            } else {
              throw new Error('Failed to create terminal session');
            }
          } catch (terminalError) {
            console.error('Terminal session creation failed:', terminalError);
            addLine('⚠️ Real terminal creation failed - falling back to bridge mode');
            addLine('💡 Commands will execute via Environment Bridge');
            addLine('');
            setIsConnected(true); // Still connected, but using bridge mode
          }
        } else if (mode === 'web-local') {
          addLine('📱 Web mode detected - commands will copy to clipboard');
          addLine('💡 Start VS Code extension for direct terminal integration');
          addLine('');
          setIsConnected(false);
        } else {
          addLine('🌍 Remote mode detected - API commands available');
          addLine('');
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Failed to initialize terminal:', error);
        addLine(`❌ Terminal initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        addLine('📱 Falling back to clipboard mode');
        addLine('');
        setIsConnected(false);
      }
    };
    
    initializeTerminal();
    
    // Cleanup function
    return () => {
      // No specific cleanup needed for Environment Bridge approach
    };
  }, [workbranchId, projectId, terminalId]);
  
  return (
    <div className={styles.simpleTerminal} onClick={handleClick} ref={containerRef}>
      <div className={styles.terminalHeader}>
        <span className={styles.terminalTitle}>{title}</span>
        <div className={styles.terminalActions}>
          <span className={styles.connectionStatus}>
            {isConnected ? '🔗 VS Code' : '📱 Web'}
          </span>
          <span className={styles.terminalId}>{realTerminalId?.slice(-8) || terminalId.slice(-8)}</span>
          {onClose && (
            <button 
              className={styles.closeButton}
              onClick={() => onClose(terminalId)}
              title="Close terminal"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.terminalContent}>
        {lines.map((line, index) => (
          <div key={index} className={styles.terminalLine}>
            {line}
          </div>
        ))}
        
        <div className={styles.currentLine}>
          <span className={styles.prompt}>$ </span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className={styles.terminalInput}
            placeholder={
              isExecuting 
                ? "Executing command..." 
                : isConnected 
                  ? "Type a command in real terminal... (↑ for history)"
                  : "Connecting to terminal... (↑ for history)"
            }
            disabled={isExecuting || !isConnected}
            style={{ 
              opacity: isExecuting || !isConnected ? 0.7 : 1,
              cursor: isExecuting ? 'wait' : isConnected ? 'text' : 'not-allowed'
            }}
          />
          {isExecuting && (
            <span className={styles.loadingIndicator}>⏳</span>
          )}
        </div>
      </div>
    </div>
  );
}