// Project Button Testing Script
// Run this in browser console at http://localhost:5175

console.log('🚀 PROJECT BUTTON TESTING STARTED');
console.log('=' .repeat(50));

// Test project button functionality across environments
window.ProjectButtonTestResults = {
    timestamp: new Date().toISOString(),
    environment: null,
    vsCodeBridge: false,
    projects: [],
    buttons: {
        found: [],
        missing: [],
        disabled: [],
        enabled: []
    },
    interactions: []
};

async function detectEnvironment() {
    console.log('🔍 Detecting environment...');
    
    try {
        const testWS = new WebSocket('ws://localhost:8123');
        
        const result = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log('📱 Environment: Web Application Mode (WebSocket timeout)');
                window.ProjectButtonTestResults.environment = 'web-application';
                window.ProjectButtonTestResults.vsCodeBridge = false;
                testWS.close();
                resolve('web-application');
            }, 2000);

            testWS.onopen = () => {
                clearTimeout(timeout);
                console.log('🔗 Environment: VS Code Enhanced Mode (WebSocket connected)');
                window.ProjectButtonTestResults.environment = 'vscode-enhanced';
                window.ProjectButtonTestResults.vsCodeBridge = true;
                testWS.close();
                resolve('vscode-enhanced');
            };

            testWS.onerror = () => {
                clearTimeout(timeout);
                console.log('📱 Environment: Web Application Mode (WebSocket failed)');
                window.ProjectButtonTestResults.environment = 'web-application';
                window.ProjectButtonTestResults.vsCodeBridge = false;
                resolve('web-application');
            };
        });

        return result;
    } catch (error) {
        console.log('📱 Environment: Web Application Mode (Error)');
        window.ProjectButtonTestResults.environment = 'web-application';
        return 'web-application';
    }
}

function findProjectButtons() {
    console.log('\n🔍 Searching for project buttons...');
    
    const buttonSelectors = {
        // Main action buttons
        'launchAll': {
            selectors: [
                'button[title*="Launch all projects"]',
                'button:contains("🚀")',
                'button[title*="all projects in VS Code"]',
                'button[class*="launch"][title*="all"]'
            ],
            expectedFunction: 'Launch all projects'
        },
        'killAll': {
            selectors: [
                'button[title*="Kill all"]',
                'button:contains("⚰️")',
                'button[title*="stop all"]',
                'button[class*="kill"][title*="all"]'
            ],
            expectedFunction: 'Kill all projects'
        },
        'launchSelected': {
            selectors: [
                'button[title*="Launch selected"]',
                'button:contains("Launch Selected")',
                'button[title*="selected projects"]'
            ],
            expectedFunction: 'Launch selected projects'
        },
        'killSelected': {
            selectors: [
                'button[title*="Kill selected"]',
                'button:contains("Kill Selected")',
                'button[title*="stop selected"]'
            ],
            expectedFunction: 'Kill selected projects'
        },
        // Individual project buttons
        'startServer': {
            selectors: [
                'button:contains("▶️ Start server")',
                'button:contains("Start server")',
                '[class*="dropdown"] button:contains("Start")'
            ],
            expectedFunction: 'Start individual project server'
        },
        'killServer': {
            selectors: [
                'button:contains("⏹️ Kill server")',
                'button:contains("Kill server")',
                '[class*="dropdown"] button:contains("Kill")'
            ],
            expectedFunction: 'Kill individual project server'
        },
        'openBrowser': {
            selectors: [
                'button:contains("🔗 Open in new tab")',
                'button:contains("Open in new tab")',
                'button:contains("Open in browser")'
            ],
            expectedFunction: 'Open project in browser'
        },
        // Refresh and status buttons
        'refresh': {
            selectors: [
                'button:contains("🔄")',
                'button[title*="refresh"]',
                'button:contains("Refresh")'
            ],
            expectedFunction: 'Refresh project status'
        }
    };
    
    const results = {};
    
    Object.entries(buttonSelectors).forEach(([buttonType, config]) => {
        console.log(`\n🔍 Looking for ${buttonType} buttons...`);
        
        let found = false;
        let button = null;
        let usedSelector = null;
        
        for (const selector of config.selectors) {
            button = document.querySelector(selector);
            if (button) {
                found = true;
                usedSelector = selector;
                console.log(`✅ Found ${buttonType}: "${button.textContent?.trim()}" (${selector})`);
                break;
            }
        }
        
        if (!found) {
            console.log(`❌ ${buttonType} button not found`);
            window.ProjectButtonTestResults.buttons.missing.push({
                type: buttonType,
                expectedFunction: config.expectedFunction,
                searchedSelectors: config.selectors
            });
        }
        
        results[buttonType] = {
            found,
            button,
            selector: usedSelector,
            expectedFunction: config.expectedFunction,
            text: button?.textContent?.trim(),
            disabled: button?.disabled || false,
            className: button?.className || '',
            title: button?.title || ''
        };
        
        if (found) {
            if (button.disabled) {
                window.ProjectButtonTestResults.buttons.disabled.push({
                    type: buttonType,
                    text: button.textContent?.trim(),
                    reason: 'Button is disabled'
                });
                console.log(`⚠️ ${buttonType} is DISABLED`);
            } else {
                window.ProjectButtonTestResults.buttons.enabled.push({
                    type: buttonType,
                    text: button.textContent?.trim()
                });
                console.log(`✅ ${buttonType} is ENABLED`);
            }
        }
    });
    
    return results;
}

function findProjectCards() {
    console.log('\n🔍 Searching for project cards...');
    
    const projectCards = document.querySelectorAll('[class*="project"], [class*="card"]');
    console.log(`Found ${projectCards.length} potential project elements`);
    
    const projects = [];
    
    projectCards.forEach((card, index) => {
        const title = card.querySelector('[class*="title"], h2, h3')?.textContent?.trim();
        const statusDot = card.querySelector('[class*="status"], [class*="dot"]');
        const dropdownButton = card.querySelector('button, [role="button"]');
        
        if (title) {
            const project = {
                index,
                title,
                element: card,
                hasStatusDot: !!statusDot,
                statusDotText: statusDot?.textContent?.trim(),
                hasDropdown: !!dropdownButton,
                dropdownText: dropdownButton?.textContent?.trim(),
                className: card.className
            };
            
            projects.push(project);
            console.log(`📋 Project ${index + 1}: "${title}" ${project.hasStatusDot ? `(${project.statusDotText})` : ''}`);
        }
    });
    
    window.ProjectButtonTestResults.projects = projects;
    return projects;
}

async function testButtonInteraction(buttonType, button, environment) {
    if (!button) return null;
    
    console.log(`\n🧪 Testing ${buttonType} button interaction...`);
    
    // Create a mock click event to analyze behavior
    const originalOnClick = button.onclick;
    const originalListeners = [];
    
    // Capture existing event listeners (if possible)
    const clickHandler = function(event) {
        console.log(`🖱️ ${buttonType} clicked!`);
        console.log(`Environment: ${environment}`);
        console.log(`Button disabled: ${button.disabled}`);
        console.log(`Event details:`, {
            type: event.type,
            target: event.target.textContent?.trim(),
            timeStamp: event.timeStamp
        });
        
        const interaction = {
            buttonType,
            timestamp: new Date().toISOString(),
            environment,
            buttonDisabled: button.disabled,
            buttonText: button.textContent?.trim(),
            expectedBehavior: environment === 'vscode-enhanced' ? 
                'Direct execution in VS Code terminal' : 
                'Copy command to clipboard',
            actualBehavior: 'Click captured - actual behavior varies'
        };
        
        window.ProjectButtonTestResults.interactions.push(interaction);
        
        // Don't actually execute - just capture the event
        event.preventDefault();
        event.stopPropagation();
        
        console.log(`💾 Interaction logged for analysis`);
        return false;
    };
    
    // Add temporary event listener
    button.addEventListener('click', clickHandler, { once: true, capture: true });
    
    // Simulate click for testing
    console.log(`🔄 Simulating click on ${buttonType}...`);
    button.click();
    
    // Clean up
    button.removeEventListener('click', clickHandler);
    
    return window.ProjectButtonTestResults.interactions[window.ProjectButtonTestResults.interactions.length - 1];
}

function generateButtonMatrix(environment, buttonResults) {
    console.log('\n📊 GENERATING BUTTON FUNCTIONALITY MATRIX');
    console.log('=' .repeat(60));
    
    const matrix = [];
    
    Object.entries(buttonResults).forEach(([buttonType, result]) => {
        const matrixEntry = {
            button: buttonType,
            found: result.found ? '✅' : '❌',
            enabled: result.found ? (result.disabled ? '❌' : '✅') : 'N/A',
            vsCodeBehavior: result.found ? 
                (environment === 'vscode-enhanced' ? 
                    '🔗 Direct execution' : 
                    '❓ Not tested') : 
                '❌ Not available',
            webBehavior: result.found ? 
                (environment === 'web-application' ? 
                    '📋 Clipboard copy' : 
                    '❓ Not tested') : 
                '❌ Not available',
            issues: []
        };
        
        if (!result.found) {
            matrixEntry.issues.push('Button not found in DOM');
        } else if (result.disabled) {
            matrixEntry.issues.push('Button is disabled');
        }
        
        matrix.push(matrixEntry);
    });
    
    console.table(matrix);
    
    return matrix;
}

function generateFailureReport(environment, buttonResults, projects) {
    console.log('\n❌ FAILURE REPORT');
    console.log('=' .repeat(40));
    
    const failures = [];
    
    // Missing buttons
    const missingButtons = Object.entries(buttonResults)
        .filter(([_, result]) => !result.found)
        .map(([buttonType, result]) => ({
            category: 'Missing Button',
            button: buttonType,
            severity: 'High',
            issue: 'Button element not found in DOM',
            expectedFunction: result.expectedFunction,
            environment: environment,
            recommendation: 'Check React component rendering and CSS selectors'
        }));
    
    // Disabled buttons
    const disabledButtons = Object.entries(buttonResults)
        .filter(([_, result]) => result.found && result.disabled)
        .map(([buttonType, result]) => ({
            category: 'Disabled Button',
            button: buttonType,
            severity: 'Medium',
            issue: 'Button is disabled when it should be enabled',
            expectedFunction: result.expectedFunction,
            environment: environment,
            recommendation: 'Check button enable/disable logic and project status detection'
        }));
    
    // Project status issues
    const projectIssues = projects
        .filter(project => !project.hasStatusDot)
        .map(project => ({
            category: 'Project Status',
            button: `Project: ${project.title}`,
            severity: 'Low',
            issue: 'Project card missing status indicator',
            environment: environment,
            recommendation: 'Verify project status detection and UI rendering'
        }));
    
    failures.push(...missingButtons, ...disabledButtons, ...projectIssues);
    
    console.log(`Found ${failures.length} issues:`);
    failures.forEach((failure, index) => {
        console.log(`\n${index + 1}. ${failure.category}: ${failure.button}`);
        console.log(`   Severity: ${failure.severity}`);
        console.log(`   Issue: ${failure.issue}`);
        console.log(`   Recommendation: ${failure.recommendation}`);
    });
    
    return failures;
}

// Main test execution
async function runProjectButtonTest() {
    console.log('⏳ Starting project button test...\n');
    
    try {
        // Step 1: Detect environment
        const environment = await detectEnvironment();
        
        // Step 2: Find all buttons
        const buttonResults = findProjectButtons();
        
        // Step 3: Find project cards
        const projects = findProjectCards();
        
        // Step 4: Generate matrix
        const matrix = generateButtonMatrix(environment, buttonResults);
        
        // Step 5: Generate failure report
        const failures = generateFailureReport(environment, buttonResults, projects);
        
        // Step 6: Summary
        console.log('\n🏁 PROJECT BUTTON TEST COMPLETE');
        console.log('=' .repeat(50));
        console.log(`Environment: ${environment.toUpperCase()}`);
        console.log(`Buttons found: ${Object.values(buttonResults).filter(r => r.found).length}`);
        console.log(`Buttons missing: ${Object.values(buttonResults).filter(r => !r.found).length}`);
        console.log(`Buttons disabled: ${Object.values(buttonResults).filter(r => r.found && r.disabled).length}`);
        console.log(`Projects found: ${projects.length}`);
        console.log(`Issues identified: ${failures.length}`);
        
        console.log('\n💾 Full results available in: window.ProjectButtonTestResults');
        
        // Export data
        window.ProjectButtonTestResults.matrix = matrix;
        window.ProjectButtonTestResults.failures = failures;
        
        return window.ProjectButtonTestResults;
        
    } catch (error) {
        console.error('❌ Project button test failed:', error);
        return null;
    }
}

// Auto-start test
console.log('🚀 Starting project button test in 2 seconds...');
setTimeout(runProjectButtonTest, 2000);

// Make functions available globally
window.runProjectButtonTest = runProjectButtonTest;
window.detectEnvironment = detectEnvironment;
window.findProjectButtons = findProjectButtons;