import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { terminalWebSocketService } from '../../services/terminalWebSocketService';
import 'xterm/css/xterm.css';
import styles from './TerminalInstance.module.css';

interface TerminalInstanceProps {
  session: {
    id: string;
    title: string;
    cwd: string;
    history: string[];
  };
  onReady?: (terminal: Terminal) => void;
}

export const TerminalInstance: React.FC<TerminalInstanceProps> = ({ session, onReady }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('');

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    console.log(`🖥️ Initializing terminal for session ${session.id}`);

    // Create terminal instance with VS Code theme
    const terminal = new Terminal({
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selection: '#264f78',
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

    // Show welcome message
    terminal.writeln(`🚀 ${session.title} - ${session.cwd}`);
    terminal.writeln('Type "help" for available commands\r\n');
    terminal.write('PS> ');

    // Set up terminal event handlers
    terminal.onData((data) => {
      // Handle input
      if (data === '\r') {
        // Enter key pressed
        if (currentCommand.trim()) {
          terminal.write('\r\n');
          handleCommand(currentCommand.trim());
          setCurrentCommand('');
        } else {
          terminal.write('\r\nPS> ');
        }
      } else if (data === '\x7f') {
        // Backspace
        if (currentCommand.length > 0) {
          terminal.write('\b \b');
          setCurrentCommand(prev => prev.slice(0, -1));
        }
      } else if (data === '\x03') {
        // Ctrl+C
        terminal.write('^C\r\nPS> ');
        setCurrentCommand('');
      } else {
        // Regular character
        terminal.write(data);
        setCurrentCommand(prev => prev + data);
      }
    });

    // Register terminal output handler with WebSocket service
    terminalWebSocketService.registerTerminalHandler(session.id, (message) => {
      if (message.type === 'output' && message.data) {
        terminal.write(message.data.output || message.data);
      } else if (message.type === 'terminal-output' && message.data) {
        terminal.write(message.data.output || message.data);
      } else if (message.type === 'error') {
        terminal.writeln(`\r\n⚠️ ${message.message}\r\n`);
      }
    });

    // Connect to WebSocket and create session
    terminalWebSocketService.connect().then(() => {
      return terminalWebSocketService.createTerminalSession(
        session.id,
        'workbranch-' + session.id,
        session.cwd
      );
    }).then(() => {
      setIsReady(true);
      onReady?.(terminal);
    }).catch(error => {
      console.error('Failed to create terminal session:', error);
      terminal.writeln(`\r\n❌ Error: ${error.message}\r\n`);
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

  // Handle command execution
  const handleCommand = async (command: string) => {
    try {
      await terminalWebSocketService.sendCommand(session.id, command);
    } catch (error) {
      xtermRef.current?.writeln(`\r\n❌ Error: ${error instanceof Error ? error.message : error}\r\nPS> `);
    }
  };

  return (
    <div className={styles.container}>
      <div 
        ref={terminalRef} 
        className={styles.terminal}
      />
    </div>
  );
};

export default TerminalInstance;
