import React from 'react'
import { useSpring, animated } from '@react-spring/web'
import { usePortfolioStore } from '../store/portfolioStore'
import styles from './PortfolioSidebar.module.css'

export default function PortfolioSidebar() {
  const { 
    sidebarState, 
    setSidebarState, 
    selectedProject,
    projects,
    activeFilter,
    setActiveFilter
  } = usePortfolioStore()
  
  // Define widths for each state
  const widths = {
    collapsed: 48,    // Icon bar only
    normal: 256,      // Sidebar width
    expanded: 816     // Wide view
  }
  
  // Spring animation for smooth transitions
  const springProps = useSpring({
    width: widths[sidebarState],
    config: {
      tension: 260,
      friction: 24,
    }
  })
  
  // Get unique tags for filtering
  const allTags = Array.from(new Set(projects.flatMap(p => p.tags)))
  
  return (
    <animated.div 
      className={styles.sidebar}
      style={{ width: springProps.width }}
    >
      {/* Toggle Buttons */}
      <div className={styles.toggleButtons}>
        {(sidebarState === 'normal' || sidebarState === 'expanded') && (
          <button 
            className={`${styles.toggleButton} ${styles.collapseButton}`}
            onClick={() => setSidebarState('collapsed')}
            title="Collapse to icons"
          >
            ◀
          </button>
        )}
        {sidebarState === 'collapsed' && (
          <button 
            className={styles.toggleButton}
            onClick={() => setSidebarState('normal')}
            title="Expand sidebar"
          >
            ▶
          </button>
        )}
        {sidebarState === 'normal' && (
          <button 
            className={`${styles.toggleButton} ${styles.expandButton}`}
            onClick={() => setSidebarState('expanded')}
            title="Expand to wide view"
          >
            ▶▶
          </button>
        )}
        {sidebarState === 'expanded' && (
          <button 
            className={`${styles.toggleButton} ${styles.shrinkButton}`}
            onClick={() => setSidebarState('normal')}
            title="Shrink to sidebar"
          >
            ◀◀
          </button>
        )}
      </div>
      
      {/* Collapsed State - Icon Bar */}
      {sidebarState === 'collapsed' && (
        <div className={styles.iconBar}>
          <div className={styles.icon} title="Projects">📁</div>
          <div className={styles.icon} title="Filter">🔍</div>
          <div className={styles.icon} title="Info">ℹ️</div>
        </div>
      )}
      
      {/* Normal State - Project Info Sidebar */}
      {sidebarState === 'normal' && (
        <div className={styles.normalContent}>
          <h3 className={styles.title}>Project Portfolio</h3>
          
          {/* Quick Actions */}
          <div className={styles.quickActions}>
            <button 
              className={styles.startAllBtn}
              onClick={() => {
                const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio && .\\scripts\\start-all-improved.ps1'
                navigator.clipboard.writeText(command).then(() => {
                  alert(
                    '✅ Command copied to clipboard!\n\n' +
                    'To start all projects:\n' +
                    '1. Open PowerShell (Win+X, then A)\n' +
                    '2. Paste the command (Ctrl+V)\n' +
                    '3. Press Enter\n\n' +
                    'Features:\n' +
                    '• No auto-opening browsers\n' +
                    '• Smart port detection\n' +
                    '• Proper port assignments\n' +
                    '• All projects in separate terminals'
                  )
                }).catch(() => {
                  alert(
                    'To start all projects, run this in PowerShell:\n\n' +
                    command + '\n\n' +
                    'This will launch all projects without auto-opening browsers!'
                  )
                })
              }}
              title="Copy improved command to start all projects"
            >
              🚀 Start All Projects
            </button>
          </div>
          
          {/* Filter Section */}
          <div className={styles.section}>
            <h4>Filter Projects</h4>
            <div className={styles.filterTags}>
              <button
                className={`${styles.filterTag} ${activeFilter === 'all' ? styles.active : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All ({projects.length})
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`${styles.filterTag} ${activeFilter === tag ? styles.active : ''}`}
                  onClick={() => setActiveFilter(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          
          {/* Selected Project Info */}
          <div className={styles.section}>
            <h4>Selected Project</h4>
            <div className={styles.projectInfo}>
              {selectedProject ? (
                <>
                  <p className={styles.projectName}>{selectedProject.title}</p>
                  <p className={styles.projectDesc}>{selectedProject.description}</p>
                  <div className={styles.projectTech}>
                    {selectedProject.tech.map(tech => (
                      <span key={tech} className={styles.techBadge}>{tech}</span>
                    ))}
                  </div>
                  <div className={styles.projectActions}>
                    {selectedProject.repository && (
                      <a href={selectedProject.repository} target="_blank" rel="noopener noreferrer" 
                         className={styles.actionLink}>
                        View Repository
                      </a>
                    )}
                    {selectedProject.demoUrl && (
                      <a href={selectedProject.demoUrl} target="_blank" rel="noopener noreferrer"
                         className={styles.actionLink}>
                        Live Demo
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className={styles.noSelection}>Click a project to view details</p>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className={styles.section}>
            <h4>Portfolio Stats</h4>
            <div className={styles.stats}>
              <p>Total Projects: {projects.length}</p>
              <p>Active: {projects.filter(p => p.status === 'active').length}</p>
              <p>Technologies: {Array.from(new Set(projects.flatMap(p => p.tech))).length}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Expanded State - Detailed View */}
      {sidebarState === 'expanded' && (
        <div className={styles.expandedContent}>
          <div className={styles.expandedHeader}>
            <h3>Project Details - {selectedProject?.title || 'Select a Project'}</h3>
          </div>
          
          {selectedProject ? (
            <div className={styles.expandedBody}>
              <div className={styles.detailsGrid}>
                <div className={styles.detailSection}>
                  <h4>Overview</h4>
                  <p>{selectedProject.description}</p>
                  <div className={styles.metaInfo}>
                    <span>Type: {selectedProject.displayType}</span>
                    <span>Status: {selectedProject.status}</span>
                  </div>
                </div>
                
                <div className={styles.detailSection}>
                  <h4>Technologies</h4>
                  <div className={styles.techGrid}>
                    {selectedProject.tech.map(tech => (
                      <div key={tech} className={styles.techCard}>
                        {tech}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className={styles.detailSection}>
                  <h4>Quick Actions</h4>
                  <div className={styles.quickActions}>
                    <button className={styles.actionButton}>
                      Open Project
                    </button>
                    {selectedProject.repository && (
                      <button className={styles.actionButton}>
                        View Source
                      </button>
                    )}
                    {selectedProject.buildCommand && (
                      <button className={styles.actionButton}>
                        Run Build
                      </button>
                    )}
                  </div>
                </div>
                
                {selectedProject.displayType === 'external' && selectedProject.localPort && (
                  <div className={styles.detailSection}>
                    <h4>Development</h4>
                    <p className={styles.codeSnippet}>
                      Local URL: http://localhost:{selectedProject.localPort}
                    </p>
                    <p className={styles.codeSnippet}>
                      Build: {selectedProject.buildCommand}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>Select a project from the gallery to view its details</p>
            </div>
          )}
        </div>
      )}
    </animated.div>
  )
}