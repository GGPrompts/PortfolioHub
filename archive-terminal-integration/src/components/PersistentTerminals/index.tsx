import React, { useState } from 'react';
import { TerminalInstance } from './TerminalInstance';
import { TerminalTabs } from './TerminalTabs';
import { useTerminalSessions } from '../../hooks/useTerminalSessions';
import styles from './PersistentTerminals.module.css';

interface TerminalSystemConfig {
  mode: 'vscode' | 'standalone' | 'external';
  url: string;
  wsUrl: string;
}

const TERMINAL_CONFIGS: Record<string, TerminalSystemConfig> = {
  standalone: {
    mode: 'standalone',
    url: 'http://localhost:3007',
    wsUrl: 'ws://localhost:3006'
  },
  vscode: {
    mode: 'vscode',
    url: 'http://localhost:3002',
    wsUrl: 'ws://localhost:3002'
  }
};

export const PersistentTerminals: React.FC = () => {
  const [terminalMode, setTerminalMode] = useState<'vscode' | 'standalone'>('vscode');
  const [isStandaloneConnected, setIsStandaloneConnected] = useState(false);
  const [externalWindow, setExternalWindow] = useState<Window | null>(null);
  
  const {
    sessions,
    activeSession,
    createSession,
    removeSession,
    setActiveSession
  } = useTerminalSessions();

  // Check standalone terminal connection
  React.useEffect(() => {
    if (terminalMode !== 'standalone') return;
    
    const checkConnection = async () => {
      try {
        const response = await fetch(TERMINAL_CONFIGS.standalone.url, { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        setIsStandaloneConnected(true);
      } catch (err) {
        setIsStandaloneConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [terminalMode]);

  const handleCreateSession = () => {
    createSession({
      title: `Terminal ${sessions.length + 1}`,
      cwd: 'D:\\ClaudeWindows\\claude-dev-portfolio'
    });
  };

  const openStandaloneWindow = () => {
    if (externalWindow && !externalWindow.closed) {
      externalWindow.focus();
      return;
    }

    const width = 1200;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const newWindow = window.open(
      TERMINAL_CONFIGS.standalone.url,
      'StandaloneTerminal',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (newWindow) {
      setExternalWindow(newWindow);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Terminal System</h3>
        <div className={styles.controls}>
          <select 
            value={terminalMode} 
            onChange={(e) => setTerminalMode(e.target.value as 'vscode' | 'standalone')}
            className={styles.modeSelector}
          >
            <option value="vscode">VS Code Terminals</option>
            <option value="standalone">Standalone System</option>
          </select>
        </div>
      </div>

      {terminalMode === 'vscode' && (
        <>
          <div className={styles.toolbar}>
            <button onClick={handleCreateSession} className={styles.newTerminalBtn}>
              + New Terminal
            </button>
            <div className={styles.sessionInfo}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} active
            </div>
          </div>

          {sessions.length > 0 && (
            <TerminalTabs
              sessions={sessions}
              activeSessionId={activeSession?.id}
              onSelectSession={setActiveSession}
              onCloseSession={removeSession}
            />
          )}

          <div className={styles.terminalContent}>
            {activeSession ? (
              <TerminalInstance
                key={activeSession.id}
                session={activeSession}
              />
            ) : (
              <div className={styles.noTerminal}>
                <p>No terminal selected</p>
                <button onClick={handleCreateSession} className={styles.createBtn}>
                  Create New Terminal
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {terminalMode === 'standalone' && (
        <div className={styles.standaloneMode}>
          {isStandaloneConnected ? (
            <>
              <div className={styles.standaloneOptions}>
                <button 
                  onClick={openStandaloneWindow} 
                  className={styles.openButton}
                >
                  Open in New Window
                </button>
                <p>or</p>
              </div>
              <iframe
                src={TERMINAL_CONFIGS.standalone.url}
                className={styles.iframe}
                title="Standalone Terminal System"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            </>
          ) : (
            <div className={styles.notRunning}>
              <h4>Standalone Terminal Not Running</h4>
              <p>Start the standalone terminal system:</p>
              <code>
                cd D:\ClaudeWindows\claude-dev-portfolio\projects\standalone-terminal-system<br />
                npm run dev
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PersistentTerminals;