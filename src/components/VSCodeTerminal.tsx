import React, { useRef, useEffect, useState } from 'react';
import SvgIcon from './SvgIcon';

interface VSCodeTerminalProps {
  projectPath?: string;
  serverPort?: number;
  className?: string;
  onClose?: () => void;
}

export const VSCodeTerminal: React.FC<VSCodeTerminalProps> = ({
  projectPath = 'D:/ClaudeWindows/claude-dev-portfolio',
  serverPort = 8080,
  className = '',
  onClose
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect to VS Code Server with Matt profile
  const vscodeUrl = `http://localhost:${serverPort}/?profile=Matt`;

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