const vscode = require('vscode');
const WebSocket = require('ws');
const TerminalCommandHandler = require('./src/terminalHandlers');

let webSocketServer;
let terminalHandler;

function activate(context) {
    console.log('Claude Dev Portfolio VS Code Extension is now active!');

    // Start WebSocket server
    startWebSocketServer(context);

    // Register commands
    registerCommands(context);

    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(terminal) Claude Dev Terminal';
    statusBarItem.tooltip = 'Claude Dev Portfolio Terminal System';
    statusBarItem.command = 'claudedev.showTerminalPanel';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}

function startWebSocketServer(context) {
    const port = vscode.workspace.getConfiguration('claudedev').get('terminalPort', 3002);
    
    webSocketServer = new WebSocket.Server({ port });
    console.log(`WebSocket server started on port ${port}`);

    webSocketServer.on('connection', (ws) => {
        console.log('New WebSocket connection established');
        
        // Create terminal handler for this connection
        terminalHandler = new TerminalCommandHandler(context, ws);

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                console.log('Received message:', data);

                switch (data.type) {
                    case 'terminal_command':
                        const result = await terminalHandler.handleTerminalCommand(data);
                        ws.send(JSON.stringify({
                            type: 'terminal_response',
                            ...result
                        }));
                        break;
                    
                    case 'ping':
                        ws.send(JSON.stringify({ type: 'pong' }));
                        break;
                    
                    default:
                        console.warn('Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('Error handling message:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    error: error.message
                }));
            }
        });

        ws.on('close', () => {
            console.log('WebSocket connection closed');
            if (terminalHandler) {
                terminalHandler.dispose();
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        // Send connection acknowledgment
        ws.send(JSON.stringify({
            type: 'connection_established',
            message: 'VS Code extension connected'
        }));
    });

    context.subscriptions.push({
        dispose: () => {
            webSocketServer.close();
            if (terminalHandler) {
                terminalHandler.dispose();
            }
        }
    });
}

function registerCommands(context) {
    // Command to show terminal panel
    const showTerminalPanel = vscode.commands.registerCommand('claudedev.showTerminalPanel', () => {
        vscode.commands.executeCommand('terminal.focus');
    });

    // Command to create new terminal
    const createTerminal = vscode.commands.registerCommand('claudedev.createTerminal', async () => {
        const terminal = vscode.window.createTerminal('Claude Dev Terminal');
        terminal.show();
    });

    // Command to restart WebSocket server
    const restartServer = vscode.commands.registerCommand('claudedev.restartServer', () => {
        if (webSocketServer) {
            webSocketServer.close();
        }
        startWebSocketServer(context);
        vscode.window.showInformationMessage('Claude Dev WebSocket server restarted');
    });

    context.subscriptions.push(showTerminalPanel, createTerminal, restartServer);
}

function deactivate() {
    if (webSocketServer) {
        webSocketServer.close();
    }
    if (terminalHandler) {
        terminalHandler.dispose();
    }
}

module.exports = {
    activate,
    deactivate
};
