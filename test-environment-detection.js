// Cross-Environment Testing - Environment Detection Test
// Run this in the browser console at http://localhost:5175

console.log('🔍 Starting Environment Detection Test...\n');

// Test 1: Check environment bridge initialization
console.log('=== Test 1: Environment Bridge Status ===');
try {
    // Check if environmentBridge is available globally
    if (typeof window !== 'undefined' && window.environmentBridge) {
        console.log('✅ Environment Bridge found globally');
        console.log('Mode:', window.environmentBridge.getMode());
        console.log('VS Code Available:', window.environmentBridge.isVSCodeAvailable());
        console.log('Connected:', window.environmentBridge.isConnected());
        console.log('Connection Status:', window.environmentBridge.getConnectionStatus());
        console.log('Capabilities:', window.environmentBridge.getCapabilities());
    } else {
        console.log('❌ Environment Bridge not found globally');
    }
} catch (error) {
    console.error('❌ Environment Bridge test failed:', error);
}

// Test 2: Check WebSocket connection attempt
console.log('\n=== Test 2: WebSocket Connection Status ===');
try {
    // Try to create a test WebSocket connection to VS Code bridge
    const testWS = new WebSocket('ws://localhost:8123');
    
    testWS.onopen = () => {
        console.log('✅ WebSocket to VS Code bridge: CONNECTED');
        console.log('🔗 Environment should be: VS Code Enhanced Mode');
        testWS.close();
    };
    
    testWS.onerror = (error) => {
        console.log('❌ WebSocket to VS Code bridge: FAILED');
        console.log('📱 Environment should be: Web Application Mode');
        console.log('Error:', error);
    };
    
    testWS.onclose = () => {
        console.log('🔌 WebSocket connection closed');
    };
    
    // Timeout test
    setTimeout(() => {
        if (testWS.readyState === WebSocket.CONNECTING) {
            console.log('⏰ WebSocket connection timeout - VS Code bridge not available');
            testWS.close();
        }
    }, 3000);
    
} catch (error) {
    console.error('❌ WebSocket test failed:', error);
    console.log('📱 Fallback to Web Application Mode');
}

// Test 3: Check VS Code environment detection functions
console.log('\n=== Test 3: Environment Detection Functions ===');
setTimeout(() => {
    try {
        // Test isVSCodeEnvironment function if available
        if (typeof window.isVSCodeEnvironment === 'function') {
            console.log('✅ isVSCodeEnvironment function found');
            console.log('Result:', window.isVSCodeEnvironment());
        } else {
            console.log('❌ isVSCodeEnvironment function not found globally');
        }
        
        // Test environment mode detection
        if (typeof window.getEnvironmentMode === 'function') {
            console.log('✅ getEnvironmentMode function found');
            console.log('Result:', window.getEnvironmentMode());
        } else {
            console.log('❌ getEnvironmentMode function not found globally');
        }
        
    } catch (error) {
        console.error('❌ Environment detection function test failed:', error);
    }
}, 1000);

// Test 4: Check browser environment characteristics
console.log('\n=== Test 4: Browser Environment Characteristics ===');
console.log('Hostname:', window.location.hostname);
console.log('Port:', window.location.port);
console.log('Protocol:', window.location.protocol);
console.log('User Agent:', navigator.userAgent);
console.log('Clipboard Available:', !!navigator.clipboard);

// Test 5: Check for VS Code specific indicators
console.log('\n=== Test 5: VS Code Specific Indicators ===');
console.log('VS Code Extension Host:', !!window.vscode);
console.log('Acquirer (VS Code):', window.navigator.userAgent.includes('Code'));
console.log('Webview (VS Code):', window.name === 'webview');

console.log('\n🏁 Environment Detection Test Complete!');
console.log('Check the results above to determine current environment mode.');