/**
 * Environment Status Component
 * Shows the current environment mode and connection status
 */

import React, { useEffect, useState } from 'react';
import { getEnvironmentMode, getConnectionStatus, getEnvironmentCapabilities } from '../utils/vsCodeIntegration';
import type { EnvironmentMode } from '../services/environmentBridge';

const EnvironmentStatus: React.FC = () => {
  const [mode, setMode] = useState<EnvironmentMode>('web-local');
  const [status, setStatus] = useState<string>('Initializing...');
  const [capabilities, setCapabilities] = useState<any>({});

  useEffect(() => {
    const updateStatus = () => {
      setMode(getEnvironmentMode());
      setStatus(getConnectionStatus());
      setCapabilities(getEnvironmentCapabilities());
    };

    // Initial update
    updateStatus();

    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const getModeIcon = (mode: EnvironmentMode): string => {
    switch (mode) {
      case 'vscode-local': return '🔗';
      case 'web-local': return '📱';
      case 'remote': return '🌍';
      default: return '❓';
    }
  };

  const getModeLabel = (mode: EnvironmentMode): string => {
    switch (mode) {
      case 'vscode-local': return 'VS Code Enhanced';
      case 'web-local': return 'Web Application';
      case 'remote': return 'Remote Access';
      default: return 'Unknown';
    }
  };

  const getCapabilityIcon = (enabled: boolean): string => {
    return enabled ? '✅' : '❌';
  };

  return (
    <div className="environment-status">
      <div className="status-header">
        <span className="mode-icon">{getModeIcon(mode)}</span>
        <span className="mode-label">{getModeLabel(mode)}</span>
      </div>
      
      <div className="status-details">
        <small>{status}</small>
      </div>

      {mode === 'vscode-local' && (
        <div className="capabilities">
          <div className="capability-item">
            {getCapabilityIcon(capabilities.commands)} Commands
          </div>
          <div className="capability-item">
            {getCapabilityIcon(capabilities.fileOperations)} Files
          </div>
          <div className="capability-item">
            {getCapabilityIcon(capabilities.livePreview)} Live Preview
          </div>
          <div className="capability-item">
            {getCapabilityIcon(capabilities.projectManagement)} Projects
          </div>
        </div>
      )}

      <style jsx>{`
        .environment-status {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 6px;
          font-size: 12px;
          border-left: 3px solid ${mode === 'vscode-local' ? '#007ACC' : mode === 'remote' ? '#FF6B6B' : '#FFA500'};
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }

        .mode-icon {
          font-size: 14px;
        }

        .mode-label {
          color: ${mode === 'vscode-local' ? '#007ACC' : mode === 'remote' ? '#FF6B6B' : '#FFA500'};
        }

        .status-details {
          color: #666;
          font-size: 10px;
        }

        .capabilities {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .capability-item {
          font-size: 10px;
          display: flex;
          align-items: center;
          gap: 2px;
        }
      `}</style>
    </div>
  );
};

export default EnvironmentStatus;