"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
function activate(context) {
    console.log('Test Minimal extension is now active!');
    const helloWorldCommand = vscode.commands.registerCommand('test.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Test Extension!');
    });
    context.subscriptions.push(helloWorldCommand);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map