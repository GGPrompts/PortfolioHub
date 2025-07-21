import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Test Minimal extension is now active!');
    
    const helloWorldCommand = vscode.commands.registerCommand('test.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Test Extension!');
    });
    
    context.subscriptions.push(helloWorldCommand);
}

export function deactivate() {}