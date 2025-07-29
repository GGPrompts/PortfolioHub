# VS Code Extension Comprehensive Update Prompt

Use this prompt when returning to systematically update all VS Code extension components with proper testing and documentation.

---

## 🎯 Primary Objective

I need you to comprehensively audit, test, and update my Claude Portfolio VS Code extension focusing on three critical areas:

1. **Extension Command Functionality** - Verify all commands work properly
2. **Portfolio Dashboard** - Fix broken buttons and ensure all pages work
3. **Command Cheat Sheet** - Update content to reflect current system state

## 🤖 Multi-Agent Approach Required

Please use multiple specialized sub-agents for this task:

### Agent 1: Extension Command Auditor
<thinking>
This agent needs to:
- Systematically test every command in package.json 
- Identify broken/non-functional commands
- Check command registration and implementation
- Verify VS Code API integration points
- Test both context menu and command palette execution
</thinking>

**Task**: Audit all VS Code extension commands
- Review `package.json` command definitions vs actual implementations
- Test each command systematically (project commands, batch commands, VS Code pages, MCP controls)
- Identify broken command registrations, missing implementations, or VS Code API issues
- Create detailed report of working vs non-working commands
- Prioritize fixes based on user impact

### Agent 2: Portfolio Dashboard Developer  
<thinking>
This agent needs to:
- Examine the current dashboard webview implementation
- Identify broken buttons and UI elements
- Check WebSocket bridge integration for live data
- Ensure proper project status display
- Fix navigation and page routing issues
- Test responsive design and styling
</thinking>

**Task**: Fix and enhance Portfolio Dashboard
- Examine `dashboardPanel.ts` and related webview HTML/CSS/JS
- Test all dashboard buttons and interactive elements
- Verify real-time project status updates via WebSocket bridge
- Fix any broken navigation or page routing
- Ensure proper integration with project management functions
- Update styling and responsive design if needed

### Agent 3: Documentation Specialist
<thinking>
This agent needs to:
- Review current Command Cheat Sheet content
- Verify all commands are current and accurate
- Check for any corrupted text or formatting issues
- Ensure PowerShell commands work with current system
- Update Claude Code integration examples
- Verify all paths and configuration examples
</thinking>

**Task**: Update Command Cheat Sheet
- Review `windows-cheatsheet.html` for accuracy and completeness
- Verify all PowerShell commands work with current portfolio structure
- Update Claude Code integration examples
- Check all file paths and configuration examples
- Add any new commands from recent system updates
- Ensure all copy-to-clipboard functionality works properly

## 🧠 Implementation Strategy

### Phase 1: Discovery and Analysis (Thinking Blocks Required)
For each agent, use detailed thinking blocks to:

<thinking>
Before starting any fixes, I need to understand:
- Current system architecture and dependencies
- Recent changes that might have broken functionality  
- Integration points between components
- User workflow expectations
- Security considerations for command execution
</thinking>

### Phase 2: Systematic Testing
- **Agent 1**: Test every command from UI (both ways: context menu + command palette)
- **Agent 2**: Test every button/link in Portfolio Dashboard webview
- **Agent 3**: Test every command example in Cheat Sheet (copy functionality + execution)

### Phase 3: Coordinated Fixes
Use thinking blocks to plan fixes that don't conflict:

<thinking>
When multiple agents need to modify the same files:
- Agent 1 handles command registration and core functionality
- Agent 2 focuses on webview content and WebSocket integration
- Agent 3 updates documentation and examples
- Coordinate changes to avoid merge conflicts
</thinking>

## 📋 Specific Areas to Focus On

### Extension Commands (Agent 1)
- [ ] Project tile click behavior (command palette integration)
- [ ] Batch command execution in terminals
- [ ] Terminal system integration (start-all.bat execution)
- [ ] MCP server controls and status checking
- [ ] VS Code Pages navigation and webview loading
- [ ] Port detection and health checking commands

### Portfolio Dashboard (Agent 2)
- [ ] Real-time project status indicators
- [ ] Start/Stop project buttons
- [ ] Browser opening functionality  
- [ ] WebSocket bridge connectivity status
- [ ] Navigation between dashboard sections
- [ ] Responsive design on different VS Code panel sizes

### Command Cheat Sheet (Agent 3)
- [ ] PowerShell command accuracy for current system
- [ ] File paths pointing to correct locations
- [ ] Claude Code integration examples
- [ ] Terminal system startup commands
- [ ] MCP server configuration examples
- [ ] Copy-to-clipboard JavaScript functionality

## 🔧 Technical Context

### Current System State
- **VS Code Extension**: Recently updated with project command palette integration
- **Portfolio Structure**: Projects located in `D:\ClaudeWindows\claude-dev-portfolio\projects\`
- **Terminal System**: Standalone system at `projects\standalone-terminal-system\`
- **WebSocket Bridge**: Running on `ws://localhost:8123`
- **Security**: Using `VSCodeSecurityService` for all command execution

### Key Integration Points
- **WebSocket Bridge**: `src\services\websocketBridge.ts`
- **Project Service**: `src\services\projectService.ts`  
- **Security Service**: `src\securityService.ts`
- **Command Handlers**: `src\commands\*.ts`

## 🎯 Success Criteria

### Extension Commands
- All commands execute without errors
- Command palette integration works smoothly
- Terminal system launches with complete `start-all.bat` script
- MCP controls properly manage server lifecycle

### Portfolio Dashboard  
- All buttons responsive and functional
- Real-time status updates working
- Clean, professional UI matching VS Code theme
- No broken links or navigation issues

### Command Cheat Sheet
- All command examples work when copied and executed
- Current and accurate system information
- Professional formatting with working copy buttons
- No corrupted text or broken emojis

## 🚀 Final Deliverables Expected

1. **Comprehensive test report** from each agent
2. **Fixed and updated code** with proper error handling
3. **Updated documentation** reflecting current system state
4. **Installation instructions** for rebuilding and testing the extension
5. **User guide updates** for any workflow changes

---

**Important**: Use proper thinking blocks throughout to document decision-making, identify potential conflicts between agents, and ensure systematic coverage of all functionality.

Please start by having each agent analyze their respective areas and provide detailed findings before implementing any fixes.