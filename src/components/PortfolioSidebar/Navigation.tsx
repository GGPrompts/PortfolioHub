import React from 'react'
import SvgIcon from '../SvgIcon'
import EnvironmentBadge from '../EnvironmentBadge'
import styles from '../PortfolioSidebar.module.css'

interface Project {
  id: string
  title: string
  description: string
  tags: string[]
}

interface NavigationProps {
  // Tab management
  activeTabs: string[]
  toggleTab: (tabId: string) => void
  tabs: {
    [key: string]: {
      width: number
      icon: string
      title: string
    }
  }
  getTabPosition: (tabId: string) => number
  layoutStrategy: 'push' | 'overlay'
}

export default function Navigation({
  activeTabs,
  toggleTab,
  tabs,
  getTabPosition,
  layoutStrategy
}: NavigationProps) {

  return (
    <>
      {/* Environment Badge */}
      <div className={styles.environmentBadgeContainer}>
        <EnvironmentBadge size="small" showDescription={false} />
      </div>
      
      {/* Responsive mode indicator */}
      {layoutStrategy === 'overlay' && activeTabs.length > 0 && (
        <div className={styles.responsiveIndicator} title="Overlay mode - content protected from cutoff">
          📱
        </div>
      )}

      {/* Notebook-style Tabs - Positioned at screen edge */}
      {Object.entries(tabs).map(([tabId, config]) => (
        <div 
          key={tabId}
          className={`${styles.notebookTab} ${activeTabs.includes(tabId) ? styles.active : ''}`}
          title={config.title}
          onClick={() => toggleTab(tabId)}
          style={{
            position: 'fixed',
            left: `${getTabPosition(tabId)}px`,
            top: `${20 + (Object.keys(tabs).indexOf(tabId) * 40)}px`,
            zIndex: activeTabs.includes(tabId) ? 10 : 5,
            transition: 'left 0.3s ease, background 0.3s ease'
          }}
        >
          <div className={styles.tabIcon}>
            <SvgIcon name={config.icon} size={18} color="currentColor" />
          </div>
        </div>
      ))}

    </>
  )
}