import React, { useState } from 'react'
import { executeCommand, isVSCodeEnvironment } from '../utils/vsCodeIntegration'
import styles from './ServerToolbar.module.css'

interface ServerToolbarProps {
  globalViewMode?: 'mobile' | 'desktop'
}

const ServerToolbar: React.FC<ServerToolbarProps> = ({ globalViewMode = 'mobile' }) => {
  const [isStartingServers, setIsStartingServers] = useState(false)
  const [isStartingPortfolio, setIsStartingPortfolio] = useState(false)
  const [isStartingVSCode, setIsStartingVSCode] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const handleStartAllServers = async () => {
    setIsStartingServers(true)
    setStatusMessage('Starting all servers...')
    
    try {
      if (isVSCodeEnvironment()) {
        // Use VS Code batch start command instead of shell command
        (window as any).vsCodePortfolio.postMessage({
          type: 'command:execute',
          command: 'claude-portfolio.batchStartProjects',
          args: [] // Will start all projects
        });
        setStatusMessage('All servers starting - check terminals for progress')
        setTimeout(() => setStatusMessage(''), 3000)
      } else {
        // Use executeCommand for non-VS Code environment (legitimate shell command)
        await executeCommand('npm run dev')
        setStatusMessage('Portfolio dev server started!')
        setTimeout(() => setStatusMessage(''), 3000)
      }
    } catch (error) {
      console.error('Failed to start servers:', error)
      setStatusMessage('Failed to start servers - check console for details')
      setTimeout(() => setStatusMessage(''), 5000)
    } finally {
      setIsStartingServers(false)
    }
  }

  const handleStartPortfolio = async () => {
    setIsStartingPortfolio(true)
    setStatusMessage('Starting portfolio dev server...')
    
    try {
      if (isVSCodeEnvironment()) {
        // Start the portfolio project specifically  
        (window as any).vsCodePortfolio.postMessage({
          type: 'project:start',
          projectId: 'claude-portfolio-self' // Portfolio project ID
        });
        setStatusMessage('Portfolio server starting - check terminal for URL')
        setTimeout(() => setStatusMessage(''), 3000)
      } else {
        await executeCommand('npm run dev')
        setStatusMessage('Portfolio dev server started!')
        setTimeout(() => setStatusMessage(''), 3000)
      }
    } catch (error) {
      console.error('Failed to start portfolio server:', error)
      setStatusMessage('Failed to start portfolio server')
      setTimeout(() => setStatusMessage(''), 5000)
    } finally {
      setIsStartingPortfolio(false)
    }
  }

  const handleStartVSCodeServer = async () => {
    setIsStartingVSCode(true)
    setStatusMessage('Starting VS Code server...')
    
    try {
      if (isVSCodeEnvironment()) {
        // Open the portfolio in VS Code Live Preview
        (window as any).vsCodePortfolio.postMessage({
          type: 'livePreview:open',
          url: 'http://localhost:5173',
          title: 'Portfolio Live Preview'
        });
        setStatusMessage('VS Code server started - Simple Browser will open')
        setTimeout(() => setStatusMessage(''), 3000)
      } else {
        setStatusMessage('VS Code server requires VS Code environment')
        setTimeout(() => setStatusMessage(''), 3000)
      }
    } catch (error) {
      console.error('Failed to start VS Code server:', error)
      setStatusMessage('Failed to start VS Code server')
      setTimeout(() => setStatusMessage(''), 5000)
    } finally {
      setIsStartingVSCode(false)
    }
  }

  return (
    <div className={`${styles.toolbar} ${globalViewMode === 'desktop' ? styles.desktop : ''}`}>
      <div className={styles.buttonGroup}>
        <button 
          onClick={handleStartAllServers}
          disabled={isStartingServers}
          className={`${styles.serverButton} ${styles.primaryButton}`}
        >
          {isStartingServers ? (
            <>
              <span className={styles.spinner}></span>
              Starting...
            </>
          ) : (
            <>
              <span className={styles.icon}>🚀</span>
              Start All Servers
            </>
          )}
        </button>

        <button 
          onClick={handleStartPortfolio}
          disabled={isStartingPortfolio}
          className={`${styles.serverButton} ${styles.secondaryButton}`}
        >
          {isStartingPortfolio ? (
            <>
              <span className={styles.spinner}></span>
              Starting...
            </>
          ) : (
            <>
              <span className={styles.icon}>💼</span>
              Portfolio Server
            </>
          )}
        </button>

        <button 
          onClick={handleStartVSCodeServer}
          disabled={isStartingVSCode}
          className={`${styles.serverButton} ${styles.secondaryButton}`}
        >
          {isStartingVSCode ? (
            <>
              <span className={styles.spinner}></span>
              Starting...
            </>
          ) : (
            <>
              <span className={styles.icon}>⚡</span>
              VS Code Server
            </>
          )}
        </button>
      </div>

      {statusMessage && (
        <div className={styles.statusMessage}>
          {statusMessage}
        </div>
      )}
    </div>
  )
}

export default ServerToolbar
