/**
 * Environment Status Component
 * Shows the current environment mode and connection status
 */

import React, { useEffect, useState } from 'react';
import { getEnvironmentMode, getConnectionStatus, getEnvironmentCapabilities } from '../utils/vsCodeIntegration';
import { connectToVSCode, disconnectFromVSCode, showBrowserNotification } from '../services/environmentBridge';
import type { EnvironmentMode } from '../services/environmentBridge';

const EnvironmentStatus: React.FC = () => {
  const [mode, setMode] = useState<EnvironmentMode>('web-local');
  const [status, setStatus] = useState<string>('Initializing...');
  const [capabilities, setCapabilities] = useState<any>({});
  const [isConnecting, setIsConnecting] = useState(false);

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

  const handleConnectToVSCode = async () => {
    setIsConnecting(true);
    try {
      const success = await connectToVSCode();
      if (success) {
        // Update status immediately
        setTimeout(() => {
          setMode(getEnvironmentMode());
          setStatus(getConnectionStatus());
          setCapabilities(getEnvironmentCapabilities());
        }, 1000);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      showBrowserNotification('Failed to connect to VS Code - ensure extension is running', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectFromVSCode = () => {
    disconnectFromVSCode();
    // Update status immediately
    setTimeout(() => {
      setMode(getEnvironmentMode());
      setStatus(getConnectionStatus());
      setCapabilities(getEnvironmentCapabilities());
    }, 500);
  };

  const testNotification = () => {
    showBrowserNotification('🎉 Notification test! This appears in both VS Code and browser when connected.', 'info');
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

      <div className="connection-controls">
        {mode === 'vscode-local' ? (
          <>
            <button 
              onClick={handleDisconnectFromVSCode}
              className="disconnect-btn"
              title="Disconnect from VS Code Extension"
            >
              🔌 Disconnect
            </button>
            <button 
              onClick={testNotification}
              className="test-btn"
              title="Test dual notifications (VS Code + Browser)"
            >
              🔔 Test
            </button>
          </>
        ) : (
          <button 
            onClick={handleConnectToVSCode}
            disabled={isConnecting}
            className="connect-btn"
            title="Connect to VS Code Extension (ensure extension is running)"
          >
            {isConnecting ? '⏳ Connecting...' : '🔗 Connect to VS Code'}
          </button>
        )}
      </div>

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

        .connection-controls {
          display: flex;
          gap: 4px;
          margin-top: 6px;
        }

        .connect-btn, .disconnect-btn, .test-btn {
          background: ${mode === 'vscode-local' ? '#007ACC' : '#28a745'};
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 1;
        }

        .connect-btn:hover {
          background: #218838;
        }

        .disconnect-btn {
          background: #dc3545;
        }

        .disconnect-btn:hover {
          background: #c82333;
        }

        .test-btn {
          background: #17a2b8;
        }

        .test-btn:hover {
          background: #138496;
        }

        .connect-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
      `}</style>

      <style jsx global>{`
        /* Global styles for toast notifications */
        .notification-toast {
          z-index: 10001 !important; /* Ensure above other elements */
        }
      `}</style>
    </div>
  );
};

export default EnvironmentStatus;