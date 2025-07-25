import React, { useState } from 'react';
import SvgIcon from './SvgIcon';

interface SetupCommand {
  label: string;
  command: string;
  description?: string;
}

interface SetupCommandsPanelProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function SetupCommandsPanel({ isVisible, onToggle }: SetupCommandsPanelProps) {
  const [copiedCommands, setCopiedCommands] = useState<Set<string>>(new Set());

  const setupCommands: SetupCommand[] = [
    {
      label: "1. Start Terminal Service",
      command: "node start-terminal-service.js",
      description: "Starts WebSocket terminal service on port 8002"
    },
    {
      label: "2. Terminal 1 - GGPrompts",
      command: 'claude --project "D:\\ClaudeWindows\\Projects\\ggprompts"',
      description: "Start Claude Code for GGPrompts project"
    },
    {
      label: "3. Terminal 2 - Matrix Cards",
      command: 'claude --project "D:\\ClaudeWindows\\Projects\\matrix-cards-react"',
      description: "Start Claude Code for Matrix Cards project"
    },
    {
      label: "4. Terminal 3 - Sleak Card",
      command: 'claude --project "D:\\ClaudeWindows\\Projects\\sleak-card-updated"',
      description: "Start Claude Code for Sleak Card project"
    },
    {
      label: "5. Terminal 4 - 3D File System",
      command: 'claude --project "D:\\ClaudeWindows\\Projects\\3d-file-system"',
      description: "Start Claude Code for 3D File System project"
    }
  ];

  const copyToClipboard = async (command: string, label: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommands(prev => new Set([...prev, label]));
      
      // Clear copied state after 2 seconds
      setTimeout(() => {
        setCopiedCommands(prev => {
          const newSet = new Set(prev);
          newSet.delete(label);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button 
        className="setup-toggle-btn"
        onClick={onToggle}
        title={isVisible ? "Hide setup commands" : "Show setup commands"}
      >
        <SvgIcon name={isVisible ? "x" : "terminal"} size={16} />
      </button>

      {/* Commands Panel */}
      {isVisible && (
        <div className="setup-commands-panel">
          <div className="setup-commands-header">
            <SvgIcon name="zap" size={16} />
            <span>Multi-Claude Setup Commands</span>
          </div>
          
          <div style={{ marginBottom: '12px', fontSize: '12px', color: '#999' }}>
            Copy and run these commands to set up multi-Claude terminal orchestration:
          </div>

          {setupCommands.map((cmd, index) => (
            <div key={index} className="setup-command">
              <span className="setup-command-label">{cmd.label}</span>
              <div className="setup-command-row">
                <div className="setup-command-text">{cmd.command}</div>
                <button
                  className={`setup-copy-btn ${copiedCommands.has(cmd.label) ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(cmd.command, cmd.label)}
                  title={`Copy ${cmd.label}`}
                >
                  {copiedCommands.has(cmd.label) ? (
                    <>
                      <SvgIcon name="check" size={10} />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <SvgIcon name="copy" size={10} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              {cmd.description && (
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px', marginLeft: '12px' }}>
                  {cmd.description}
                </div>
              )}
            </div>
          ))}

          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: 'rgba(0, 255, 136, 0.1)', 
            borderRadius: '6px',
            fontSize: '11px',
            color: '#00ff88'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <SvgIcon name="info" size={12} />
              <strong>Quick Start:</strong>
            </div>
            <div>1. Run command #1 in external terminal</div>
            <div>2. Create 4 terminals in the grid</div>
            <div>3. Run commands #2-5 in each terminal</div>
            <div>4. Use checkboxes to route prompts!</div>
          </div>
        </div>
      )}
    </>
  );
}