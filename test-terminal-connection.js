#!/usr/bin/env node

/**
 * Test Terminal Service WebSocket Connection
 * This script tests the connection between the React app and terminal service
 */

const WebSocket = require('ws');

async function testTerminalConnection() {
  console.log('🧪 Testing terminal service connection...');
  
  try {
    // Connect to terminal service
    const ws = new WebSocket('ws://localhost:8002');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, 5000);
      
      ws.on('open', () => {
        console.log('✅ Successfully connected to terminal service');
        clearTimeout(timeout);
        
        // Send a ping message
        ws.send(JSON.stringify({
          type: 'ping',
          id: 'test-ping',
          timestamp: Date.now()
        }));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('📨 Received message:', {
            type: message.type,
            success: message.success,
            message: message.message
          });
          
          if (message.type === 'connected') {
            console.log('🎯 Terminal service capabilities:', message.data);
            
            // Test creating a terminal session
            ws.send(JSON.stringify({
              type: 'terminal-create',
              id: 'test-terminal-create',
              sessionId: 'test-session-1',
              workbranchId: 'test-workbranch',
              projectId: 'claude-dev-portfolio',
              shell: process.platform === 'win32' ? 'powershell' : 'bash',
              timestamp: Date.now()
            }));
          } else if (message.type === 'terminal-created') {
            console.log('✅ Terminal session created successfully');
            
            // Test sending a command
            ws.send(JSON.stringify({
              type: 'terminal-command',
              id: 'test-command',
              sessionId: 'test-session-1',
              command: process.platform === 'win32' ? 'echo "Terminal service working!"' : 'echo "Terminal service working!"',
              timestamp: Date.now()
            }));
          } else if (message.type === 'terminal-output') {
            console.log('📟 Terminal output:', message.data.data);
            console.log('✅ End-to-end test completed successfully!');
            
            // Clean up and close
            ws.send(JSON.stringify({
              type: 'terminal-destroy',
              id: 'test-cleanup',
              sessionId: 'test-session-1',
              timestamp: Date.now()
            }));
            
            setTimeout(() => {
              ws.close();
              clearTimeout(timeout);
              resolve(true);
            }, 1000);
          }
          
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('🔌 Connection closed');
        clearTimeout(timeout);
        resolve(true);
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        clearTimeout(timeout);
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to test terminal connection:', error);
    return false;
  }
}

// Run the test
testTerminalConnection()
  .then((success) => {
    if (success) {
      console.log('🎉 All tests passed! Terminal service is fully functional.');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });