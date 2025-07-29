import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { terminalWebSocketService } from '../../services/terminalWebSocketService';
import 'xterm/css/xterm.css';
import styles from './XTerminalView.module.css';

interface XTerminalViewProps {
  session: {
    id: string;
    title: string;
    cwd: string;
    history: string[];
  };
  onReady?: (terminal: Terminal) => void;
}

export const XTerminalView: React.FC<XTerminalViewProps> = ({ session, onReady }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    console.log(`🖥️ Initializing XTerm for session ${session.id}`);

    // Create terminal instance with VS Code-like theme
    const terminal = new Terminal({
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      cursorBlink: true,
      allowTransparency: false,
      windowsMode: true,
      convertEol: true,
      scrollback: 10000
    });

    // Initialize addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Open terminal in the DOM
    terminal.open(terminalRef.current);

    // Fit terminal to container
    setTimeout(() => {
      fitAddon.fit();
    }, 0);

    // Show welcome message and restore history
    terminal.writeln(`🚀 ${session.title} - ${session.cwd}`);
    terminal.writeln('Type "help" for available commands\r\n');
    
    // Restore session history if available
    if (session.history && session.history.length > 0) {
      terminal.writeln('=== Session History ===');
      session.history.forEach(line => terminal.writeln(line));
      terminal.writeln('=== End History ===\r\n');
    }

    terminal.write('$ ');

    // Set up terminal event handlers
    terminal.onData((data) => {
      // Handle input - send to WebSocket service
      if (data === '\r') {
        // Enter key pressed
        const currentLine = getCurrentLine(terminal);
        if (currentLine.trim()) {
          terminal.write('\r\n');
          handleCommand(currentLine.trim());
        } else {
          terminal.write('\r\n$ ');
        }
      } else if (data === '\x7f') {
        // Backspace
        const currentLine = getCurrentLine(terminal);
        if (currentLine.length > 0) {
          terminal.write('\b \b');
        }
      } else if (data === '\x03') {
        // Ctrl+C
        terminal.write('^C\r\n$ ');
      } else {
        // Regular character
        terminal.write(data);
      }
    });

    // Register terminal output handler with WebSocket service
    terminalWebSocketService.registerTerminalHandler(session.id, (message) => {
      if (message.type === 'output' && message.data?.output) {
        terminal.write(message.data.output);
      }
    });

    // Create WebSocket session
    terminalWebSocketService.createTerminalSession(
      session.id,
      'default',
      session.title
    ).then(() => {
      setIsReady(true);
      onReady?.(terminal);
    }).catch(error => {
      console.error('Failed to create terminal session:', error);
      terminal.writeln(`\r\n❌ Error: ${error.message}\r\n$ `);
    });

    return () => {
      // Cleanup
      terminalWebSocketService.unregisterTerminalHandler(session.id);
      terminalWebSocketService.destroyTerminalSession(session.id);
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [session.id]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = xtermRef.current;
        terminalWebSocketService.resizeTerminal(session.id, cols, rows);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [session.id]);

  // Helper function to get current line
  const getCurrentLine = (terminal: Terminal): string => {
    const buffer = terminal.buffer.active;
    const cursorY = buffer.cursorY;
    const line = buffer.getLine(cursorY);
    if (!line) return '';
    
    let text = '';
    for (let i = 2; i < line.length; i++) { // Skip "$ " prompt
      const cell = line.getCell(i);
      if (cell) {
        text += cell.getChars() || ' ';
      }
    }
    return text.trim();
  };

  // Handle command execution
  const handleCommand = async (command: string) => {
    try {
      await terminalWebSocketService.sendCommand(session.id, command);
    } catch (error) {
      xtermRef.current?.writeln(`\r\n❌ Error: ${error instanceof Error ? error.message : error}\r\n$ `);
    }
  };

  // Copy/paste handlers
  const handleCopy = useCallback(() => {
    const selection = xtermRef.current?.getSelection();
    if (selection) {
      navigator.clipboard.writeText(selection);
    }
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      xtermRef.current?.write(text);
    } catch (error) {
      console.error('Failed to paste:', error);
    }
  }, []);

  return (
    <div className={styles.terminalContainer}>
      <div className={styles.toolbar}>
        <button onClick={handleCopy} title="Copy">
          Copy
        </button>
        <button onClick={handlePaste} title="Paste">
          Paste
        </button>
      </div>
      <div 
        ref={terminalRef} 
        className={styles.terminal}
      />
    </div>
  );
};