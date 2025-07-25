import React, { useState, useEffect } from 'react';
import SvgIcon from './SvgIcon';
import { setPortCheckingEnabled } from '../utils/portManager';
import styles from './PerformanceSettings.module.css';

interface PerformanceSettings {
  portCheckingEnabled: boolean;
  livePreviewEnabled: boolean;
  pollingInterval: number;
}

interface PerformanceSettingsProps {
  onClose?: () => void;
}

export default function PerformanceSettings({ onClose }: PerformanceSettingsProps) {
  const [settings, setSettings] = useState<PerformanceSettings>(() => {
    const saved = localStorage.getItem('performanceSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      portCheckingEnabled: true,
      livePreviewEnabled: true,
      pollingInterval: 5000 // 5 seconds
    };
  });

  // Apply settings on change
  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('performanceSettings', JSON.stringify(settings));
    
    // Apply port checking setting
    setPortCheckingEnabled(settings.portCheckingEnabled);
    
    // Apply polling interval globally
    if (window.portfolioConfig) {
      window.portfolioConfig.pollingInterval = settings.pollingInterval;
      window.portfolioConfig.livePreviewEnabled = settings.livePreviewEnabled;
    }
  }, [settings]);

  const handleToggle = (key: keyof PerformanceSettings) => {
    if (key === 'pollingInterval') return; // Not a boolean
    
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleIntervalChange = (interval: number) => {
    setSettings(prev => ({
      ...prev,
      pollingInterval: interval
    }));
  };

  return (
    <div className={styles.performanceSettings}>
      <div className={styles.header}>
        <h3>
          <SvgIcon name="settings" size={20} />
          Performance Settings
        </h3>
        {onClose && (
          <button onClick={onClose} className={styles.closeButton}>
            <SvgIcon name="x" size={16} />
          </button>
        )}
      </div>

      <div className={styles.settingsContent}>
        <div className={styles.section}>
          <h4>Port Checking</h4>
          <div className={styles.setting}>
            <label>
              <input
                type="checkbox"
                checked={settings.portCheckingEnabled}
                onChange={() => handleToggle('portCheckingEnabled')}
              />
              <span>Enable Port Checking</span>
            </label>
            <p className={styles.description}>
              Continuously check if projects are running on their ports. 
              Disable to reduce console spam and improve performance.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h4>Live Preview</h4>
          <div className={styles.setting}>
            <label>
              <input
                type="checkbox"
                checked={settings.livePreviewEnabled}
                onChange={() => handleToggle('livePreviewEnabled')}
              />
              <span>Enable Live Previews</span>
            </label>
            <p className={styles.description}>
              Automatically refresh project previews. 
              Disable to reduce network requests.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h4>Polling Interval</h4>
          <div className={styles.setting}>
            <label>
              <span>Check Interval:</span>
              <select
                value={settings.pollingInterval}
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                className={styles.intervalSelect}
              >
                <option value={1000}>1 second</option>
                <option value={3000}>3 seconds</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
                <option value={0}>Never (Manual only)</option>
              </select>
            </label>
            <p className={styles.description}>
              How often to check project status when enabled.
            </p>
          </div>
        </div>

        <div className={styles.currentStatus}>
          <h4>Current Status</h4>
          <ul>
            <li>
              Port Checking: 
              <span className={settings.portCheckingEnabled ? styles.enabled : styles.disabled}>
                {settings.portCheckingEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </li>
            <li>
              Live Preview: 
              <span className={settings.livePreviewEnabled ? styles.enabled : styles.disabled}>
                {settings.livePreviewEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </li>
            <li>
              Polling: 
              <span>
                {settings.pollingInterval === 0 ? 'Manual Only' : `Every ${settings.pollingInterval / 1000}s`}
              </span>
            </li>
          </ul>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.resetButton}
            onClick={() => setSettings({
              portCheckingEnabled: true,
              livePreviewEnabled: true,
              pollingInterval: 5000
            })}
          >
            Reset to Defaults
          </button>
          <button 
            className={styles.disableAllButton}
            onClick={() => setSettings({
              portCheckingEnabled: false,
              livePreviewEnabled: false,
              pollingInterval: 0
            })}
          >
            Disable All Checks
          </button>
        </div>
      </div>
    </div>
  );
}

// Add global config type declaration
declare global {
  interface Window {
    portfolioConfig?: {
      pollingInterval: number;
      livePreviewEnabled: boolean;
    };
  }
}
