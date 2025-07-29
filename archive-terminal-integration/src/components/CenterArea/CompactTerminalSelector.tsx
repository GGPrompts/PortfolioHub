import React from 'react';
import SvgIcon from '../SvgIcon';
import styles from './CompactTerminalSelector.module.css';

interface CompactTerminalSelectorProps {
  terminals: any[];
  selectedTerminals: Set<string>;
  onTerminalSelect: (terminalId: string, selected: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function CompactTerminalSelector({
  terminals,
  selectedTerminals,
  onTerminalSelect,
  onSelectAll,
  onDeselectAll
}: CompactTerminalSelectorProps) {
  const selectedCount = selectedTerminals.size;
  const allSelected = selectedCount === terminals.length && terminals.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < terminals.length;

  return (
    <div className={styles.compactSelector}>
      <div className={styles.selectorHeader}>
        <div className={styles.headerLeft}>
          <SvgIcon name="terminal" size={16} />
          <span className={styles.title}>Terminal Targets</span>
          <span className={styles.count}>
            {selectedCount}/{terminals.length} selected
          </span>
        </div>
        
        <div className={styles.headerActions}>
          <button
            className={styles.actionBtn}
            onClick={allSelected ? onDeselectAll : onSelectAll}
            title={allSelected ? 'Deselect all' : 'Select all'}
          >
            <SvgIcon 
              name={allSelected ? "square" : "checkSquare"} 
              size={14} 
            />
            <span>{allSelected ? 'None' : 'All'}</span>
          </button>
        </div>
      </div>

      <div className={styles.terminalList}>
        {terminals.map(terminal => {
          const isSelected = selectedTerminals.has(terminal.id);
          
          return (
            <div
              key={terminal.id}
              className={`${styles.terminalItem} ${isSelected ? styles.selected : ''}`}
              onClick={() => onTerminalSelect(terminal.id, !isSelected)}
            >
              <div className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onTerminalSelect(terminal.id, !isSelected)}
                  className={styles.checkboxInput}
                />
                <div className={styles.checkboxCustom}>
                  {isSelected && <SvgIcon name="check" size={10} />}
                </div>
              </div>
              
              <div className={styles.terminalInfo}>
                <div className={styles.terminalTitle}>
                  {terminal.title || `Terminal ${terminal.id.slice(-8)}`}
                </div>
                <div className={styles.terminalMeta}>
                  <span className={styles.workbranch}>
                    🌿 {terminal.workbranchId}
                  </span>
                  {terminal.projectId && (
                    <span className={styles.project}>
                      📁 {terminal.projectId}
                    </span>
                  )}
                  <span className={styles.status}>
                    ● running
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {terminals.length === 0 && (
        <div className={styles.emptyState}>
          <SvgIcon name="terminal" size={24} />
          <span>No terminals available</span>
          <button className={styles.addButton}>
            <SvgIcon name="plus" size={12} />
            Add Terminal
          </button>
        </div>
      )}
    </div>
  );
}