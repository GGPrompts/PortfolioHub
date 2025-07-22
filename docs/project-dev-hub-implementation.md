# Project Dev Hub - Implementation Plan

## 🎯 Implementation Overview
Based on the wireframe design, implement project-specific development tabs that open when clicking project headers, with simultaneous Simple Browser preview opening.

## 🏗️ Technical Architecture

### Components & Files to Modify

#### 1. VS Code Extension (`vscode-extension/claude-portfolio/src/`)
```
portfolioWebviewProvider.ts
├── Add message handler: 'project:openDevHub'
├── Create method: _createProjectDevHub(project)
├── Create method: _openSimpleBrowserPreview(project)
└── Update message routing

extension.ts  
├── Register project dev hub webview provider
└── Add command: 'claude-portfolio.openProjectDevHub'
```

#### 2. React Portfolio (`src/components/`)
```
PortfolioSidebar.tsx
├── Update project click handler
├── Add vsCodeIntegration check
└── Send 'project:openDevHub' message

ProjectDevHub.tsx (NEW COMPONENT)
├── Project header section
├── Quick actions buttons  
├── Matrix Card DEV NOTES interface
├── Project info & links section
└── Recent activity feed
```

## 📋 Detailed Implementation Steps

### Phase 1: VS Code Extension Backend

#### Step 1.1: Add Project Dev Hub Handler
```typescript
// In portfolioWebviewProvider.ts
private async _createProjectDevHub(project: any): Promise<void> {
    // Create new webview panel for project dev hub
    const panel = vscode.window.createWebviewPanel(
        `devhub-${project.id}`,
        `${project.title} - Dev Hub`,
        vscode.ViewColumn.Active,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media'),
                vscode.Uri.joinPath(this._extensionUri, 'portfolio-dist')
            ]
        }
    );

    // Generate project dev hub HTML
    panel.webview.html = this._getProjectDevHubHTML(project, panel.webview);
    
    // Handle messages from project dev hub
    panel.webview.onDidReceiveMessage(message => {
        this._handleProjectDevHubMessage(message, project);
    });
}
```

#### Step 1.2: Add Message Handler
```typescript
// In _handleMessage method
case 'project:openDevHub':
    await this._createProjectDevHub(message.project);
    await this._openSimpleBrowserPreview(message.project);
    break;
```

#### Step 1.3: Simple Browser Integration
```typescript
private async _openSimpleBrowserPreview(project: any): Promise<void> {
    const url = `http://localhost:${project.localPort}`;
    try {
        await vscode.commands.executeCommand('simpleBrowser.show', url);
        console.log(`🌐 Opened ${project.title} preview in Simple Browser`);
    } catch (error) {
        console.error(`Failed to open Simple Browser for ${project.title}:`, error);
        // Fallback to external browser
        vscode.env.openExternal(vscode.Uri.parse(url));
    }
}
```

### Phase 2: React Portfolio Frontend

#### Step 2.1: Update Project Click Handler
```typescript
// In PortfolioSidebar.tsx
const handleProjectHeaderClick = async (project: Project) => {
    if (isVSCodeEnvironment()) {
        // Send message to VS Code extension for dual action
        (window as any).vsCodePortfolio.postMessage({
            type: 'project:openDevHub',
            project: project
        });
    } else {
        // Web fallback - open project landing page
        selectProject(project);
    }
};

// Update JSX click handler
<div 
    className={styles.projectTitle}
    onClick={() => handleProjectHeaderClick(project)}
    style={{ cursor: 'pointer' }}
>
    {project.title}
</div>
```

#### Step 2.2: Create ProjectDevHub Component
```typescript
// New file: src/components/ProjectDevHub.tsx
interface ProjectDevHubProps {
    project: Project;
    onMessage: (message: any) => void;
}

export const ProjectDevHub: React.FC<ProjectDevHubProps> = ({ project, onMessage }) => {
    const [notes, setNotes] = useState('');
    const [claudeInstructions, setClaudeInstructions] = useState('');
    
    // Project header section
    const renderProjectHeader = () => (
        <div className={styles.projectHeader}>
            <h1>{project.title}</h1>
            <span className={`${styles.status} ${project.status}`}>
                {project.status === 'online' ? '🟢 ONLINE' : '🔴 OFFLINE'} 
                (Port {project.localPort})
            </span>
            <p>{project.description}</p>
        </div>
    );

    // Quick actions section  
    const renderQuickActions = () => (
        <div className={styles.quickActions}>
            <button onClick={() => onMessage({type: 'project:start', project})}>
                🚀 Start Server
            </button>
            <button onClick={() => onMessage({type: 'project:stop', project})}>
                🛑 Stop Server  
            </button>
            <button onClick={() => onMessage({type: 'project:preview', project})}>
                👁️ Open Preview
            </button>
            <button onClick={() => onMessage({type: 'project:mobilePreview', project})}>
                📱 Mobile Preview
            </button>
            {/* More actions... */}
        </div>
    );

    // Matrix Card DEV NOTES section
    const renderDevNotes = () => (
        <div className={styles.devNotes}>
            <MatrixCardNotes
                project={project}
                initialNotes={notes}
                initialInstructions={claudeInstructions}
                onSave={(noteData) => onMessage({type: 'notes:save', data: noteData})}
            />
        </div>
    );

    // Project info & links section
    const renderProjectInfo = () => (
        <div className={styles.projectInfo}>
            <div className={styles.pathInfo}>
                📂 Path: {project.path}
            </div>
            <div className={styles.quickLinks}>
                {/* README, CLAUDE.md, etc. links */}
            </div>
        </div>
    );

    return (
        <div className={styles.projectDevHub}>
            {renderProjectHeader()}
            {renderQuickActions()}
            {renderDevNotes()}
            {renderProjectInfo()}
        </div>
    );
};
```

### Phase 3: Integration & Polish

#### Step 3.1: Project Actions Handler
```typescript
// In portfolioWebviewProvider.ts
private async _handleProjectDevHubMessage(message: any, project: any): Promise<void> {
    switch (message.type) {
        case 'project:start':
            await this._startProject(project);
            break;
            
        case 'project:stop':
            await this._stopProject(project);
            break;
            
        case 'project:preview':
            await this._openSimpleBrowserPreview(project);
            break;
            
        case 'project:mobilePreview':
            await this._openMobilePreview(project);
            break;
            
        case 'notes:save':
            await this._saveProjectNote(message.data, project);
            break;
            
        // Add more handlers...
    }
}
```

#### Step 3.2: Mobile Preview Integration
```typescript
private async _openMobilePreview(project: any): Promise<void> {
    const url = `http://localhost:${project.localPort}`;
    // Open Simple Browser with mobile viewport
    try {
        await vscode.commands.executeCommand('simpleBrowser.show', url);
        // Note: Simple Browser doesn't have mobile toggle, 
        // but user can use browser dev tools
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open mobile preview: ${error}`);
    }
}
```

## 🎨 Styling & Assets

### CSS Modules Structure
```
ProjectDevHub.module.css
├── .projectDevHub (main container)
├── .projectHeader (project title & status)  
├── .quickActions (action buttons grid)
├── .devNotes (Matrix Card notes container)
├── .projectInfo (links and metadata)
└── .recentActivity (activity feed)
```

### Design System Integration
- Reuse Matrix Card note interface styling
- VS Code theme integration (dark/light mode)
- Consistent button styles with portfolio
- Professional spacing and typography

## 🧪 Testing Strategy

### Unit Tests
- [ ] Project dev hub creation
- [ ] Message handling between React and VS Code
- [ ] Simple Browser integration
- [ ] Note saving functionality

### Integration Tests  
- [ ] Dual-action click flow (dev hub + simple browser)
- [ ] Project actions (start/stop/preview)
- [ ] Cross-environment compatibility (web fallback)

### User Acceptance Tests
- [ ] Click project header → Both tabs open
- [ ] Dev hub provides complete project context
- [ ] Simple Browser shows live preview
- [ ] Notes save to correct project location
- [ ] All quick actions work as expected

## 🚀 Deployment Plan

### Phase 1: Core Infrastructure (Week 1)
- [ ] VS Code extension project dev hub handler
- [ ] React portfolio click handler update  
- [ ] Basic dev hub HTML template

### Phase 2: Rich Interface (Week 2)
- [ ] Complete ProjectDevHub React component
- [ ] Matrix Card notes integration
- [ ] Quick actions implementation
- [ ] Project info and links

### Phase 3: Polish & Testing (Week 3)
- [ ] Styling and responsive design
- [ ] Error handling and edge cases
- [ ] User testing and feedback
- [ ] Documentation updates

## 📚 Documentation Updates Required

- [ ] Update README.md with dev hub workflow
- [ ] Add dev hub usage guide
- [ ] Update VS Code extension documentation
- [ ] Create troubleshooting guide

## 🔄 Future Enhancements

### Phase 4: Advanced Features
- [ ] Recent activity feed implementation
- [ ] Git status integration in dev hub
- [ ] Bundle analyzer integration
- [ ] Performance metrics display
- [ ] Project templates and scaffolding
- [ ] Team collaboration features

### Technical Debt
- [ ] Optimize webview performance
- [ ] Add comprehensive error boundaries
- [ ] Implement proper state management
- [ ] Add accessibility features