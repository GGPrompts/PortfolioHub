// Enhanced Dashboard JavaScript functionality with real-time updates
(function() {
    const vscode = acquireVsCodeApi();
    
    // Dashboard state management
    const dashboardState = {
        lastRefresh: Date.now(),
        refreshCount: 0,
        operationInProgress: false,
        autoRefreshInterval: null,
        logEntries: [],
        capabilities: window.dashboardCapabilities || {}
    };
    
    // Ensure portfolio path is available
    const portfolioPath = window.portfolioPath || '';
    
    // Enhanced project loading with real-time capabilities
    async function loadProjects() {
        try {
            logActivity('Loading projects...', 'info');
            const projects = window.portfolioProjects || [];
            
            displayProjects(projects);
            updateStats(projects);
            updateLastRefreshTime();
            dashboardState.refreshCount++;
            
            logActivity(`Loaded ${projects.length} projects (refresh #${dashboardState.refreshCount})`, 'success');
        } catch (error) {
            console.error('Failed to load projects:', error);
            logActivity(`Failed to load projects: ${error.message}`, 'error');
            showError('Failed to load projects');
        }
    }
    
    function displayProjects(projects) {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;
        
        if (projects.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <h3>📁 No Projects Found</h3>
                    <p>No portfolio projects detected. Check your manifest.json file.</p>
                    <button onclick="refreshProjects()" style="margin-top: 20px;">🔄 Refresh</button>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = projects.map(project => {
            const statusIcon = project.status === 'active' ? '🟢' : '🔴';
            const enhancedInfo = project.enhancedStatus ? 
                `<div class="enhanced-status">Status: ${project.enhancedStatus.status} | Processes: ${project.enhancedStatus.processCount || 0}</div>` : '';
            
            return `
                <div class="project-card" data-project-id="${project.id}">
                    <div class="project-header">
                        <h3>${project.title}</h3>
                        <span class="status-indicator">${statusIcon}</span>
                    </div>
                    <p>${project.description || 'No description available'}</p>
                    <div class="project-meta">
                        <span class="port">Port: ${project.localPort}</span>
                        <span class="status ${project.status || 'inactive'}">${project.status || 'inactive'}</span>
                    </div>
                    ${enhancedInfo}
                    <div class="project-tech">
                        ${(project.tech || []).map(t => `<span class="tech-tag">${t}</span>`).join('')}
                    </div>
                    <div class="project-actions">
                        <button onclick="openProject('${project.id}')" title="Open in VS Code">📂 Open</button>
                        <button onclick="runProject('${project.id}')" title="Start/Stop Server" class="${project.status === 'active' ? 'stop-btn' : 'start-btn'}">
                            ${project.status === 'active' ? '⏹️ Stop' : '▶️ Run'}
                        </button>
                        <button onclick="openInBrowser('${project.id}')" title="Open in VS Code Browser">🌐 VS Code</button>
                        <button onclick="openInExternalBrowser('${project.id}')" title="Open in External Browser">🔗 External</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function updateStats(projects) {
        const totalElement = document.getElementById('totalProjects');
        const activeElement = document.getElementById('activeProjects');
        const techElement = document.getElementById('techCount');
        const bridgeElement = document.getElementById('bridgeStatus');
        
        if (totalElement) {
            totalElement.textContent = projects.length;
            totalElement.title = `${projects.length} total projects configured`;
        }
        
        if (activeElement) {
            const activeCount = projects.filter(p => p.status === 'active').length;
            activeElement.textContent = activeCount;
            activeElement.title = `${activeCount} servers currently running`;
            
            // Update active element styling
            const activeCard = activeElement.closest('.stat-card');
            if (activeCard) {
                activeCard.className = `stat-card ${activeCount > 0 ? 'stat-active' : 'stat-inactive'}`;
            }
        }
        
        if (techElement) {
            const allTech = new Set();
            projects.forEach(p => (p.tech || []).forEach(t => allTech.add(t)));
            techElement.textContent = allTech.size;
            techElement.title = `${allTech.size} unique technologies: ${Array.from(allTech).join(', ')}`;
        }
        
        if (bridgeElement) {
            const isConnected = dashboardState.capabilities.websocketBridge;
            bridgeElement.textContent = isConnected ? '🟢' : '🔴';
            bridgeElement.title = isConnected ? 'WebSocket bridge connected' : 'WebSocket bridge disconnected';
        }
    }
    
    function showError(message) {
        const grid = document.getElementById('projectsGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--vscode-errorForeground);">
                    <h3>⚠️ Error</h3>
                    <p>${message}</p>
                    <button onclick="refreshProjects()" style="margin-top: 20px;">🔄 Retry</button>
                </div>
            `;
        }
        logActivity(`Error: ${message}`, 'error');
    }
    
    // Enhanced project actions with logging and feedback
    window.openProject = function(projectId) {
        const project = (window.portfolioProjects || []).find(p => p.id === projectId);
        if (project) {
            logActivity(`Opening project: ${project.title}`, 'info');
            vscode.postMessage({ command: 'openProject', project });
        } else {
            logActivity(`Project not found: ${projectId}`, 'error');
        }
    };
    
    window.runProject = function(projectId) {
        const project = (window.portfolioProjects || []).find(p => p.id === projectId);
        if (project) {
            const action = project.status === 'active' ? 'Stopping' : 'Starting';
            logActivity(`${action} project server: ${project.title}`, 'info');
            vscode.postMessage({ command: 'runProject', project });
            
            // Update UI immediately for better UX
            const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
            if (projectCard) {
                const button = projectCard.querySelector('.project-actions button:nth-child(2)');
                if (button) {
                    button.disabled = true;
                    button.textContent = project.status === 'active' ? '⏹️ Stopping...' : '▶️ Starting...';
                    
                    // Re-enable after operation
                    setTimeout(() => {
                        button.disabled = false;
                        refreshProjects();
                    }, 3000);
                }
            }
        } else {
            logActivity(`Project not found: ${projectId}`, 'error');
        }
    };
    
    window.openInBrowser = function(projectId) {
        const project = (window.portfolioProjects || []).find(p => p.id === projectId);
        if (project) {
            logActivity(`Opening in VS Code browser: ${project.title}`, 'info');
            vscode.postMessage({ command: 'openInBrowser', project });
        } else {
            logActivity(`Project not found: ${projectId}`, 'error');
        }
    };
    
    window.openInExternalBrowser = function(projectId) {
        const project = (window.portfolioProjects || []).find(p => p.id === projectId);
        if (project) {
            logActivity(`Opening in external browser: ${project.title}`, 'info');
            vscode.postMessage({ command: 'openInExternalBrowser', project });
        } else {
            logActivity(`Project not found: ${projectId}`, 'error');
        }
    };
    
    window.refreshProjects = function() {
        if (dashboardState.operationInProgress) {
            logActivity('Refresh already in progress, skipping...', 'warning');
            return;
        }
        
        dashboardState.operationInProgress = true;
        disableButton('refreshBtn', 'Refreshing...');
        
        logActivity('Manual refresh requested', 'info');
        vscode.postMessage({ command: 'refreshProjects' });
        
        // Re-enable button after operation
        setTimeout(() => {
            dashboardState.operationInProgress = false;
            enableButton('refreshBtn', '🔄 Refresh Projects');
            loadProjects();
        }, 2000);
    };
    
    window.openAllProjects = function() {
        if (dashboardState.operationInProgress) {
            logActivity('Batch operation already in progress, skipping...', 'warning');
            return;
        }
        
        const projects = window.portfolioProjects || [];
        if (projects.length === 0) {
            logActivity('No projects to open', 'warning');
            return;
        }
        
        dashboardState.operationInProgress = true;
        disableButton('openAllBtn', `Opening ${projects.length} projects...`);
        
        logActivity(`Starting batch open operation for ${projects.length} projects`, 'info');
        vscode.postMessage({ command: 'openAllProjects' });
        
        // Re-enable button after estimated completion time
        const estimatedTime = projects.length * 500 + 2000; // 500ms per project + 2s buffer
        setTimeout(() => {
            dashboardState.operationInProgress = false;
            enableButton('openAllBtn', '📂 Open All Projects');
            logActivity('Batch open operation completed', 'success');
        }, estimatedTime);
    };
    
    window.startAllServers = function() {
        if (dashboardState.operationInProgress) {
            logActivity('Batch operation already in progress, skipping...', 'warning');
            return;
        }
        
        const projects = window.portfolioProjects || [];
        if (projects.length === 0) {
            logActivity('No projects to start', 'warning');
            return;
        }
        
        dashboardState.operationInProgress = true;
        disableButton('startAllBtn', `Starting ${projects.length} servers...`);
        
        logActivity(`Starting batch server operation for ${projects.length} projects`, 'info');
        vscode.postMessage({ command: 'startAllServers' });
        
        // Re-enable button after estimated completion time (longer for server starts)
        const estimatedTime = projects.length * 2000 + 5000; // 2s per project + 5s buffer
        setTimeout(() => {
            dashboardState.operationInProgress = false;
            enableButton('startAllBtn', '▶️ Start All Servers');
            logActivity('Batch server operation completed', 'success');
            // Trigger refresh to update status
            setTimeout(() => refreshProjects(), 2000);
        }, estimatedTime);
    };
    
    // New utility functions for enhanced dashboard
    function logActivity(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = { timestamp, message, level };
        dashboardState.logEntries.unshift(logEntry);
        
        // Keep only last 100 log entries
        if (dashboardState.logEntries.length > 100) {
            dashboardState.logEntries = dashboardState.logEntries.slice(0, 100);
        }
        
        // Update log display if visible
        updateLogDisplay();
        
        // Console logging with appropriate level
        const prefix = `[Dashboard ${timestamp}]`;
        switch (level) {
            case 'error':
                console.error(`❌ ${prefix} ${message}`);
                break;
            case 'warning':
                console.warn(`⚠️ ${prefix} ${message}`);
                break;
            case 'success':
                console.log(`✅ ${prefix} ${message}`);
                break;
            default:
                console.log(`ℹ️ ${prefix} ${message}`);
        }
    }
    
    function updateLogDisplay() {
        const logContent = document.getElementById('logContent');
        if (!logContent) return;
        
        const logsHtml = dashboardState.logEntries.map(entry => {
            const icon = {
                error: '❌',
                warning: '⚠️',
                success: '✅',
                info: 'ℹ️'
            }[entry.level] || 'ℹ️';
            
            return `<div class="log-entry log-${entry.level}">
                <span class="log-time">${entry.timestamp}</span>
                <span class="log-icon">${icon}</span>
                <span class="log-message">${entry.message}</span>
            </div>`;
        }).join('');
        
        logContent.innerHTML = logsHtml || '<p>No activity logged yet.</p>';
    }
    
    function disableButton(buttonId, newText) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
            button.textContent = newText;
            button.style.opacity = '0.6';
        }
    }
    
    function enableButton(buttonId, originalText) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
            button.style.opacity = '1';
        }
    }
    
    function updateLastRefreshTime() {
        const lastUpdateElement = document.getElementById('lastUpdate');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
        dashboardState.lastRefresh = Date.now();
    }
    
    function startAutoRefresh() {
        if (dashboardState.autoRefreshInterval) {
            clearInterval(dashboardState.autoRefreshInterval);
        }
        
        // Auto-refresh every 30 seconds
        dashboardState.autoRefreshInterval = setInterval(() => {
            if (!dashboardState.operationInProgress) {
                logActivity('Auto-refresh triggered', 'info');
                vscode.postMessage({ command: 'refreshProjects' });
                loadProjects();
            }
        }, 30000);
        
        logActivity('Auto-refresh enabled (30 second interval)', 'info');
    }
    
    window.toggleLogs = function() {
        const logsDiv = document.getElementById('dashboardLogs');
        const testBtn = document.getElementById('testBtn');
        
        if (logsDiv.style.display === 'none') {
            logsDiv.style.display = 'block';
            updateLogDisplay();
            if (testBtn) testBtn.textContent = 'Hide Logs';
        } else {
            logsDiv.style.display = 'none';
            if (testBtn) testBtn.textContent = '🧪 Test Dashboard';
        }
    };
    
    window.clearLogs = function() {
        dashboardState.logEntries = [];
        updateLogDisplay();
        logActivity('Log entries cleared', 'info');
    };
    
    window.runDashboardTest = function() {
        const logsDiv = document.getElementById('dashboardLogs');
        
        if (logsDiv.style.display === 'none') {
            // Show logs and run test
            toggleLogs();
            setTimeout(() => runDashboardTestSuite(), 500);
        } else {
            // Hide logs
            toggleLogs();
        }
    };
    
    function runDashboardTestSuite() {
        logActivity('🧪 Starting Dashboard Test Suite', 'info');
        
        // Test 1: Capabilities Check
        logActivity(`Capabilities: WebSocket=${dashboardState.capabilities.websocketBridge}, Port Detection=${dashboardState.capabilities.portDetection}`, 'info');
        
        // Test 2: Project Data Check
        const projects = window.portfolioProjects || [];
        logActivity(`Project Data: ${projects.length} projects loaded`, projects.length > 0 ? 'success' : 'warning');
        
        // Test 3: Button Functionality
        const buttons = ['refreshBtn', 'openAllBtn', 'startAllBtn'];
        const workingButtons = buttons.filter(id => document.getElementById(id) !== null);
        logActivity(`UI Elements: ${workingButtons.length}/${buttons.length} buttons found`, workingButtons.length === buttons.length ? 'success' : 'warning');
        
        // Test 4: Connection Status
        const bridgeStatus = document.getElementById('bridgeStatus');
        const connectionOk = bridgeStatus && bridgeStatus.textContent === '🟢';
        logActivity(`Bridge Connection: ${connectionOk ? 'Connected' : 'Disconnected'}`, connectionOk ? 'success' : 'warning');
        
        // Test 5: Auto-refresh Status
        const autoRefreshActive = dashboardState.autoRefreshInterval !== null;
        logActivity(`Auto-refresh: ${autoRefreshActive ? 'Active' : 'Inactive'}`, autoRefreshActive ? 'success' : 'warning');
        
        logActivity('🧪 Dashboard Test Suite completed', 'success');
    }
    
    // Initialize dashboard
    document.addEventListener('DOMContentLoaded', () => {
        logActivity('Dashboard initializing...', 'info');
        loadProjects();
        startAutoRefresh();
        logActivity('Dashboard ready', 'success');
    });
    
    // Listen for project updates from extension
    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'updateProjects') {
            logActivity('Received project update from extension', 'info');
            window.portfolioProjects = message.projects;
            loadProjects();
        } else if (message.type === 'dashboard-project-update') {
            logActivity('Received real-time project update', 'info');
            window.portfolioProjects = message.data.projects;
            loadProjects();
        }
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (dashboardState.autoRefreshInterval) {
            clearInterval(dashboardState.autoRefreshInterval);
        }
    });
})();