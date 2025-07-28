import React, { useState, useEffect, useCallback } from 'react';
import { TerminalTab } from './TerminalTab';
import { XTerminalView } from './XTerminalView';
import { useTerminalSessions } from '../../hooks/useTerminalSessions';
import { terminalWebSocketService } from '../../services/terminalWebSocketService';
import { usePortfolioStore } from '../../store/portfolioStore';
import SvgIcon from '../SvgIcon';
import styles from './PersistentTerminals.module.css';

export interface TerminalSession {
  id: string;
  title: string;
  cwd: string;
  isActive: boolean;
  websocket: WebSocket | null;
  history: string[];
  createdAt: Date;
  lastActivity: Date;
}

export const PersistentTerminals: React.FC = () => {
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const { 
    sessions, 
    createSession, 
    destroySession, 
    updateSession,
    getActiveSession 
  } = useTerminalSessions();

  // Create initial terminal on mount if none exist
  useEffect(() => {
    if (sessions.length === 0) {
      createInitialTerminal();
    }
  }, []);

  const createInitialTerminal = async () => {
    const selectedProject = usePortfolioStore.getState().selectedProject;
    await createSession({
      title: 'Terminal 1',
      cwd: selectedProject?.path || 'D:\\ClaudeWindows\\claude-dev-portfolio',
      projectId: selectedProject?.id
    });
  };

  const handleCreateTerminal = async () => {
    const selectedProject = usePortfolioStore.getState().selectedProject;
    const terminalNumber = sessions.length + 1;
    
    const newSession = await createSession({
      title: `Terminal ${terminalNumber}`,
      cwd: selectedProject?.path || 'D:\\ClaudeWindows\\claude-dev-portfolio',
      projectId: selectedProject?.id
    });
    
    if (newSession) {
      setActiveTerminalId(newSession.id);
    }
  };

  const handleCloseTerminal = async (terminalId: string) => {
    await destroySession(terminalId);
    
    // If closing active terminal, switch to another
    if (activeTerminalId === terminalId && sessions.length > 1) {
      const remainingSessions = sessions.filter(s => s.id !== terminalId);
      if (remainingSessions.length > 0) {
        setActiveTerminalId(remainingSessions[0].id);
      }
    }
  };

  const handleSelectTerminal = (terminalId: string) => {
    setActiveTerminalId(terminalId);
    updateSession(terminalId, { isActive: true, lastActivity: new Date() });
  };

  // Get active session or first session
  const activeSession = activeTerminalId 
    ? sessions.find(s => s.id === activeTerminalId) 
    : sessions[0];

  return (
    <div className={styles.persistentTerminals}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <SvgIcon name="terminal" className={styles.icon} />
          Terminals
        </h3>
        <button 
          className={styles.addButton}
          onClick={handleCreateTerminal}
          title="New Terminal"
        >
          <SvgIcon name="plus" />
        </button>
      </div>

      <div className={styles.terminalTabs}>
        {sessions.map((session) => (
          <TerminalTab
            key={session.id}
            session={session}
            isActive={session.id === activeSession?.id}
            onSelect={() => handleSelectTerminal(session.id)}
            onClose={() => handleCloseTerminal(session.id)}
          />
        ))}
      </div>

      <div className={styles.terminalContent}>
        {activeSession ? (
          <XTerminalView
            key={activeSession.id}
            session={activeSession}
            onReady={(terminal) => {
              console.log(`Terminal ${activeSession.id} ready`);
            }}
          />
        ) : (
          <div className={styles.noTerminal}>
            <p>No terminal sessions active</p>
            <button onClick={handleCreateTerminal}>
              Create Terminal
            </button>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.sessionCount}>
          {sessions.length} terminal{sessions.length !== 1 ? 's' : ''}
        </span>
        <span className={styles.status}>
          {terminalWebSocketService.isConnected() ? (
            <>
              <span className={styles.statusDot} />
              Connected
            </>
          ) : (
            <>
              <span className={`${styles.statusDot} ${styles.disconnected}`} />
              Disconnected
            </>
          )}
        </span>
      </div>
    </div>
  );
};