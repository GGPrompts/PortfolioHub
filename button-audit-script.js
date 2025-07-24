// 🔍 Comprehensive Button Audit Script
// Run this in browser console at http://localhost:5173

console.log('🧪 Starting comprehensive button audit...');

// 1. Find all interactive elements
const getAllInteractiveElements = () => {
    const selectors = [
        'button',
        '[onClick]', 
        '[role="button"]',
        '.clickable',
        'a[href]',
        'input[type="button"]',
        'input[type="submit"]'
    ];
    
    const elements = [];
    selectors.forEach(selector => {
        const found = document.querySelectorAll(selector);
        found.forEach(el => elements.push({
            element: el,
            type: el.tagName.toLowerCase(),
            text: el.textContent?.trim() || el.getAttribute('aria-label') || el.title || 'No text',
            id: el.id || 'No ID',
            className: el.className || 'No class',
            disabled: el.disabled || false,
            selector: selector
        }));
    });
    
    return elements;
};

// 2. Test button responsiveness
const testButtonResponsiveness = (element) => {
    const originalHandler = element.onclick;
    let clicked = false;
    
    element.onclick = function(e) {
        clicked = true;
        console.log(`✅ Button responded: "${element.textContent?.trim()}"`);
        if (originalHandler) {
            return originalHandler.call(this, e);
        }
    };
    
    // Simulate click
    element.click();
    
    setTimeout(() => {
        if (!clicked) {
            console.log(`❌ Button not responsive: "${element.textContent?.trim()}"`);
        }
        element.onclick = originalHandler;
    }, 100);
};

// 3. Check for error patterns
const checkForErrorPatterns = () => {
    console.log('🔍 Checking for common error patterns...');
    
    // Listen for console errors
    const originalConsoleError = console.error;
    const errors = [];
    
    console.error = function(...args) {
        errors.push(args.join(' '));
        originalConsoleError.apply(console, args);
    };
    
    // Listen for WebSocket events
    if (window.vsCodeWebSocket) {
        console.log('🔗 WebSocket connection found:', window.vsCodeWebSocket.readyState);
    } else {
        console.log('📱 No WebSocket - running in Web Application mode');
    }
    
    return { errors };
};

// 4. Main audit function
const runButtonAudit = () => {
    console.log('📊 BUTTON AUDIT RESULTS:');
    console.log('========================');
    
    const elements = getAllInteractiveElements();
    console.log(`Found ${elements.length} interactive elements`);
    
    // Group by component area
    const byArea = {
        sidebar: elements.filter(el => el.element.closest('.portfolio-sidebar')),
        batch: elements.filter(el => el.element.closest('.batch-commands')),
        devnotes: elements.filter(el => el.element.closest('.dev-notes')),
        rightSidebar: elements.filter(el => el.element.closest('.right-sidebar')),
        projectViewer: elements.filter(el => el.element.closest('.project-viewer')),
        other: elements.filter(el => !el.element.closest('.portfolio-sidebar, .batch-commands, .dev-notes, .right-sidebar, .project-viewer'))
    };
    
    Object.entries(byArea).forEach(([area, buttons]) => {
        if (buttons.length > 0) {
            console.log(`\n📍 ${area.toUpperCase()}: ${buttons.length} buttons`);
            buttons.forEach((btn, i) => {
                const status = btn.disabled ? '🚫 DISABLED' : '✅ ENABLED';
                console.log(`  ${i+1}. ${status} "${btn.text}" (${btn.type})`);
            });
        }
    });
    
    // Test responsiveness
    console.log('\n🧪 Testing button responsiveness...');
    elements.slice(0, 10).forEach(el => {
        if (el.type === 'button' && !el.disabled) {
            testButtonResponsiveness(el.element);
        }
    });
    
    checkForErrorPatterns();
};

// 5. Easy commands to run
console.log('🎯 Available commands:');
console.log('- runButtonAudit() - Full audit');
console.log('- getAllInteractiveElements() - List all buttons');
console.log('- checkForErrorPatterns() - Check for errors');

// Auto-run audit
runButtonAudit();