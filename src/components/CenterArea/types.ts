import { Terminal } from 'xterm';

// Terminal Grid Layout Options
export type TerminalGridLayout = 
  | 'single'      // 1x1 - Full-width single terminal
  | 'split'       // 1x2 - Side-by-side terminals  
  | 'triple'      // 2x2-1 - 2 top, 1 bottom
  | 'quad'        // 2x2 - Perfect 2×2 grid
  | 'vertical'    // 1x4 - 4 vertical columns
  | 'custom';     // User-defined layout

// Terminal Instance Interface
export interface TerminalInstance {
  id: string;
  title: string;
  terminal: Terminal;
  websocket?: WebSocket;
  workbranchId: string;
  projectId?: string;
  selected: boolean;
  status: 'idle' | 'running' | 'error' | 'disconnected';
  lastActivity: Date;
  element?: HTMLDivElement;
}

// Terminal Grid Configuration
export interface TerminalGridConfig {
  layout: TerminalGridLayout;
  terminals: TerminalInstance[];
  selectedTerminals: Set<string>;
  maxTerminals: number;
}

// Chat Interface Configuration
export interface ChatInterfaceConfig {
  multiTargetEnabled: boolean;
  selectedTargets: Set<string>;
  messageHistory: ChatMessage[];
  autoScroll: boolean;
}

// Chat Message Structure
export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  targets: string[];
  source: 'user' | 'system';
  status: 'sending' | 'sent' | 'error';
}

// Terminal Header Interface
export interface TerminalHeaderProps {
  terminal: TerminalInstance;
  selected: boolean;
  onToggleSelection: (terminalId: string) => void;
  onClose: (terminalId: string) => void;
  onRename: (terminalId: string, newTitle: string) => void;
}

// Terminal Layout Dimensions
export interface TerminalDimensions {
  width: number;
  height: number;
  rows: number;
  cols: number;
}

// Layout Grid Position
export interface GridPosition {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

// Terminal Service Connection
export interface TerminalService {
  connect: (terminalId: string, workbranchId: string) => Promise<WebSocket>;
  disconnect: (terminalId: string) => Promise<void>;
  sendCommand: (terminalId: string, command: string) => Promise<void>;
  sendToMultiple: (terminalIds: string[], command: string) => Promise<void>;
  getStatus: (terminalId: string) => Promise<'connected' | 'disconnected' | 'error'>;
}

// Quick Selection Presets
export interface SelectionPreset {
  id: string;
  name: string;
  description: string;
  terminalFilter: (terminal: TerminalInstance) => boolean;
  icon: string;
}

// Keyboard Shortcuts
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: string;
  description: string;
}

// Terminal Theme Configuration
export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
  selectionForeground?: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

// Center Area State
export interface CenterAreaState {
  // Grid Configuration
  layout: TerminalGridLayout;
  terminals: TerminalInstance[];
  selectedTerminals: Set<string>;
  
  // Chat Interface
  chatEnabled: boolean;
  messageInput: string;
  chatHistory: ChatMessage[];
  
  // UI State
  isResizing: boolean;
  showChat: boolean;
  gridDimensions: TerminalDimensions;
  
  // Settings
  theme: TerminalTheme;
  shortcuts: KeyboardShortcut[];
  selectionPresets: SelectionPreset[];
}

// Action Types for State Management
export type CenterAreaAction = 
  | { type: 'ADD_TERMINAL'; payload: { workbranchId: string; projectId?: string } }
  | { type: 'REMOVE_TERMINAL'; payload: { terminalId: string } }
  | { type: 'SELECT_TERMINAL'; payload: { terminalId: string; selected: boolean } }
  | { type: 'SELECT_ALL_TERMINALS' }
  | { type: 'DESELECT_ALL_TERMINALS' }
  | { type: 'SET_LAYOUT'; payload: { layout: TerminalGridLayout } }
  | { type: 'SEND_MESSAGE'; payload: { content: string; targets: string[] } }
  | { type: 'TOGGLE_CHAT'; payload: { enabled: boolean } }
  | { type: 'UPDATE_TERMINAL_STATUS'; payload: { terminalId: string; status: TerminalInstance['status'] } }
  | { type: 'RESIZE_GRID'; payload: { dimensions: TerminalDimensions } };

// Component Props Interfaces
export interface CenterAreaProps {
  className?: string;
  initialLayout?: TerminalGridLayout;
  maxTerminals?: number;
  onTerminalAdd?: (terminal: TerminalInstance) => void;
  onTerminalRemove?: (terminalId: string) => void;
  onLayoutChange?: (layout: TerminalGridLayout) => void;
}

export interface TerminalGridProps {
  terminals: TerminalInstance[];
  layout: TerminalGridLayout;
  selectedTerminals: Set<string>;
  onTerminalSelect: (terminalId: string, selected: boolean) => void;
  onTerminalClose: (terminalId: string) => void;
  onLayoutChange: (layout: TerminalGridLayout) => void;
  dimensions?: TerminalDimensions;
  className?: string;
}

export interface ChatInterfaceProps {
  selectedTerminals: Set<string>;
  terminals: TerminalInstance[];
  messageHistory: ChatMessage[];
  onSendMessage: (content: string, targets: string[]) => void;
  onClearHistory: () => void;
  onTerminalSelect: (terminalId: string, selected: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  className?: string;
}

export interface TerminalSelectorProps {
  terminals: TerminalInstance[];
  selectedTerminals: Set<string>;
  selectionPresets: SelectionPreset[];
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectPreset: (presetId: string) => void;
  onToggleTerminal: (terminalId: string) => void;
  className?: string;
}