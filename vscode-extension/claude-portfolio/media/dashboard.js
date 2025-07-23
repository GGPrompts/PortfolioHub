// Dashboard JavaScript functionality
(function() {
    const vscode = acquireVsCodeApi();
    
    // Ensure portfolio path is available
    const portfolioPath = window.portfolioPath || '';
    
    // Load projects from manifest.json
    async function loadProjects() {
        try {
            // This will be populated by the extension
            const projects = window.portfolioProjects || [];
            console.log('Loading projects:', projects); // Debug log
            displayProjects(projects);
            updateStats(projects);
        } catch (error) {
            console.error('Failed to load projects:', error);
            showError('Failed to load projects');
        }
    }
    
    function displayProjects(projects) {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;
        
        grid.innerHTML = projects.map(project => `
            <div class="project-card">
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                <div class="project-meta">
                    <span class="port">Port: ${project.localPort}</span>
                    <span class="status ${project.status || 'inactive'}">${project.status || 'inactive'}</span>
                </div>
                <div class="project-tech">
                    ${(project.tech || []).map(t => `<span class="tech-tag">${t}</span>`).join('')}
                </div>
                <div class="project-actions">
                    <button onclick="openProject('${project.id}')">📂 Open</button>
                    <button onclick="runProject('${project.id}')">▶️ Run</button>
                    <button onclick="openInBrowser('${project.id}')">🌐 VS Code</button>
                    <button onclick="openInExternalBrowser('${project.id}')">🔗 External</button>
                </div>
            </div>
        `).join('');
    }
    
    function updateStats(projects) {
        const totalElement = document.getElementById('totalProjects');
        const activeElement = document.getElementById('activeProjects');
        const techElement = document.getElementById('techCount');
        
        if (totalElement) totalElement.textContent = projects.length;
        if (activeElement) {
            const activeCount = projects.filter(p => p.status === 'active').length;
            activeElement.textContent = activeCount;
        }
        if (techElement) {
            const allTech = new Set();
            projects.forEach(p => (p.tech || []).forEach(t => allTech.add(t)));
            techElement.textContent = allTech.size;
        }
    }
    
    function showError(message) {
        const grid = document.getElementById('projectsGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--vscode-errorForeground);">
                    <h3>⚠️ Error</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }
    
    // Project actions
    window.openProject = function(projectId) {
        const project = (window.portfolioProjects || []).find(p => p.id === projectId);
        if (project) {
            vscode.postMessage({ command: 'openProject', project });
        }
    };
    
    window.runProject = function(projectId) {
        const project = (window.portfolioProjects || []).find(p => p.id === projectId);
        if (project) {
            vscode.postMessage({ command: 'runProject', project });
        }
    };
    
    window.openInBrowser = function(projectId) {
        const project = (window.portfolioProjects || []).find(p => p.id === projectId);
        if (project) {
            vscode.postMessage({ command: 'openInBrowser', project });
        }
    };
    
    window.openInExternalBrowser = function(projectId) {
        const project = (window.portfolioProjects || []).find(p => p.id === projectId);
        if (project) {
            vscode.postMessage({ command: 'openInExternalBrowser', project });
        }
    };
    
    window.refreshProjects = function() {
        vscode.postMessage({ command: 'refreshProjects' });
        loadProjects();
    };
    
    window.openAllProjects = function() {
        const projects = window.portfolioProjects || [];
        projects.forEach(project => {
            vscode.postMessage({ command: 'openProject', project });
        });
    };
    
    window.startAllServers = function() {
        const projects = window.portfolioProjects || [];
        projects.forEach(project => {
            vscode.postMessage({ command: 'runProject', project });
        });
    };
    
    // Initialize dashboard
    document.addEventListener('DOMContentLoaded', loadProjects);
    
    // Listen for project updates from extension
    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'updateProjects') {
            window.portfolioProjects = message.projects;
            loadProjects();
        }
    });
})();