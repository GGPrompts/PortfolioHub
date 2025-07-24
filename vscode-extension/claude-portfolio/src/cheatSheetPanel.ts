import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class CheatSheetPanel {
    public static currentPanel: CheatSheetPanel | undefined;
    public static readonly viewType = 'claudeCheatSheet';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _portfolioPath: string;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, portfolioPath: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (CheatSheetPanel.currentPanel) {
            CheatSheetPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            CheatSheetPanel.viewType,
            'Windows Command Cheat Sheet',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    extensionUri,
                    vscode.Uri.file(path.join(portfolioPath, 'vscode-extension', 'claude-code-cheatsheet'))
                ]
            }
        );

        CheatSheetPanel.currentPanel = new CheatSheetPanel(panel, extensionUri, portfolioPath);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, portfolioPath: string) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._portfolioPath = portfolioPath;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'copy':
                        vscode.env.clipboard.writeText(message.text);
                        vscode.window.showInformationMessage(`Copied: ${message.text}`);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        CheatSheetPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Windows Command Cheat Sheet';
        this._panel.webview.html = await this._getHtmlForWebview(webview);
    }

    private async _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
        try {
            // Read the HTML file directly
            const cheatSheetPath = path.join(
                this._portfolioPath, 
                'vscode-extension', 
                'claude-code-cheatsheet', 
                'windows-cheatsheet.html'
            );

            if (fs.existsSync(cheatSheetPath)) {
                let htmlContent = fs.readFileSync(cheatSheetPath, 'utf8');
                
                // Replace the copyCommand function to use VS Code's message passing
                const updatedScript = `
                    // Copy command to clipboard via VS Code API
                    async function copyCommand(command) {
                        // Replace placeholders
                        let finalCommand = command;
                        finalCommand = finalCommand.replace('<PORTFOLIO_PATH>', '${this._portfolioPath.replace(/\\/g, '\\\\')}');
                        finalCommand = finalCommand.replace('<USERNAME>', document.getElementById('username')?.value || 'your-username');
                        
                        // Send to VS Code for clipboard
                        if (typeof acquireVsCodeApi !== 'undefined') {
                            const vscode = acquireVsCodeApi();
                            vscode.postMessage({
                                command: 'copy',
                                text: finalCommand
                            });
                        }
                        
                        // Show visual feedback
                        showCopyIndicator(event.target);
                    }
                `;

                // Insert the updated script before the closing </script> tag
                htmlContent = htmlContent.replace(
                    /\/\/ Copy command to clipboard[\s\S]*?async function copyCommand\(command\)[\s\S]*?}\s*}/,
                    updatedScript
                );

                return htmlContent;
            } else {
                return this._getErrorHtml('Cheat sheet file not found');
            }
        } catch (error) {
            console.error('Error loading cheat sheet:', error);
            return this._getErrorHtml(`Error loading cheat sheet: ${error}`);
        }
    }

    private _getErrorHtml(errorMessage: string): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #1e1e1e;
                    color: #cccccc;
                    padding: 20px;
                    text-align: center;
                }
                .error {
                    background: #3c1618;
                    border: 1px solid #a1260e;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <h1>❌ Error Loading Cheat Sheet</h1>
            <div class="error">
                <p>${errorMessage}</p>
            </div>
            <p>Please check that the cheat sheet file exists and try again.</p>
        </body>
        </html>`;
    }
}