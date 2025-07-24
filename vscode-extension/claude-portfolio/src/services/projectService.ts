import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PortDetectionService, ProjectStatusInfo } from './portDetectionService';
import { VSCodeSecurityService } from '../securityService';

export interface ProjectOperationResult {
    success: boolean;
    message: string;
    error?: string;
}

export class ProjectService {
    private portDetection = PortDetectionService.getInstance();

    constructor(private portfolioPath: string) {}

    /**
     * Get the portfolio path
     */
    getPortfolioPath(): string {
        return this.portfolioPath;
    }

    /**
     * Start a single project
     */
    async startProject(project: any): Promise<ProjectOperationResult> {
        try {
            const projectPath = await this.getProjectPath(project);
            const command = project.buildCommand || 'npm run dev';
            const workspaceRoot = path.join(this.portfolioPath, '..');  // D:\ClaudeWindows
            
            const success = await VSCodeSecurityService.executeProjectCommand(
                projectPath,
                command,
                `Run ${project.title}`,
                workspaceRoot
            );
            
            if (!success) {
                return {
                    success: false,
                    message: `Failed to execute secure command for ${project.title}`,
                    error: 'Security validation failed'
                };
            }
            
            return {
                success: true,
                message: `Starting ${project.title} on port ${project.localPort}`
            };
        } catch (error) {
            return {
                success: false,
                message: `Error starting project: ${project.title}`,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Stop a single project
     */
    async stopProject(project: any): Promise<ProjectOperationResult> {
        try {
            // Get project status to find actual running processes
            const status = await this.getProjectStatus(project);
            
            if (status.status === 'inactive') {
                return {
                    success: true,
                    message: `${project.title} is already stopped`
                };
            }

            // Kill processes using the project's ports
            let stoppedCount = 0;
            for (const portInfo of status.ports) {
                if (portInfo.isRunning && portInfo.processId) {
                    try {
                        const success = await VSCodeSecurityService.executeSecureCommand(
                            `taskkill /F /PID ${portInfo.processId}`,
                            `Stop ${project.title}`,
                            this.portfolioPath
                        );
                        if (success) {
                            stoppedCount++;
                        }
                    } catch (error) {
                        console.error(`Failed to stop process ${portInfo.processId}:`, error);
                    }
                }
            }

            if (stoppedCount > 0) {
                return {
                    success: true,
                    message: `Stopped ${stoppedCount} process(es) for ${project.title}`
                };
            } else {
                return {
                    success: false,
                    message: `No processes stopped for ${project.title}`,
                    error: 'No running processes found or stop failed'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Error stopping project: ${project.title}`,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Open project in VS Code integrated browser
     */
    async openProjectInBrowser(project: any): Promise<ProjectOperationResult> {
        try {
            if (!project || !project.id) {
                return {
                    success: false,
                    message: 'No project information found',
                    error: 'Invalid project data'
                };
            }

            // Get project status to determine actual running port
            const status = await this.getProjectStatus(project);
            const runningPorts = status.ports.filter(p => p.isRunning);
            
            if (runningPorts.length === 0) {
                return {
                    success: false,
                    message: `${project.title} is not running`,
                    error: 'No active ports found'
                };
            }

            // Use the first running port (could be different from configured port)
            const portToUse = runningPorts[0].port;
            await this.openProjectInVSCodeBrowser(project, portToUse);
            
            return {
                success: true,
                message: `Opened ${project.title} in VS Code Simple Browser (port ${portToUse})`
            };
        } catch (error) {
            return {
                success: false,
                message: `Error opening project in browser: ${project.title}`,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Open project in external browser
     */
    async openProjectInExternalBrowser(project: any): Promise<ProjectOperationResult> {
        try {
            if (!project || !project.id) {
                return {
                    success: false,
                    message: 'No project information found',
                    error: 'Invalid project data'
                };
            }

            // Get project status to determine actual running port
            const status = await this.getProjectStatus(project);
            const runningPorts = status.ports.filter(p => p.isRunning);
            
            if (runningPorts.length === 0) {
                return {
                    success: false,
                    message: `${project.title} is not running`,
                    error: 'No active ports found'
                };
            }

            // Use the first running port
            const portToUse = runningPorts[0].port;
            const url = `http://localhost:${portToUse}`;
            
            await vscode.env.openExternal(vscode.Uri.parse(url));
            
            return {
                success: true,
                message: `Opened ${project.title} in external browser (port ${portToUse})`
            };
        } catch (error) {
            return {
                success: false,
                message: `Error opening project in external browser: ${project.title}`,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Add project to VS Code workspace
     */
    async openProject(project: any): Promise<ProjectOperationResult> {
        try {
            const projectPath = await this.getProjectPath(project);
            
            if (!fs.existsSync(projectPath)) {
                return {
                    success: false,
                    message: `Project directory not found: ${projectPath}`,
                    error: 'Directory does not exist'
                };
            }

            // Add folder to workspace
            const uri = vscode.Uri.file(projectPath);
            vscode.workspace.updateWorkspaceFolders(
                vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0,
                null,
                { uri, name: project.title }
            );
            
            return {
                success: true,
                message: `Opened project: ${project.title}`
            };
        } catch (error) {
            return {
                success: false,
                message: `Error opening project: ${project.title}`,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Get project status information
     */
    async getProjectStatus(project: any): Promise<ProjectStatusInfo> {
        const statuses = await this.portDetection.checkProjectStatuses([project]);
        return statuses[0];
    }

    /**
     * Batch start multiple projects
     */
    async batchStartProjects(projects: any[]): Promise<ProjectOperationResult[]> {
        const results: ProjectOperationResult[] = [];
        
        for (const project of projects) {
            const result = await this.startProject(project);
            results.push(result);
        }
        
        return results;
    }

    /**
     * Batch stop multiple projects
     */
    async batchStopProjects(projects: any[]): Promise<ProjectOperationResult[]> {
        const results: ProjectOperationResult[] = [];
        
        for (const project of projects) {
            const result = await this.stopProject(project);
            results.push(result);
        }
        
        return results;
    }

    /**
     * Batch open multiple projects in browser
     */
    async batchOpenBrowser(projects: any[]): Promise<ProjectOperationResult[]> {
        const results: ProjectOperationResult[] = [];
        
        for (const project of projects) {
            const result = await this.openProjectInBrowser(project);
            results.push(result);
        }
        
        return results;
    }

    /**
     * Get project file system path with security validation
     */
    private async getProjectPath(project: any): Promise<string> {
        const workspaceRoot = path.join(this.portfolioPath, '..');
        
        try {
            let resolvedPath: string;
            
            if (project.path?.startsWith('D:\\')) {
                // External project path (absolute) - validate against workspace
                resolvedPath = await VSCodeSecurityService.sanitizePath(project.path, workspaceRoot);
            } else if (project.path === '.') {
                // Self-reference to portfolio root
                resolvedPath = await VSCodeSecurityService.sanitizePath(this.portfolioPath, workspaceRoot);
            } else if (project.path?.startsWith('../Projects/')) {
                // External project path (relative to portfolio) - validate resolved path
                const resolved = path.resolve(this.portfolioPath, project.path);
                resolvedPath = await VSCodeSecurityService.sanitizePath(resolved, workspaceRoot);
            } else if (project.path?.startsWith('projects/')) {
                // Internal project path (relative to portfolio root)
                const projectPath = path.join(this.portfolioPath, project.path);
                resolvedPath = await VSCodeSecurityService.sanitizePath(projectPath, workspaceRoot);
            } else {
                // Default: assume internal project
                const defaultPath = path.join(this.portfolioPath, 'projects', project.path || project.id);
                resolvedPath = await VSCodeSecurityService.sanitizePath(defaultPath, workspaceRoot);
            }
            
            return resolvedPath;
        } catch (error) {
            // If path validation fails due to security concerns, throw with context
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Path security validation failed for project "${project.title || project.id}": ${errorMessage}`);
        }
    }

    /**
     * Open project in VS Code Edge Tools browser
     * Note: VS Code webview panels are still used for Portfolio Dashboard and Command Cheat Sheet
     */
    private async openProjectInVSCodeBrowser(project: any, portToUse: number): Promise<void> {
        const url = `http://localhost:${portToUse}`;
        
        // Check if this is a 3D project for special messaging
        const requires3D = project.requires3D === true || 
                         project.id?.includes('3d') || 
                         project.title?.toLowerCase().includes('3d');
        
        try {
            // Use Simple Browser as primary (most reliable)
            console.log(`🌐 Opening ${project.title} in VS Code Simple Browser: ${url}`);
            await vscode.commands.executeCommand('simpleBrowser.show', url);
            
            if (requires3D) {
                vscode.window.showInformationMessage(`Opened ${project.title} in VS Code Simple Browser (3D/pointer lock support)`);
            } else {
                vscode.window.showInformationMessage(`Opened ${project.title} in VS Code Simple Browser`);
            }
            
        } catch (error) {
            console.error('Failed to open in Simple Browser, trying external browser:', error);
            // Fallback to external browser if Simple Browser fails
            try {
                await vscode.env.openExternal(vscode.Uri.parse(url));
                vscode.window.showInformationMessage(`Opened ${project.title} in external browser`);
            } catch (fallbackError) {
                vscode.window.showErrorMessage(`Failed to open ${project.title}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * Generate HTML for webview panel
     */
    private getWebviewHtml(project: any, url: string): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${project.title}</title>
                <style>
                    body, html {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100vh;
                        overflow: hidden;
                        background: #1e1e1e;
                    }
                    iframe {
                        width: 100%;
                        height: 100%;
                        border: none;
                    }
                    .loading {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        color: #cccccc;
                        flex-direction: column;
                        gap: 10px;
                    }
                    .error {
                        padding: 20px;
                        text-align: center;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        color: #f48771;
                        background: #1e1e1e;
                    }
                    .spinner {
                        width: 20px;
                        height: 20px;
                        border: 2px solid #555;
                        border-top: 2px solid #007acc;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div class="loading" id="loading">
                    <div class="spinner"></div>
                    <div>Loading ${project.title}...</div>
                </div>
                <iframe id="projectFrame" src="${url}" style="display: none;"
                        onload="document.getElementById('loading').style.display='none'; this.style.display='block';"
                        onerror="document.getElementById('loading').innerHTML='<div class=error>Failed to load ${project.title}<br>Make sure the project is running on port ${url.split(':')[2]}</div>';">
                </iframe>
            </body>
            </html>
        `;
    }
}