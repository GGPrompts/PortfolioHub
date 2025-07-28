import React from 'react';
import SvgIcon from '../SvgIcon';
import styles from './TerminalTab.module.css';

interface TerminalTabProps {
  session: {
    id: string;
    title: string;
    cwd: string;
    lastActivity: Date;
  };
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

export const TerminalTab: React.FC<TerminalTabProps> = ({
  session,
  isActive,
  onSelect,
  onClose
}) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div 
      className={`${styles.terminalTab} ${isActive ? styles.active : ''}`}
      onClick={onSelect}
      title={`${session.title} - ${session.cwd}`}
    >
      <SvgIcon name="terminal" className={styles.icon} />
      <span className={styles.title}>{session.title}</span>
      <button 
        className={styles.closeButton}
        onClick={handleClose}
        title="Close Terminal"
      >
        <SvgIcon name="close" />
      </button>
    </div>
  );
};