# PROJECT_NAME - Claude Development Instructions

## 🎯 Project Vision
**[REPLACE WITH YOUR PROJECT VISION]**

## 📋 Project Setup Checklist

### Initial Configuration
- [ ] Replace `PROJECT_NAME` with your actual project name
- [ ] Update `PROJECT_ID` in package.json name field
- [ ] Set appropriate port in package.json (use next available: 3006, 3007, etc.)
- [ ] Configure build commands for your framework
- [ ] Update CLAUDE.md with your project vision and requirements

### Portfolio Integration
- [ ] Add project entry to `../manifest.json`
- [ ] Create thumbnail image in `../thumbnails/PROJECT_ID.png`
- [ ] Initialize git repository: `git init`
- [ ] Create GitHub repository and set remote
- [ ] Add project to portfolio startup scripts

### Development Environment
- [ ] Install dependencies: `npm install`
- [ ] Test development server: `npm run dev`
- [ ] Verify port conflicts with other projects
- [ ] Test portfolio integration and live preview

## 🚀 Getting Started

### 1. Clone This Template
```bash
# From portfolio root
cp -r project-template projects/YOUR-PROJECT-NAME
cd projects/YOUR-PROJECT-NAME
```

### 2. Initialize Your Project
```bash
# Update package.json
# Replace PROJECT_NAME and set port
# Install dependencies
npm install

# Initialize git
git init
git add .
git commit -m "Initial project setup from template"

# Create GitHub repo and push
git remote add origin https://github.com/GGPrompts/YOUR-PROJECT-NAME
git push -u origin main
```

### 3. Add to Portfolio
Add entry to `../manifest.json`:
```json
{
  "id": "your-project-id",
  "title": "Your Project Name",
  "description": "Brief description of your project",
  "displayType": "external",
  "localPort": 3006,
  "buildCommand": "npm run dev",
  "path": "your-project-name",
  "thumbnail": "thumbnails/your-project-id.png",
  "tags": ["React", "TypeScript", "Your-Tech"],
  "tech": ["React", "Vite", "TypeScript"],
  "status": "active",
  "devJournal": "projects/dev-journals/your-project-id.md",
  "features": [
    "Feature 1",
    "Feature 2", 
    "Feature 3"
  ]
}
```

## 🛠️ Development Workflow

### Working with Claude Code
1. **Open in Claude**: `claude code` from your project directory
2. **Context Loading**: Claude will read this CLAUDE.md for project context
3. **Development**: Use Claude to implement features, fix bugs, refactor
4. **Portfolio Testing**: Test in portfolio grid view and live preview

### Git Workflow
```bash
# Regular development
git add .
git commit -m "feat: implement new feature"
git push

# Update from portfolio
# Use portfolio update buttons or:
git pull origin main
```

### Portfolio Integration Commands
```bash
# Start this project (from portfolio root)
cd projects/YOUR-PROJECT-NAME && npm run dev

# Add to startup script (automatically done by create-project.ps1)
# Projects are automatically integrated with start-all-tabbed.ps1 and start-all-enhanced.ps1

# Test portfolio integration
cd .. && npm run dev
# Check http://localhost:5173 for live preview
```

## 📁 Template Structure

```
your-project/
├── CLAUDE.md              # This file - Claude context and instructions
├── README.md               # Public documentation
├── package.json            # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.js         # Vite build configuration
├── index.html             # Entry HTML file
├── src/
│   ├── App.tsx            # Main application component
│   ├── App.module.css     # Application styles
│   ├── main.tsx           # Application entry point
│   ├── components/        # React components
│   │   └── ExampleComponent/
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   └── assets/            # Static assets
├── public/                # Public static files
└── docs/                  # Development documentation
```

## 🎨 Styling Guidelines

### CSS Modules
- Use CSS Modules for component styling
- Follow BEM-like naming: `.componentName`, `.componentName__element`, `.componentName--modifier`
- Use CSS custom properties for theming

### Portfolio Integration
- Dark theme compatibility (background: #0a0a0a)
- Cyberpunk aesthetic with neon accents
- Responsive design (mobile-friendly)
- Loading states and transitions

### Color Palette
```css
:root {
  --primary-green: #00ff88;
  --primary-cyan: #00ffff;
  --primary-orange: #ff8800;
  --primary-purple: #aa00ff;
  --bg-dark: #0a0a0a;
  --bg-card: rgba(20, 20, 20, 0.8);
  --border-glow: rgba(0, 255, 136, 0.3);
}
```

## 🔧 Common Development Tasks

### Adding New Components
```bash
mkdir src/components/NewComponent
touch src/components/NewComponent/NewComponent.tsx
touch src/components/NewComponent/NewComponent.module.css
touch src/components/NewComponent/index.ts
```

### Installing Dependencies
```bash
# Production dependencies
npm install library-name

# Development dependencies  
npm install -D @types/library-name

# Update package.json port if needed
```

### Debugging
- Use browser DevTools for React debugging
- Check portfolio console for integration issues
- Test in portfolio grid view with different view modes
- Verify live preview iframe functionality

## 📝 Documentation

### Update This File
Keep CLAUDE.md updated with:
- New features and capabilities
- Architecture decisions
- Integration notes
- Troubleshooting steps

### Create Dev Journal
Create `../dev-journals/your-project-id.md` with:
- Development progress
- Feature implementations
- Challenges and solutions
- Future plans

## 🚀 Deployment

### Build for Production
```bash
npm run build
# Test build locally
npm run preview
```

### GitHub Integration
- Enable GitHub Pages if needed
- Set up CI/CD workflows
- Configure issue templates
- Add proper README.md

## 💡 Next Steps

1. **Define your project vision** - What problem does it solve?
2. **Choose your tech stack** - React, Vue, vanilla JS, etc.
3. **Design the architecture** - Components, data flow, state management
4. **Implement MVP** - Core functionality first
5. **Portfolio integration** - Ensure it works well in the portfolio
6. **Polish and deploy** - Styling, optimization, documentation

---

*This template provides everything needed to create a new project that integrates seamlessly with the Claude Development Portfolio. Update this file as your project evolves.*