/**
 * Simple Node.js script to test terminal streaming
 * Run this to verify our node-pty implementation works
 */

const pty = require('node-pty');
const os = require('os');

console.log('🧪 Testing terminal streaming implementation...\n');

// Test 1: Create a terminal like our VS Code extension does
console.log('1️⃣ Creating node-pty terminal...');

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
const ptyTerminal = pty.spawn(shell, os.platform() === 'win32' ? ['-NoLogo'] : [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
});

console.log('✅ Terminal created');

// Test 2: Set up output streaming
console.log('2️⃣ Setting up output streaming...');

ptyTerminal.onData((data) => {
    console.log('📤 Terminal Output:', JSON.stringify(data));
});

ptyTerminal.onExit((e) => {
    console.log(`🔚 Terminal exited with code ${e.exitCode}, signal ${e.signal}`);
    process.exit(0);
});

console.log('✅ Output streaming configured');

// Test 3: Send test commands
console.log('3️⃣ Sending test commands...\n');

setTimeout(() => {
    console.log('📤 Sending: echo "Hello from real terminal!"');
    ptyTerminal.write('echo "Hello from real terminal!"\r\n');
}, 1000);

setTimeout(() => {
    console.log('📤 Sending: dir (Windows) / ls (Unix)');
    const listCommand = os.platform() === 'win32' ? 'dir\r\n' : 'ls -la\r\n';
    ptyTerminal.write(listCommand);
}, 3000);

setTimeout(() => {
    console.log('📤 Sending: exit');
    ptyTerminal.write('exit\r\n');
}, 5000);

console.log('⏳ Waiting for terminal output...\n');
console.log('--- TERMINAL OUTPUT ---');