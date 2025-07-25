import React, { useEffect, useMemo } from 'react';
import { TerminalGridProps, GridPosition } from './types';
import { useXtermIntegration } from './hooks/useXtermIntegration';
import TerminalHeader from './TerminalHeader';
import SvgIcon from '../SvgIcon';
import SimpleTerminal from './SimpleTerminal';
import styles from './CenterArea.module.css';

// Function to create dynamic layout based on terminal count
function createDynamicLayout(terminalCount: number) {
  if (terminalCount <= 0) {
    return { rows: 1, cols: 1, positions: [], description: 'No terminals' };
  }
  
  // Calculate optimal grid size
  const cols = Math.ceil(Math.sqrt(terminalCount));
  const rows = Math.ceil(terminalCount / cols);
  
  // Generate positions for all terminals
  const positions = [];
  for (let i = 0; i < terminalCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    positions.push({ row, col, rowSpan: 1, colSpan: 1 });
  }
  
  return {
    rows,
    cols,
    positions,
    description: `Dynamic ${cols}x${rows} grid for ${terminalCount} terminals`
  };
}

// Layout configurations mapping
const LAYOUT_CONFIGS = {
  single: { 
    rows: 1, 
    cols: 1, 
    positions: [{ row: 0, col: 0, rowSpan: 1, colSpan: 1 }],
    description: 'Single full-width terminal'
  },
  split: { 
    rows: 1, 
    cols: 2, 
    positions: [
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 1, rowSpan: 1, colSpan: 1 }
    ],
    description: 'Two side-by-side terminals'
  },
  triple: { 
    rows: 2, 
    cols: 2, 
    positions: [
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 0, rowSpan: 1, colSpan: 2 }
    ],
    description: 'Two top terminals, one bottom'
  },
  quad: { 
    rows: 2, 
    cols: 2, 
    positions: [
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 1, rowSpan: 1, colSpan: 1 }
    ],
    description: '2×2 grid of terminals'
  },
  vertical: { 
    rows: 1, 
    cols: 4, 
    positions: [
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 2, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 3, rowSpan: 1, colSpan: 1 }
    ],
    description: 'Four vertical columns'
  },
  custom: { 
    rows: 3, 
    cols: 3, 
    positions: [
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 2, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 2, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
      { row: 2, col: 2, rowSpan: 1, colSpan: 1 }
    ],
    description: 'Custom 3x3 grid layout'
  }
};

// Individual Terminal Component
function TerminalCell({ 
  terminal, 
  position, 
  dimensions,
  selected,
  onSelect,
  onClose,
  onRename
}: {
  terminal: any;
  position: GridPosition;
  dimensions: any;
  selected: boolean;
  onSelect: (terminalId: string, selected: boolean) => void;
  onClose: (terminalId: string) => void;
  onRename: (terminalId: string, newTitle: string) => void;
}) {
  // Calculate terminal dimensions based on grid position
  const terminalDimensions = useMemo(() => {
    // Provide safe defaults if dimensions is undefined
    const safeWidth = dimensions?.width || 800;
    const safeHeight = dimensions?.height || 600;
    const safeLayout = dimensions?.layout || 'single';
    
    const layoutConfig = LAYOUT_CONFIGS[safeLayout];
    const cellWidth = Math.floor(safeWidth / (layoutConfig?.cols || 1));
    const cellHeight = Math.floor(safeHeight / (layoutConfig?.rows || 1));
    
    return {
      width: cellWidth * position.colSpan,
      height: cellHeight * position.rowSpan - 40, // Account for header height
      rows: Math.max(Math.floor((cellHeight * position.rowSpan - 40) / 14), 10),
      cols: Math.max(Math.floor((cellWidth * position.colSpan) / 7), 40)
    };
  }, [dimensions, position]);

  // Use xterm integration hook
  const {
    terminalRef,
    isInitialized,
    connectionStatus,
    sendCommand,
    isConnected
  } = useXtermIntegration(terminal, terminalDimensions);

  const gridStyle = {
    gridRow: `${position.row + 1} / span ${position.rowSpan}`,
    gridColumn: `${position.col + 1} / span ${position.colSpan}`,
    minHeight: '200px'
  };

  return (
    <div 
      className={`${styles.terminalCell} ${selected ? styles.selected : ''}`}
      style={gridStyle}
    >
      {/* Use SimpleTerminal instead of complex xterm.js for now */}
      <SimpleTerminal
        terminalId={terminal.id}
        title={terminal.title || `Terminal ${terminal.id.slice(-8)}`}
        workbranchId={terminal.workbranchId}
        projectId={terminal.projectId}
        onCommand={(command) => {
          console.log(`Command from ${terminal.id}:`, command);
          // Send command to VS Code via Environment Bridge
          sendCommand(command);
        }}
        onClose={(terminalId) => {
          console.log(`Closing terminal: ${terminalId}`);
          onTerminalClose(terminalId);
        }}
      />
    </div>
  );
}

export default function TerminalGrid({
  terminals,
  layout,
  selectedTerminals,
  onTerminalSelect,
  onTerminalClose,
  onLayoutChange,
  dimensions,
  className = ''
}: TerminalGridProps) {
  // Create dynamic layout for custom mode based on terminal count
  const layoutConfig = layout === 'custom' 
    ? createDynamicLayout(terminals.length)
    : LAYOUT_CONFIGS[layout];
  
  // Calculate grid dimensions
  const gridDimensions = useMemo(() => {
    // Use passed dimensions or fall back to defaults
    return {
      width: dimensions?.width || 1200,
      height: dimensions?.height || 800,
      layout
    };
  }, [dimensions, layout]);

  // Handle layout change
  const handleLayoutChange = (newLayout: typeof layout) => {
    onLayoutChange(newLayout);
  };

  // Handle terminal rename
  const handleTerminalRename = (terminalId: string, newTitle: string) => {
    const terminal = terminals.find(t => t.id === terminalId);
    if (terminal) {
      terminal.title = newTitle;
      // Update the terminal title in the actual xterm instance
      if (terminal.terminal) {
        terminal.terminal.setOption('title', newTitle);
      }
    }
  };

  // Create grid style
  const gridStyle = {
    display: 'grid',
    gridTemplateRows: `repeat(${layoutConfig.rows}, 1fr)`,
    gridTemplateColumns: `repeat(${layoutConfig.cols}, 1fr)`,
    gap: '8px',
    width: '100%',
    height: '100%',
    minHeight: '400px'
  };

  return (
    <div className={`${styles.terminalGrid} ${className}`}>
      {/* Layout Controls */}
      <div className={styles.layoutControls}>
        <div className={styles.layoutInfo}>
          <SvgIcon name="grid" size={16} />
          <span className={styles.layoutTitle}>Terminal Grid</span>
          <span className={styles.layoutDescription}>
            {layoutConfig.description}
          </span>
        </div>
        
        <div className={styles.layoutButtons}>
          {Object.entries(LAYOUT_CONFIGS).map(([layoutKey, config]) => (
            <button
              key={layoutKey}
              className={`${styles.layoutButton} ${layout === layoutKey ? styles.active : ''}`}
              onClick={() => handleLayoutChange(layoutKey as any)}
              title={config.description}
              disabled={terminals.length === 0}
            >
              <LayoutIcon layout={layoutKey as any} />
              <span className={styles.layoutName}>
                {layoutKey.charAt(0).toUpperCase() + layoutKey.slice(1)}
              </span>
            </button>
          ))}
        </div>
        
        <div className={styles.gridActions}>
          <button
            className={styles.actionButton}
            onClick={() => {
              // Add new terminal
              console.log('Adding new terminal');
            }}
            title="Add new terminal"
          >
            <SvgIcon name="plus" size={14} />
            <span>Add Terminal</span>
          </button>
          
          <button
            className={styles.actionButton}
            onClick={() => {
              // Smart auto-tile based on terminal count
              if (terminals.length === 1) {
                handleLayoutChange('single');
              } else if (terminals.length === 2) {
                handleLayoutChange('split');
              } else if (terminals.length === 3) {
                handleLayoutChange('triple');
              } else if (terminals.length === 4) {
                handleLayoutChange('quad');
              } else {
                handleLayoutChange('custom');
              }
            }}
            title="Auto-arrange terminals based on count"
            disabled={terminals.length === 0}
          >
            <SvgIcon name="layout" size={14} />
            <span>Auto-Tile</span>
          </button>
        </div>
      </div>

      {/* Terminal Grid */}
      <div className={styles.gridContainer} style={gridStyle}>
        {terminals.slice(0, layoutConfig.positions.length).map((terminal, index) => {
          const position = layoutConfig.positions[index];
          if (!position) return null;
          
          return (
            <TerminalCell
              key={terminal.id}
              terminal={terminal}
              position={position}
              dimensions={gridDimensions}
              selected={selectedTerminals.has(terminal.id)}
              onSelect={onTerminalSelect}
              onClose={onTerminalClose}
              onRename={handleTerminalRename}
            />
          );
        })}
        
        {/* Empty slots for additional terminals */}
        {layoutConfig.positions.slice(terminals.length).map((position, index) => (
          <div
            key={`empty-${index}`}
            className={styles.emptyTerminalSlot}
            style={{
              gridRow: `${position.row + 1} / span ${position.rowSpan}`,
              gridColumn: `${position.col + 1} / span ${position.colSpan}`
            }}
            onClick={() => {
              // Add terminal to this slot
              console.log('Adding terminal to slot', index + terminals.length);
            }}
          >
            <div className={styles.emptySlotContent}>
              <SvgIcon name="plus" size={24} />
              <span>Add Terminal</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Terminal Overflow Indicator */}
      {terminals.length > layoutConfig.positions.length && (
        <div className={styles.overflowIndicator}>
          <SvgIcon name="moreHorizontal" size={16} />
          <span>
            {terminals.length - layoutConfig.positions.length} more terminals hidden
          </span>
          <button
            className={styles.showAllButton}
            onClick={() => handleLayoutChange('custom')}
          >
            Show All
          </button>
        </div>
      )}
    </div>
  );
}

// Layout icon component
function LayoutIcon({ layout }: { layout: string }) {
  switch (layout) {
    case 'single':
      return <SvgIcon name="square" size={12} />;
    case 'split':
      return <SvgIcon name="columns" size={12} />;
    case 'triple':
      return <SvgIcon name="grid" size={12} />;
    case 'quad':
      return <SvgIcon name="grid" size={12} />;
    case 'vertical':
      return <SvgIcon name="menu" size={12} />;
    case 'custom':
      return <SvgIcon name="layout" size={12} />;
    default:
      return <SvgIcon name="square" size={12} />;
  }
}