# 🚀 Terminal System Quick Start

## 1. Install Dependencies

```powershell
cd D:\ClaudeWindows\claude-dev-portfolio\scripts
.\install-terminal.ps1
```

## 2. Start the System

```powershell
.\start-terminal-system.ps1
```

This will:
- Start the React dev server on http://localhost:3000
- Open VS Code with the extension
- Start the WebSocket server on port 3002

## 3. In VS Code

Press `F5` to start the extension in debug mode.

## 4. In the React App

1. Navigate to http://localhost:3000
2. Click the terminal icon in the right sidebar
3. Click "New Terminal" to create a session

## 5. Test It Out

Try these commands in the terminal:
- `echo "Hello from Claude Dev!"`
- `node --version`
- `npm list`

## Troubleshooting

If terminals don't connect:
1. Check VS Code extension is running (F5)
2. Verify WebSocket on port 3002
3. Check browser console for errors

## Next Steps

- Read the full documentation in `/docs/TERMINAL_SYSTEM.md`
- Customize terminal settings in VS Code
- Add terminal themes and configurations
