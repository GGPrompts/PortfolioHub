// Test script to verify checkPort function works correctly
async function testCheckPort() {
    console.log('Testing port checking logic...')
    
    // Simulate the checkPort function logic
    async function checkPort(port) {
        try {
            const img = new Image();
            
            return new Promise((resolve) => {
                const timeoutId = setTimeout(() => {
                    resolve(false);
                }, 1000);
                
                img.onload = () => {
                    clearTimeout(timeoutId);
                    console.log(`✅ Port ${port}: favicon.ico loaded - RUNNING`);
                    resolve(true);
                };
                
                img.onerror = () => {
                    clearTimeout(timeoutId);
                    console.log(`❌ Port ${port}: favicon.ico failed - OFFLINE`);
                    resolve(false);
                };
                
                img.src = `http://localhost:${port}/favicon.ico?t=${Date.now()}`;
                console.log(`🔍 Checking port ${port}...`);
            });
        } catch (error) {
            console.log(`💥 Port ${port}: Error - ${error.message}`);
            return false;
        }
    }
    
    // Test ports
    console.log('\n=== Testing Known Ports ===');
    await checkPort(9323); // Should be running
    await checkPort(9999); // Should be offline
    await checkPort(5173); // Portfolio port - should be running
    await checkPort(9326); // New GGPrompts port - should be running
}

// Run in browser console
if (typeof window !== 'undefined') {
    window.testCheckPort = testCheckPort;
    console.log('Test function loaded. Run: testCheckPort()');
}