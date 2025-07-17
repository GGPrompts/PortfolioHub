// Gallery Controller - Manages project display and filtering

class GalleryController {
    constructor() {
        this.projects = [];
        this.currentFilter = 'all';
        this.currentProject = null;
        this.init();
    }

    async init() {
        // Load projects from manifest
        this.projects = await projectLoader.init();
        
        // Set up UI
        this.setupEventListeners();
        this.renderProjects();
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Close viewer button
        document.getElementById('closeViewer').addEventListener('click', () => {
            this.closeProjectViewer();
        });

        // ESC key to close viewer
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentProject) {
                this.closeProjectViewer();
            }
        });
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Filter projects
        this.filterProjects();
    }

    filterProjects() {
        const cards = document.querySelectorAll('.project-card');
        
        cards.forEach(card => {
            const tags = card.dataset.tags.split(',');
            const show = this.currentFilter === 'all' || tags.includes(this.currentFilter);
            
            card.style.display = show ? 'block' : 'none';
            
            // Add/remove animation
            if (show) {
                card.style.animation = 'fadeIn 0.3s ease-out';
            }
        });
    }

    renderProjects() {
        const grid = document.getElementById('projectGrid');
        grid.innerHTML = '';
        
        this.projects.forEach(project => {
            const card = projectLoader.createProjectCard(project);
            
            // Add click handler
            card.addEventListener('click', () => {
                this.openProject(project.id);
            });
            
            grid.appendChild(card);
        });
    }

    async openProject(projectId) {
        const viewer = document.getElementById('projectViewer');
        const viewerContent = viewer.querySelector('.viewer-content');
        const projectTitle = document.getElementById('projectTitle');
        
        // Show loading state
        viewerContent.innerHTML = '<div class="loading-spinner"></div>';
        viewer.style.display = 'flex';
        
        try {
            // Load project data
            const project = await projectLoader.loadProject(projectId);
            
            if (project) {
                this.currentProject = project;
                projectTitle.textContent = project.title;
                
                // Create and insert iframe
                const iframe = projectLoader.createIframe(project);
                viewerContent.innerHTML = '';
                viewerContent.appendChild(iframe);
                
                // Add fade-in animation
                viewer.style.animation = 'fadeIn 0.3s ease-out';
            }
        } catch (error) {
            console.error('Failed to open project:', error);
            viewerContent.innerHTML = '<p>Failed to load project</p>';
        }
    }

    closeProjectViewer() {
        const viewer = document.getElementById('projectViewer');
        
        // Unload current project
        if (this.currentProject) {
            projectLoader.unloadProject(this.currentProject.id);
            this.currentProject = null;
        }
        
        // Hide viewer with animation
        viewer.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            viewer.style.display = 'none';
            viewer.style.animation = '';
        }, 300);
    }
}

// CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize gallery when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new GalleryController();
});