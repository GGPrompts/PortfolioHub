const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

class TerminalCommandHandler {
    constructor(context, webSocket) {
        this.context = context;
        this.webSocket = webSocket;
        this.terminals = new Map();
        this.terminalIdCounter = 1;
    }

    async handleTerminalCommand(data) {
        const { command, sessionId, input, shell, cwd } = data;

        switch (command) {
            case 'create':
                return this.createTerminal(sessionId, shell, cwd);
            case 'write':
                return this.writeToTerminal(sessionId, input);
            case 'resize':
                return this.resizeTerminal(sessionId, data.cols, data.rows);
            case 'kill':
                return this.killTerminal(sessionId);
            case 'list':
                return this.listTerminals();
            case 'clear':
                return this.clearTerminal(sessionId);
            default:
                throw new Error(`Unknown terminal command: ${command}`);
        }
    }

    async createTerminal(sessionId, shell, cwd) {
        const terminalOptions = {
            name: `Terminal ${this.terminalIdCounter++}`,
            cwd: cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            env: process.env,
            shellPath: shell || undefined
        };

        const terminal = vscode.window.createTerminal(terminalOptions);
        
        // Store terminal reference
        this.terminals.set(sessionId, {
            terminal,
            id: sessionId,
            name: terminalOptions.name,
            cwd: terminalOptions.cwd,
            shell: shell || 'default',
            created: new Date().toISOString()
        });

        // Set up data listener for terminal output
        const writeEmitter = new vscode.EventEmitter();
        const pty = {
            onDidWrite: writeEmitter.event,
            open: () => writeEmitter.fire(`Terminal ${sessionId} opened\r\n`),
            close: () => {
                this.terminals.delete(sessionId);
                this.webSocket.send({
                    type: 'terminal_closed',
                    sessionId
                });
            },
            handleInput: (data) => {
                terminal.sendText(data, false);
            }
        };

        // Show the terminal
        terminal.show();

        return {
            success: true,
            sessionId,
            message: `Terminal ${sessionId} created successfully`
        };
    }

    async writeToTerminal(sessionId, input) {
        const terminalInfo = this.terminals.get(sessionId);
        if (!terminalInfo) {
            throw new Error(`Terminal ${sessionId} not found`);
        }

        terminalInfo.terminal.sendText(input, false);
        return {
            success: true,
            sessionId,
            message: 'Input sent to terminal'
        };
    }

    async resizeTerminal(sessionId, cols, rows) {
        // VS Code terminals handle resizing automatically
        // This is a placeholder for future implementation if needed
        return {
            success: true,
            sessionId,
            message: 'Terminal resize acknowledged'
        };
    }

    async killTerminal(sessionId) {
        const terminalInfo = this.terminals.get(sessionId);
        if (!terminalInfo) {
            throw new Error(`Terminal ${sessionId} not found`);
        }

        terminalInfo.terminal.dispose();
        this.terminals.delete(sessionId);

        return {
            success: true,
            sessionId,
            message: `Terminal ${sessionId} killed`
        };
    }

    async listTerminals() {
        const terminalList = Array.from(this.terminals.values()).map(info => ({
            id: info.id,
            name: info.name,
            cwd: info.cwd,
            shell: info.shell,
            created: info.created,
            active: vscode.window.activeTerminal === info.terminal
        }));

        return {
            success: true,
            terminals: terminalList
        };
    }

    async clearTerminal(sessionId) {
        const terminalInfo = this.terminals.get(sessionId);
        if (!terminalInfo) {
            throw new Error(`Terminal ${sessionId} not found`);
        }

        // Send clear command based on shell type
        const clearCommand = process.platform === 'win32' ? 'cls' : 'clear';
        terminalInfo.terminal.sendText(clearCommand);

        return {
            success: true,
            sessionId,
            message: 'Terminal cleared'
        };
    }

    dispose() {
        // Clean up all terminals
        for (const [sessionId, terminalInfo] of this.terminals) {
            terminalInfo.terminal.dispose();
        }
        this.terminals.clear();
    }
}

module.exports = TerminalCommandHandler;
