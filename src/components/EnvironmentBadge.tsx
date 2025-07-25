import React, { useEffect, useState } from 'react';
import environmentBridge from '../services/environmentBridge';
import styles from './EnvironmentBadge.module.css';

interface EnvironmentBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showDescription?: boolean;
}

const EnvironmentBadge: React.FC<EnvironmentBadgeProps> = ({ 
  size = 'medium', 
  showDescription = false 
}) => {
  const [mode, setMode] = useState(environmentBridge.getMode());
  const [isConnected, setIsConnected] = useState(environmentBridge.isConnected());
  
  // Update badge when connection status changes
  useEffect(() => {
    const interval = setInterval(() => {
      const currentMode = environmentBridge.getMode();
      const currentConnection = environmentBridge.isConnected();
      
      if (currentMode !== mode || currentConnection !== isConnected) {
        setMode(currentMode);
        setIsConnected(currentConnection);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [mode, isConnected]);
  
  const isVSCode = mode === 'vscode-local' && isConnected;
  
  return (
    <div className={`${styles.envBadge} ${styles[size]} ${isVSCode ? styles.vscode : styles.web}`}>
      <span className={styles.icon}>
        {isVSCode ? '🔗' : '📱'}
      </span>
      <span className={styles.label}>
        {isVSCode ? 'VS Code Enhanced' : 'Web Application'}
      </span>
      {showDescription && (
        <small className={styles.description}>
          {isVSCode ? 'Direct terminal execution' : 'Clipboard commands'}
        </small>
      )}
    </div>
  );
};

export default EnvironmentBadge;