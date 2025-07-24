#!/usr/bin/env node

/**
 * Generate Claude Documentation Update Prompts
 * 
 * This script generates the same prompts that the "Ask Claude to Update" buttons
 * create in the portfolio interface, but for automated GitHub Actions workflow.
 */

const fs = require('fs');
const path = require('path');

// Load project manifest
const manifestPath = path.join(__dirname, '../projects/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Output directory for generated prompts
const outputDir = path.join(__dirname, '../.github/claude-prompts');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Generate prompts for each project
manifest.projects.forEach(project => {
    console.log(`Generating prompts for ${project.title}...`);
    
    // Generate README prompt
    const readmePrompt = generateClaudeUpdatePrompt(project, 'README');
    const readmeFile = path.join(outputDir, `${project.id}-readme-prompt.md`);
    fs.writeFileSync(readmeFile, readmePrompt);
    
    // Generate CLAUDE.md prompt  
    const claudePrompt = generateClaudeUpdatePrompt(project, 'CLAUDE');
    const claudeFile = path.join(outputDir, `${project.id}-claude-prompt.md`);
    fs.writeFileSync(claudeFile, claudePrompt);
    
    console.log(`✅ Generated prompts for ${project.title}`);
});

// Generate summary file
const summaryContent = `# Documentation Update Prompts

Generated on: ${new Date().toISOString()}

## Available Prompts

${manifest.projects.map(project => `
### ${project.title} (\`${project.id}\`)
- **README.md**: [${project.id}-readme-prompt.md](./${project.id}-readme-prompt.md)
- **CLAUDE.md**: [${project.id}-claude-prompt.md](./${project.id}-claude-prompt.md)
- **Path**: \`${project.path}\`
- **Tech**: ${project.tech.join(', ')}
`).join('\n')}

## Usage

1. Choose the project and documentation type you want to update
2. Copy the content from the corresponding prompt file
3. Paste it into Claude and let it analyze the project and generate updated documentation
4. Save the generated documentation to the appropriate file in the project directory

## Automation

These prompts are automatically generated daily by GitHub Actions.
Last updated: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(outputDir, 'README.md'), summaryContent);

console.log(`\n🎉 Generated documentation prompts for ${manifest.projects.length} projects`);
console.log(`📁 Output directory: ${outputDir}`);

/**
 * Generate comprehensive Claude prompt for documentation updates
 * (Same logic as the React component, but for Node.js)
 */
function generateClaudeUpdatePrompt(project, fileType) {
    const isReadme = fileType === 'README';
    const filename = isReadme ? 'README.md' : 'CLAUDE.md';
    
    // Calculate file path based on project configuration
    const getProjectFilePath = (filename) => {
        if (project.path === '.') {
            return path.join(__dirname, '../', filename);
        } else if (project.path && project.path.startsWith('../Projects/')) {
            const projectDir = project.path.replace('../Projects/', '');
            return path.join(__dirname, '../../Projects', projectDir, filename);
        } else {
            return path.join(__dirname, '../projects', project.id, filename);
        }
    };
    
    const filePath = getProjectFilePath(filename);
    
    return `# ${filename} Update Request for ${project.title}

## Project Context
- **Name**: ${project.title}
- **Description**: ${project.description}
- **Tech Stack**: ${project.tech.join(', ')}
- **Port**: ${project.localPort}
- **Build Command**: ${project.buildCommand || 'npm run dev'}
- **Project Path**: ${project.path}
- **Display Type**: ${project.displayType}
${project.requires3D ? '- **Special**: Requires 3D/WebGL support' : ''}

## File Location
Please update the ${filename} file at:
\`${filePath}\`

${isReadme ? `## README.md Requirements
Please create a comprehensive README.md that includes:

### Essential Sections
1. **Project Title & Description**
   - Clear, concise project description
   - Key features and capabilities

2. **Installation & Setup**
   - Prerequisites (Node.js version, etc.)
   - Step-by-step installation instructions
   - Environment setup if needed

3. **Usage Instructions**
   - How to start the development server
   - How to access the application (http://localhost:${project.localPort})
   - Basic usage examples

4. **Technology Stack**
   - List all technologies used: ${project.tech.join(', ')}
   - Brief explanation of why each was chosen

5. **Project Structure**
   - High-level directory structure
   - Explanation of key files and folders

6. **Development**
   - Available npm scripts
   - Development workflow
   - How to contribute (if applicable)

7. **Features**
   - Detailed feature list based on the project description
   - Screenshots or GIFs if the project has a visual interface

### Style Guidelines
- Use proper Markdown formatting
- Include code blocks with syntax highlighting
- Add badges if appropriate (build status, version, etc.)
- Keep it professional but accessible
- Include emojis sparingly for visual appeal

### Project-Specific Notes
${project.tech.includes('React') ? '- This is a React application with modern hooks and functional components' : ''}
${project.tech.includes('Three.js') ? '- This project includes 3D graphics and may require WebGL support' : ''}
${project.tech.includes('TypeScript') ? '- TypeScript is used for type safety and better development experience' : ''}
${project.requires3D ? '- This project requires 3D/WebGL support and pointer lock for optimal experience' : ''}` : `## CLAUDE.md Requirements
Please create comprehensive Claude AI instructions that include:

### Essential Sections
1. **Project Overview**
   - Technical context and architecture
   - Key files and their purposes
   - Development patterns used

2. **Development Guidelines**
   - Code style and conventions
   - Best practices specific to this tech stack: ${project.tech.join(', ')}
   - Architecture patterns to follow

3. **Common Tasks**
   - Adding new features
   - Debugging common issues
   - Performance optimization
   - Testing strategies

4. **File Structure & Key Components**
   - Important files and their roles
   - How components interact
   - Data flow and state management

5. **Development Workflow**
   - How to start development (\`${project.buildCommand || 'npm run dev'}\`)
   - Build and deployment process
   - Integration with portfolio system

6. **Troubleshooting**
   - Common issues and solutions
   - Port conflicts (project uses ${project.localPort})
   - Environment-specific problems

### Claude-Specific Instructions
- Provide context for AI assistance on this project
- Include helpful commands and shortcuts
- Explain the project's role in the larger portfolio system
- Note any special requirements or constraints

### Project-Specific Context
${project.tech.includes('React') ? '- Modern React patterns with hooks, context, and functional components' : ''}
${project.tech.includes('Three.js') ? '- 3D graphics development with Three.js, WebGL optimization needed' : ''}
${project.tech.includes('TypeScript') ? '- TypeScript development with strict type checking' : ''}
${project.requires3D ? '- 3D project requiring pointer lock and WebGL capabilities' : ''}
- Part of Claude Development Portfolio system
- Integrates with VS Code extension and unified portfolio interface`}

## Current Features
${project.features ? project.features.map(f => `- ${f}`).join('\n') : 'No specific features listed in manifest'}

## Request
Please analyze the current project structure and create a comprehensive, professional ${filename} file that accurately reflects the project's current state, features, and development needs.

Make sure to:
- Check the actual project files to understand the current implementation
- Update any outdated information
- Add any missing sections that would be helpful
- Ensure all paths, commands, and technical details are accurate
- Follow modern documentation best practices

Thank you!

---
*Generated by GitHub Actions on ${new Date().toISOString()}*`;
}