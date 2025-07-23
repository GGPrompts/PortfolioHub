# VS Code Extension Security Testing Guide

## 🎯 **Complete Testing Strategy**

This guide helps you test both security validation AND actual command execution in VS Code.

---

## **Phase 1: Pattern Validation**

### **Step 1: Run Security Pattern Tests**
```bash
cd vscode-extension/claude-portfolio
node live-security-test.js
```
**Expected Output**: All patterns should validate correctly

---

## **Phase 2: Extension Development Testing**

### **Step 2: Launch Extension in Debug Mode**
1. Open `vscode-extension/claude-portfolio` in VS Code
2. Press `F5` to launch Extension Development Host
3. New VS Code window opens with your extension loaded

### **Step 3: Test Extension UI**
1. **Activity Bar**: Click Claude Portfolio icon (should appear in sidebar)
2. **Project List**: Verify projects load with status indicators
3. **Commands Panel**: Check that command buttons are visible

---

## **Phase 3: Security Validation Testing**

### **Step 4: Test Safe Commands Through Extension**

#### **Test 1: Git Commands**
1. **Extension Method**:
   - Select a project in extension tree
   - Right-click → "Git Status" (if available)
   - OR use command buttons
   
2. **Manual Method**:
   - Open VS Code terminal
   - Navigate to project: `cd "D:\ClaudeWindows\Projects\[project-name]"`
   - Run: `git status`
   - **Expected**: Command executes successfully

#### **Test 2: NPM Commands**  
1. **Extension Method**:
   - Click "Start" button on a project
   - OR use "Run Dev Server" command
   
2. **Manual Method**:
   - Open VS Code terminal  
   - Navigate to project directory
   - Run: `npm run dev`
   - **Expected**: Dev server starts successfully

#### **Test 3: Quoted Arguments**
1. **Extension Method**:
   - Try git commit through extension (if available)
   
2. **Manual Method**:
   - In a git repo with changes
   - Run: `git commit -m "test security fix"`
   - **Expected**: Commit succeeds with quoted message

---

## **Phase 4: Security Blocking Testing**

### **Step 5: Verify Dangerous Commands Are Blocked**

#### **⚠️ IMPORTANT: DO NOT RUN THESE COMMANDS DIRECTLY**

#### **Test 1: Extension Security**
1. Try to execute through extension:
   - If extension has custom command input, try: `git status | rm -rf .`
   - **Expected**: Extension blocks with security error message

#### **Test 2: Security Service Testing**
Create a test in VS Code's integrated terminal:

```javascript
// In VS Code Debug Console (Ctrl+Shift+Y):
// Test the security service directly
const { VSCodeSecurityService } = require('./out/securityService');

// These should return false (blocked):
console.log('git status | rm -rf .:', VSCodeSecurityService.validateCommand('git status | rm -rf .'));
console.log('npm run dev | del node_modules:', VSCodeSecurityService.validateCommand('npm run dev | del node_modules'));

// These should return true (allowed):
console.log('git status:', VSCodeSecurityService.validateCommand('git status'));
console.log('npm run dev:', VSCodeSecurityService.validateCommand('npm run dev'));
```

---

## **Phase 5: Integration Testing**

### **Step 6: Test React App Integration**
1. **Webview Loading**:
   - Extension should show portfolio webview
   - React app should load without errors
   
2. **Message Passing**:
   - Commands from React app should go through VS Code security
   - Test command execution from web interface

### **Step 7: Test Real Project Workflows**
1. **Start Project**:
   - Use extension to start a project
   - Verify project actually starts and is accessible
   
2. **Stop Project**:
   - Use extension to stop project
   - Verify project actually stops
   
3. **Open in Browser**:
   - Use extension to open project in browser
   - Verify browser opens to correct URL

---

## **Phase 6: Error Handling Testing**

### **Step 8: Test Security Error Messages**
1. **Trigger Security Block**:
   - Try to execute a dangerous command through extension
   - **Expected**: Clear, helpful error message explaining why blocked

2. **Test Workspace Trust**:
   - Open extension in untrusted workspace
   - Try to execute commands
   - **Expected**: Workspace trust prompt appears

---

## **📊 Success Criteria Checklist**

### **Security Validation**
- [ ] All dangerous commands blocked by extension
- [ ] Clear error messages shown for blocked commands  
- [ ] No security bypasses possible through extension UI
- [ ] Workspace trust properly enforced

### **Functionality Preservation**
- [ ] Git commands execute successfully (`git status`, `git add`, `git commit -m "message"`)
- [ ] NPM commands execute successfully (`npm run dev`, `npm run build`)
- [ ] Quoted arguments handled properly
- [ ] Project start/stop operations work
- [ ] Browser opening works correctly

### **Integration Testing**
- [ ] Extension loads without errors
- [ ] React webview displays correctly
- [ ] Command execution goes through proper security validation
- [ ] Real project workflows function end-to-end

### **User Experience**
- [ ] Extension UI is responsive and intuitive
- [ ] Error messages are helpful and actionable
- [ ] Performance is acceptable (commands execute quickly)
- [ ] No legitimate workflows are broken

---

## **🚨 If Tests Fail**

### **Security Pattern Issues**:
1. Check `shared/security-config.ts` regex patterns
2. Verify dangerous patterns catch malicious commands
3. Ensure safe patterns allow legitimate commands

### **Extension Issues**:
1. Check VS Code Developer Console for errors
2. Verify extension compiles without TypeScript errors
3. Test extension reload (`Ctrl+Shift+P` → "Developer: Reload Window")

### **Integration Issues**:
1. Verify React app builds correctly (`npm run build`)
2. Check webview communication in VS Code logs
3. Test message passing between React and extension

---

## **🎉 Final Validation**

Once all tests pass:
1. **Package Extension**: `npx vsce package`
2. **Install Locally**: `code --install-extension [package].vsix`
3. **Test in Fresh VS Code Window**: Verify everything works in production mode

**Success**: Your extension is ready for production with enterprise-grade security! 🛡️