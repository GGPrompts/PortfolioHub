#!/usr/bin/env node

/**
 * Terminal Service Launcher
 * Starts the terminal service on port 8002 using compiled JavaScript
 */

const path = require('path');

// Register ts-node for TypeScript compilation
require('ts-node').register({
  project: path.join(__dirname, 'tsconfig.json'),
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
    moduleResolution: 'node',
    allowSyntheticDefaultImports: true,
    esModuleInterop: true
  }
});

// Import and start the terminal service
async function main() {
  try {
    console.log('🚀 Starting Terminal Service Launcher...');
    
    const { startTerminalService } = require('./src/services/terminal-service/example-server.ts');
    
    await startTerminalService();
    
  } catch (error) {
    console.error('❌ Failed to start terminal service:', error);
    process.exit(1);
  }
}

main();