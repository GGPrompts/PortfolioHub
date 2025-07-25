import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatInterfaceProps, ChatMessage, TerminalInstance } from './types';
import SvgIcon from '../SvgIcon';
import CompactTerminalSelector from './CompactTerminalSelector';
import styles from './CenterArea.module.css';

export default function ChatInterface({
  selectedTerminals,
  terminals,
  messageHistory,
  onSendMessage,
  onClearHistory,
  onTerminalSelect,
  onSelectAll,
  onDeselectAll,
  className = ''
}: ChatInterfaceProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // Get selected terminal details
  const selectedTerminalDetails = useMemo(() => {
    return Array.from(selectedTerminals).map(terminalId => {
      const terminal = terminals.find(t => t.id === terminalId);
      return terminal ? {
        id: terminal.id,
        title: terminal.title,
        projectId: terminal.projectId,
        workbranchId: terminal.workbranchId,
        status: terminal.status
      } : null;
    }).filter(Boolean);
  }, [selectedTerminals, terminals]);

  // Handle message send
  const handleSendMessage = () => {
    console.log('💬 ChatInterface handleSendMessage called');
    console.log('📝 Message input:', messageInput);
    console.log('🎯 Selected terminals:', selectedTerminals);
    console.log('📊 Selected terminals size:', selectedTerminals.size);
    
    if (!messageInput.trim()) {
      console.warn('❌ Message is empty');
      return;
    }
    
    if (selectedTerminals.size === 0) {
      console.warn('❌ No terminals selected');
      return;
    }

    const targets = Array.from(selectedTerminals);
    console.log('📤 Sending message to targets:', targets);
    onSendMessage(messageInput.trim(), targets);
    setMessageInput('');
    
    // Focus back to input
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter for new line - default behavior
        return;
      } else {
        // Enter to send
        e.preventDefault();
        handleSendMessage();
      }
    }
    
    if (e.key === 'Escape') {
      // Clear input on Escape
      setMessageInput('');
    }
  };

  // Auto-scroll history to bottom
  useEffect(() => {
    if (historyRef.current && showHistory) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messageHistory, showHistory]);

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get status icon for terminals
  const getStatusIcon = (status: TerminalInstance['status']) => {
    switch (status) {
      case 'running':
        return <SvgIcon name="play" size={10} className={styles.statusRunning} />;
      case 'idle':
        return <SvgIcon name="pause" size={10} className={styles.statusIdle} />;
      case 'error':
        return <SvgIcon name="alertCircle" size={10} className={styles.statusError} />;
      case 'disconnected':
        return <SvgIcon name="wifiOff" size={10} className={styles.statusDisconnected} />;
      default:
        return <SvgIcon name="circle" size={10} className={styles.statusUnknown} />;
    }
  };

  // Predefined command suggestions
  const commandSuggestions = [
    { command: 'npm run dev', description: 'Start development server' },
    { command: 'npm run build', description: 'Build project' },
    { command: 'npm install', description: 'Install dependencies' },
    { command: 'git status', description: 'Check git status' },
    { command: 'git add .', description: 'Stage all changes' },
    { command: 'git commit -m "message"', description: 'Commit changes' },
    { command: 'ls -la', description: 'List directory contents' },
    { command: 'pwd', description: 'Show current directory' },
    { command: 'clear', description: 'Clear terminal' }
  ];

  const insertCommand = (command: string) => {
    setMessageInput(command);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  return (
    <div className={`${styles.chatInterface} ${className} ${isExpanded ? styles.expanded : styles.collapsed}`}>
      {/* Chat Header */}
      <div className={styles.chatHeader}>
        <div className={styles.chatTitle}>
          <SvgIcon name="messageSquare" size={16} />
          <span>Multi-Terminal Chat</span>
          {selectedTerminals.size > 0 && (
            <span className={styles.targetCount}>
              → {selectedTerminals.size} terminal{selectedTerminals.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        <div className={styles.chatControls}>
          {/* History Toggle */}
          <button
            className={`${styles.controlButton} ${showHistory ? styles.active : ''}`}
            onClick={() => setShowHistory(!showHistory)}
            title="Toggle message history"
          >
            <SvgIcon name="history" size={14} />
          </button>
          
          {/* Clear History */}
          <button
            className={styles.controlButton}
            onClick={onClearHistory}
            title="Clear message history"
            disabled={messageHistory.length === 0}
          >
            <SvgIcon name="trash2" size={14} />
          </button>
          
          {/* Collapse/Expand */}
          <button
            className={styles.controlButton}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse chat' : 'Expand chat'}
          >
            <SvgIcon name={isExpanded ? 'chevronDown' : 'chevronUp'} size={14} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Compact Terminal Selector */}
          <CompactTerminalSelector
            terminals={terminals}
            selectedTerminals={selectedTerminals}
            onTerminalSelect={onTerminalSelect}
            onSelectAll={onSelectAll}
            onDeselectAll={onDeselectAll}
          />

          {/* Target Terminals Display */}
          <div className={styles.targetTerminals}>
            <div className={styles.targetHeader}>
              <SvgIcon name="target" size={14} />
              <span>Sending to ({selectedTerminals.size}):</span>
            </div>
            
            {selectedTerminals.size === 0 ? (
              <div className={styles.noTargets}>
                <SvgIcon name="alertTriangle" size={16} />
                <span>No terminals selected. Select terminals from the grid above.</span>
              </div>
            ) : (
              <div className={styles.targetList}>
                {selectedTerminalDetails.map(terminal => terminal && (
                  <div key={terminal.id} className={styles.targetTerminal}>
                    {getStatusIcon(terminal.status)}
                    <span className={styles.terminalTitle}>{terminal.title}</span>
                    {terminal.projectId && (
                      <span className={styles.projectBadge}>
                        <SvgIcon name="folder" size={8} />
                        {terminal.projectId}
                      </span>
                    )}
                    <span className={styles.workbranchBadge}>
                      <SvgIcon name="gitBranch" size={8} />
                      {terminal.workbranchId}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message History */}
          {showHistory && messageHistory.length > 0 && (
            <div className={styles.messageHistory} ref={historyRef}>
              <div className={styles.historyHeader}>
                <SvgIcon name="history" size={12} />
                <span>Message History ({messageHistory.length})</span>
              </div>
              
              <div className={styles.historyMessages}>
                {messageHistory.map(message => (
                  <div
                    key={message.id}
                    className={`${styles.historyMessage} ${styles[message.status]}`}
                  >
                    <div className={styles.messageHeader}>
                      <span className={styles.timestamp}>
                        {formatTimestamp(message.timestamp)}
                      </span>
                      <span className={styles.targetCount}>
                        → {message.targets.length} terminals
                      </span>
                      <span className={`${styles.messageStatus} ${styles[message.status]}`}>
                        {message.status === 'sending' && <SvgIcon name="clock" size={10} />}
                        {message.status === 'sent' && <SvgIcon name="check" size={10} />}
                        {message.status === 'error' && <SvgIcon name="x" size={10} />}
                      </span>
                    </div>
                    <div className={styles.messageContent}>
                      <code>{message.content}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Commands */}
          <div className={styles.quickCommands}>
            <div className={styles.commandsHeader}>
              <SvgIcon name="zap" size={12} />
              <span>Quick Commands</span>
            </div>
            <div className={styles.commandsList}>
              {commandSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className={styles.commandButton}
                  onClick={() => insertCommand(suggestion.command)}
                  title={suggestion.description}
                >
                  <code>{suggestion.command}</code>
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className={styles.messageInput}>
            <div className={styles.inputContainer}>
              <textarea
                ref={messageInputRef}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedTerminals.size === 0 
                    ? 'Select terminals above to send commands...'
                    : `Send command to ${selectedTerminals.size} terminal${selectedTerminals.size !== 1 ? 's' : ''}... (Enter to send, Shift+Enter for new line)`
                }
                className={styles.messageTextarea}
                rows={2}
                disabled={selectedTerminals.size === 0}
              />
              
              <div className={styles.inputActions}>
                <button
                  className={styles.sendButton}
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || selectedTerminals.size === 0}
                  title={`Send to ${selectedTerminals.size} terminals`}
                >
                  <SvgIcon name="send" size={16} />
                  <span>Send</span>
                </button>
                
                <button
                  className={styles.clearButton}
                  onClick={() => setMessageInput('')}
                  disabled={!messageInput}
                  title="Clear input"
                >
                  <SvgIcon name="x" size={14} />
                </button>
              </div>
            </div>
            
            <div className={styles.inputHints}>
              <div className={styles.shortcuts}>
                <span><kbd>Enter</kbd> Send</span>
                <span><kbd>Shift+Enter</kbd> New line</span>
                <span><kbd>Esc</kbd> Clear</span>
              </div>
              
              {messageInput.length > 0 && (
                <div className={styles.charCount}>
                  {messageInput.length} characters
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}