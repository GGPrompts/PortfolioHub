import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_SESSIONS = 6;
const MAX_HISTORY_PER_SESSION = 1000;

export const useTerminalStore = create(
  persist(
    (set, get) => ({
      // Terminal sessions
      sessions: new Map(),
      activeSessionId: null,
      
      // Session management
      createSession: (sessionData) => {
        const { sessions } = get();
        const sessionId = sessionData.id || `terminal-${Date.now()}`;
        
        if (sessions.size >= MAX_SESSIONS) {
          const oldestSession = Array.from(sessions.entries())
            .sort(([, a], [, b]) => a.createdAt - b.createdAt)[0];
          if (oldestSession) {
            get().removeSession(oldestSession[0]);
          }
        }
        
        const newSession = {
          id: sessionId,
          name: sessionData.name || `Terminal ${sessions.size + 1}`,
          history: [],
          currentCommand: '',
          isConnected: false,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          cwd: sessionData.cwd || process.cwd(),
          shell: sessionData.shell || 'powershell',
          ...sessionData
        };
        
        sessions.set(sessionId, newSession);
        set({ 
          sessions: new Map(sessions),
          activeSessionId: sessionId 
        });
        
        return sessionId;
      },
      
      updateSession: (sessionId, updates) => {
        const { sessions } = get();
        const session = sessions.get(sessionId);
        
        if (session) {
          const updatedSession = {
            ...session,
            ...updates,
            lastActiveAt: Date.now()
          };
          sessions.set(sessionId, updatedSession);
          set({ sessions: new Map(sessions) });
        }
      },
      
      removeSession: (sessionId) => {
        const { sessions, activeSessionId } = get();
        sessions.delete(sessionId);
        
        const newActiveId = activeSessionId === sessionId 
          ? (sessions.size > 0 ? Array.from(sessions.keys())[0] : null)
          : activeSessionId;
        
        set({ 
          sessions: new Map(sessions),
          activeSessionId: newActiveId
        });
      },
      
      setActiveSession: (sessionId) => {
        const { sessions } = get();
        if (sessions.has(sessionId)) {
          set({ activeSessionId: sessionId });
          get().updateSession(sessionId, { lastActiveAt: Date.now() });
        }
      },
      
      // Command history
      addToHistory: (sessionId, entry) => {
        const { sessions } = get();
        const session = sessions.get(sessionId);
        
        if (session) {
          const history = [...session.history, entry];
          if (history.length > MAX_HISTORY_PER_SESSION) {
            history.shift();
          }
          get().updateSession(sessionId, { history });
        }
      },
      
      clearHistory: (sessionId) => {
        get().updateSession(sessionId, { history: [] });
      },
      
      // Connection management
      setConnectionStatus: (sessionId, isConnected) => {
        get().updateSession(sessionId, { isConnected });
      },
      
      // Current command
      setCurrentCommand: (sessionId, command) => {
        get().updateSession(sessionId, { currentCommand: command });
      },
      
      // Getters
      getSession: (sessionId) => {
        return get().sessions.get(sessionId);
      },
      
      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return activeSessionId ? sessions.get(activeSessionId) : null;
      },
      
      getAllSessions: () => {
        return Array.from(get().sessions.values());
      },
      
      // Clear all sessions
      clearAllSessions: () => {
        set({ 
          sessions: new Map(),
          activeSessionId: null
        });
      }
    }),
    {
      name: 'terminal-sessions',
      partialize: (state) => ({
        sessions: Array.from(state.sessions.entries()).map(([id, session]) => ({
          id,
          ...session,
          // Don't persist connection status
          isConnected: false
        })),
        activeSessionId: state.activeSessionId
      }),
      merge: (persistedState, currentState) => {
        if (persistedState && persistedState.sessions) {
          const sessions = new Map();
          persistedState.sessions.forEach(session => {
            sessions.set(session.id, session);
          });
          return {
            ...currentState,
            sessions,
            activeSessionId: persistedState.activeSessionId
          };
        }
        return currentState;
      }
    }
  )
);

export default useTerminalStore;
