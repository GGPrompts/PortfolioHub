#!/usr/bin/env node

/**
 * Check Documentation Status
 * 
 * This script analyzes project documentation and identifies which files
 * need updates based on various criteria (age, completeness, etc.)
 */

const fs = require('fs');
const path = require('path');

// Load project manifest
const manifestPath = path.join(__dirname, '../projects/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('🔍 Checking documentation status for all projects...\n');

const results = {
    needsUpdate: [],
    upToDate: [],
    missing: []
};

manifest.projects.forEach(project => {
    console.log(`📁 Checking ${project.title} (${project.id})`);
    
    const projectResult = {
        id: project.id,
        title: project.title,
        path: project.path,
        readme: checkFile(project, 'README.md'),
        claude: checkFile(project, 'CLAUDE.md')
    };
    
    // Determine overall status
    const hasMissing = !projectResult.readme.exists || !projectResult.claude.exists;
    const needsUpdate = projectResult.readme.needsUpdate || projectResult.claude.needsUpdate;
    
    if (hasMissing) {
        results.missing.push(projectResult);
        console.log(`  ❌ Missing files`);
    } else if (needsUpdate) {
        results.needsUpdate.push(projectResult);
        console.log(`  ⚠️  Needs update`);
    } else {
        results.upToDate.push(projectResult);
        console.log(`  ✅ Up to date`);
    }
    
    console.log(`     README.md: ${getStatusIcon(projectResult.readme)}`);
    console.log(`     CLAUDE.md: ${getStatusIcon(projectResult.claude)}`);
    console.log('');
});

// Print summary
console.log('📊 Documentation Status Summary:');
console.log(`   ✅ Up to date: ${results.upToDate.length} projects`);
console.log(`   ⚠️  Needs update: ${results.needsUpdate.length} projects`);
console.log(`   ❌ Missing files: ${results.missing.length} projects`);
console.log(`   📁 Total projects: ${manifest.projects.length}`);

// Generate action outputs for GitHub Actions
if (process.env.GITHUB_ACTIONS) {
    console.log('\n🤖 GitHub Actions Outputs:');
    console.log(`::set-output name=needs-update::${results.needsUpdate.length > 0}`);
    console.log(`::set-output name=missing-docs::${results.missing.length > 0}`);
    console.log(`::set-output name=total-projects::${manifest.projects.length}`);
    console.log(`::set-output name=projects-needing-update::${results.needsUpdate.length}`);
}

// Save detailed results for other scripts
const resultsPath = path.join(__dirname, '../.github/doc-check-results.json');
fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

console.log(`\n📄 Detailed results saved to: ${resultsPath}`);

/**
 * Check if a documentation file exists and needs updating
 */
function checkFile(project, filename) {
    const filePath = getProjectFilePath(project, filename);
    
    const result = {
        filename,
        path: filePath,
        exists: false,
        lastModified: null,
        size: 0,
        needsUpdate: false,
        reasons: []
    };
    
    try {
        const stats = fs.statSync(filePath);
        result.exists = true;
        result.lastModified = stats.mtime;
        result.size = stats.size;
        
        // Check if file needs update based on various criteria
        const daysSinceUpdate = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        
        // File is very old (more than 30 days)
        if (daysSinceUpdate > 30) {
            result.needsUpdate = true;
            result.reasons.push(`Last updated ${Math.floor(daysSinceUpdate)} days ago`);
        }
        
        // File is very small (likely placeholder or incomplete)
        if (result.size < 500) {
            result.needsUpdate = true;
            result.reasons.push(`File is very small (${result.size} bytes)`);
        }
        
        // Check content for placeholder indicators
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('TODO') || content.includes('placeholder') || content.includes('FIXME')) {
            result.needsUpdate = true;
            result.reasons.push('Contains placeholder content');
        }
        
        // README-specific checks
        if (filename === 'README.md') {
            if (!content.includes('## Installation') && !content.includes('## Setup')) {
                result.needsUpdate = true;
                result.reasons.push('Missing installation/setup section');
            }
            if (!content.includes('## Usage') && !content.includes('## Getting Started')) {
                result.needsUpdate = true;
                result.reasons.push('Missing usage instructions');
            }
        }
        
        // CLAUDE.md-specific checks
        if (filename === 'CLAUDE.md') {
            if (!content.includes('Development Guidelines') && !content.includes('Instructions')) {
                result.needsUpdate = true;
                result.reasons.push('Missing development guidelines');
            }
            if (!content.includes('Common Tasks') && !content.includes('Workflow')) {
                result.needsUpdate = true;
                result.reasons.push('Missing common tasks section');
            }
        }
        
    } catch (error) {
        // File doesn't exist
        result.exists = false;
        result.needsUpdate = true;
        result.reasons.push('File does not exist');
    }
    
    return result;
}

/**
 * Get file path for a project file
 */
function getProjectFilePath(project, filename) {
    if (project.path === '.') {
        // Portfolio app itself
        return path.join(__dirname, '../', filename);
    } else if (project.path && project.path.startsWith('../Projects/')) {
        // External projects
        const projectDir = project.path.replace('../Projects/', '');
        return path.join(__dirname, '../../Projects', projectDir, filename);
    } else {
        // Default path structure
        return path.join(__dirname, '../projects', project.id, filename);
    }
}

/**
 * Get status icon for display
 */
function getStatusIcon(fileResult) {
    if (!fileResult.exists) {
        return '❌ Missing';
    } else if (fileResult.needsUpdate) {
        return `⚠️  Needs update (${fileResult.reasons.join(', ')})`;
    } else {
        return '✅ Good';
    }
}