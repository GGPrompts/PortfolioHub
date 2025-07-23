// Test the enhanced port detection functionality
const { PortDetectionService } = require('./out/services/portDetectionService');

async function testEnhancedPortDetection() {
    console.log('🧪 Testing Enhanced Port Detection');
    console.log('==================================');

    const portService = PortDetectionService.getInstance();
    
    // Test portfolio project specifically
    const portfolioProject = {
        id: 'claude-portfolio',
        title: 'Claude Portfolio (Self)',
        localPort: 5173,
        buildCommand: 'npm run dev',
        path: '.'
    };

    console.log('\n🔍 Testing Portfolio Project Detection:');
    console.log(`Configured port: ${portfolioProject.localPort}`);
    
    try {
        // Test 1: Smart port detection
        console.log('\n📡 Test 1: Smart Port Detection');
        const actualPort = await portService.detectActualPort(portfolioProject);
        console.log(`Detected actual port: ${actualPort || 'Not found'}`);
        
        // Test 2: Enhanced project status
        console.log('\n📊 Test 2: Enhanced Project Status');
        const enhancedStatus = await portService.getEnhancedProjectStatus(portfolioProject);
        console.log('Enhanced Status:', {
            status: enhancedStatus.status,
            actualPort: enhancedStatus.actualPort,
            ports: enhancedStatus.ports.map(p => ({ port: p.port, running: p.isRunning })),
            warnings: enhancedStatus.warnings
        });

        // Test 3: Port range status (Vite range)
        console.log('\n🌐 Test 3: Vite Port Range Status (5173-5180)');
        const viteRange = await portService.getPortRangeStatus(5173, 5180);
        console.log('Active ports in Vite range:', viteRange);

        // Test 4: Cache stats
        console.log('\n💾 Test 4: Cache Statistics');
        const cacheStats = portService.getCacheStats();
        console.log('Cache stats:', cacheStats);

        // Test 5: Clear cache and refresh
        console.log('\n🗑️ Test 5: Clear Cache and Enhanced Refresh');
        portService.clearCache();
        console.log('Cache cleared');
        
        const refreshResults = await portService.refreshAll([portfolioProject]);
        console.log('Refresh results:', refreshResults.map(r => ({
            projectId: r.projectId,
            status: r.status,
            ports: r.ports.filter(p => p.isRunning).map(p => p.port),
            warnings: r.warnings
        })));

        console.log('\n🎉 Enhanced Port Detection Test Complete!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testEnhancedPortDetection().catch(console.error);