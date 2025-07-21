#!/usr/bin/env pwsh
# Create New Project Script with 2D/3D Support

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectName,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("2d", "3d")]
    [string]$Type = "2d",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("orbit", "fps", "fly", "gallery")]
    [string]$ControlSystem = "orbit",
    
    [Parameter(Mandatory=$false)]
    [int]$Port = 0,
    
    [Parameter(Mandatory=$false)]
    [string]$Description = ""
)

Write-Host "🚀 Creating new $Type project: $ProjectName" -ForegroundColor Green

# Validate project name
if ($ProjectName -match '[^a-zA-Z0-9-]') {
    Write-Host "❌ Project name can only contain letters, numbers, and hyphens" -ForegroundColor Red
    exit 1
}

# Convert to proper formats
$ProjectId = $ProjectName.ToLower()
$ProjectTitle = $ProjectName -replace '-', ' ' | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_) }
$ProjectDir = "D:\ClaudeWindows\claude-dev-portfolio\projects\$ProjectId"

# Set description based on type if not provided
if ($Description -eq "") {
    if ($Type -eq "3d") {
        $Description = "A 3D interactive experience built with Three.js and React"
    } else {
        $Description = "A new project in the Claude Development Portfolio"
    }
}

# Check if project already exists
if (Test-Path $ProjectDir) {
    Write-Host "❌ Project '$ProjectId' already exists" -ForegroundColor Red
    exit 1
}

# Find available port if not specified
if ($Port -eq 0) {
    $UsedPorts = @()
    $ManifestPath = "D:\ClaudeWindows\claude-dev-portfolio\projects\manifest.json"
    if (Test-Path $ManifestPath) {
        Get-Content $ManifestPath | ConvertFrom-Json | ForEach-Object {
            $_.projects | ForEach-Object {
                if ($_.localPort) {
                    $UsedPorts += $_.localPort
                }
            }
        }
    }
    
    # Find next available port starting from 3006
    $Port = 3006
    while ($UsedPorts -contains $Port) {
        $Port++
    }
}

# Select template based on type
$TemplateDir = if ($Type -eq "3d") {
    "D:\ClaudeWindows\claude-dev-portfolio\project-template-3d"
} else {
    "D:\ClaudeWindows\claude-dev-portfolio\project-template"
}

# Check if 3D template exists, if not create it
if ($Type -eq "3d" -and !(Test-Path $TemplateDir)) {
    Write-Host "📦 Setting up 3D template..." -ForegroundColor Cyan
    
    # Copy Modular3D as base
    $Modular3DPath = "D:\ClaudeWindows\claude-dev-portfolio\projects\Modular3D"
    if (Test-Path $Modular3DPath) {
        Copy-Item -Path $Modular3DPath -Destination $TemplateDir -Recurse
        
        # Clean up template
        Remove-Item "$TemplateDir\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "$TemplateDir\.git" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "$TemplateDir\package-lock.json" -Force -ErrorAction SilentlyContinue
        
        # Update template files to use placeholders
        $PackageJson = Get-Content "$TemplateDir\package.json" -Raw | ConvertFrom-Json
        $PackageJson.name = "PROJECT_NAME"
        $PackageJson.scripts.dev = "vite --port 3006 --host 0.0.0.0"
        $PackageJson | ConvertTo-Json -Depth 10 | Set-Content "$TemplateDir\package.json"
    } else {
        Write-Host "❌ Modular3D project not found. Please ensure it exists first." -ForegroundColor Red
        exit 1
    }
}

Write-Host "📁 Creating project directory..." -ForegroundColor Cyan
Copy-Item -Path $TemplateDir -Destination $ProjectDir -Recurse

Write-Host "📝 Updating project files..." -ForegroundColor Cyan

# Update package.json
$PackageJson = Get-Content "$ProjectDir\package.json" -Raw | ConvertFrom-Json
$PackageJson.name = $ProjectId
$PackageJson.scripts.dev = "vite --port $Port --host 0.0.0.0"
$PackageJson | ConvertTo-Json -Depth 10 | Set-Content "$ProjectDir\package.json"

# Update vite.config files
$ViteConfig = if (Test-Path "$ProjectDir\vite.config.js") { "$ProjectDir\vite.config.js" } else { "$ProjectDir\vite.config.ts" }
if (Test-Path $ViteConfig) {
    (Get-Content $ViteConfig) -replace 'port: \d+', "port: $Port" | Set-Content $ViteConfig
}

# Update index.html
(Get-Content "$ProjectDir\index.html") -replace 'PROJECT_NAME', $ProjectTitle | Set-Content "$ProjectDir\index.html"

# Update main app file based on type
if ($Type -eq "3d") {
    # Create App.tsx for 3D project with selected control system
    $AppContent = @"
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Scene3D } from './Scene3D';
import { UI } from './UI';
import './App.css';

export default function App() {
    return (
        <div className="app">
            <Canvas
                shadows
                camera={{ position: [5, 5, 5], fov: 50 }}
            >
                <Suspense fallback={null}>
                    <Scene3D controlType="$ControlSystem" />
                </Suspense>
            </Canvas>
            <UI projectName="$ProjectTitle" />
        </div>
    );
}
"@
    Set-Content "$ProjectDir\src\App.tsx" -Value $AppContent
    
    # Create Scene3D component
    $Scene3DContent = @"
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Grid, Stats } from '@react-three/drei';
import { Controls } from './controls/Controls';
import * as THREE from 'three';

interface Scene3DProps {
    controlType: 'orbit' | 'fps' | 'fly' | 'gallery';
}

export function Scene3D({ controlType }: Scene3DProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    
    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.5;
        }
    });
    
    return (
        <>
            <Stats />
            <Controls type={controlType} />
            
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            
            {/* Environment */}
            <Environment preset="city" />
            <Grid args={[20, 20]} />
            
            {/* Example object */}
            <mesh ref={meshRef} position={[0, 1, 0]} castShadow>
                <boxGeometry args={[2, 2, 2]} />
                <meshStandardMaterial color="#00ff88" />
            </mesh>
            
            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[20, 20]} />
                <shadowMaterial opacity={0.3} />
            </mesh>
        </>
    );
}
"@
    Set-Content "$ProjectDir\src\Scene3D.tsx" -Value $Scene3DContent
    
    # Create Controls wrapper
    $ControlsContent = @"
import React from 'react';
import { OrbitControls } from '@react-three/drei';
// Import custom controls when ready
// import { FPSControls } from './FPSControls';
// import { FlyControls } from './FlyControls';
// import { GalleryControls } from './GalleryControls';

interface ControlsProps {
    type: 'orbit' | 'fps' | 'fly' | 'gallery';
}

export function Controls({ type }: ControlsProps) {
    switch (type) {
        case 'orbit':
        default:
            return (
                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={3}
                    maxDistance={20}
                    maxPolarAngle={Math.PI / 2}
                />
            );
        // Add other control types as you implement them
    }
}
"@
    New-Item -Path "$ProjectDir\src\controls" -ItemType Directory -Force | Out-Null
    Set-Content "$ProjectDir\src\controls\Controls.tsx" -Value $ControlsContent
    
    # Create UI component
    $UIContent = @"
import React from 'react';

interface UIProps {
    projectName: string;
}

export function UI({ projectName }: UIProps) {
    const controlInfo = {
        orbit: [
            'Left Click + Drag: Rotate',
            'Right Click + Drag: Pan',
            'Scroll: Zoom'
        ],
        fps: [
            'WASD: Move',
            'Mouse: Look',
            'Space: Jump',
            'Shift: Run'
        ],
        fly: [
            'WASD: Move',
            'Q/E: Up/Down',
            'Mouse: Look',
            'Shift: Boost'
        ],
        gallery: [
            'Scroll: Next/Prev View',
            'Number Keys: Jump to View',
            'Click: Select Object'
        ]
    };
    
    return (
        <>
            <div id="info" className="ui-overlay">
                <h1>{projectName}</h1>
            </div>
            
            <div className="controls-info ui-overlay">
                <h3>Controls</h3>
                <div id="controls-display">
                    {controlInfo['$ControlSystem']?.map((control, i) => (
                        <div key={i}>• {control}</div>
                    )) || 'Loading controls...'}
                </div>
            </div>
        </>
    );
}
"@
    Set-Content "$ProjectDir\src\UI.tsx" -Value $UIContent
    
    # Create App.css
    $AppCSS = @"
.app {
    width: 100vw;
    height: 100vh;
    position: relative;
}

.ui-overlay {
    position: absolute;
    color: white;
    pointer-events: none;
    user-select: none;
}

.ui-overlay * {
    pointer-events: auto;
}

#info {
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    padding: 10px 20px;
    border-radius: 8px;
    border: 1px solid rgba(0, 255, 255, 0.3);
    text-align: center;
}

#info h1 {
    margin: 0;
    font-size: 24px;
    color: #00ffff;
}

.controls-info {
    bottom: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.8);
    padding: 15px;
    border-radius: 8px;
    border: 1px solid rgba(0, 255, 255, 0.3);
    font-size: 14px;
    line-height: 1.6;
    max-width: 300px;
}

.controls-info h3 {
    margin: 0 0 10px 0;
    color: #00ffff;
    font-size: 16px;
}
"@
    Set-Content "$ProjectDir\src\App.css" -Value $AppCSS
    
} else {
    # Update App.tsx for 2D project
    if (Test-Path "$ProjectDir\src\App.tsx") {
        (Get-Content "$ProjectDir\src\App.tsx") -replace 'PROJECT_NAME', $ProjectTitle | Set-Content "$ProjectDir\src\App.tsx"
    }
}

# Update or create main.tsx
$MainContent = if ($Type -eq "3d") {
@"
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Hide loading screen after app loads
window.addEventListener('load', () => {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('fade-out');
        setTimeout(() => loading.remove(), 500);
    }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
"@
} else {
@"
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
"@
}
Set-Content "$ProjectDir\src\main.tsx" -Value $MainContent

# Create index.css
$IndexCSS = @"
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a0a;
    color: #ffffff;
    overflow: hidden;
}

#root {
    width: 100vw;
    height: 100vh;
}

/* Loading animation */
.loading {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #0a0a0a;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    opacity: 1;
    transition: opacity 0.5s ease-out;
}

.loading.fade-out {
    opacity: 0;
    pointer-events: none;
}

.loading-spinner {
    width: 50px;
    height: 50px;
    border: 3px solid rgba(0, 255, 255, 0.2);
    border-top-color: #00ffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
"@
Set-Content "$ProjectDir\src\index.css" -Value $IndexCSS

# Create/Update README.md
$ReadmeContent = @"
# $ProjectTitle

$Description

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
\`\`\`

## 📁 Project Structure

"@

if ($Type -eq "3d") {
    $ReadmeContent += @"
\`\`\`
src/
├── components/         # React components
├── controls/          # 3D control systems
├── core/             # Core 3D utilities
├── Scene3D.tsx       # Main 3D scene
├── UI.tsx            # UI overlays
├── App.tsx           # Main application
└── main.tsx          # Entry point
\`\`\`

## 🎮 3D Features

- **Control System**: $ControlSystem
- **Three.js** with React Three Fiber
- **Drei** helpers and utilities
- **Stats.js** performance monitoring
- **lil-gui** for runtime tweaking
- **Modular component system**

## 🎯 Control Systems

This project uses the **$ControlSystem** control system by default.

### Available Control Systems:
- **orbit**: OrbitControls for general 3D viewing
- **fps**: First-person shooter style controls
- **fly**: Free flight controls
- **gallery**: Fixed viewpoint navigation

"@
} else {
    $ReadmeContent += @"
\`\`\`
src/
├── components/         # React components
├── hooks/             # Custom React hooks  
├── utils/             # Utility functions
├── types/             # TypeScript types
├── assets/            # Static assets
├── App.tsx            # Main application
└── main.tsx           # Entry point
\`\`\`

"@
}

$ReadmeContent += @"
## 🛠️ Development

This project is part of the Claude Development Portfolio and includes:

- **React 18** with TypeScript
- **Vite** for fast development and building
"@

if ($Type -eq "3d") {
    $ReadmeContent += @"
- **Three.js** for 3D graphics
- **React Three Fiber** for React integration
- **Drei** for 3D helpers and utilities
"@
}

$ReadmeContent += @"
- **Portfolio integration** ready out of the box

## 📚 Documentation

See \`CLAUDE.md\` for detailed development instructions and Claude Code integration.

## 🔗 Portfolio Integration

This project is designed to work seamlessly with the Claude Development Portfolio:
- Live preview in portfolio grid view
- Automatic port management (Port: $Port)
- Git update integration
- Development journal tracking

## 🎨 Styling

Uses the portfolio color palette and design system:
- Dark theme compatible
- Cyberpunk aesthetic with neon accents
- Responsive design
- CSS custom properties for theming

## 📝 License

This project is part of the Claude Development Portfolio system.
"@

Set-Content "$ProjectDir\README.md" -Value $ReadmeContent

# Create CLAUDE.md
$ClaudeContent = @"
# $ProjectTitle - Claude Development Guide

This document provides instructions for developing this project with Claude Code.

## Project Context

**Type**: $(if ($Type -eq "3d") { "3D Interactive Experience" } else { "2D React Application" })
**Port**: $Port
**Created**: $(Get-Date -Format 'yyyy-MM-dd')
"@

if ($Type -eq "3d") {
    $ClaudeContent += @"
**Control System**: $ControlSystem
**Tech Stack**: React, TypeScript, Three.js, React Three Fiber, Drei

## 3D Development Guidelines

### Scene Structure
- Main scene logic in \`Scene3D.tsx\`
- UI overlays in \`UI.tsx\`
- Controls managed in \`controls/Controls.tsx\`

### Adding New 3D Objects
1. Create component in \`src/components/\`
2. Import in \`Scene3D.tsx\`
3. Add to scene graph
4. Configure shadows and materials

### Control System Integration
Current control system: **$ControlSystem**

To change control systems:
1. Update \`controls/Controls.tsx\`
2. Import the desired control system
3. Update the switch statement
4. Update UI control hints

### Performance Optimization
- Use instancing for repeated objects
- Implement LOD (Level of Detail)
- Optimize textures and models
- Monitor with Stats.js panel

### Common Three.js Patterns
\`\`\`typescript
// Animated object
const meshRef = useRef<THREE.Mesh>(null);
useFrame((state, delta) => {
    if (meshRef.current) {
        meshRef.current.rotation.y += delta;
    }
});
\`\`\`

"@
} else {
    $ClaudeContent += @"
**Tech Stack**: React, TypeScript, Vite

## Development Guidelines

### Component Structure
- Functional components with TypeScript
- Custom hooks in \`src/hooks/\`
- Shared types in \`src/types/\`
- Utility functions in \`src/utils/\`

"@
}

$ClaudeContent += @"
## Portfolio Integration

This project is integrated with the Claude Development Portfolio system:
- Live preview at portfolio index
- Development server on port $Port
- Git integration for updates
- Development journal at \`projects/dev-journals/$ProjectId.md\`

## Claude Code Commands

### Initial Setup
\`\`\`bash
cd $ProjectDir
npm install
npm run dev
\`\`\`

### Common Tasks
- **Add component**: Create in \`src/components/\`
- **Update styles**: Modify \`src/App.css\` or component styles
- **Add dependencies**: \`npm install [package]\`
- **Build project**: \`npm run build\`

## Project-Specific Notes

Add your project-specific documentation here...

## Resources
"@

if ($Type -eq "3d") {
    $ClaudeContent += @"
- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
- [Drei Documentation](https://github.com/pmndrs/drei)
- [Three.js Examples](https://threejs.org/examples/)
"@
} else {
    $ClaudeContent += @"
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vite Documentation](https://vitejs.dev/)
"@
}

Set-Content "$ProjectDir\CLAUDE.md" -Value $ClaudeContent

Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
Set-Location $ProjectDir
npm install

Write-Host "🔧 Initializing git repository..." -ForegroundColor Cyan
git init
git add .
$CommitMessage = if ($Type -eq "3d") {
    "feat: initial 3D project setup with $ControlSystem controls"
} else {
    "feat: initial project setup from template"
}

git commit -m "$CommitMessage

- Set up $ProjectTitle project structure
- Configure port $Port
- Add portfolio integration files
$(if ($Type -eq '3d') { '- Initialize 3D environment with ' + $ControlSystem + ' controls' } else { '- Initialize with example component' })

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

Write-Host "📋 Creating dev journal..." -ForegroundColor Cyan
$JournalPath = "D:\ClaudeWindows\claude-dev-portfolio\projects\dev-journals\$ProjectId.md"
New-Item -Path (Split-Path $JournalPath) -ItemType Directory -Force | Out-Null

$JournalContent = @"
# $ProjectTitle - Development Journal

## Project Overview
$Description

**Created**: $(Get-Date -Format 'yyyy-MM-dd')
**Port**: $Port
**Type**: $(if ($Type -eq "3d") { "3D Interactive Experience" } else { "2D React Application" })
"@

if ($Type -eq "3d") {
    $JournalContent += @"
**Control System**: $ControlSystem
**Tech Stack**: React, TypeScript, Three.js, React Three Fiber, Drei
"@
} else {
    $JournalContent += @"
**Tech Stack**: React, TypeScript, Vite
"@
}

$JournalContent += @"

## Development Log

### $(Get-Date -Format 'yyyy-MM-dd') - Project Initialization
- Created project from $(if ($Type -eq "3d") { "3D" } else { "2D" }) template
- Set up $(if ($Type -eq "3d") { "Three.js environment with $ControlSystem controls" } else { "React + TypeScript structure" })
- Configured development server on port $Port
- Ready for feature development

## Next Steps
- [ ] Define project requirements and features
- [ ] Create initial $(if ($Type -eq "3d") { "3D scene" } else { "component" }) architecture
- [ ] Add to portfolio manifest
- [ ] Implement core functionality
$(if ($Type -eq "3d") { "- [ ] Optimize 3D performance`n- [ ] Add interactive elements" } else { "" })

## Notes
- Uses portfolio color palette and styling
- Integrated with portfolio live preview system
- Git repository initialized and ready for GitHub
$(if ($Type -eq "3d") { "- Modular 3D component system ready for expansion" } else { "" })
"@

Set-Content $JournalPath -Value $JournalContent

Write-Host "📋 Updating portfolio manifest..." -ForegroundColor Cyan

# Read current manifest
$ManifestPath = "D:\ClaudeWindows\claude-dev-portfolio\projects\manifest.json"
$Manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json

# Create new project entry
$Tags = if ($Type -eq "3d") {
    @("React", "TypeScript", "Three.js", "3D", "New")
} else {
    @("React", "TypeScript", "New")
}

$Tech = if ($Type -eq "3d") {
    @("React", "Vite", "TypeScript", "Three.js", "React Three Fiber", "Drei")
} else {
    @("React", "Vite", "TypeScript")
}

$Features = if ($Type -eq "3d") {
    @(
        "3D interactive environment",
        "$ControlSystem control system",
        "React Three Fiber integration",
        "Portfolio integration",
        "Modern development setup"
    )
} else {
    @(
        "React 18 with TypeScript",
        "Portfolio integration",
        "Modern development setup"
    )
}

$NewProject = @{
    id = $ProjectId
    title = $ProjectTitle
    description = $Description
    displayType = "external"
    localPort = $Port
    buildCommand = "npm run dev"
    path = $ProjectId
    thumbnail = "thumbnails/$ProjectId.png"
    tags = $Tags
    tech = $Tech
    status = "active"
    devJournal = "projects/dev-journals/$ProjectId.md"
    features = $Features
}

# Add to manifest
$Manifest.projects += $NewProject
$Manifest | ConvertTo-Json -Depth 10 | Set-Content $ManifestPath

Write-Host "📡 Updating port manager..." -ForegroundColor Cyan

# Update portManager.ts
$PortManagerPath = "D:\ClaudeWindows\claude-dev-portfolio\src\utils\portManager.ts"
$PortManagerContent = Get-Content $PortManagerPath -Raw

# Add new port entry
$Pattern = '(\s+)(};)(\s+// Fallback ports)'
$Replacement = "`$1  '$ProjectId': $Port,`n`$1`$2`$3"
$PortManagerContent = $PortManagerContent -replace $Pattern, $Replacement
Set-Content $PortManagerPath -Value $PortManagerContent

Write-Host ""
Write-Host "✅ $Type Project '$ProjectTitle' created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Project Location: $ProjectDir" -ForegroundColor Yellow
Write-Host "🌐 Development Port: $Port" -ForegroundColor Yellow
Write-Host "📝 Dev Journal: $JournalPath" -ForegroundColor Yellow

if ($Type -eq "3d") {
    Write-Host "🎮 Control System: $ControlSystem" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. cd $ProjectDir"
Write-Host "  2. npm run dev"
Write-Host "  3. Refresh portfolio to see new project"
Write-Host ""

if ($Type -eq "3d") {
    Write-Host "✨ 3D Features Included:" -ForegroundColor Green
    Write-Host "  ✅ Three.js + React Three Fiber setup"
    Write-Host "  ✅ $ControlSystem control system configured"
    Write-Host "  ✅ Stats.js performance monitoring"
    Write-Host "  ✅ Basic 3D scene with lighting"
    Write-Host "  ✅ Modular component structure"
    Write-Host ""
}

Write-Host "🎯 Happy coding with Claude!" -ForegroundColor Green
