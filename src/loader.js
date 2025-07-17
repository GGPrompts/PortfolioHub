// Project Loader - Handles lazy loading and iframe isolation

class ProjectLoader {
    constructor() {
        this.manifest = null;
        this.loadedProjects = new Set();
        this.projectCache = new Map();
        this.baseUrl = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    }

    async init() {
        try {
            const response = await fetch('projects/manifest.json');
            this.manifest = await response.json();
            return this.manifest.projects;
        } catch (error) {
            console.error('Failed to load project manifest:', error);
            return [];
        }
    }

    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.projectId = project.id;
        card.dataset.tags = project.tags.join(',');
        
        // Create placeholder content
        card.innerHTML = `
            <div class="project-placeholder">
                <div class="loading-spinner"></div>
            </div>
            <div class="project-info">
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                <div class="project-tags">
                    ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;

        // Lazy load thumbnail
        this.loadThumbnail(card, project);
        
        return card;
    }

    async loadThumbnail(card, project) {
        const placeholder = card.querySelector('.project-placeholder');
        
        if (project.thumbnail) {
            const img = new Image();
            img.className = 'project-thumbnail';
            img.alt = project.title;
            
            img.onload = () => {
                placeholder.replaceWith(img);
            };
            
            img.onerror = () => {
                placeholder.innerHTML = '🎨';
                placeholder.classList.remove('loading');
            };
            
            // Simulate thumbnail path - in real implementation, this would be actual thumbnails
            img.src = project.thumbnail;
        } else {
            placeholder.innerHTML = '🎨';
            placeholder.classList.remove('loading');
        }
    }

    async loadProject(projectId) {
        const project = this.manifest.projects.find(p => p.id === projectId);
        if (!project) return null;

        // Check cache first
        if (this.projectCache.has(projectId)) {
            return this.projectCache.get(projectId);
        }

        // For demonstration, we'll use the actual project path
        // In production, you'd copy projects into the portfolio structure
        const projectPath = project.path.replace('projects/', '../');
        
        this.projectCache.set(projectId, {
            ...project,
            src: projectPath
        });

        return this.projectCache.get(projectId);
    }

    createIframe(project) {
        const iframe = document.createElement('iframe');
        iframe.id = 'projectFrame';
        iframe.frameBorder = '0';
        iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';
        
        // Set iframe source
        iframe.src = project.src;
        
        // Handle iframe load events
        iframe.onload = () => {
            console.log(`Project ${project.id} loaded successfully`);
            this.loadedProjects.add(project.id);
        };

        iframe.onerror = () => {
            console.error(`Failed to load project ${project.id}`);
        };

        return iframe;
    }

    unloadProject(projectId) {
        // Clean up resources when closing a project
        this.loadedProjects.delete(projectId);
        const iframe = document.getElementById('projectFrame');
        if (iframe) {
            iframe.src = 'about:blank';
        }
    }
}

// Initialize loader
const projectLoader = new ProjectLoader();