/**
 * Example Terminal Service Server
 * 
 * This is a demonstration of how to start and configure the Terminal Service.
 * Use this as a reference for integrating the service into your application.
 */

import { TerminalService } from './index';
import * as path from 'path';

async function startTerminalService() {
    console.log('🚀 Starting Terminal Service Example...');

    // Configure the service
    const service = new TerminalService({
        port: 8002,
        host: 'localhost',
        workspaceRoot: path.resolve(__dirname, '../../../..'), // Project root
        maxSessions: 10,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        enableSecurity: true,
        allowedOrigins: [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000'
        ]
    });

    // Start the service
    const started = await service.start();
    
    if (started) {
        console.log('✅ Terminal Service started successfully!');
        console.log('📡 WebSocket endpoint: ws://localhost:8002');
        console.log('🛡️ Security validation: Enabled');
        console.log('📁 Workspace root:', path.resolve(__dirname, '../../../..'));
        console.log('\n📋 Available message types:');
        console.log('  - terminal-create: Create new terminal session');
        console.log('  - terminal-destroy: Destroy terminal session');
        console.log('  - terminal-command: Execute command in terminal');
        console.log('  - terminal-data: Send raw data to terminal');
        console.log('  - terminal-resize: Resize terminal dimensions');
        console.log('  - terminal-list: List all terminal sessions');
        console.log('  - terminal-status: Get terminal session status');
        console.log('  - service-status: Get service status and statistics');
        console.log('  - security-audit: Get security audit log');
        console.log('  - ping: Ping/pong for connection testing');
        console.log('\n📚 See MESSAGE_PROTOCOL.md for complete protocol documentation');
        
        // Log service status periodically
        setInterval(() => {
            const status = service.getStatus();
            console.log(`📊 Service Status: ${status.clients} clients, ${status.sessions} sessions`);
        }, 30000); // Every 30 seconds
        
    } else {
        console.error('❌ Failed to start Terminal Service');
        process.exit(1);
    }

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
        console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
        await service.stop();
        console.log('✅ Terminal Service stopped');
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Only run if this file is executed directly
if (require.main === module) {
    startTerminalService().catch(error => {
        console.error('❌ Failed to start Terminal Service:', error);
        process.exit(1);
    });
}

export { startTerminalService };