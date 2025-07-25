import React from 'react';

const SvgIcon = ({ 
  name, 
  size = 16, 
  className = '', 
  color = 'currentColor',
  ...props 
}) => {
  const iconComponents = {
    // Projects icon - file/document
    fileText: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
    ),
    
    // Journals icon - edit/writing
    edit: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        <path d="m15 5 4 4"/>
      </svg>
    ),
    
    // Dashboard icon - settings/management
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),

    // Additional useful icons for buttons
    play: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polygon points="5,3 19,12 5,21"/>
      </svg>
    ),
    
    stop: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="6" y="6" width="12" height="12"/>
      </svg>
    ),
    
    // Arrow icons
    arrowLeft: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <line x1="19" y1="12" x2="5" y2="12"/>
        <polyline points="12,19 5,12 12,5"/>
      </svg>
    ),
    
    // Info icon
    info: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
    
    // Terminal icon
    terminal: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="4,17 10,11 4,5"/>
        <line x1="12" y1="19" x2="20" y2="19"/>
      </svg>
    ),
    
    // Box icon for build
    box: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
    
    // Check circle for tests
    checkCircle: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22,4 12,14.01 9,11.01"/>
      </svg>
    ),
    
    refreshCw: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M3 21v-5h5"/>
      </svg>
    ),

    copy: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    ),

    eye: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),

    save: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17,21 17,13 7,13 7,21"/>
        <polyline points="7,3 7,8 15,8"/>
      </svg>
    ),

    x: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    ),
    
    refresh: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="23,4 23,10 17,10"/>
        <polyline points="1,20 1,14 7,14"/>
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
      </svg>
    ),
    
    // Mobile/Phone icon
    smartphone: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
        <line x1="12" y1="18" x2="12" y2="18"/>
      </svg>
    ),
    
    // Desktop/Monitor icon
    monitor: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    
    // Expand/Desktop view icon (from GGPrompts)
    expand: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
      </svg>
    ),
    
    // More horizontal (three dots) icon for dropdown
    moreHorizontal: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="1"/>
        <circle cx="19" cy="12" r="1"/>
        <circle cx="5" cy="12" r="1"/>
      </svg>
    ),
    
    eyeOff: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    ),
    
    // GitHub icon
    github: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    ),

    // New Project Wizard icons
    plus: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),

    layers: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polygon points="12,2 2,7 12,12 22,7 12,2"/>
        <polyline points="2,17 12,22 22,17"/>
        <polyline points="2,12 12,17 22,12"/>
      </svg>
    ),

    gamepad: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <line x1="6" y1="12" x2="18" y2="12"/>
        <line x1="12" y1="6" x2="12" y2="18"/>
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
      </svg>
    ),

    server: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="2" y="3" width="20" height="4" rx="1"/>
        <rect x="2" y="9" width="20" height="4" rx="1"/>
        <rect x="2" y="15" width="20" height="4" rx="1"/>
        <line x1="6" y1="5" x2="6" y2="5"/>
        <line x1="6" y1="11" x2="6" y2="11"/>
        <line x1="6" y1="17" x2="6" y2="17"/>
      </svg>
    ),

    check: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="20,6 9,17 4,12"/>
      </svg>
    ),

    arrowRight: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12,5 19,12 12,19"/>
      </svg>
    ),

    rocket: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
      </svg>
    ),

    alertTriangle: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),

    sparkles: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/>
        <path d="M19 17v4"/>
        <path d="M3 5h4"/>
        <path d="M17 19h4"/>
      </svg>
    ),

    // Sidebar state icons - simple rectangle with vertical line
    sidebarSmall: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        {/* Rectangle border */}
        <rect x="4" y="6" width="16" height="12" rx="2" fill="none"/>
        {/* Small vertical line representing narrow sidebar */}
        <line x1="8" y1="6" x2="8" y2="18"/>
      </svg>
    ),

    sidebarLarge: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        {/* Rectangle border */}
        <rect x="4" y="6" width="16" height="12" rx="2" fill="none"/>
        {/* Large vertical line representing wide sidebar */}
        <line x1="12" y1="6" x2="12" y2="18"/>
      </svg>
    ),

    // VS Code icon
    code: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="16,18 22,12 16,6"/>
        <polyline points="8,6 2,12 8,18"/>
      </svg>
    ),

    // Additional VS Code related icons
    terminal2: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="4,17 10,11 4,5"/>
        <line x1="12" y1="19" x2="20" y2="19"/>
      </svg>
    ),

    folder: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),

    externalLink: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M7 17l9.2-9.2M17 7H7v10"/>
      </svg>
    ),

    alertCircle: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),

    // Browser-related icons
    globe: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),

    home: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),

    chevronLeft: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="15,18 9,12 15,6"/>
      </svg>
    ),

    chevronRight: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="9,18 15,12 9,6"/>
      </svg>
    ),

    chevronDown: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="6,9 12,15 18,9"/>
      </svg>
    ),

    brain: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.51 2.51 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.51 2.51 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
      </svg>
    ),

    loader: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <line x1="12" y1="2" x2="12" y2="6"/>
        <line x1="12" y1="18" x2="12" y2="22"/>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
        <line x1="2" y1="12" x2="6" y2="12"/>
        <line x1="18" y1="12" x2="22" y2="12"/>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
      </svg>
    ),

    compass: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/>
      </svg>
    ),

    book: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),

    package: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),

    helpCircle: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),

    // Lightning/zap icon for enhanced launch
    zap: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
      </svg>
    ),

    // Rotate counter-clockwise icon for force restart
    rotateCcw: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="1,4 1,10 7,10"/>
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
      </svg>
    ),

    // Terminal and chat icons
    terminal: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="4,17 10,11 4,5"/>
        <line x1="12" y1="19" x2="20" y2="19"/>
      </svg>
    ),

    gitBranch: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <line x1="6" y1="3" x2="6" y2="15"/>
        <circle cx="18" cy="6" r="3"/>
        <circle cx="6" cy="18" r="3"/>
        <path d="M18 9a9 9 0 0 1-9 9"/>
      </svg>
    ),

    pause: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>
    ),

    send: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22,2 15,22 11,13 2,9"/>
      </svg>
    ),

    messageSquare: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),

    grid: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),

    maximize: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>
    ),

    minimize: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
      </svg>
    ),

    minus: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),

    square: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      </svg>
    ),

    columns: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="3" y="3" width="7" height="18"/>
        <rect x="14" y="3" width="7" height="18"/>
      </svg>
    ),

    wifiOff: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
    ),

    wifi: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
        <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
    ),

    // Missing icons for terminal interface
    layout: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="9" y1="3" x2="9" y2="21"/>
        <line x1="15" y1="3" x2="15" y2="21"/>
      </svg>
    ),

    selectAll: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="3" y="3" width="18" height="7" rx="1"/>
        <rect x="3" y="14" width="18" height="7" rx="1"/>
        <circle cx="7" cy="6.5" r="1" fill={color}/>
        <circle cx="7" cy="17.5" r="1" fill={color}/>
      </svg>
    ),

    checkSquare: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <polyline points="9,11 12,14 16,8"/>
      </svg>
    ),

    menu: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    ),

    history: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="1,4 1,10 7,10"/>
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
      </svg>
    ),

    trash2: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="3,6 5,6 21,6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
      </svg>
    ),

    chevronUp: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <polyline points="18,15 12,9 6,15"/>
      </svg>
    ),

    target: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    ),

    clock: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
    ),

    circle: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    )
  };

  const IconComponent = iconComponents[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <span
      className={`svg-icon ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        color: color
      }}
      {...props}
    >
      {React.cloneElement(IconComponent, {
        width: size,
        height: size,
        style: { display: 'block' }
      })}
    </span>
  );
};

export default SvgIcon;