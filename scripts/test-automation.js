/**
 * Portfolio Browser Automation Test
 * Tests Edge DevTools connection and takes portfolio screenshots
 */

const { chromium } = require('playwright');

async function testPortfolioAutomation() {
  console.log('🚀 Starting Portfolio Automation Test...');
  
  let browser;
  try {
    // Connect to the existing Edge DevTools session
    console.log('🔗 Connecting to Edge DevTools at localhost:9222...');
    browser = await chromium.connectOverCDP('http://localhost:9222');
    
    // Get existing page or create new one
    const contexts = browser.contexts();
    let page;
    
    if (contexts.length > 0 && contexts[0].pages().length > 0) {
      page = contexts[0].pages()[0];
      console.log('📱 Using existing Edge page');
    } else {
      page = await browser.newPage();
      console.log('📱 Created new page');
    }
    
    // Test 1: Navigate to portfolio
    console.log('🏠 Navigating to portfolio...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Test 2: Take portfolio screenshot
    console.log('📸 Taking portfolio screenshot...');
    await page.screenshot({ 
      path: 'portfolio-screenshot.png',
      fullPage: true 
    });
    console.log('✅ Portfolio screenshot saved as portfolio-screenshot.png');
    
    // Test 3: Check for React errors
    console.log('🧪 Checking for React errors...');
    const errors = await page.evaluate(() => {
      // Check for error boundaries or console errors
      const errorBoundary = document.querySelector('.error-boundary');
      const hasReactErrors = window.React && window.React.version;
      return {
        hasErrorBoundary: !!errorBoundary,
        reactVersion: hasReactErrors,
        title: document.title,
        url: window.location.href
      };
    });
    
    console.log('📊 Page Status:', errors);
    
    // Test 4: Check project status indicators
    console.log('🔍 Checking project status indicators...');
    const projectStatuses = await page.evaluate(() => {
      const statusElements = document.querySelectorAll('.project-status-indicator, .project-card');
      return Array.from(statusElements).map(el => ({
        text: el.textContent?.trim(),
        className: el.className
      })).slice(0, 5); // First 5 projects
    });
    
    console.log('📋 Project Status Elements Found:', projectStatuses.length);
    projectStatuses.forEach((status, i) => {
      console.log(`   ${i+1}. ${status.text} (${status.className})`);
    });
    
    // Test 5: Test specific project ports
    console.log('🌐 Testing individual project ports...');
    const projectPorts = [3002, 3005, 3004, 9323]; // Matrix Cards, 3D Matrix, 3D File System, GGPrompts
    
    for (const port of projectPorts) {
      try {
        await page.goto(`http://localhost:${port}`, { 
          waitUntil: 'domcontentloaded',
          timeout: 5000 
        });
        
        const title = await page.title();
        console.log(`✅ Port ${port}: "${title}"`);
        
        // Take screenshot of this project
        await page.screenshot({ 
          path: `project-${port}-screenshot.png`,
          fullPage: true 
        });
        console.log(`📸 Screenshot saved: project-${port}-screenshot.png`);
        
      } catch (error) {
        console.log(`❌ Port ${port}: Not responding (${error.message})`);
      }
    }
    
    console.log('🎉 Automation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Automation test failed:', error.message);
    
    if (error.message.includes('connect')) {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Make sure Edge DevTools is running with debugging enabled');
      console.log('2. Check that Edge was launched with --remote-debugging-port=9222');
      console.log('3. Verify no firewall is blocking localhost:9222');
    }
  } finally {
    // Don't close the browser - we're connected to the user's Edge session
    console.log('🔗 Leaving Edge browser open for continued use');
  }
}

// Run the test
testPortfolioAutomation();