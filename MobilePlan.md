# Mobile Voice Control Plan for Portfolio Hub

## 🎯 Vision

Transform Portfolio Hub into a voice-controlled development command center accessible from anywhere using your phone, Tailscale VPN, and voice commands.

## 🔄 Integration Overview

```
Phone (Termux) → Voice Input → Tailscale VPN → Home PC → Portfolio Hub
                     ↓                            ↓
                Speech-to-Text              VS Code Extension
                     ↓                            ↓
                Voice Commands            Terminal/Chat Interface
```

## 📱 Mobile Features

### 1. Voice-Controlled Wake-on-LAN
- Wake your home PC from anywhere using voice commands
- "Hey, wake up my PC" triggers wake-on-LAN through Tailscale
- Automatic connection verification and service availability

### 2. Multi-Terminal Voice Control
- Route voice commands to specific terminals: "Terminal 1: npm run dev"
- Project-aware commands: "Open Matrix Cards in terminal 2"
- Parallel terminal management with voice routing

### 3. Voice-to-Chat Interface
- Direct voice input to NoteCard component
- Voice-enabled Claude instructions
- Hands-free note creation and task management

### 4. Remote Development Commands
- "Check git status on portfolio"
- "Run tests in terminal 3"
- "Build the 3D project"
- "Show me terminal 2 output"

## 🛠️ Technical Implementation

### Phase 1: Mobile Setup (Termux)

```bash
# Core dependencies
pkg install termux-api nodejs git openssh tailscale

# Voice and notification tools
pkg install jq curl wakeonlan

# Audio feedback
pkg install espeak sox
```

### Phase 2: Tailscale Integration

1. **Network Setup**
   ```bash
   # Start Tailscale
   sudo tailscale up
   
   # Get your network info
   tailscale status
   ```

2. **PC Configuration**
   - Enable Wake-on-LAN in BIOS
   - Configure Windows network adapter for WoL
   - Install Tailscale on PC
   - Note PC's Tailscale IP (100.x.x.x)

### Phase 3: Voice Command System

```bash
#!/bin/bash
# voice-portfolio-control.sh

# Configuration
PC_MAC="AA:BB:CC:DD:EE:FF"  # Your PC's MAC
PC_TAILSCALE_IP="100.x.x.x"  # Your PC's Tailscale IP
PORTFOLIO_HUB_PORT="5173"
TERMINAL_SERVER_PORT="3100"

# Voice command processor
process_voice_command() {
    local cmd="$1"
    local lower=$(echo "$cmd" | tr '[:upper:]' '[:lower:]')
    
    # Terminal routing
    if [[ "$lower" =~ ^terminal\ ([1-4]):(.+) ]]; then
        terminal_id="${BASH_REMATCH[1]}"
        command="${BASH_REMATCH[2]}"
        
        curl -X POST "http://$PC_TAILSCALE_IP:$TERMINAL_SERVER_PORT/api/terminal" \
            -H "Content-Type: application/json" \
            -d "{
                \"sessionId\": \"terminal-$terminal_id\",
                \"type\": \"input\",
                \"data\": \"$command\\r\"
            }"
    fi
    
    # Note creation
    if [[ "$lower" =~ ^note:(.+) ]]; then
        note_content="${BASH_REMATCH[1]}"
        
        curl -X POST "http://$PC_TAILSCALE_IP:$PORTFOLIO_HUB_PORT/api/voice-note" \
            -H "Content-Type: application/json" \
            -d "{
                \"content\": \"$note_content\",
                \"type\": \"voice\",
                \"timestamp\": \"$(date -Iseconds)\"
            }"
    fi
}
```

### Phase 4: VS Code Extension Integration

1. **Add Voice WebSocket Handler**
   ```typescript
   // src/terminals/VoiceHandler.ts
   export class VoiceHandler {
     handleVoiceMessage(message: VoiceMessage) {
       switch(message.type) {
         case 'terminal':
           this.routeToTerminal(message.terminalId, message.command);
           break;
         case 'note':
           this.createVoiceNote(message.content);
           break;
         case 'project':
           this.switchProject(message.projectName);
           break;
       }
     }
   }
   ```

2. **Enhance NoteCard for Voice**
   ```typescript
   // Add voice indicator to NoteCard
   const [isVoiceInput, setIsVoiceInput] = useState(false);
   
   // Handle incoming voice transcripts
   useEffect(() => {
     window.addEventListener('voice-input', (e: CustomEvent) => {
       if (e.detail.target === 'note-content') {
         onNoteContentChange(e.detail.transcript);
         setIsVoiceInput(true);
       }
     });
   }, []);
   ```

## 🎤 Voice Command Reference

### System Commands
- "Wake up" / "Start PC" - Wake computer via WoL
- "Check status" - Verify PC is online
- "Connect to portfolio" - Open Portfolio Hub

### Terminal Commands
- "Terminal 1: npm run dev" - Run command in terminal 1
- "Terminal 2: git status" - Check git in terminal 2
- "All terminals: clear" - Clear all terminals

### Project Commands
- "Open Matrix Cards" - Launch Matrix Cards project
- "Switch to 3D project" - Change active project
- "Build current project" - Run build command

### Note Commands
- "Note: Check mobile responsiveness" - Create quick note
- "Claude: Help me refactor the sidebar" - Claude instruction
- "Bug: Sidebar animation glitchy" - Bug report

### Navigation Commands
- "Show terminal 2" - Focus specific terminal
- "Open project dashboard" - Navigate to dashboard
- "View 3D preview" - Switch to 3D view

## 📊 Integration Points

### 1. Terminal Server WebSocket
- Accept voice commands via new `/api/voice` endpoint
- Route to existing terminal sessions
- Return command results for audio feedback

### 2. Portfolio Hub API
- `/api/voice-note` - Create notes from voice
- `/api/voice-command` - Execute voice commands
- `/api/voice-status` - Get system status for audio feedback

### 3. VS Code Extension
- Register voice command handlers
- Update UI to show voice input indicators
- Add voice-specific keyboard shortcuts

## 🚀 Quick Start

1. **On Phone (Termux)**
   ```bash
   # Clone the voice control script
   curl -O https://raw.githubusercontent.com/GGPrompts/PortfolioHub/main/scripts/voice-control.sh
   chmod +x voice-control.sh
   
   # Configure your PC details
   nano voice-control.sh  # Add MAC address and Tailscale IP
   
   # Run voice control
   ./voice-control.sh
   ```

2. **On PC**
   - Ensure Portfolio Hub is running
   - Terminal server active on port 3100
   - Tailscale connected

3. **Test Commands**
   - "Wake up" - Wake your PC
   - "Terminal 1: ls" - List files
   - "Note: Test voice input" - Create note

## 🔮 Future Enhancements

### Phase 5: Advanced Features
- [ ] Multi-language support for voice commands
- [ ] Custom voice command macros
- [ ] Voice command history and replay
- [ ] Audio feedback for command results

### Phase 6: AI Integration
- [ ] Natural language processing for complex commands
- [ ] Context-aware command suggestions
- [ ] Voice-to-code generation with Claude
- [ ] Automatic error correction and retry

### Phase 7: Productivity Features
- [ ] Voice-controlled code snippets
- [ ] Project template instantiation
- [ ] Voice-driven git workflows
- [ ] Meeting notes to code tasks

## 📝 Implementation Notes

### Security Considerations
- All traffic through Tailscale VPN (encrypted)
- Voice commands logged for audit
- Rate limiting on voice endpoints
- Authentication tokens for voice API

### Performance Optimizations
- Command debouncing (prevent duplicate sends)
- Voice transcript caching
- Efficient WebSocket message routing
- Minimal latency design (<100ms target)

### Error Handling
- Offline PC detection with helpful messages
- Voice recognition error recovery
- Network timeout handling
- Graceful degradation

## 🎯 Success Metrics

- Wake PC in < 30 seconds
- Voice command latency < 500ms
- 95% voice recognition accuracy
- Zero-touch mobile workflow

## 📅 Timeline

- **Tonight**: Initial chat interface ✅
- **Tomorrow**: Test wake-on-LAN with Tailscale
- **This Week**: Implement voice command routing
- **Next Week**: Polish and optimize

---

*"Control your entire development environment with just your voice, from anywhere in the world."*