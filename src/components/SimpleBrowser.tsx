import React, { useState } from 'react';
import SvgIcon from './SvgIcon';
import './BrowserManager.css';

export const SimpleBrowser: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      let url = inputUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      setCurrentUrl(url);
      setIframeError(false); // Reset error state
      setIsLoading(true);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setIframeError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIframeError(true);
  };

  const refreshPage = () => {
    if (currentUrl) {
      // Force reload by updating the URL
      setCurrentUrl(currentUrl + '?t=' + Date.now());
    }
  };

  const goHome = () => {
    setCurrentUrl('');
    setInputUrl('');
  };

  const openGitHub = () => {
    setCurrentUrl('https://github.com');
    setInputUrl('https://github.com');
  };

  return (
    <div className="browser-manager">
      {/* Simple Toolbar */}
      <div className="browser-toolbar">
        <div className="browser-nav-controls">
          <button className="nav-btn" onClick={refreshPage} disabled={!currentUrl} title="Refresh">
            <SvgIcon name="refreshCw" />
          </button>
          <button className="nav-btn" onClick={goHome} title="Home">
            <SvgIcon name="home" />
          </button>
          <button className="nav-btn" onClick={openGitHub} title="GitHub">
            <SvgIcon name="github" />
          </button>
        </div>

        <form className="url-form" onSubmit={handleUrlSubmit}>
          <div className="url-input-container">
            <SvgIcon name="globe" className="url-icon" />
            <input
              type="text"
              className="url-input"
              placeholder="Enter URL..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
            />
          </div>
        </form>
      </div>

      {/* Browser Content */}
      <div className="browser-content">
        {currentUrl ? (
          <div className="iframe-container">
            {isLoading && (
              <div className="loading-overlay">
                <SvgIcon name="loader" className="loading-spinner" />
                <p>Loading...</p>
              </div>
            )}
            {iframeError ? (
              <div className="iframe-error">
                <SvgIcon name="alertTriangle" className="error-icon" />
                <h3>Unable to load page</h3>
                <p>This site prevents embedding in iframes for security reasons.</p>
                <p className="error-url">Tried to load: <code>{currentUrl}</code></p>
                <div className="error-actions">
                  <button 
                    onClick={() => window.open(currentUrl, '_blank')} 
                    className="open-external-btn"
                  >
                    <SvgIcon name="externalLink" />
                    Open in New Tab
                  </button>
                  <button onClick={goHome} className="go-home-btn">
                    <SvgIcon name="home" />
                    Go Home
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                src={currentUrl}
                className="browser-iframe"
                title="Browser content"
                sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-modals allow-popups"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            )}
          </div>
        ) : (
          <div className="browser-home">
            <div className="home-header">
              <SvgIcon name="globe" className="home-icon" />
              <h3>Development Browser</h3>
              <p>Enter a URL above to get started</p>
            </div>
            
            <div className="preset-shortcuts">
              <button onClick={openGitHub} className="preset-btn">
                <SvgIcon name="github" />
                GitHub
              </button>
              <button onClick={() => { setCurrentUrl('https://stackoverflow.com'); setInputUrl('https://stackoverflow.com'); }} className="preset-btn">
                <SvgIcon name="helpCircle" />
                Stack Overflow
              </button>
              <button onClick={() => { setCurrentUrl('https://developer.mozilla.org'); setInputUrl('https://developer.mozilla.org'); }} className="preset-btn">
                <SvgIcon name="book" />
                MDN Docs
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};