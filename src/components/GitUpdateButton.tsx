import React, { useState } from 'react'
import styles from './GitUpdateButton.module.css'

interface GitUpdateButtonProps {
  type: 'portfolio' | 'project' | 'all'
  projectId?: string
  projectName?: string
  size?: 'small' | 'medium' | 'large'
  variant?: 'primary' | 'secondary' | 'minimal'
}

export default function GitUpdateButton({ 
  type, 
  projectId, 
  projectName,
  size = 'medium',
  variant = 'secondary'
}: GitUpdateButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<'success' | 'error' | null>(null)

  const getButtonText = () => {
    if (isUpdating) {
      switch (type) {
        case 'portfolio': return '🔄 Updating Portfolio...'
        case 'project': return `🔄 Updating ${projectName || 'Project'}...`
        case 'all': return '🔄 Updating All...'
      }
    }
    
    switch (type) {
      case 'portfolio': return '📥 Update Portfolio'
      case 'project': return '📥 Update'
      case 'all': return '📥 Update All Projects'
    }
  }

  const getTooltip = () => {
    switch (type) {
      case 'portfolio': return 'Pull latest changes from portfolio repository'
      case 'project': return `Pull latest changes for ${projectName || 'this project'}`
      case 'all': return 'Pull latest changes from all repositories'
    }
  }

  const executeUpdate = async () => {
    setIsUpdating(true)
    setUpdateStatus(null)
    
    try {
      // For now, show instructions to user instead of executing directly
      // This avoids security issues with executing shell commands from browser
      const instructions = getUpdateInstructions()
      
      // Simulate update process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check if we're in VS Code and execute commands directly
      if (typeof window !== 'undefined' && (window as any).vsCodePortfolio?.isVSCodeWebview) {
        // Execute git update directly in VS Code terminal
        const projectPath = type === 'project' ? `projects/${projectId}` : '.'
        ;(window as any).vsCodePortfolio.updateGitRepo(projectPath)
        
        setUpdateStatus('success')
        setLastUpdate(new Date().toLocaleTimeString())
        
        // Show notification
        ;(window as any).vsCodePortfolio.showNotification(`Git update started for ${projectName || 'portfolio'}!`)
      } else {
        // Fallback for web version - copy to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(instructions)
          setUpdateStatus('success')
          setLastUpdate(new Date().toLocaleTimeString())
          
          // Show toast notification
          showNotification('Update commands copied to clipboard!', 'success')
        } else {
          // Fallback: show instructions in alert
          alert(`Update commands:\n\n${instructions}`)
          setUpdateStatus('success')
          setLastUpdate(new Date().toLocaleTimeString())
        }
      }
      
    } catch (error) {
      console.error('Update failed:', error)
      setUpdateStatus('error')
      showNotification('Update failed. Check console for details.', 'error')
    } finally {
      setIsUpdating(false)
    }
  }

  const getUpdateInstructions = (): string => {
    switch (type) {
      case 'portfolio':
        return `cd "D:\\ClaudeWindows\\claude-dev-portfolio"
git pull origin master`
      
      case 'project':
        return `cd "D:\\ClaudeWindows\\claude-dev-portfolio\\projects\\${projectId}"
git pull origin main`
      
      case 'all':
        return `cd "D:\\ClaudeWindows\\claude-dev-portfolio"
.\\scripts\\update-all.ps1`
    }
  }

  const showNotification = (message: string, type: 'success' | 'error') => {
    // Simple notification - you could integrate with a toast library
    const notification = document.createElement('div')
    notification.className = `git-notification git-notification-${type}`
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#00ff88' : '#ff4444'};
      color: #000;
      border-radius: 6px;
      z-index: 9999;
      font-weight: 500;
    `
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  return (
    <button
      onClick={executeUpdate}
      disabled={isUpdating}
      title={getTooltip()}
      className={`${styles.gitUpdateButton} ${styles[size]} ${styles[variant]} ${updateStatus ? styles[updateStatus] : ''}`}
    >
      {getButtonText()}
      {lastUpdate && (
        <span className={styles.lastUpdate}>
          Last: {lastUpdate}
        </span>
      )}
    </button>
  )
}