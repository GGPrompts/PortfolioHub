// Comprehensive Cross-Environment Testing Script
// Run this in browser console at http://localhost:5175

console.log('🚀 COMPREHENSIVE CROSS-ENVIRONMENT TESTING STARTED');
console.log('=' .repeat(60));

// Global test results object
window.CrossEnvironmentTestResults = {
    timestamp: new Date().toISOString(),
    environment: {
        detected: null,
        webSocketAvailable: false,
        vsCodeBridgeConnected: false,
        capabilities: {}
    },
    buttonTests: {},
    functionalityMatrix: {},
    failureReport: [],
    recommendations: []
};

// Phase 1: Environment Detection Testing
console.log('\n📍 PHASE 1: ENVIRONMENT DETECTION TESTING');
console.log('-'.repeat(50));

async function testEnvironmentDetection() {
    const results = window.CrossEnvironmentTestResults.environment;
    
    // Test 1: Check WebSocket availability
    console.log('🔍 Test 1.1: WebSocket Bridge Availability');
    try {
        const testWS = new WebSocket('ws://localhost:8123');
        
        await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log('❌ WebSocket connection timeout (3s)');
                results.webSocketAvailable = false;
                results.detected = 'web-local';
                testWS.close();
                resolve();
            }, 3000);

            testWS.onopen = () => {
                clearTimeout(timeout);
                console.log('✅ WebSocket bridge connected');
                results.webSocketAvailable = true;
                results.vsCodeBridgeConnected = true;
                results.detected = 'vscode-local';
                testWS.close();
                resolve();
            };

            testWS.onerror = () => {
                clearTimeout(timeout);
                console.log('❌ WebSocket bridge connection failed');
                results.webSocketAvailable = false;
                results.detected = 'web-local';
                resolve();
            };
        });
    } catch (error) {
        console.error('❌ WebSocket test error:', error);
        results.webSocketAvailable = false;
        results.detected = 'web-local';
    }
    
    // Test 2: Check environment bridge functions
    console.log('\n🔍 Test 1.2: Environment Bridge Functions');
    try {
        // Wait for app to load environment bridge
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if functions are available in React app context
        const appElement = document.querySelector('#root');
        if (appElement && appElement._reactInternalInstance) {
            console.log('✅ React app detected');
        } else {
            console.log('⚠️ React app context not accessible via direct DOM inspection');
        }
        
        // Check global scope for environment utilities
        if (window.environmentBridge) {
            console.log('✅ environmentBridge found globally');
            results.capabilities = window.environmentBridge.getCapabilities();
            console.log('Capabilities:', results.capabilities);
        } else {
            console.log('❌ environmentBridge not in global scope');
        }
        
    } catch (error) {
        console.error('❌ Environment bridge test error:', error);
    }
    
    // Test 3: Check VS Code specific indicators
    console.log('\n🔍 Test 1.3: VS Code Environment Indicators');
    const indicators = {
        vscodeAPI: !!window.vscode,
        userAgent: navigator.userAgent.includes('Code'),
        webviewName: window.name === 'webview',
        hostname: window.location.hostname,
        port: window.location.port
    };
    
    console.log('VS Code API:', indicators.vscodeAPI);
    console.log('User Agent includes "Code":', indicators.userAgent);
    console.log('Window name is "webview":', indicators.webviewName);
    console.log('Running on localhost:', indicators.hostname === 'localhost');
    
    results.indicators = indicators;
    
    console.log(`\n🎯 DETECTED ENVIRONMENT: ${results.detected.toUpperCase()}`);
    return results.detected;
}

// Phase 2: Button Functionality Testing
console.log('\n🔘 PHASE 2: BUTTON FUNCTIONALITY TESTING');
console.log('-'.repeat(50));

function findButton(selectors, name) {
    for (const selector of selectors) {
        const button = document.querySelector(selector);
        if (button) {
            console.log(`✅ Found ${name}: ${selector}`);
            return button;
        }
    }
    console.log(`❌ Button not found: ${name}`);
    return null;
}

function testButtonBehavior(button, buttonName, expectedVSCode, expectedWeb) {
    if (!button) {
        return {
            found: false,
            error: 'Button not found'
        };
    }
    
    const result = {
        found: true,
        name: buttonName,
        text: button.textContent?.trim(),
        disabled: button.disabled,
        hasClickHandler: !!(button.onclick || button.getAttribute('onclick')),
        className: button.className,
        expectedVSCode,
        expectedWeb,
        actualBehavior: 'Unknown - requires user interaction to test'
    };
    
    console.log(`📊 ${buttonName}:`);
    console.log(`   Text: "${result.text}"`);
    console.log(`   Disabled: ${result.disabled}`);
    console.log(`   Has Handler: ${result.hasClickHandler}`);
    console.log(`   Expected in VS Code: ${expectedVSCode}`);
    console.log(`   Expected in Web: ${expectedWeb}`);
    
    return result;
}

async function testButtonFunctionality() {
    console.log('🔍 Testing button functionality across categories...\n');
    
    const buttonCategories = {
        'Project Management': [
            {
                name: 'Launch All Projects',
                selectors: [
                    'button[title*="Launch all projects"]',
                    'button:contains("🚀")',
                    '[class*="launch"]:contains("all")'
                ],
                expectedVSCode: 'Execute PowerShell script in VS Code terminal',
                expectedWeb: 'Copy PowerShell command to clipboard'
            },
            {
                name: 'Kill All Projects',
                selectors: [
                    'button[title*="Kill all"]',
                    'button:contains("⚰️")',
                    '[class*="kill"]:contains("all")'
                ],
                expectedVSCode: 'Execute kill script in VS Code terminal',
                expectedWeb: 'Copy kill command to clipboard'
            },
            {
                name: 'Start Server',
                selectors: [
                    'button:contains("▶️ Start server")',
                    '[class*="dropdown"] button:contains("Start")',
                    'button[title*="Start"]'
                ],
                expectedVSCode: 'Execute npm run dev in VS Code terminal',
                expectedWeb: 'Copy npm run dev to clipboard'
            },
            {
                name: 'Kill Server',
                selectors: [
                    'button:contains("⏹️ Kill server")',
                    '[class*="dropdown"] button:contains("Kill")',
                    'button[title*="Kill"]'
                ],
                expectedVSCode: 'Kill process in VS Code terminal',
                expectedWeb: 'Copy kill command to clipboard'
            }
        ],
        
        'Quick Commands Panel': [
            {
                name: 'First VS Code Command',
                selectors: [
                    '.quickCommandsPanel .commandItem:first-child',
                    '[class*="quickCommands"] [class*="command"]:first-child',
                    '[class*="commandItem"]:first-child'
                ],
                expectedVSCode: 'Execute VS Code command directly',
                expectedWeb: 'Copy command to clipboard'
            },
            {
                name: 'Terminal Command',
                selectors: [
                    '[class*="commandItem"][title*="terminal"]',
                    '[class*="command"]:contains("npm")',
                    '[class*="command"]:contains("git")'
                ],
                expectedVSCode: 'Copy to clipboard (terminal commands)',
                expectedWeb: 'Copy to clipboard (terminal commands)'
            }
        ],
        
        'DEV NOTES': [
            {
                name: 'Save Note',
                selectors: [
                    'button:contains("💾 Save")',
                    'button:contains("Save Note")',
                    '[class*="note"] button:contains("Save")'
                ],
                expectedVSCode: 'Save file via VS Code API',
                expectedWeb: 'Save to localStorage or trigger download'
            },
            {
                name: 'Copy Note',
                selectors: [
                    'button:contains("📋 Copy")',
                    'button:contains("Copy Note")',
                    '[class*="note"] button:contains("Copy")'
                ],
                expectedVSCode: 'Copy to clipboard',
                expectedWeb: 'Copy to clipboard'
            }
        ],
        
        'UI Controls': [
            {
                name: 'Refresh Button',
                selectors: [
                    'button:contains("refresh")',
                    'button:contains("🔄")',
                    '[title*="refresh"]'
                ],
                expectedVSCode: 'Refresh via VS Code API',
                expectedWeb: 'Local data refresh'
            },
            {
                name: 'Sidebar Toggle',
                selectors: [
                    'button[title*="toggle"]',
                    '[class*="sidebar"] button:first-child',
                    'button:contains("☰")'
                ],
                expectedVSCode: 'UI state change (identical)',
                expectedWeb: 'UI state change (identical)'
            }
        ]
    };
    
    const results = {};
    
    for (const [category, buttons] of Object.entries(buttonCategories)) {
        console.log(`\n📂 Testing ${category} buttons:`);
        results[category] = {};
        
        for (const buttonConfig of buttons) {
            const button = findButton(buttonConfig.selectors, buttonConfig.name);
            const result = testButtonBehavior(
                button, 
                buttonConfig.name, 
                buttonConfig.expectedVSCode, 
                buttonConfig.expectedWeb
            );
            results[category][buttonConfig.name] = result;
            
            // Add to failure report if button not found or disabled when it shouldn't be
            if (!result.found) {
                window.CrossEnvironmentTestResults.failureReport.push({
                    category,
                    button: buttonConfig.name,
                    issue: 'Button not found',
                    selectors: buttonConfig.selectors,
                    severity: 'high'
                });
            } else if (result.disabled && !buttonConfig.expectedDisabled) {
                window.CrossEnvironmentTestResults.failureReport.push({
                    category,
                    button: buttonConfig.name,
                    issue: 'Button unexpectedly disabled',
                    severity: 'medium'
                });
            }
        }
    }
    
    window.CrossEnvironmentTestResults.buttonTests = results;
    return results;
}

// Phase 3: Generate Functionality Matrix
console.log('\n📊 PHASE 3: FUNCTIONALITY MATRIX GENERATION');
console.log('-'.repeat(50));

function generateFunctionalityMatrix(environment, buttonResults) {
    console.log('🔍 Generating functionality matrix...\n');
    
    const matrix = [];
    const vsCodeEnhanced = environment === 'vscode-local';
    
    for (const [category, buttons] of Object.entries(buttonResults)) {
        for (const [buttonName, result] of Object.entries(buttons)) {
            if (result.found) {
                matrix.push({
                    component: category,
                    button: buttonName,
                    vsCodeWorks: vsCodeEnhanced ? '✅ Expected to work' : '❓ Untested',
                    webWorks: !vsCodeEnhanced ? '✅ Current mode' : '❓ Untested',
                    expectedVSCode: result.expectedVSCode,
                    expectedWeb: result.expectedWeb,
                    currentStatus: result.disabled ? '❌ Disabled' : '✅ Enabled',
                    issues: result.disabled && !result.expectedDisabled ? ['Unexpectedly disabled'] : []
                });
            } else {
                matrix.push({
                    component: category,
                    button: buttonName,
                    vsCodeWorks: '❌ Button not found',
                    webWorks: '❌ Button not found', 
                    expectedVSCode: result.expectedVSCode,
                    expectedWeb: result.expectedWeb,
                    currentStatus: '❌ Not found',
                    issues: ['Button element not found in DOM']
                });
            }
        }
    }
    
    // Display matrix in console
    console.log('📋 FUNCTIONALITY MATRIX:');
    console.log('='.repeat(100));
    console.table(matrix);
    
    window.CrossEnvironmentTestResults.functionalityMatrix = matrix;
    return matrix;
}

// Phase 4: Generate Recommendations
function generateRecommendations(environment, failureReport, matrix) {
    console.log('\n💡 GENERATING RECOMMENDATIONS');
    console.log('-'.repeat(50));
    
    const recommendations = [];
    
    // Environment-specific recommendations
    if (environment === 'vscode-local') {
        recommendations.push({
            category: 'VS Code Enhanced Mode',
            priority: 'High',
            issue: 'VS Code bridge connected but some commands may still use clipboard fallback',
            recommendation: 'Verify all VS Code commands execute directly instead of copying to clipboard',
            action: 'Test each command category systematically and check VS Code Output panel for bridge messages'
        });
    } else {
        recommendations.push({
            category: 'Web Application Mode',
            priority: 'Medium',
            issue: 'Running in clipboard mode - commands copy instead of execute',
            recommendation: 'Install and activate VS Code extension for enhanced functionality',
            action: 'Run: code --install-extension claude-portfolio-unified-architecture.vsix'
        });
    }
    
    // Button-specific recommendations
    const missingButtons = failureReport.filter(f => f.issue === 'Button not found');
    if (missingButtons.length > 0) {
        recommendations.push({
            category: 'Missing Buttons',
            priority: 'High',
            issue: `${missingButtons.length} critical buttons not found in DOM`,
            recommendation: 'Check React component rendering and CSS selector accuracy',
            action: 'Review PortfolioSidebar.tsx and QuickCommandsPanel.tsx for button implementations'
        });
    }
    
    const disabledButtons = failureReport.filter(f => f.issue === 'Button unexpectedly disabled');
    if (disabledButtons.length > 0) {
        recommendations.push({
            category: 'Disabled Buttons',
            priority: 'Medium',
            issue: `${disabledButtons.length} buttons are disabled when they should be enabled`,
            recommendation: 'Check button enable/disable logic in React components',
            action: 'Review useProjectData hook and project status detection logic'
        });
    }
    
    // Cross-environment consistency recommendations
    recommendations.push({
        category: 'Cross-Environment Consistency',
        priority: 'High',
        issue: 'User experience differs significantly between VS Code and Web modes',
        recommendation: 'Implement consistent feedback patterns across both environments',
        action: 'Ensure both modes show clear status indicators and appropriate user feedback'
    });
    
    console.log('📝 RECOMMENDATIONS:');
    recommendations.forEach((rec, index) => {
        console.log(`\n${index + 1}. ${rec.category} (${rec.priority} Priority)`);
        console.log(`   Issue: ${rec.issue}`);
        console.log(`   Recommendation: ${rec.recommendation}`);
        console.log(`   Action: ${rec.action}`);
    });
    
    window.CrossEnvironmentTestResults.recommendations = recommendations;
    return recommendations;
}

// Main test execution
async function runComprehensiveTest() {
    try {
        console.log('⏳ Starting comprehensive test execution...\n');
        
        // Phase 1: Environment Detection
        const detectedEnvironment = await testEnvironmentDetection();
        
        // Wait for app to fully load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Phase 2: Button Functionality Testing
        const buttonResults = await testButtonFunctionality();
        
        // Phase 3: Generate Matrix
        const matrix = generateFunctionalityMatrix(detectedEnvironment, buttonResults);
        
        // Phase 4: Generate Recommendations
        const recommendations = generateRecommendations(
            detectedEnvironment, 
            window.CrossEnvironmentTestResults.failureReport, 
            matrix
        );
        
        // Final summary
        console.log('\n🏁 COMPREHENSIVE TEST COMPLETE');
        console.log('='.repeat(60));
        console.log(`Environment: ${detectedEnvironment.toUpperCase()}`);
        console.log(`Total buttons tested: ${Object.values(buttonResults).reduce((total, category) => total + Object.keys(category).length, 0)}`);
        console.log(`Issues found: ${window.CrossEnvironmentTestResults.failureReport.length}`);
        console.log(`Recommendations: ${recommendations.length}`);
        console.log('\n💾 Full results available in: window.CrossEnvironmentTestResults');
        
        // Export results
        const exportData = JSON.stringify(window.CrossEnvironmentTestResults, null, 2);
        console.log('\n📤 Exportable JSON results:');
        console.log(exportData);
        
    } catch (error) {
        console.error('❌ Comprehensive test failed:', error);
        console.log('Partial results may be available in window.CrossEnvironmentTestResults');
    }
}

// Auto-start the test
console.log('🚀 Starting test in 2 seconds...');
setTimeout(runComprehensiveTest, 2000);

// Make functions available globally for manual testing
window.testEnvironmentDetection = testEnvironmentDetection;
window.testButtonFunctionality = testButtonFunctionality;
window.runComprehensiveTest = runComprehensiveTest;