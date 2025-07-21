import React, { useState, useRef, useEffect } from 'react';
import SvgIcon from './SvgIcon';
import './BrowserManager.css';

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isLoading: boolean;
}

interface BrowserPreset {
  name: string;
  url: string;
  icon: string;
  description: string;
}

const browserPresets: BrowserPreset[] = [
  {
    name: 'GitHub',
    url: 'https://github.com',
    icon: 'github',
    description: 'Code repositories and collaboration'
  },
  {
    name: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    icon: 'helpCircle',
    description: 'Programming Q&A community'
  },
  {
    name: 'MDN Docs',
    url: 'https://developer.mozilla.org',
    icon: 'book',
    description: 'Web development documentation'
  },
  {
    name: 'React Docs',
    url: 'https://react.dev',
    icon: 'code',
    description: 'React documentation and guides'
  },
  {
    name: 'TypeScript Docs',
    url: 'https://www.typescriptlang.org/docs',
    icon: 'fileText',
    description: 'TypeScript handbook and reference'
  },
  {
    name: 'npm',
    url: 'https://www.npmjs.com',
    icon: 'package',
    description: 'Node.js package manager'
  }
];

export const BrowserManager: React.FC = () => {
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [showPresets, setShowPresets] = useState(true);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Create new tab
  const createTab = (url: string, title?: string) => {
    const newTab: BrowserTab = {
      id: `tab-${Date.now()}`,
      title: title || 'New Tab',
      url: url,
      isLoading: true
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setCurrentUrl(url);
    setInputUrl(url);
    setShowPresets(false);
  };

  // Close tab
  const closeTab = (tabId: string) => {
    setTabs(prev => {
      const filteredTabs = prev.filter(tab => tab.id !== tabId);
      
      // If we're closing the active tab, switch to another one
      if (activeTabId === tabId) {
        if (filteredTabs.length > 0) {
          const newActiveTab = filteredTabs[filteredTabs.length - 1];
          setActiveTabId(newActiveTab.id);
          setCurrentUrl(newActiveTab.url);
          setInputUrl(newActiveTab.url);
        } else {
          setActiveTabId(null);
          setCurrentUrl('');
          setInputUrl('');
          setShowPresets(true);
        }
      }
      
      return filteredTabs;
    });
  };

  // Switch to tab
  const switchToTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setActiveTabId(tabId);
      setCurrentUrl(tab.url);
      setInputUrl(tab.url);
      setShowPresets(false);
    }
  };

  // Navigate to URL
  const navigateToUrl = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    if (activeTabId) {
      // Update current tab
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, url, isLoading: true }
          : tab
      ));
      setCurrentUrl(url);
    } else {
      // Create new tab
      createTab(url);
    }
  };

  // Handle URL input submission
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      navigateToUrl(inputUrl.trim());
    }
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    if (activeTabId) {
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, isLoading: false }
          : tab
      ));
    }
  };

  // Refresh current page
  const refreshPage = () => {
    if (iframeRef.current && currentUrl) {
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, isLoading: true }
          : tab
      ));
      iframeRef.current.src = currentUrl;
    }
  };

  // Go home (show presets)
  const goHome = () => {
    setShowPresets(true);
    setActiveTabId(null);
    setCurrentUrl('');
    setInputUrl('');
  };

  // Open preset
  const openPreset = (preset: BrowserPreset) => {
    createTab(preset.url, preset.name);
  };

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  return (
    <div className="browser-manager">
      {/* Browser Toolbar */}
      <div className="browser-toolbar">
        <div className="browser-nav-controls">
          <button 
            className="nav-btn"
            onClick={() => window.history.back()}
            disabled={!canGoBack}
            title="Go back"
          >
            <SvgIcon name="chevronLeft" />
          </button>
          <button 
            className="nav-btn"
            onClick={() => window.history.forward()}
            disabled={!canGoForward}
            title="Go forward"
          >
            <SvgIcon name="chevronRight" />
          </button>
          <button 
            className="nav-btn"
            onClick={refreshPage}
            disabled={!currentUrl}
            title="Refresh page"
          >
            <SvgIcon name="refreshCw" />
          </button>
          <button 
            className="nav-btn"
            onClick={goHome}
            title="Home"
          >
            <SvgIcon name="home" />
          </button>
        </div>

        <form className="url-form" onSubmit={handleUrlSubmit}>
          <div className="url-input-container">
            <SvgIcon name="globe" className="url-icon" />
            <input
              ref={urlInputRef}
              type="text"
              className="url-input"
              placeholder="Enter URL or search..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
            />
            {activeTab?.isLoading && (
              <div className="loading-spinner" title="Loading...">
                <SvgIcon name="loader" />
              </div>
            )}
          </div>
        </form>

        <button 
          className="new-tab-btn"
          onClick={() => createTab('about:blank', 'New Tab')}
          title="New tab"
        >
          <SvgIcon name="plus" />
        </button>
      </div>

      {/* Browser Tabs */}
      {tabs.length > 0 && (
        <div className="browser-tabs">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`browser-tab ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => switchToTab(tab.id)}
            >
              <div className="tab-content">
                {tab.isLoading ? (
                  <SvgIcon name="loader" className="tab-icon spinning" />
                ) : (
                  <SvgIcon name="globe" className="tab-icon" />
                )}
                <span className="tab-title">{tab.title}</span>
              </div>
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                title="Close tab"
              >
                <SvgIcon name="x" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Browser Content */}
      <div className="browser-content">
        {showPresets ? (
          /* Home Page with Presets */
          <div className="browser-home">
            <div className="home-header">
              <SvgIcon name="compass" className="home-icon" />
              <h3>Development Browser</h3>
              <p>Quick access to essential development resources</p>
            </div>
            
            <div className="presets-grid">
              {browserPresets.map((preset, index) => (
                <button
                  key={index}
                  className="preset-card"
                  onClick={() => openPreset(preset)}
                >
                  <div className="preset-icon">
                    <SvgIcon name={preset.icon} />
                  </div>
                  <div className="preset-info">
                    <h4>{preset.name}</h4>
                    <p>{preset.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="home-footer">
              <p>Enter any URL in the address bar above to browse the web</p>
            </div>
          </div>
        ) : currentUrl ? (
          /* Active Website */
          <iframe
            ref={iframeRef}
            src={currentUrl}
            className="browser-iframe"
            title="Browser content"
            onLoad={handleIframeLoad}
            sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-modals allow-popups allow-pointer-lock"
          />
        ) : (
          /* Empty State */
          <div className="browser-empty">
            <SvgIcon name="globe" className="empty-icon" />
            <h3>No page loaded</h3>
            <p>Enter a URL or click Home to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};