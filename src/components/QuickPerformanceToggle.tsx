import React from 'react';
import { setPortCheckingEnabled } from '../utils/portManager';
import SvgIcon from './SvgIcon';
import styles from './QuickPerformanceToggle.module.css';

export function QuickPerformanceToggle() {
  const [portCheckingEnabled, setPortCheckingEnabledState] = React.useState(() => {
    const settings = JSON.parse(localStorage.getItem('performanceSettings') || '{}');
    return settings.portCheckingEnabled !== false; // Default to true
  });

  const handleToggle = () => {
    const newValue = !portCheckingEnabled;
    setPortCheckingEnabledState(newValue);
    
    // Update localStorage
    const settings = JSON.parse(localStorage.getItem('performanceSettings') || '{}');
    settings.portCheckingEnabled = newValue;
    localStorage.setItem('performanceSettings', JSON.stringify(settings));
    
    // Update port manager
    setPortCheckingEnabled(newValue);
    
    // Force a page reload to clear any pending checks
    if (!newValue) {
      console.log('🚫 Port checking disabled - console errors will stop');
    } else {
      console.log('✅ Port checking enabled');
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={styles.toggle}
      title={portCheckingEnabled ? 'Disable port checking' : 'Enable port checking'}
    >
      <SvgIcon 
        name={portCheckingEnabled ? 'wifi' : 'wifiOff'} 
        size={16} 
      />
      <span className={styles.label}>
        {portCheckingEnabled ? 'Ports On' : 'Ports Off'}
      </span>
    </button>
  );
}
