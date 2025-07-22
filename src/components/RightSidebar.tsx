import React, { useState, useRef, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/web';
import SvgIcon from './SvgIcon';
import { VSCodeManager } from './VSCodeManager';
import QuickCommandsPanel from './QuickCommandsPanel';
import styles from './RightSidebar.module.css';

interface RightSidebarProps {
  className?: string;
  onWidthChange?: (width: number) => void;
}

interface Tab {
  id: string;
  label: string;
  icon: string;
  width: number;
}

const tabs: Record<string, Tab> = {
  commands: { id: 'commands', label: 'Quick Commands', icon: 'terminal', width: 800 },
  vscode: { id: 'vscode', label: 'VS Code Terminals', icon: 'code', width: 800 },
  preview: { id: 'preview', label: 'Live Preview', icon: 'monitor', width: 800 }
};

export const RightSidebar: React.FC<RightSidebarProps> = ({ className = '', onWidthChange }) => {
  const [activeTabs, setActiveTabs] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(800);
  const [isDragging, setIsDragging] = useState(false);
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number>(0);
  const startWidth = useRef<number>(800);

  // Calculate total width of active tabs
  const totalWidth = activeTabs.reduce((sum, tabId) => {
    const tab = tabs[tabId as keyof typeof tabs];
    return sum + (tab ? tab.width : 0);
  }, 0);

  // Spring animation for sidebar
  const sidebarSpring = useSpring({
    width: activeTabs.length > 0 ? sidebarWidth : 0,
    config: { tension: 300, friction: 30 }
  });

  // Toggle tab functionality - only one panel active at a time
  const toggleTab = (tabId: string) => {
    setActiveTabs(prev => {
      if (prev.includes(tabId)) {
        // Remove tab if already active
        return [];
      } else {
        // Replace current tab with new one (only one active at a time)
        return [tabId];
      }
    });
  };

  // Get tab position (from right edge)
  const getTabPosition = (tabId: string) => {
    if (!activeTabs.includes(tabId)) return 0;
    
    const fixedOrder = ['commands', 'vscode', 'preview']; // Order of tabs from top to bottom
    const tabIndex = fixedOrder.indexOf(tabId);
    return tabIndex * 50; // 50px spacing between tabs
  };

  // Drag functionality - Fixed event handling order
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const deltaX = dragStartX.current - e.clientX; // Reversed for right sidebar
    const newWidth = Math.max(300, Math.min(1200, startWidth.current + deltaX));
    setSidebarWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    startWidth.current = sidebarWidth;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth, handleMouseMove, handleMouseUp]);

  // Notify parent of width changes
  React.useEffect(() => {
    const currentWidth = activeTabs.length > 0 ? sidebarWidth : 0;
    onWidthChange?.(currentWidth);
  }, [activeTabs, sidebarWidth, onWidthChange]);

  // Cleanup event listeners
  React.useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className={`${styles.rightSidebarContainer} ${className}`}>
      {/* Tabs positioned on the right edge */}
      {Object.values(tabs).map((tab, index) => {
        const isActive = activeTabs.includes(tab.id);

        return (
          <div
            key={tab.id}
            className={`${styles.tab} ${isActive ? styles.activeTab : ''}`}
            style={{
              right: isActive ? `${sidebarWidth}px` : '0px',
              top: `${20 + (index * 50)}px`, // Vertical spacing: 20px base + 50px per tab
            }}
            onClick={() => toggleTab(tab.id)}
            title={tab.label} // Keep hover text
          >
            <SvgIcon name={tab.icon} className={styles.tabIcon} />
          </div>
        );
      })}

      {/* Animated sidebar panel */}
      <animated.div
        ref={sidebarRef}
        className={styles.sidebar}
        style={sidebarSpring}
      >
        {/* Drag handle */}
        <div
          className={`${styles.dragHandle} ${isDragging ? styles.dragging : ''}`}
          onMouseDown={handleMouseDown}
        >
          <div className={styles.dragIndicator}></div>
        </div>

        {/* Sidebar content */}
        <div className={styles.sidebarContent}>
          {activeTabs.includes('commands') && (
            <div className={styles.commandsPanel}>
              <QuickCommandsPanel />
            </div>
          )}
          
          {activeTabs.includes('vscode') && (
            <div className={styles.vscodePanel}>
              <div className={styles.panelHeader}>
                <SvgIcon name="code" className={styles.headerIcon} />
                <h3>VS Code Terminals</h3>
              </div>
              <VSCodeManager />
            </div>
          )}

          {activeTabs.includes('preview') && (
            <div className={styles.previewPanel}>
              <div className={styles.panelHeader}>
                <SvgIcon name="monitor" className={styles.headerIcon} />
                <h3>Live Preview</h3>
              </div>
              <div className={styles.previewContent}>
                <div className={styles.previewPlaceholder}>
                  <SvgIcon name="monitor" size={48} />
                  <h4>Live Preview Panel</h4>
                  <p>Project previews will be embedded here when you click "Start Server" in the main portfolio view.</p>
                  <p>This replaces the need for separate browser tabs!</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </animated.div>

      {/* Overlay when dragging */}
      {isDragging && <div className={styles.dragOverlay} />}
    </div>
  );
};