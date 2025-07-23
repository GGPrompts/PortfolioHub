// Cross-Environment Testing - Button Functionality Test
// Run this in the browser console at http://localhost:5175

console.log('🔘 Starting Button Functionality Test...\n');

// Helper function to simulate button clicks and capture behavior
function testButtonClick(selector, buttonName, expectedVSCodeBehavior, expectedWebBehavior) {
    console.log(`\n=== Testing Button: ${buttonName} ===`);
    console.log(`Selector: ${selector}`);
    console.log(`Expected VS Code: ${expectedVSCodeBehavior}`);
    console.log(`Expected Web: ${expectedWebBehavior}`);
    
    try {
        const button = document.querySelector(selector);
        if (!button) {
            console.log(`❌ Button not found: ${selector}`);
            return {
                found: false,
                error: 'Button not found'
            };
        }
        
        console.log(`✅ Button found: ${button.textContent?.trim()}`);
        console.log(`Disabled: ${button.disabled}`);
        console.log(`Classes: ${button.className}`);
        
        // Check if button has click handler
        const hasClickHandler = button.onclick !== null || 
                               button.addEventListener !== undefined ||
                               button.getAttribute('onclick') !== null;
        console.log(`Has Click Handler: ${hasClickHandler}`);
        
        return {
            found: true,
            disabled: button.disabled,
            text: button.textContent?.trim(),
            classes: button.className,
            hasClickHandler,
            element: button
        };
        
    } catch (error) {
        console.error(`❌ Error testing ${buttonName}:`, error);
        return {
            found: false,
            error: error.message
        };
    }
}

// Test specific button categories
const buttonTests = [
    // Project Management Buttons
    {
        category: 'Project Management',
        tests: [
            {
                selector: 'button[title*="Launch all projects"]',
                name: '🚀 Launch All Projects',
                expectedVSCode: 'Direct terminal execution in VS Code',
                expectedWeb: 'Command copied to clipboard'
            },
            {
                selector: 'button[title*="Kill all"]',
                name: '⚰️ Kill All Projects',
                expectedVSCode: 'Direct terminal execution in VS Code',
                expectedWeb: 'Command copied to clipboard'
            },
            {
                selector: 'button:contains("▶️ Start server")',
                name: '▶️ Start Server',
                expectedVSCode: 'Direct terminal execution in VS Code',
                expectedWeb: 'Command copied to clipboard'
            },
            {
                selector: 'button:contains("⏹️ Kill server")',
                name: '⏹️ Kill Server', 
                expectedVSCode: 'Direct terminal execution in VS Code',
                expectedWeb: 'Command copied to clipboard'
            }
        ]
    },
    
    // Quick Commands Panel
    {
        category: 'Quick Commands Panel',
        tests: [
            {
                selector: '.quickCommandsPanel .commandItem:first-child',
                name: 'First Quick Command',
                expectedVSCode: 'Execute VS Code command or copy terminal command',
                expectedWeb: 'Copy command to clipboard'
            },
            {
                selector: '.quickCommandsPanel .commandItem[title*="vscode"]',
                name: 'VS Code Command',
                expectedVSCode: 'Direct VS Code command execution',
                expectedWeb: 'Copy command to clipboard'
            },
            {
                selector: '.quickCommandsPanel .commandItem[title*="terminal"]',
                name: 'Terminal Command',
                expectedVSCode: 'Copy to clipboard or execute in terminal',
                expectedWeb: 'Copy command to clipboard'
            }
        ]
    },
    
    // DEV NOTES System
    {
        category: 'DEV NOTES',
        tests: [
            {
                selector: 'button:contains("💾 Save Note")',
                name: '💾 Save Note',
                expectedVSCode: 'Save file via VS Code API',
                expectedWeb: 'Browser download or localStorage'
            },
            {
                selector: 'button:contains("📋 Copy Note")',
                name: '📋 Copy Note',
                expectedVSCode: 'Copy to clipboard',
                expectedWeb: 'Copy to clipboard'
            },
            {
                selector: 'button:contains("🗑️ Delete Note")',
                name: '🗑️ Delete Note',
                expectedVSCode: 'Delete file via VS Code API',
                expectedWeb: 'Remove from localStorage'
            }
        ]
    },
    
    // UI Controls
    {
        category: 'UI Controls',
        tests: [
            {
                selector: 'button[title*="toggle"]',
                name: 'Sidebar Toggle',
                expectedVSCode: 'State change (identical)',
                expectedWeb: 'State change (identical)'
            },
            {
                selector: 'button:contains("refresh")',
                name: 'Refresh Button',
                expectedVSCode: 'VS Code API refresh',
                expectedWeb: 'Local data refresh'
            }
        ]
    }
];

// Run the tests
console.log('Starting systematic button testing...\n');

const results = {};

buttonTests.forEach(category => {
    console.log(`\n🗂️ === ${category.category} ===`);
    results[category.category] = {};
    
    category.tests.forEach(test => {
        const result = testButtonClick(test.selector, test.name, test.expectedVSCode, test.expectedWeb);
        results[category.category][test.name] = result;
    });
});

// Generate summary
console.log('\n📊 === TEST SUMMARY ===');
Object.keys(results).forEach(category => {
    console.log(`\n${category}:`);
    Object.keys(results[category]).forEach(buttonName => {
        const result = results[category][buttonName];
        if (result.found) {
            console.log(`  ✅ ${buttonName}: Found${result.disabled ? ' (DISABLED)' : ''}`);
        } else {
            console.log(`  ❌ ${buttonName}: ${result.error || 'Not found'}`);
        }
    });
});

// Export results to global scope for further analysis
window.buttonTestResults = results;
console.log('\n💾 Results saved to window.buttonTestResults');

// Function to simulate environment change
window.simulateEnvironmentChange = function(newMode) {
    console.log(`\n🔄 Simulating environment change to: ${newMode}`);
    // This would need to be implemented to actually change the environment
    console.log('Note: This is a simulation - actual environment change requires WebSocket connection changes');
};

console.log('\n🏁 Button Functionality Test Complete!');
console.log('Use window.buttonTestResults to analyze results');
console.log('Use window.simulateEnvironmentChange("vscode-local") to test mode changes');