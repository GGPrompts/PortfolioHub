# Project Dev Hub - Wireframe & Design

## 🎯 Overview
Design for project-specific development tabs that open when clicking project headers in the VS Code portfolio. Each tab provides a complete development environment for one project.

## 📱 Wireframe: Project Dev Hub Tab

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ VS Code Tab: "🎮 Matrix Cards - Dev Hub"                                      [×]│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─ PROJECT HEADER ─────────────────────────────────────────────────────────┐   │
│  │  🎮 Matrix Cards                                    🟢 ONLINE (Port 3002) │   │
│  │  React cyberpunk card components with animations                          │   │
│  └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─ QUICK ACTIONS ──────────────────────────────────────────────────────────┐   │
│  │  [🚀 Start Server]  [🛑 Stop Server]  [👁️ Open Preview]  [📱 Mobile Preview] │   │
│  │  [🔄 Git Pull]      [📤 Git Push]     [📂 Open Folder]  [⚙️ Settings]     │   │
│  └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─ DEV NOTES ──────────────────────────────────────────────────────────────┐   │
│  │                                                                            │   │
│  │  ┌─ Matrix Card Note Interface ─────────────────────────────────────────┐ │   │
│  │  │                                                                       │ │   │
│  │  │  ### Claude Instructions (Optional)                                   │ │   │
│  │  │  ┌─────────────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │ Help me implement this feature in Matrix Cards...              │ │ │   │
│  │  │  └─────────────────────────────────────────────────────────────────┘ │ │   │
│  │  │                                                                       │ │   │
│  │  │  ### Note Content                                                     │ │   │
│  │  │  ┌─────────────────────────────────────────────────────────────────┐ │ │   │
│  │  │  │                                                                 │ │ │   │
│  │  │  │ Add hover animations to card flip effects                       │ │ │   │
│  │  │  │ - Research CSS transform performance                            │ │ │   │
│  │  │  │ - Test on mobile devices                                        │ │ │   │
│  │  │  │ - Consider reduced motion preferences                           │ │ │   │
│  │  │  │                                                                 │ │ │   │
│  │  │  └─────────────────────────────────────────────────────────────────┘ │ │   │
│  │  │                                                                       │ │   │
│  │  │  [💾 Save Note]  [🔄 Flip Preview]  [📋 Copy Claude Prompt]        │ │   │
│  │  │                                                                       │ │   │
│  │  └───────────────────────────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─ PROJECT INFO & LINKS ───────────────────────────────────────────────────┐   │
│  │                                                                            │   │
│  │  📂 Path: D:\ClaudeWindows\claude-dev-portfolio\projects\matrix-cards     │   │
│  │  🔗 Port: localhost:3002                                                  │   │
│  │  ⚡ Tech: React, TypeScript, CSS Animations                              │   │
│  │                                                                            │   │
│  │  Quick Links:                                                             │   │
│  │  [📖 README.md]  [🤖 CLAUDE.md]  [📝 Dev Journal]  [⚙️ package.json]    │   │
│  │  [🌐 Repository]  [📊 Lighthouse]  [🔍 Bundle Analyzer]                │   │
│  │                                                                            │   │
│  └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─ RECENT ACTIVITY ─────────────────────────────────────────────────────────┐   │
│  │                                                                            │   │
│  │  🕐 2 minutes ago    Started development server                           │   │
│  │  🕐 15 minutes ago   Saved note: "Card flip performance improvements"    │   │
│  │  🕐 1 hour ago       Git commit: "Add hover animations to matrix cards"  │   │
│  │  🕐 2 hours ago      Opened project in VS Code                           │   │
│  │                                                                            │   │
│  └────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Dual-Action Flow Wireframe

### Step 1: User Clicks Project Header in Portfolio
```
┌─ VS Code Portfolio (Main Tab) ─────────────────────────┐
│                                                        │
│  🎮 Matrix Cards                    🟢 ONLINE         │ ← CLICK HERE
│  React cyberpunk card components                      │
│                                                        │
│  🃏 Sleak Card                      🔴 OFFLINE        │
│  Modern card system with effects                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Step 2: Two Actions Happen Simultaneously

#### Action 1: Dev Hub Tab Opens
```
┌─ New VS Code Tab: "🎮 Matrix Cards - Dev Hub" ────────┐
│                                                        │
│  [Complete dev environment as wireframed above]       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### Action 2: Simple Browser Window Opens
```
┌─ Simple Browser Window: "Matrix Cards Preview" ───────┐
│                                                        │
│  Address: http://localhost:3002                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                    │ │
│  │     [Live Matrix Cards Application]                │ │
│  │     - Full browser capabilities                    │ │
│  │     - Responsive testing tools                     │ │
│  │     - Dev tools access                             │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## 🎨 Design Principles

### Visual Hierarchy
1. **Project Header** - Clear project identity and status
2. **Quick Actions** - Most common tasks prominently displayed  
3. **DEV NOTES** - Large, comfortable writing area (Matrix Card style)
4. **Project Info** - Reference information and links
5. **Recent Activity** - Context for recent work

### Interaction Patterns
- **One-Click Access** - Single click opens both dev hub and preview
- **Contextual Actions** - All buttons relevant to this specific project
- **Familiar Interface** - Matrix Card notes maintain consistent experience
- **Quick Reference** - Important links and info always visible

### Information Architecture
- **Project-Focused** - Everything relates to this one project
- **Development-Oriented** - Tools and actions for active development
- **Self-Contained** - No need to switch between different interfaces

## 📱 Mobile/Responsive Considerations
- Dev hub optimized for desktop VS Code environment
- Simple browser handles mobile responsive testing
- Matrix card notes maintain comfortable proportions

## 🔗 Integration Points
- Automatic project path detection
- Real-time server status monitoring  
- Git status and operations
- File system operations
- Simple Browser API integration

## 🎯 Success Metrics
- Reduced context switching between tools
- Faster note-taking and idea capture
- Improved project development workflow
- Better project status awareness