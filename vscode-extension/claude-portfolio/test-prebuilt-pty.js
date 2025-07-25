/**
 * Test the prebuilt node-pty version
 */

const pty = require('@homebridge/node-pty-prebuilt-multiarch');
const os = require('os');

console.log('🧪 Testing prebuilt node-pty terminal streaming...\n');

// Test 1: Create a terminal like our VS Code extension does
console.log('1️⃣ Creating prebuilt node-pty terminal...');

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
const ptyTerminal = pty.spawn(shell, os.platform() === 'win32' ? ['-NoLogo'] : [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
});

console.log('✅ Terminal created successfully');

// Test 2: Set up output streaming
console.log('2️⃣ Setting up output streaming...');

ptyTerminal.onData((data) => {
    process.stdout.write(`📤 Terminal Output: ${JSON.stringify(data.substring(0, 100))}${data.length > 100 ? '...' : ''}\n`);
});

ptyTerminal.onExit((e) => {
    console.log(`🔚 Terminal exited with code ${e.exitCode}, signal ${e.signal}`);
    process.exit(0);
});

console.log('✅ Output streaming configured');

// Test 3: Send test commands
console.log('3️⃣ Sending test commands...\n');
console.log('--- TERMINAL OUTPUT ---');

setTimeout(() => {
    console.log('\n📤 Sending: echo "Hello from prebuilt terminal!"');
    ptyTerminal.write('echo "Hello from prebuilt terminal!"\r\n');
}, 1000);

setTimeout(() => {
    console.log('\n📤 Sending: Get-Date (PowerShell command)');
    ptyTerminal.write('Get-Date\r\n');
}, 3000);

setTimeout(() => {
    console.log('\n📤 Sending: exit');
    ptyTerminal.write('exit\r\n');
}, 5000);

console.log('⏳ Waiting for terminal output...\n');