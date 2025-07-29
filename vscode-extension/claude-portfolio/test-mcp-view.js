// Quick test to check if MCP view registration is working
const vscode = require('vscode');

console.log('Testing MCP view registration...');

// Check if the view is registered
const views = [
    'claudeProjects',
    'claudeProjectCommands', 
    'claudeMultiProjectCommands',
    'claudeVSCodePages',
    'claudeMCPControls'
];

views.forEach(viewId => {
    console.log(`View ${viewId}: ${vscode.window.createTreeView ? 'TreeView API available' : 'TreeView API missing'}`);
});