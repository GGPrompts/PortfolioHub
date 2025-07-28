import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface TerminalSession {
  id: string;
  title: string;
  cwd: string;
  isActive: boolean;
  websocket: WebSocket | null;
  history: string[];
  createdAt: Date;
  lastActivity: Date;
  projectId?: string;
}

interface TerminalSessionsStore {
  sessions: TerminalSession[];
  
  // Actions
  createSession: (config: {
    title: string;
    cwd: string;
    projectId?: string;
  }) => Promise<TerminalSession | null>;
  
  updateSession: (id: string, updates: Partial<TerminalSession>) => void;
  destroySession: (id: string) => Promise<void>;
  getActiveSession: () => TerminalSession | null;
  clearAllSessions: () => Promise<void>;
  
  // History management
  addToHistory: (sessionId: string, line: string) => void;
  clearHistory: (sessionId: string) => void;
}

const useTerminalSessionsStore = create<TerminalSessionsStore>((set, get) => ({
  sessions: [],

  createSession: async (config) => {
    const newSession: TerminalSession = {
      id: uuidv4(),
      title: config.title,
      cwd: config.cwd,
      projectId: config.projectId,
      isActive: true,
      websocket: null,
      history: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };

    // Set all other sessions to inactive
    set(state => ({
      sessions: [
        ...state.sessions.map(s => ({ ...s, isActive: false })),
        newSession
      ]
    }));

    return newSession;
  },

  updateSession: (id, updates) => {
    set(state => ({
      sessions: state.sessions.map(session =>
        session.id === id
          ? { ...session, ...updates, lastActivity: new Date() }
          : session
      )
    }));
  },

  destroySession: async (id) => {
    set(state => ({
      sessions: state.sessions.filter(session => session.id !== id)
    }));
  },

  getActiveSession: () => {
    const { sessions } = get();
    return sessions.find(s => s.isActive) || sessions[0] || null;
  },

  clearAllSessions: async () => {
    set({ sessions: [] });
  },

  addToHistory: (sessionId, line) => {
    set(state => ({
      sessions: state.sessions.map(session =>
        session.id === sessionId
          ? {
              ...session,
              history: [...session.history, line].slice(-100) // Keep last 100 lines
            }
          : session
      )
    }));
  },

  clearHistory: (sessionId) => {
    set(state => ({
      sessions: state.sessions.map(session =>
        session.id === sessionId
          ? { ...session, history: [] }
          : session
      )
    }));
  }
}));

// Hook wrapper for better DX
export const useTerminalSessions = () => {
  const store = useTerminalSessionsStore();
  
  return {
    sessions: store.sessions,
    createSession: store.createSession,
    updateSession: store.updateSession,
    destroySession: store.destroySession,
    getActiveSession: store.getActiveSession,
    clearAllSessions: store.clearAllSessions,
    addToHistory: store.addToHistory,
    clearHistory: store.clearHistory
  };
};