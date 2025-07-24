import React from 'react';
import { TerminalSelectorProps } from './types';
import SvgIcon from '../SvgIcon';
import styles from './CenterArea.module.css';

export default function TerminalSelector({
  terminals,
  selectedTerminals,
  selectionPresets,
  onSelectAll,
  onSelectNone,
  onSelectPreset,
  onToggleTerminal,
  className = ''
}: TerminalSelectorProps) {
  const selectedCount = selectedTerminals.size;
  const totalTerminals = terminals.length;

  // Get preset statistics
  const getPresetStats = (presetId: string) => {
    const preset = selectionPresets.find(p => p.id === presetId);
    if (!preset) return { count: 0, selected: 0 };
    
    const matchingTerminals = terminals.filter(preset.terminalFilter);
    const selectedMatching = matchingTerminals.filter(t => selectedTerminals.has(t.id));
    
    return {
      count: matchingTerminals.length,
      selected: selectedMatching.length
    };
  };

  const handleKeyboardShortcut = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          onSelectAll();
          break;
        case 'escape':
          e.preventDefault();
          onSelectNone();
          break;
      }
    }
  };

  return (
    <div 
      className={`${styles.terminalSelector} ${className}`}
      onKeyDown={handleKeyboardShortcut}
      tabIndex={0}
    >
      {/* Selection Header */}
      <div className={styles.selectorHeader}>
        <div className={styles.selectionStatus}>
          <SvgIcon name="monitor" size={16} />
          <span className={styles.selectionCount}>
            {selectedCount} of {totalTerminals} terminals selected
          </span>
        </div>
        
        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <button
            className={`${styles.quickActionBtn} ${selectedCount === totalTerminals ? styles.active : ''}`}
            onClick={onSelectAll}
            title="Select all terminals (Ctrl+A)"
            disabled={totalTerminals === 0}
          >
            <SvgIcon name="checkSquare" size={14} />
            <span>All</span>
          </button>
          
          <button
            className={`${styles.quickActionBtn} ${selectedCount === 0 ? styles.active : ''}`}
            onClick={onSelectNone}
            title="Deselect all terminals (Escape)"
            disabled={selectedCount === 0}
          >
            <SvgIcon name="square" size={14} />
            <span>None</span>
          </button>
        </div>
      </div>

      {/* Selection Presets */}
      <div className={styles.selectionPresets}>
        <div className={styles.presetsHeader}>
          <SvgIcon name="filter" size={14} />
          <span>Quick Selection</span>
        </div>
        
        <div className={styles.presetButtons}>
          {selectionPresets.map(preset => {
            const stats = getPresetStats(preset.id);
            const isFullySelected = stats.count > 0 && stats.selected === stats.count;
            const isPartiallySelected = stats.selected > 0 && stats.selected < stats.count;
            
            return (
              <button
                key={preset.id}
                className={`${styles.presetButton} ${
                  isFullySelected ? styles.fullySelected : 
                  isPartiallySelected ? styles.partiallySelected : ''
                }`}
                onClick={() => onSelectPreset(preset.id)}
                title={`${preset.description} (${stats.selected}/${stats.count})`}
                disabled={stats.count === 0}
              >
                <SvgIcon name={preset.icon as any} size={14} />
                <span className={styles.presetName}>{preset.name}</span>
                <span className={styles.presetCount}>
                  {stats.selected}/{stats.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Individual Terminal Selection */}
      {totalTerminals > 0 && (
        <div className={styles.individualSelection}>
          <div className={styles.individualHeader}>
            <SvgIcon name="list" size={14} />
            <span>Individual Terminals</span>
          </div>
          
          <div className={styles.terminalList}>
            {terminals.map(terminal => (
              <div
                key={terminal.id}
                className={`${styles.terminalItem} ${
                  selectedTerminals.has(terminal.id) ? styles.selected : ''
                }`}
                onClick={() => onToggleTerminal(terminal.id)}
              >
                <label className={styles.terminalCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedTerminals.has(terminal.id)}
                    onChange={() => onToggleTerminal(terminal.id)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxCustom}>
                    {selectedTerminals.has(terminal.id) && (
                      <SvgIcon name="check" size={10} />
                    )}
                  </span>
                </label>
                
                <div className={styles.terminalInfo}>
                  <div className={styles.terminalTitle}>
                    {terminal.title}
                  </div>
                  <div className={styles.terminalMeta}>
                    {terminal.projectId && (
                      <span className={styles.projectTag}>
                        <SvgIcon name="folder" size={10} />
                        {terminal.projectId}
                      </span>
                    )}
                    <span className={styles.workbranchTag}>
                      <SvgIcon name="gitBranch" size={10} />
                      {terminal.workbranchId}
                    </span>
                    <span className={`${styles.statusTag} ${styles[`status${terminal.status.charAt(0).toUpperCase() + terminal.status.slice(1)}`]}`}>
                      {terminal.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className={styles.shortcutsHelp}>
        <div className={styles.shortcutsHeader}>
          <SvgIcon name="keyboard" size={12} />
          <span>Shortcuts</span>
        </div>
        <div className={styles.shortcutsList}>
          <div className={styles.shortcut}>
            <kbd>Ctrl+A</kbd>
            <span>Select all</span>
          </div>
          <div className={styles.shortcut}>
            <kbd>Esc</kbd>
            <span>Select none</span>
          </div>
          <div className={styles.shortcut}>
            <kbd>Space</kbd>
            <span>Toggle selection</span>
          </div>
        </div>
      </div>

      {/* Selection Actions */}
      {selectedCount > 0 && (
        <div className={styles.selectionActions}>
          <div className={styles.actionsHeader}>
            <SvgIcon name="zap" size={14} />
            <span>Actions for {selectedCount} terminals</span>
          </div>
          
          <div className={styles.actionButtons}>
            <button
              className={styles.actionButton}
              onClick={() => {
                // Close all selected terminals
                Array.from(selectedTerminals).forEach(terminalId => {
                  // This would be handled by parent component
                  console.log(`Closing terminal ${terminalId}`);
                });
              }}
              title="Close selected terminals"
            >
              <SvgIcon name="x" size={12} />
              <span>Close</span>
            </button>
            
            <button
              className={styles.actionButton}
              onClick={() => {
                // Clear all selected terminals
                Array.from(selectedTerminals).forEach(terminalId => {
                  const terminal = terminals.find(t => t.id === terminalId);
                  if (terminal) {
                    terminal.terminal.clear();
                  }
                });
              }}
              title="Clear selected terminals"
            >
              <SvgIcon name="trash2" size={12} />
              <span>Clear</span>
            </button>
            
            <button
              className={styles.actionButton}
              onClick={() => {
                // Restart selected terminals
                Array.from(selectedTerminals).forEach(terminalId => {
                  // This would reconnect terminals
                  console.log(`Restarting terminal ${terminalId}`);
                });
              }}
              title="Restart selected terminals"
            >
              <SvgIcon name="refreshCw" size={12} />
              <span>Restart</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}