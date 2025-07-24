/**
 * Terminal State Management Types
 * 
 * Comprehensive TypeScript interfaces for multi-terminal support with workbranch isolation
 * and visual checkbox selection for efficient multi-target messaging.
 */

export type TerminalShell = 'powershell' | 'bash' | 'cmd' | 'node' | 'python';
export type TerminalStatus = 'active' | 'idle' | 'busy' | 'error' | 'connecting' | 'disconnected';
export type TerminalType = 'project' | 'utility' | 'workbranch' | 'debug' | 'monitoring';
export type TerminalGridLayout = '1x1' | '1x2' | '1x3' | '1x4' | '2x2' | '2x3' | '3x2' | '2x2-1' | '1x2-2';

/**
 * Core terminal configuration with selection state
 */
export interface TerminalConfig {
  id: string;                    // Unique terminal identifier
  title: string;                 // Display name (ProjectA, Tools, etc.)
  workbranch: string;           // Git workbranch/working directory context
  project?: string;             // Associated project ID (optional)
  shell: TerminalShell;         // Shell type for terminal
  selected: boolean;            // ✨ Checkbox selection state for multi-target messaging
  status: TerminalStatus;       // Current terminal state
  type: TerminalType;           // Terminal category for organization
  autoAssign: boolean;          // Auto-assign based on project selection
  createdAt: Date;              // Creation timestamp
  lastActivity: Date;           // Last activity timestamp
  
  // Context and Environment
  workingDirectory: string;     // Current working directory
  environmentVars?: Record<string, string>; // Custom environment variables
  claudeContext?: string;       // Path to CLAUDE.md for this workbranch
  
  // Visual and UI Properties
  color?: string;               // Terminal accent color
  icon?: string;                // Terminal icon identifier
  position: TerminalPosition;   // Grid position for layout
  
  // Connection and Performance
  connectionId?: string;        // WebSocket connection identifier
  pid?: number;                 // Process ID if available
  performance: TerminalPerformance; // Performance metrics
}

/**
 * Terminal position in grid layout
 */
export interface TerminalPosition {
  row: number;                  // Grid row (0-based)
  col: number;                  // Grid column (0-based)
  span?: {                      // Optional span configuration
    rows?: number;              // Row span (default: 1)
    cols?: number;              // Column span (default: 1)
  };
}

/**
 * Terminal performance metrics
 */
export interface TerminalPerformance {
  messagesCount: number;        // Total messages sent/received
  lastLatency: number;          // Last message roundtrip latency (ms)
  averageLatency: number;       // Average latency over session
  memoryUsage?: number;         // Memory usage if available (MB)
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Visual selection management interface
 */
export interface TerminalSelection {
  selectedCount: number;        // Number of selected terminals
  selectedTerminals: string[];  // Array of selected terminal IDs
  allSelected: boolean;         // Whether all terminals are selected
  
  // Selection Actions
  toggleTerminal: (id: string) => void;           // Toggle single terminal
  selectAll: () => void;                          // Select all terminals
  selectNone: () => void;                         // Deselect all terminals
  selectProjects: () => void;                     // Select project terminals only
  selectUtilities: () => void;                    // Select utility terminals only
  selectWorkbranch: (workbranch: string) => void; // Select by workbranch
  selectByType: (type: TerminalType) => void;     // Select by terminal type
  selectActive: () => void;                       // Select only active terminals
  selectIdle: () => void;                         // Select only idle terminals
  
  // Advanced Selection
  invertSelection: () => void;                    // Invert current selection
  selectByProject: (projectId: string) => void;  // Select terminals for specific project
  selectRecent: (count: number) => void;         // Select N most recently active terminals
}

/**
 * Terminal grid layout configuration
 */
export interface TerminalGridConfig {
  layout: TerminalGridLayout;   // Current layout type
  maxTerminals: number;         // Maximum terminals supported by layout
  autoResize: boolean;          // Auto-resize terminals to fit layout
  showHeaders: boolean;         // Show terminal headers/titles
  showSelection: boolean;       // Show selection checkboxes
  compactMode: boolean;         // Compact view for smaller screens
  
  // Layout Dimensions
  dimensions: {
    rows: number;               // Number of rows in grid
    cols: number;               // Number of columns in grid
    minTerminalWidth: number;   // Minimum terminal width (px)
    minTerminalHeight: number;  // Minimum terminal height (px)
  };
  
  // Responsive Breakpoints
  responsive: {
    small: TerminalGridLayout;  // Layout for small screens
    medium: TerminalGridLayout; // Layout for medium screens
    large: TerminalGridLayout;  // Layout for large screens
  };
}

/**
 * Workbranch context isolation
 */
export interface WorkbranchContext {
  name: string;                 // Workbranch name (e.g., 'feature/multi-workbranch-chat')
  displayName: string;          // Human-readable name
  baseBranch: string;           // Base branch (usually 'master' or 'main')
  claudeContextPath: string;    // Path to CLAUDE.md for this workbranch
  projectRoot: string;          // Root directory for this workbranch
  
  // Associated Terminals
  terminals: string[];          // Terminal IDs using this workbranch
  activeTerminal?: string;      // Currently active terminal for this workbranch
  
  // Git Integration
  gitStatus: 'clean' | 'modified' | 'staged' | 'ahead' | 'behind' | 'diverged';
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: Date;
  };
  
  // Context Metadata
  description?: string;         // Workbranch description
  tags: string[];              // Tags for organization
  priority: 'low' | 'medium' | 'high'; // Priority level
  locked: boolean;             // Whether workbranch is locked from changes
}

/**
 * Multi-target messaging configuration
 */
export interface MultiTargetMessage {
  id: string;                   // Message identifier
  content: string;              // Message content
  targetTerminals: string[];    // Target terminal IDs
  timestamp: Date;              // Send timestamp
  
  // Execution Options
  sequential: boolean;          // Execute sequentially vs parallel
  waitForCompletion: boolean;   // Wait for completion before next
  timeout: number;              // Timeout per terminal (ms)
  
  // Response Handling
  collectResponses: boolean;    // Collect responses from all terminals
  aggregateOutput: boolean;     // Aggregate output into single view
  showIndividualResults: boolean; // Show per-terminal results
  
  // Context and Routing
  workbranchSpecific: boolean;  // Route based on workbranch context
  projectSpecific: boolean;     // Route based on project context
  shellSpecific: boolean;       // Route based on shell type
  
  // Progress Tracking
  status: 'pending' | 'sending' | 'sent' | 'completed' | 'failed';
  results: Map<string, MessageResult>; // Results per terminal
  overallProgress: number;      // Overall completion percentage (0-100)
}

/**
 * Message result from individual terminal
 */
export interface MessageResult {
  terminalId: string;           // Terminal that processed the message
  success: boolean;             // Whether execution succeeded
  output?: string;              // Terminal output
  error?: string;               // Error message if failed
  executionTime: number;        // Time taken (ms)
  timestamp: Date;              // Completion timestamp
}

/**
 * Terminal lifecycle events
 */
export interface TerminalLifecycleEvents {
  onTerminalCreated: (terminal: TerminalConfig) => void;
  onTerminalDestroyed: (terminalId: string) => void;
  onTerminalStatusChanged: (terminalId: string, status: TerminalStatus) => void;
  onTerminalSelected: (terminalId: string, selected: boolean) => void;
  onWorkbranchChanged: (terminalId: string, workbranch: string) => void;
  onMessageSent: (message: MultiTargetMessage) => void;
  onMessageCompleted: (messageId: string, results: Map<string, MessageResult>) => void;
  onLayoutChanged: (layout: TerminalGridLayout) => void;
}

/**
 * Terminal command history
 */
export interface TerminalHistory {
  terminalId: string;           // Terminal identifier
  commands: HistoryEntry[];     // Command history entries
  maxEntries: number;           // Maximum history entries to keep
  searchIndex: Map<string, number[]>; // Search index for quick lookup
}

/**
 * Individual history entry
 */
export interface HistoryEntry {
  id: string;                   // Entry identifier
  command: string;              // Command text
  timestamp: Date;              // Execution timestamp
  workingDirectory: string;     // Directory when executed
  exitCode?: number;            // Command exit code
  output?: string;              // Command output (if captured)
  duration: number;             // Execution duration (ms)
  tags: string[];               // Tags for categorization
}

/**
 * Terminal session statistics
 */
export interface TerminalSessionStats {
  terminalId: string;           // Terminal identifier
  sessionStart: Date;           // Session start time
  totalCommands: number;        // Total commands executed
  totalTime: number;            // Total active time (ms)
  successfulCommands: number;   // Successful command count
  failedCommands: number;       // Failed command count
  averageResponseTime: number;  // Average command response time (ms)
  mostUsedCommands: Array<{     // Most frequently used commands
    command: string;
    count: number;
  }>;
  workbranchSwitches: number;   // Number of workbranch switches
  messagesReceived: number;     // Messages received from multi-target
  messagesSent: number;         // Messages sent to other terminals
}

/**
 * Terminal theme and appearance
 */
export interface TerminalTheme {
  name: string;                 // Theme name
  colors: {
    background: string;         // Background color
    foreground: string;         // Text color
    cursor: string;             // Cursor color
    selection: string;          // Selection highlight
    accent: string;             // Accent color for UI elements
  };
  fonts: {
    family: string;             // Font family
    size: number;               // Font size (px)
    weight: number;             // Font weight
    lineHeight: number;         // Line height multiplier
  };
  ui: {
    borderRadius: number;       // Border radius (px)
    padding: number;            // Internal padding (px)
    headerHeight: number;       // Header height (px)
    showScrollbar: boolean;     // Show scrollbar
  };
}

/**
 * Advanced terminal features configuration
 */
export interface TerminalFeatures {
  // Core Features
  multiSelect: boolean;         // Enable multi-terminal selection
  workbranchIsolation: boolean; // Enable workbranch context isolation
  autoComplete: boolean;        // Enable command auto-completion
  historySearch: boolean;       // Enable history search
  
  // Advanced Features
  scriptRecording: boolean;     // Record command sequences as scripts
  macroSupport: boolean;        // Enable command macros
  templateCommands: boolean;    // Command templates with variables
  smartRouting: boolean;        // Smart message routing based on context
  
  // Integration Features
  gitIntegration: boolean;      // Git status and operations
  projectAware: boolean;        // Project-specific context and commands
  claudeIntegration: boolean;   // Claude AI assistant integration
  performanceMonitoring: boolean; // Performance metrics and monitoring
  
  // Security Features
  commandValidation: boolean;   // Validate commands before execution
  workspaceIsolation: boolean;  // Isolate terminals by workspace
  auditLogging: boolean;        // Log all terminal activities
  privilegeEscalation: boolean; // Allow privilege escalation prompts
}

/**
 * Export all terminal-related types for easy importing
 */
export type {
  TerminalShell,
  TerminalStatus,
  TerminalType,
  TerminalGridLayout,
  TerminalConfig,
  TerminalPosition,
  TerminalPerformance,
  TerminalSelection,
  TerminalGridConfig,
  WorkbranchContext,
  MultiTargetMessage,
  MessageResult,
  TerminalLifecycleEvents,
  TerminalHistory,
  HistoryEntry,
  TerminalSessionStats,
  TerminalTheme,
  TerminalFeatures
};