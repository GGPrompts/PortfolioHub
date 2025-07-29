import React from 'react';
import styles from './TerminalTabs.module.css';

interface TerminalSession {
  id: string;
  title: string;
  cwd: string;
  isActive: boolean;
}

interface TerminalTabsProps {
  sessions: TerminalSession[];
  activeSessionId?: string;
  onSelectSession: (id: string) => void;
  onCloseSession: (id: string) => void;
}

export const TerminalTabs: React.FC<TerminalTabsProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCloseSession
}) => {
  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabs}>
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`${styles.tab} ${session.id === activeSessionId ? styles.active : ''}`}
            onClick={() => onSelectSession(session.id)}
          >
            <span className={styles.tabIcon}>{'>'}</span>
            <span className={styles.tabTitle}>{session.title}</span>
            <button
              className={styles.closeBtn}
              onClick={(e) => {
                e.stopPropagation();
                onCloseSession(session.id);
              }}
              title="Close terminal"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TerminalTabs;
