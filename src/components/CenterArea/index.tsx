import React, { useCallback, useEffect, useState } from 'react';
import { CenterAreaProps, TerminalInstance, ChatMessage } from './types';
import { useTerminalGrid } from './hooks/useTerminalGrid';
import TerminalGrid from './TerminalGrid';
import ChatInterface from './ChatInterface';
import TerminalSelector from './TerminalSelector';
import SvgIcon from '../SvgIcon';
import styles from './CenterArea.module.css';

export default function CenterArea({
  className = '',
  initialLayout = 'single',
  maxTerminals = 8,
  onTerminalAdd,
  onTerminalRemove,
  onLayoutChange
}: CenterAreaProps) {
  // Use terminal grid management hook
  const {
    terminals,
    selectedTerminals,
    layout,
    chatEnabled,
    messageInput,
    chatHistory,
    gridDimensions,
    selectionPresets,
    showChat,
    addTerminal,
    removeTerminal,
    selectTerminal,
    selectAllTerminals,
    deselectAllTerminals,
    selectByPreset,
    setLayout,
    sendMessage,
    toggleChat,
    gridRef,
    selectedCount,
    totalTerminals,
    canAddTerminal
  } = useTerminalGrid(initialLayout, maxTerminals);

  const [showSelector, setShowSelector] = useState(false);
  const [viewMode, setViewMode] = useState<'terminals' | 'chat' | 'split'>('split');

  // Handle terminal operations
  const handleAddTerminal = useCallback((workbranchId?: string, projectId?: string) => {
    const wbId = workbranchId || `wb-${Date.now()}`;
    addTerminal(wbId, projectId);
    onTerminalAdd?.(terminals[terminals.length - 1]);
  }, [addTerminal, terminals, onTerminalAdd]);

  const handleRemoveTerminal = useCallback((terminalId: string) => {
    removeTerminal(terminalId);
    onTerminalRemove?.(terminalId);
  }, [removeTerminal, onTerminalRemove]);

  const handleLayoutChange = useCallback((newLayout: typeof layout) => {
    setLayout(newLayout);
    onLayoutChange?.(newLayout);
  }, [setLayout, onLayoutChange]);

  // Handle terminal selection
  const handleTerminalSelect = useCallback((terminalId: string, selected: boolean) => {
    selectTerminal(terminalId, selected);
  }, [selectTerminal]);

  // Handle preset selection
  const handleSelectPreset = useCallback((presetId: string) => {
    selectByPreset(presetId);
  }, [selectByPreset]);

  // Handle message sending
  const handleSendMessage = useCallback((content: string, targets: string[]) => {
    console.log('🚀 CenterArea handleSendMessage called:', { content, targets });
    console.log('📊 Available terminals:', terminals.map(t => ({ id: t.id, title: t.title, hasTerminal: !!t.terminal })));
    console.log('📋 Selected terminals:', selectedTerminals);
    sendMessage(content, targets);
  }, [sendMessage, terminals, selectedTerminals]);

  // Clear chat history
  const handleClearHistory = useCallback(() => {
    // This would clear the chat history
    console.log('Clearing chat history');
  }, []);

  // Add sample terminals for development
  useEffect(() => {
    if (terminals.length === 0) {
      // Add some sample terminals
      handleAddTerminal('main', 'portfolio');
      setTimeout(() => handleAddTerminal('feature', 'ggprompts'), 100);
      setTimeout(() => handleAddTerminal('tools'), 200);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'a':
            if (e.target instanceof HTMLElement && 
                (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
              return; // Don't interfere with text selection
            }
            e.preventDefault();
            selectAllTerminals();
            break;
          case 'n':
            e.preventDefault();
            if (canAddTerminal) {
              handleAddTerminal();
            }
            break;
          case '`':
            e.preventDefault();
            toggleChat();
            break;
        }
      }
      
      if (e.key === 'Escape') {
        deselectAllTerminals();
        setShowSelector(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectAllTerminals, deselectAllTerminals, toggleChat, canAddTerminal, handleAddTerminal]);

  return (
    <div className={`${styles.centerArea} ${className}`}>
      {/* Header Controls */}
      <div className={styles.centerHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.areaTitle}>
            <SvgIcon name="terminal" size={20} />
            <span>Terminal Grid + Chat</span>
          </div>
          
          <div className={styles.terminalCount}>
            <span>{totalTerminals} terminals</span>
            {selectedCount > 0 && (
              <span className={styles.selectedCount}>
                ({selectedCount} selected)
              </span>
            )}
          </div>
        </div>

        <div className={styles.headerCenter}>
          {/* View Mode Toggle */}
          <div className={styles.viewModeToggle}>
            <button
              className={`${styles.viewButton} ${viewMode === 'terminals' ? styles.active : ''}`}
              onClick={() => setViewMode('terminals')}
              title="Terminals only"
            >
              <SvgIcon name="terminal" size={14} />
              <span>Terminals</span>
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === 'split' ? styles.active : ''}`}
              onClick={() => setViewMode('split')}
              title="Split view"
            >
              <SvgIcon name="layout" size={14} />
              <span>Split</span>
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === 'chat' ? styles.active : ''}`}
              onClick={() => setViewMode('chat')}
              title="Chat interface only"
            >
              <SvgIcon name="messageSquare" size={14} />
              <span>Chat</span>
            </button>
          </div>
        </div>

        <div className={styles.headerRight}>
          {/* Quick Actions */}
          <button
            className={styles.headerButton}
            onClick={() => setShowSelector(!showSelector)}
            title="Toggle terminal selector"
          >
            <SvgIcon name="checkSquare" size={16} />
            <span>Select</span>
          </button>

          <button
            className={styles.headerButton}
            onClick={() => handleAddTerminal()}
            disabled={!canAddTerminal}
            title={`Add new terminal (${terminals.length}/${maxTerminals})`}
          >
            <SvgIcon name="plus" size={16} />
            <span>Add</span>
          </button>

          <button
            className={styles.headerButton}
            onClick={selectAllTerminals}
            disabled={totalTerminals === 0}
            title="Select all terminals (Ctrl+A)"
          >
            <SvgIcon name="selectAll" size={16} />
            <span>All</span>
          </button>

          <button
            className={styles.headerButton}
            onClick={deselectAllTerminals}
            disabled={selectedCount === 0}
            title="Deselect all terminals (Escape)"
          >
            <SvgIcon name="square" size={16} />
            <span>None</span>
          </button>
        </div>
      </div>

      {/* Terminal Selector Panel */}
      {showSelector && (
        <div className={styles.selectorPanel}>
          <TerminalSelector
            terminals={terminals}
            selectedTerminals={selectedTerminals}
            selectionPresets={selectionPresets}
            onSelectAll={selectAllTerminals}
            onSelectNone={deselectAllTerminals}
            onSelectPreset={handleSelectPreset}
            onToggleTerminal={(terminalId) => {
              const isSelected = selectedTerminals.has(terminalId);
              handleTerminalSelect(terminalId, !isSelected);
            }}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className={styles.mainContent} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Terminal Grid */}
        {(viewMode === 'terminals' || viewMode === 'split') && (
          <div 
            className={styles.terminalSection}
            style={{ 
              flex: viewMode === 'terminals' ? 1 : '1 1 60%',
              minHeight: viewMode === 'split' ? '400px' : 'auto'
            }}
          >
            <div ref={gridRef} style={{ width: '100%', height: '100%' }}>
              <TerminalGrid
                terminals={terminals}
                layout={layout}
                selectedTerminals={selectedTerminals}
                onTerminalSelect={handleTerminalSelect}
                onTerminalClose={handleRemoveTerminal}
                onLayoutChange={handleLayoutChange}
              />
            </div>
          </div>
        )}

        {/* Chat Interface */}
        {(viewMode === 'chat' || viewMode === 'split') && chatEnabled && (
          <div 
            className={styles.chatSection}
            style={{ 
              flex: viewMode === 'chat' ? 1 : '0 0 auto',
              minHeight: viewMode === 'split' ? '200px' : 'auto'
            }}
          >
            <ChatInterface
              selectedTerminals={selectedTerminals}
              terminals={terminals}
              messageHistory={chatHistory}
              onSendMessage={handleSendMessage}
              onClearHistory={handleClearHistory}
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.terminalStatus}>
            {terminals.filter(t => t.status === 'running').length} running, {' '}
            {terminals.filter(t => t.status === 'idle').length} idle, {' '}
            {terminals.filter(t => t.status === 'error').length} error
          </span>
        </div>
        
        <div className={styles.statusCenter}>
          <span className={styles.layoutInfo}>
            Layout: {layout} ({totalTerminals} terminals)
          </span>
        </div>
        
        <div className={styles.statusRight}>
          <div className={styles.shortcuts}>
            <span><kbd>Ctrl+A</kbd> Select All</span>
            <span><kbd>Ctrl+N</kbd> New Terminal</span>
            <span><kbd>Ctrl+`</kbd> Toggle Chat</span>
            <span><kbd>Esc</kbd> Deselect</span>
          </div>
        </div>
      </div>
    </div>
  );
}