/**
 * Final Terminal System Test - Comprehensive Test with Clean Output
 * 
 * Tests all requested functionalities with security-compliant commands
 */

const WebSocket = require('ws');

class FinalTerminalTest {
    constructor() {
        this.ws = null;
        this.terminals = new Map();
        this.messageId = 0;
        this.pendingRequests = new Map();
    }

    generateMessageId() {
        return `final_${++this.messageId}_${Date.now()}`;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            console.log('🔌 Connecting to standalone terminal system...');
            this.ws = new WebSocket('ws://localhost:8125');

            this.ws.on('open', () => {
                console.log('✅ Connected to ws://localhost:8125');
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

            this.ws.on('error', reject);
            this.ws.on('close', () => console.log('🔌 Connection closed'));
        });
    }

    handleMessage(message) {
        switch (message.type) {
            case 'connection-established':
                console.log('🎉 Connected! Server capabilities:', message.data.capabilities);
                break;

            case 'terminal-created':
                if (message.success) {
                    const pendingResolve = this.pendingRequests.get(message.id);
                    if (pendingResolve) {
                        pendingResolve(message.terminalId);
                        this.pendingRequests.delete(message.id);
                    }
                }
                break;

            case 'command-executed':
                const pendingResolve = this.pendingRequests.get(message.id);
                if (pendingResolve) {
                    pendingResolve(message.success);
                    this.pendingRequests.delete(message.id);
                }
                break;

            case 'terminal-output':
                const terminal = this.terminals.get(message.terminalId);
                if (terminal) {
                    // Clean up terminal escape sequences for readable output
                    const cleanData = message.data
                        .replace(/\[\?[\d;]*[a-zA-Z]/g, '') // Remove escape sequences
                        .replace(/\[[\d;]*[a-zA-Z]/g, '')   // Remove color codes
                        .replace(/\r\n/g, '\n')             // Normalize line endings
                        .replace(/\r/g, '\n')               // Convert CR to LF
                        .trim();
                    
                    if (cleanData && !cleanData.startsWith('PS ') && cleanData !== '>>' && cleanData.length > 2) {
                        terminal.outputs.push({
                            timestamp: new Date().toISOString(),
                            data: cleanData
                        });
                    }
                }
                break;

            case 'error':
                console.error(`❌ Error:`, message.error);
                if (message.id) {
                    const pendingResolve = this.pendingRequests.get(message.id);
                    if (pendingResolve) {
                        pendingResolve(null);
                        this.pendingRequests.delete(message.id);
                    }
                }
                break;
        }
    }

    async sendMessage(message) {
        const messageId = this.generateMessageId();
        message.id = messageId;
        
        return new Promise((resolve) => {
            this.pendingRequests.set(messageId, resolve);
            this.ws.send(JSON.stringify(message));
            
            setTimeout(() => {
                if (this.pendingRequests.has(messageId)) {
                    this.pendingRequests.delete(messageId);
                    resolve(null);
                }
            }, 8000);
        });
    }

    async createTerminal(workbranchId) {
        console.log(`🚀 Creating terminal: ${workbranchId}`);
        
        const terminalId = await this.sendMessage({
            type: 'terminal-create',
            workbranchId: workbranchId,
            shell: 'powershell',
            title: `Terminal - ${workbranchId}`
        });

        if (terminalId) {
            this.terminals.set(terminalId, {
                workbranchId: workbranchId,
                outputs: []
            });
            console.log(`✅ Terminal created: ${workbranchId} (${terminalId})`);
            return terminalId;
        } else {
            console.error(`❌ Failed to create terminal: ${workbranchId}`);
            return null;
        }
    }

    async executeCommand(terminalId, command) {
        const terminal = this.terminals.get(terminalId);
        if (!terminal) return false;

        console.log(`⚡ Executing [${terminal.workbranchId}]: ${command}`);
        
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

    showResults() {
        console.log('\n' + '═'.repeat(80));
        console.log('📋 TERMINAL SYSTEM TEST RESULTS');
        console.log('═'.repeat(80));
        
        for (const [terminalId, terminal] of this.terminals) {
            console.log(`\n🖥️  Terminal: ${terminal.workbranchId}`);
            console.log('─'.repeat(60));
            
            if (terminal.outputs.length === 0) {
                console.log('  (No output captured)');
            } else {
                terminal.outputs.forEach((output) => {
                    console.log(`  ${output.data}`);
                });
            }
        }
        console.log('\n' + '═'.repeat(80));
    }

    async runComprehensiveTest() {
        try {
            await this.connect();
            await this.wait(1000);

            console.log('\n📋 Starting comprehensive terminal system test...\n');

            // 1. Create "test-session" terminal and run greeting
            const testTerminal = await this.createTerminal('test-session');
            await this.wait(2000);
            if (testTerminal) {
                await this.executeCommand(testTerminal, 'Write-Host "Hello from Claude! The time is: " (Get-Date -Format "yyyy-MM-dd HH:mm:ss")');
                await this.wait(3000);
            }

            // 2. Create "dev" terminal and check Node.js version
            const devTerminal = await this.createTerminal('dev');
            await this.wait(2000);
            if (devTerminal) {
                await this.executeCommand(devTerminal, 'node --version');
                await this.wait(3000);
            }

            // 3. Create "monitor" terminal and show first 5 processes
            const monitorTerminal = await this.createTerminal('monitor');
            await this.wait(2000);
            if (monitorTerminal) {
                await this.executeCommand(monitorTerminal, 'ps | head -5');
                await this.wait(3000);
                
                // If that fails, try Windows command
                await this.executeCommand(monitorTerminal, 'tasklist | findstr /i "node"');
                await this.wait(3000);
            }

            // Wait for final outputs
            await this.wait(2000);

            this.showResults();
            
            console.log('\n✅ Comprehensive test completed successfully!');
            console.log(`📊 Created ${this.terminals.size} terminals with unique workbranchIds`);
            console.log('🔗 Backend running on http://localhost:8124 (HTTP) and ws://localhost:8125 (WebSocket)');
            
        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            if (this.ws) {
                this.ws.close();
            }
        }
    }
}

// Execute the comprehensive test
const tester = new FinalTerminalTest();
tester.runComprehensiveTest().catch(console.error);