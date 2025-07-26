# 🚀 Standalone Node.js Backend Plan

## 📋 **Current Status** 
✅ **Working terminal streaming with VS Code dependency**
- Real terminal output via node-pty ✅
- Individual terminal sessions ✅  
- Ultra-wide responsive layout ✅
- Close terminal functionality ✅
- **Issue**: All commands execute in "React Bridge Command" terminal

## 🎯 **Goal: Eliminate VS Code Dependency**
Create a standalone Node.js backend that provides the same terminal functionality without requiring VS Code extension.

---

## 🏗️ **Architecture Overview**

### **Current (VS Code Dependent)**
```
React App (5173) → WebSocket (8123) → VS Code Extension → node-pty terminals
```

### **Target (Standalone)**
```
React App (5173) → WebSocket (8002) → Node.js Backend → node-pty terminals
```

---

## 📁 **Implementation Plan**

### **Phase 1: Create Standalone Backend** ⭐ **START HERE**

#### **1.1: Create Backend Server** (`backend/server.js`)
```javascript
// Key features to implement:
// - Express server with WebSocket support
// - Terminal session management using node-pty
// - Security validation (reuse existing patterns)
// - Real-time output streaming
// - Session cleanup and lifecycle management
```

**Dependencies needed:**
```json
{
  "@homebridge/node-pty-prebuilt-multiarch": "^0.13.1",
  "ws": "^8.14.2", 
  "express": "^4.18.0",
  "cors": "^2.8.5"
}
```

**File structure:**
```
backend/
├── server.js              # Main Express + WebSocket server
├── services/
│   ├── terminalManager.js  # Terminal session management
│   ├── securityService.js  # Command validation (copy from existing)
│   └── messageRouter.js    # WebSocket message routing
├── package.json
└── README.md
```

#### **1.2: Terminal Session Management**
- **Individual sessions** per terminal ID
- **Real output streaming** via node-pty onData
- **Session cleanup** on disconnect/timeout
- **Security validation** before command execution

#### **1.3: WebSocket Message Protocol**
Reuse existing message types:
```javascript
// Terminal lifecycle
{ type: 'terminal:create', workbranchId, projectId, shell }
{ type: 'terminal:command', terminalId, command }
{ type: 'terminal:destroy', terminalId }

// Real-time output
{ type: 'terminal:output', terminalId, data }
{ type: 'terminal:exit', terminalId, exitCode }
```

### **Phase 2: Update React App**

#### **2.1: Update Environment Bridge** 
- **Change WebSocket target** from `ws://localhost:8123` to `ws://localhost:8002`
- **Remove VS Code detection logic** 
- **Always connect to standalone backend**

#### **2.2: Update SimpleTerminal Component**
- **Direct WebSocket connection** to backend
- **Remove VS Code fallback logic**
- **Simplified initialization** - always expect real terminals

#### **2.3: Add Backend Health Check**
- **Backend status indicator** in UI
- **Auto-restart backend** if it crashes
- **Graceful degradation** if backend unavailable

### **Phase 3: Integration & Testing**

#### **3.1: Startup Scripts**
Create package.json scripts:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run backend\" \"npm run frontend\"",
    "backend": "node backend/server.js",
    "frontend": "vite",
    "start": "npm run dev"
  }
}
```

#### **3.2: Process Management**
- **Auto-start backend** when frontend starts
- **Process supervision** - restart backend if it crashes
- **Clean shutdown** - terminate all terminals on exit

---

## 🛠️ **Detailed Implementation Steps**

### **Step 1: Create Backend Structure** (15 mins)
```bash
mkdir backend backend/services
cd backend
npm init -y
npm install @homebridge/node-pty-prebuilt-multiarch ws express cors
```

### **Step 2: Implement Terminal Manager** (30 mins)
Based on existing VS Code implementation in:
- `vscode-extension/claude-portfolio/src/services/terminalService.ts`
- Copy session management logic
- Adapt for standalone use (remove vscode imports)

### **Step 3: Create WebSocket Server** (20 mins)
- Express server on port 8002
- WebSocket upgrade handling
- Message routing to terminal manager
- Real-time output broadcasting

### **Step 4: Security Integration** (15 mins)
- Copy `src/shared/security-config.ts` 
- Implement command validation
- Path sanitization
- Dangerous pattern blocking

### **Step 5: Update React Frontend** (20 mins)
- Modify `src/services/environmentBridge.ts`
- Update WebSocket connection target
- Remove VS Code dependency checks
- Test terminal creation and command execution

### **Step 6: Testing & Debugging** (30 mins)
- Test individual terminal sessions
- Verify real output streaming
- Test ultra-wide layout still works
- Verify close button functionality

---

## 🎯 **Expected Benefits**

### **Immediate**
- ✅ **Simplified setup** - No VS Code extension required
- ✅ **Faster startup** - Direct terminal access
- ✅ **Individual terminals** - Each creates its own session
- ✅ **Real output streaming** - Direct node-pty integration

### **Long-term**
- ✅ **Portable** - Works anywhere Node.js runs
- ✅ **Easier deployment** - Self-contained application
- ✅ **Better performance** - No extension overhead
- ✅ **Universal compatibility** - Not tied to VS Code

---

## 🚨 **Potential Challenges & Solutions**

### **Challenge: Port Conflicts**
**Solution**: Use port detection and auto-increment (8002 → 8003 → 8004)

### **Challenge: Terminal Cleanup**
**Solution**: Implement proper session lifecycle with cleanup timers

### **Challenge: Security**
**Solution**: Reuse existing security validation patterns

### **Challenge: Process Management**
**Solution**: Use `concurrently` package for dev, `pm2` for production

---

## 📋 **Quick Start Checklist for Tomorrow**

1. **☕ Coffee first** - You've earned it!

2. **🏗️ Create backend directory and install dependencies**
   ```bash
   mkdir backend backend/services
   cd backend && npm init -y
   npm install @homebridge/node-pty-prebuilt-multiarch ws express cors concurrently
   ```

3. **📋 Copy existing terminal logic**
   - Copy `vscode-extension/claude-portfolio/src/services/terminalService.ts`
   - Remove VS Code imports, adapt for standalone
   - Save as `backend/services/terminalManager.js`

4. **🔌 Create WebSocket server**
   - Express server with WebSocket upgrade
   - Route messages to terminal manager
   - Test with existing React app

5. **🧪 Test individual terminals**
   - Verify each terminal creates separate session
   - Test real output streaming
   - Confirm close buttons work

6. **🎉 Celebrate** - You'll have a fully standalone system!

---

## 💡 **Key Files to Reference**

**Existing implementations to copy/adapt:**
- `vscode-extension/claude-portfolio/src/services/terminalService.ts` - Terminal session management
- `src/shared/security-config.ts` - Security validation
- `src/services/environmentBridge.ts` - WebSocket client logic
- `vscode-extension/claude-portfolio/test-prebuilt-pty.js` - Working node-pty example

**Files to modify:**
- `src/services/environmentBridge.ts` - Change WebSocket target
- `src/components/CenterArea/SimpleTerminal.tsx` - Remove VS Code logic
- `package.json` - Add backend startup scripts

---

## 🎯 **Success Criteria**

You'll know it's working when:
- ✅ Each terminal shows its own session ID in header
- ✅ Commands execute in separate terminals (not "React Bridge Command")
- ✅ Real terminal output appears in React components
- ✅ No VS Code extension required
- ✅ Close buttons kill individual terminals
- ✅ Ultra-wide layout still works perfectly

Sweet dreams! 🌙 The plan is rock solid and you've already done the hard part with the real terminal streaming. Tomorrow will just be moving the logic from VS Code extension to standalone Node.js backend.