import React, { useState, useRef, useEffect } from 'react';
import { TerminalHeaderProps, TerminalInstance } from './types';
import SvgIcon from '../SvgIcon';
import styles from './CenterArea.module.css';

export default function TerminalHeader({
  terminal,
  selected,
  onToggleSelection,
  onClose,
  onRename
}: TerminalHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(terminal.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle title editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTitleSubmit = () => {
    if (editTitle.trim() && editTitle !== terminal.title) {
      onRename(terminal.id, editTitle.trim());
    } else {
      setEditTitle(terminal.title);
    }
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setEditTitle(terminal.title);
      setIsEditing(false);
    }
  };

  const getStatusIcon = (status: TerminalInstance['status']) => {
    switch (status) {
      case 'running':
        return <SvgIcon name="play" size={12} className={styles.statusRunning} />;
      case 'idle':
        return <SvgIcon name="pause" size={12} className={styles.statusIdle} />;
      case 'error':
        return <SvgIcon name="alertCircle" size={12} className={styles.statusError} />;
      case 'disconnected':
        return <SvgIcon name="wifiOff" size={12} className={styles.statusDisconnected} />;
      default:
        return <SvgIcon name="circle" size={12} className={styles.statusUnknown} />;
    }
  };

  const getStatusText = (status: TerminalInstance['status']) => {
    switch (status) {
      case 'running':
        return 'Active';
      case 'idle':
        return 'Idle';
      case 'error':
        return 'Error';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`${styles.terminalHeader} ${selected ? styles.selected : ''}`}>
      {/* Selection Checkbox */}
      <div className={styles.headerLeft}>
        <label className={styles.checkboxContainer}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onToggleSelection(terminal.id)}
            className={styles.selectionCheckbox}
          />
          <span className={styles.checkboxCustom}>
            {selected && <SvgIcon name="check" size={10} />}
          </span>
        </label>
      </div>

      {/* Terminal Title */}
      <div className={styles.headerCenter}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleTitleKeyDown}
            className={styles.titleInput}
            maxLength={50}
          />
        ) : (
          <div 
            className={styles.terminalTitle}
            onDoubleClick={() => setIsEditing(true)}
            title="Double-click to rename"
          >
            {terminal.title}
          </div>
        )}
        
        {/* Workbranch Badge */}
        {terminal.workbranchId && (
          <div className={styles.workbranchBadge} title={`Workbranch: ${terminal.workbranchId}`}>
            <SvgIcon name="gitBranch" size={10} />
            <span>{terminal.workbranchId}</span>
          </div>
        )}
        
        {/* Project Badge */}
        {terminal.projectId && (
          <div className={styles.projectBadge} title={`Project: ${terminal.projectId}`}>
            <SvgIcon name="folder" size={10} />
            <span>{terminal.projectId}</span>
          </div>
        )}
      </div>

      {/* Status and Controls */}
      <div className={styles.headerRight}>
        {/* Status Indicator */}
        <div 
          className={styles.statusIndicator}
          title={`Status: ${getStatusText(terminal.status)} | Last activity: ${formatLastActivity(terminal.lastActivity)}`}
        >
          {getStatusIcon(terminal.status)}
          <span className={styles.statusText}>{getStatusText(terminal.status)}</span>
        </div>

        {/* Terminal Controls */}
        <div className={styles.terminalControls}>
          {/* Minimize/Restore */}
          <button
            className={styles.controlButton}
            onClick={() => {
              // Toggle terminal visibility (minimize/restore)
              // This would be handled by the parent component
            }}
            title="Minimize terminal"
          >
            <SvgIcon name="minus" size={12} />
          </button>

          {/* Maximize/Restore */}
          <button
            className={styles.controlButton}
            onClick={() => {
              // Toggle terminal full screen
              // This would be handled by the parent component
            }}
            title="Maximize terminal"
          >
            <SvgIcon name="square" size={12} />
          </button>

          {/* Split Terminal */}
          <button
            className={styles.controlButton}
            onClick={() => {
              // Create new terminal split
              // This would be handled by the parent component
            }}
            title="Split terminal"
          >
            <SvgIcon name="columns" size={12} />
          </button>

          {/* Terminal Settings */}
          <button
            className={styles.controlButton}
            onClick={() => {
              // Open terminal settings menu
              // This could open a dropdown with terminal-specific settings
            }}
            title="Terminal settings"
          >
            <SvgIcon name="settings" size={12} />
          </button>

          {/* Close Terminal */}
          <button
            className={`${styles.controlButton} ${styles.closeButton}`}
            onClick={() => onClose(terminal.id)}
            title="Close terminal"
          >
            <SvgIcon name="x" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}