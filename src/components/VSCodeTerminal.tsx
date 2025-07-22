import React, { useRef, useEffect, useState } from 'react';
import SvgIcon from './SvgIcon';

interface VSCodeTerminalProps {
  projectPath?: string;
  serverPort?: number;
  className?: string;
  onClose?: () => void;
  workspacePath?: string;
}

export const VSCodeTerminal: React.FC<VSCodeTerminalProps> = ({
  projectPath = 'D:/ClaudeWindows/claude-dev-portfolio',
  serverPort = 8080,
  className = '',
  onClose,
  workspacePath = 'D:/ClaudeWindows/claude-dev-portfolio/portfolio-absolute-paths.code-workspace'
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasShownTip, setHasShownTip] = useState(false);

  // Simple VS Code Server URL without folder parameter to avoid errors
  const vscodeUrl = `http://localhost:${serverPort}/`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setIsLoaded(true);
      setError(null);
    };

    const handleError = () => {
      setError('Failed to load VS Code Server');
      setIsLoaded(false);
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, []);

  const openInNewTab = () => {
    window.open(vscodeUrl, '_blank');
  };

  const refreshIframe = () => {
    if (iframeRef.current) {
      setIsLoaded(false);
      setError(null);
      iframeRef.current.src = vscodeUrl;
    }
  };

  const copyFolderPaths = () => {
    const paths = `D:\\ClaudeWindows\\claude-dev-portfolio
D:\\ClaudeWindows\\claude-dev-portfolio\\projects  
D:\\ClaudeWindows\\claude-dev-portfolio\\scripts`;
    if (typeof window !== 'undefined' && (window as any).vsCodePortfolio?.isVSCodeWebview) {
      ;(window as any).vsCodePortfolio.showNotification(`Folder paths: ${paths}`);
    } else {
      navigator.clipboard.writeText(paths);
    }
    alert(`Folder paths copied!\n\nTo create a multi-root workspace:\n1. Press Ctrl+Shift+P\n2. Type "Add Folder to Workspace"\n3. Add each folder one by one\n4. Save as workspace: File → Save Workspace As...`);
  };

  const copyWorkspacePath = () => {
    if (typeof window !== 'undefined' && (window as any).vsCodePortfolio?.isVSCodeWebview) {
      ;(window as any).vsCodePortfolio.showNotification(`Workspace path: ${workspacePath}`);
    } else {
      navigator.clipboard.writeText(workspacePath);
    }
    alert(`Workspace path copied!\n\n${workspacePath}\n\nIf the file dialog doesn't show .code-workspace files:\n1. Change file filter to "All Files (*.*)" \n2. Or manually type the filename\n3. Or use "Add Folder to Workspace" instead`);
  };

  const hideTip = () => {
    setHasShownTip(true);
  };

  return (
    <div className={`vscode-terminal ${className}`}>
      <div className="vscode-header">
        <div className="vscode-title">
          <SvgIcon name="code" className="vscode-icon" />
          <span>VS Code - {projectPath.split('/').pop() || 'Portfolio'}</span>
        </div>
        
        <div className="vscode-controls">
          <span className={`connection-status ${isLoaded && !error ? 'connected' : 'disconnected'}`}>
            {isLoaded && !error ? '●' : '○'}
          </span>
          
          <button 
            onClick={copyFolderPaths}
            className="vscode-control-btn"
            title="Copy folder paths for multi-root workspace"
          >
            <SvgIcon name="folder" />
          </button>
          
          <button 
            onClick={copyWorkspacePath}
            className="vscode-control-btn"
            title="Copy workspace path"
          >
            <SvgIcon name="copy" />
          </button>
          
          <button 
            onClick={refreshIframe}
            className="vscode-control-btn"
            title="Refresh VS Code"
          >
            <SvgIcon name="refreshCw" />
          </button>
          
          <button 
            onClick={openInNewTab}
            className="vscode-control-btn"
            title="Open in New Tab"
          >
            <SvgIcon name="externalLink" />
          </button>
          
          {onClose && (
            <button 
              onClick={onClose}
              className="vscode-control-btn vscode-close"
              title="Close VS Code"
            >
              <SvgIcon name="x" />
            </button>
          )}
        </div>
      </div>

      {isLoaded && !hasShownTip && (
        <div className="vscode-workspace-notice">
          <SvgIcon name="info" className="notice-icon" />
          <div className="notice-content">
            <div className="notice-main">
              <strong>Quick Setup - Choose One:</strong>
            </div>
            <div className="notice-options">
              <div className="notice-option">
                <span className="option-number">1.</span>
                <span>Open single folder: <kbd>Ctrl+K</kbd> <kbd>Ctrl+O</kbd> → Navigate to <code>D:\ClaudeWindows\claude-dev-portfolio</code></span>
              </div>
              <div className="notice-option">
                <span className="option-number">2.</span>
                <span>Multi-root workspace: <kbd>Ctrl+Shift+P</kbd> → "Add Folder to Workspace" → Add Portfolio, Projects, and Scripts folders</span>
              </div>
              <div className="notice-option">
                <span className="option-number">3.</span>
                <span>Click the folder button above to copy paths for easy pasting</span>
              </div>
            </div>
          </div>
          <button onClick={hideTip} className="notice-close" title="Hide tip">
            <SvgIcon name="x" />
          </button>
        </div>
      )}

      <div className="vscode-content">
        {error ? (
          <div className="vscode-error">
            <SvgIcon name="alertCircle" className="error-icon" />
            <div className="error-message">
              <h3>Connection Error</h3>
              <p>{error}</p>
              <p>Make sure VS Code Server is running on port {serverPort}</p>
              <button onClick={refreshIframe} className="retry-btn">
                Retry Connection
              </button>
            </div>
          </div>
        ) : (
          <>
            {!isLoaded && (
              <div className="vscode-loading">
                <div className="loading-spinner"></div>
                <p>Loading VS Code Server...</p>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={vscodeUrl}
              title="VS Code Server"
              className={`vscode-iframe ${isLoaded ? 'loaded' : 'loading'}`}
              sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-modals allow-popups allow-pointer-lock"
            />
          </>
        )}
      </div>
    </div>
  );
};