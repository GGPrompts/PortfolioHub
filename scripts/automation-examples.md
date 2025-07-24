# Portfolio Browser Automation Examples

## 🎯 **What's Possible with Edge + Playwright/Puppeteer**

### **📸 Screenshot Generation**

```javascript
// Playwright example
const { chromium } = require('playwright');

async function capturePortfolioScreenshots() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const page = contexts[0].pages()[0]; // Connect to existing Edge session
  
  // Capture full portfolio
  await page.screenshot({ 
    path: 'portfolio-screenshot.png',
    fullPage: true 
  });
  
  // Capture each project
  const projects = ['3001', '3002', '3005', '3004'];
  for (const port of projects) {
    await page.goto(`http://localhost:${port}`);
    await page.screenshot({ 
      path: `project-${port}-screenshot.png`,
      fullPage: true 
    });
  }
}
```

### **🧪 Automated Testing**

```javascript
// Test all portfolio projects
async function testAllProjects() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = await browser.newPage();
  
  const projects = [
    { name: 'Portfolio', port: 5173 },
    { name: 'Matrix Cards', port: 3002 },
    { name: '3D Matrix Cards', port: 3005 },
    { name: '3D File System', port: 3004 },
    { name: 'GGPrompts', port: 9323 }
  ];
  
  for (const project of projects) {
    console.log(`Testing ${project.name}...`);
    
    try {
      await page.goto(`http://localhost:${project.port}`);
      
      // Wait for page to load
      await page.waitForSelector('body');
      
      // Check for React errors
      const errors = await page.evaluate(() => {
        return window.console.errors || [];
      });
      
      // Performance check
      const metrics = await page.evaluate(() => {
        return JSON.stringify(performance.getEntriesByType('navigation')[0]);
      });
      
      console.log(`✅ ${project.name}: OK`);
      console.log(`   Load time: ${JSON.parse(metrics).loadEventEnd}ms`);
      
    } catch (error) {
      console.log(`❌ ${project.name}: ${error.message}`);
    }
  }
}
```

### **🎮 User Journey Testing**

```javascript
// Test portfolio navigation flow
async function testPortfolioFlow() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  
  // Test sidebar navigation
  await page.click('[data-testid="project-matrix-cards"]');
  await page.waitForSelector('iframe[src*="3002"]');
  
  // Test Quick Commands
  await page.click('[data-testid="quick-commands-toggle"]');
  await page.waitForSelector('.quick-commands-panel');
  
  // Test project launch
  await page.click('[data-testid="launch-all-projects"]');
  
  // Verify projects started
  await page.waitForTimeout(5000);
  const runningProjects = await page.$$eval('.project-status-online', 
    els => els.length
  );
  
  console.log(`✅ Portfolio flow test: ${runningProjects} projects running`);
}
```

### **📊 Performance Auditing**

```javascript
// Automated Lighthouse audits
async function auditAllProjects() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  
  const projects = ['5173', '3001', '3002', '3005'];
  
  for (const port of projects) {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}`);
    
    // Run performance metrics
    const metrics = await page.evaluate(() => {
      return {
        lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
        fid: performance.getEntriesByType('first-input')[0]?.processingStart,
        cls: performance.getEntriesByType('layout-shift').reduce((sum, entry) => 
          sum + entry.value, 0)
      };
    });
    
    console.log(`📊 Port ${port} Performance:`, metrics);
  }
}
```

## 🛠️ **PowerShell Integration Scripts**

### **Screenshot All Projects**

```powershell
# screenshot-portfolio.ps1
param([string]$OutputDir = "screenshots")

New-Item -ItemType Directory -Path $OutputDir -Force

# Install playwright if needed
if (-not (Get-Command playwright -ErrorAction SilentlyContinue)) {
    npm install -g playwright
    playwright install
}

# Run screenshot script
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = await browser.newPage();
  
  const projects = [
    { name: 'portfolio', port: 5173 },
    { name: 'matrix-cards', port: 3002 },
    { name: '3d-matrix-cards', port: 3005 },
    { name: '3d-file-system', port: 3004 }
  ];
  
  for (const project of projects) {
    try {
      await page.goto(\`http://localhost:\${project.port}\`);
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: \`$OutputDir/\${project.name}.png\`,
        fullPage: true 
      });
      console.log(\`✅ Screenshot: \${project.name}\`);
    } catch (error) {
      console.log(\`❌ Failed: \${project.name}\`);
    }
  }
  
  await browser.close();
})();
"
```

### **Test All Projects**

```powershell
# test-portfolio.ps1
Write-Host "🧪 Testing all portfolio projects..." -ForegroundColor Cyan

node -e "
const { chromium } = require('playwright');
(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const page = await browser.newPage();
    
    const projects = [
      { name: 'Portfolio', port: 5173 },
      { name: 'Matrix Cards', port: 3002 },
      { name: '3D Matrix Cards', port: 3005 },
      { name: '3D File System', port: 3004 }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const project of projects) {
      try {
        await page.goto(\`http://localhost:\${project.port}\`, { 
          waitUntil: 'networkidle' 
        });
        
        // Check for React errors
        const hasErrors = await page.evaluate(() => {
          return document.querySelector('.error-boundary') !== null ||
                 window.console.error.length > 0;
        });
        
        if (hasErrors) {
          console.log(\`❌ \${project.name}: Has errors\`);
          failed++;
        } else {
          console.log(\`✅ \${project.name}: OK\`);
          passed++;
        }
      } catch (error) {
        console.log(\`❌ \${project.name}: \${error.message}\`);
        failed++;
      }
    }
    
    console.log(\`\n📊 Results: \${passed} passed, \${failed} failed\`);
  } catch (error) {
    console.log('❌ Browser connection failed:', error.message);
  }
})();
"
```

## 🎯 **Claude Integration Possibilities**

With Edge DevTools + Playwright, **Claude can now**:

1. **📸 Take Screenshots**: "Claude, screenshot all my projects"
2. **🧪 Run Tests**: "Claude, test if all my projects are working"
3. **📊 Performance Audits**: "Claude, check the performance of my portfolio"
4. **🔄 Visual Regression**: "Claude, compare before/after screenshots"
5. **🎮 User Journey Tests**: "Claude, test the complete user flow"
6. **📈 Automated Reporting**: Generate test reports with screenshots

## 🚀 **Next Steps**

1. **Install Playwright**: `npm install -g playwright && playwright install`
2. **Test Connection**: Verify Edge DevTools debugging is working
3. **Run Examples**: Try the screenshot or testing scripts above
4. **Automate**: Add automation to your portfolio CI/CD pipeline

This opens up **massive possibilities** for automated portfolio management and testing! 🎉