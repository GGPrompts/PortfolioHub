/**
 * Terminal System Testing Script
 * 
 * Tests the standalone terminal system by:
 * 1. Creating terminals with specified workbranchIds
 * 2. Executing commands in each terminal  
 * 3. Capturing and displaying all outputs
 */

const WebSocket = require('ws');

class TerminalSystemTester {
    constructor() {
        this.ws = null;
        this.terminals = new Map(); // terminalId -> {workbranchId, outputs: []}
        this.messageId = 0;
        this.pendingRequests = new Map(); // messageId -> resolve function
    }

    generateMessageId() {
        return `test_${++this.messageId}_${Date.now()}`;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            console.log('🔌 Connecting to WebSocket server...');
            this.ws = new WebSocket('ws://localhost:8125');

            this.ws.on('open', () => {
                console.log('✅ Connected to terminal system WebSocket');
                resolve();
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(message);
                } catch (error) {
                    console.error('❌ Failed to parse message:', error);
                }
            });

            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log('🔌 WebSocket connection closed');
            });
        });
    }

    handleMessage(message) {
        console.log(`📨 Received: ${message.type}`, message.id ? `(ID: ${message.id})` : '');

        switch (message.type) {
            case 'connection-established':
                console.log('🎉 Connection established:', message.data);
                break;

            case 'terminal-created':
                if (message.success) {
                    console.log(`✅ Terminal created: ${message.terminalId}`);
                    // Find which workbranchId this corresponds to
                    const pendingResolve = this.pendingRequests.get(message.id);
                    if (pendingResolve) {
                        pendingResolve(message.terminalId);
                        this.pendingRequests.delete(message.id);
                    }
                } else {
                    console.error(`❌ Failed to create terminal:`, message);
                }
                break;

            case 'command-executed':
                console.log(`⚡ Command executed in ${message.terminalId}: ${message.command} (success: ${message.success})`);
                const pendingResolve = this.pendingRequests.get(message.id);
                if (pendingResolve) {
                    pendingResolve(message.success);
                    this.pendingRequests.delete(message.id);
                }
                break;

            case 'terminal-output':
                // Store output for this terminal
                const terminal = this.terminals.get(message.terminalId);
                if (terminal) {
                    terminal.outputs.push({
                        timestamp: new Date().toISOString(),
                        data: message.data
                    });
                    console.log(`📤 Output from ${terminal.workbranchId} (${message.terminalId}):`, message.data.trim());
                }
                break;

            case 'error':
                console.error(`❌ Server error:`, message.error);
                if (message.id) {
                    const pendingResolve = this.pendingRequests.get(message.id);
                    if (pendingResolve) {
                        pendingResolve(null);
                        this.pendingRequests.delete(message.id);
                    }
                }
                break;

            default:
                console.log(`📨 Unknown message type: ${message.type}`, message);
        }
    }

    async sendMessage(message) {
        const messageId = this.generateMessageId();
        message.id = messageId;
        
        return new Promise((resolve) => {
            this.pendingRequests.set(messageId, resolve);
            this.ws.send(JSON.stringify(message));
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(messageId)) {
                    this.pendingRequests.delete(messageId);
                    resolve(null);
                }
            }, 10000);
        });
    }

    async createTerminal(workbranchId) {
        console.log(`🚀 Creating terminal with workbranchId: ${workbranchId}`);
        
        const terminalId = await this.sendMessage({
            type: 'terminal-create',
            workbranchId: workbranchId,
            shell: 'powershell',
            title: `Test Terminal - ${workbranchId}`
        });

        if (terminalId) {
            this.terminals.set(terminalId, {
                workbranchId: workbranchId,
                outputs: []
            });
            console.log(`✅ Terminal created: ${terminalId} for workbranch: ${workbranchId}`);
            return terminalId;
        } else {
            console.error(`❌ Failed to create terminal for workbranch: ${workbranchId}`);
            return null;
        }
    }

    async executeCommand(terminalId, command) {
        const terminal = this.terminals.get(terminalId);
        if (!terminal) {
            console.error(`❌ Terminal not found: ${terminalId}`);
            return false;
        }

        console.log(`⚡ Executing in ${terminal.workbranchId} (${terminalId}): ${command}`);
        
        const success = await this.sendMessage({
            type: 'terminal-command',
            terminalId: terminalId,
            command: command
        });

        return success;
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showAllOutputs() {
        console.log('\n📋 === TERMINAL OUTPUTS SUMMARY ===');
        for (const [terminalId, terminal] of this.terminals) {
            console.log(`\n🖥️  Terminal: ${terminal.workbranchId} (${terminalId})`);
            console.log('─'.repeat(60));
            
            if (terminal.outputs.length === 0) {
                console.log('  (No outputs captured)');
            } else {
                terminal.outputs.forEach((output, index) => {
                    console.log(`  [${output.timestamp}] ${output.data.trim()}`);
                });
            }
        }
        console.log('\n' + '═'.repeat(60));
    }

    async runTests() {
        try {
            // Connect to WebSocket
            await this.connect();
            
            // Wait a moment for connection to stabilize
            await this.wait(1000);

            console.log('\n🧪 === STARTING TERMINAL TESTS ===\n');

            // 1. Create terminal with workbranchId "test-session"
            const testTerminalId = await this.createTerminal('test-session');
            await this.wait(2000); // Wait for terminal to be ready

            // 2. Execute simple echo command in test-session
            if (testTerminalId) {
                await this.executeCommand(testTerminalId, 'echo Hello from Claude!');
                await this.wait(3000); // Wait for command output
            }

            // 3. Create terminal with workbranchId "dev"
            const devTerminalId = await this.createTerminal('dev');
            await this.wait(2000);

            // 4. Run "node --version" in the "dev" terminal
            if (devTerminalId) {
                await this.executeCommand(devTerminalId, 'node --version');
                await this.wait(3000);
            }

            // 5. Create terminal with workbranchId "monitor"
            const monitorTerminalId = await this.createTerminal('monitor');
            await this.wait(2000);

            // 6. Run simple directory listing in the "monitor" terminal
            if (monitorTerminalId) {
                await this.executeCommand(monitorTerminalId, 'dir');
                await this.wait(5000); // Wait longer for directory listing
            }

            // Wait a bit more for any remaining outputs
            await this.wait(2000);

            // 7. Show all terminal outputs
            this.showAllOutputs();

            console.log('\n✅ Test completed successfully!');
            
        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            if (this.ws) {
                this.ws.close();
            }
        }
    }
}

// Run the tests
const tester = new TerminalSystemTester();
tester.runTests().catch(console.error);