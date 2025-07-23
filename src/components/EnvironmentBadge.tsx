import React from 'react';
import { isVSCodeEnvironment } from '../utils/vsCodeIntegration';
import styles from './EnvironmentBadge.module.css';

interface EnvironmentBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showDescription?: boolean;
}

const EnvironmentBadge: React.FC<EnvironmentBadgeProps> = ({ 
  size = 'medium', 
  showDescription = false 
}) => {
  const isVSCode = isVSCodeEnvironment();
  
  return (
    <div className={`${styles.envBadge} ${styles[size]} ${isVSCode ? styles.vscode : styles.web}`}>
      <span className={styles.icon}>
        {isVSCode ? '🔌' : '🌐'}
      </span>
      <span className={styles.label}>
        {isVSCode ? 'VS Code Extension' : 'Web Application'}
      </span>
      {showDescription && (
        <small className={styles.description}>
          {isVSCode ? 'Direct execution' : 'Clipboard commands'}
        </small>
      )}
    </div>
  );
};

export default EnvironmentBadge;