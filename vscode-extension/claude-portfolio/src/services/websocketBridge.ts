/**
 * WebSocket Bridge Service
 * 
 * This service creates a WebSocket server that allows the React app to communicate
 * directly with VS Code extension, eliminating the need for embedded webview.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { VSCodeSecurityService } from '../securityService';
import { ProjectService } from './projectService';
import { PortDetectionService } from './portDetectionService';
import { TerminalService } from './terminalService';
import * as path from 'path';

export interface BridgeMessage {
    type: string;
    id?: string;
    terminalId?: string;
    command?: string;
    projectPath?: string;
    projectId?: string;
    url?: string;
    title?: string;
    args?: any[];
    data?: any;
}

export interface BridgeResponse {
    id?: string;
    success: boolean;
    result?: any;
    error?: string;
    message?: string;
}

export class WebSocketBridgeService {
    private server: WebSocketServer | null = null;
    private clients: Set<WebSocket> = new Set();
    private readonly port = 8123;
    private readonly portfolioPath: string;
    private projectService: ProjectService;
    private portDetectionService: PortDetectionService;
    private terminalService: TerminalService;
    private terminalSessionMap: Map<string, string> = new Map(); // terminalId -> sessionId

    constructor(portfolioPath: string, projectService: ProjectService, portDetectionService: PortDetectionService) {
        this.portfolioPath = portfolioPath;
        this.projectService = projectService;
        this.portDetectionService = portDetectionService;
        this.terminalService = new TerminalService(path.join(portfolioPath, '..'));
    }

    async start(): Promise<boolean> {
        try {
            this.server = new WebSocketServer({ 
                port: this.port,
                host: 'localhost'
            });

            this.server.on('connection', (ws: WebSocket) => {
                console.log('🔗 React app connected to VS Code bridge');
                this.clients.add(ws);

                ws.on('message', async (data: Buffer) => {
                    try {
                        console.log('🔍🔍🔍 RAW WEBSOCKET MESSAGE RECEIVED 🔍🔍🔍');
                        console.log('Raw data:', data.toString());
                        const message: BridgeMessage = JSON.parse(data.toString());
                        console.log('🔍 Bridge received message:', message);
                        console.log('Message type:', message.type);
                        console.log('Message ID:', message.id);
                        console.log('Terminal ID:', message.terminalId);
                        const response = await this.handleMessage(message);
                        console.log('🔍 Bridge response:', response);
                        ws.send(JSON.stringify(response));
                    } catch (error) {
                        console.error('❌ Bridge message error:', error);
                        console.error('❌ Raw message data:', data.toString());
                        ws.send(JSON.stringify({
                            id: 'unknown',
                            success: false,
                            error: 'Invalid message format'
                        }));
                    }
                });

                ws.on('close', () => {
                    console.log('❌ React app disconnected from VS Code bridge');
                    this.clients.delete(ws);
                });

                ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.clients.delete(ws);
                });

                // Send initial connection confirmation
                ws.send(JSON.stringify({
                    type: 'connected',
                    success: true,
                    message: 'Connected to VS Code bridge',
                    capabilities: {
                        commands: true,
                        fileOperations: true,
                        livePreview: true,
                        projectManagement: true,
                        terminals: true,
                        multiWorkbranch: true
                    }
                }));
            });

            this.server.on('error', (error) => {
                console.error('WebSocket server error:', error);
            });

            // Start terminal service
            const terminalStarted = await this.terminalService.start();
            if (terminalStarted) {
                console.log('✅ Terminal service started on ws://localhost:8002');
            } else {
                console.warn('⚠️ Terminal service failed to start - terminal features will be limited');
            }

            console.log(`🚀 WebSocket bridge started on ws://localhost:${this.port}`);
            return true;
        } catch (error) {
            console.error('Failed to start WebSocket bridge:', error);
            return false;
        }
    }

    async stop(): Promise<void> {
        if (this.server) {
            // Stop terminal service first
            await this.terminalService.stop();

            // Close all client connections
            this.clients.forEach(ws => {
                ws.close(1000, 'Server shutting down');
            });
            this.clients.clear();

            // Close server
            this.server.close();
            this.server = null;
            console.log('🛑 WebSocket bridge stopped');
        }
    }

    private async handleMessage(message: BridgeMessage): Promise<BridgeResponse> {
        const { type, id, terminalId, command, projectPath, projectId, url, title, args, data } = message;

        try {
            switch (type) {
                case 'execute-command':
                    return await this.handleExecuteCommand(id, command!, projectPath);

                case 'project-start':
                    return await this.handleProjectStart(id, projectId!);

                case 'project-stop':
                    return await this.handleProjectStop(id, projectId!);

                case 'project-status':
                    return await this.handleProjectStatus(id, projectId);

                case 'open-in-vscode':
                    return await this.handleOpenInVSCode(id, projectPath!);

                case 'open-folder':
                    return await this.handleOpenFolder(id, projectPath!);

                case 'live-preview':
                    return await this.handleLivePreview(id, url!, title);

                case 'git-operation':
                    return await this.handleGitOperation(id, command!, projectPath!);

                case 'file-save':
                    return await this.handleFileSave(id, data.path, data.content);

                case 'file-delete':
                    return await this.handleFileDelete(id, data.path);

                case 'workspace-add-project':
                    return await this.handleWorkspaceAddProject(id, data.project);

                case 'notification':
                    return await this.handleNotification(id, data.text, data.level);

                case 'vscode-command':
                    return await this.handleVSCodeCommand(id, command!, args);

                case 'refresh-projects':
                    return await this.handleRefreshProjects(id);

                case 'project-launch-all':
                    return await this.handleProjectLaunchAll(id);

                case 'project-kill-all':
                    return await this.handleProjectKillAll(id);

                case 'enhanced-project-launch':
                    return await this.handleEnhancedProjectLaunch(id, data);

                case 'project-status-sync':
                    return await this.handleProjectStatusSync(id);

                case 'terminal-create':
                    return await this.handleTerminalCreate(id, data, terminalId);

                case 'terminal-destroy':
                    return await this.handleTerminalDestroy(id, data.sessionId);

                case 'terminal-command':
                    return await this.handleTerminalCommand(id, terminalId || data.sessionId, data.command);

                case 'terminal-resize':
                    return await this.handleTerminalResize(id, data.sessionId, data.cols, data.rows);

                case 'terminal-data':
                    return await this.handleTerminalData(id, data.sessionId, data.data);

                case 'terminal-status':
                    return await this.handleTerminalStatus(id);

                case 'terminal-list-sessions':
                    return await this.handleTerminalListSessions(id, data.workbranchId);

                default:
                    return {
                        id,
                        success: false,
                        error: `Unknown message type: ${type}`
                    };
            }
        } catch (error) {
            console.error(`❌ Bridge error handling ${type}:`, error);
            console.error(`❌ Message details:`, { type, id, terminalId, data });
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                message: 'Failed to execute command'
            };
        }
    }

    private async handleExecuteCommand(id: string | undefined, command: string, projectPath?: string): Promise<BridgeResponse> {
        const workspaceRoot = path.join(this.portfolioPath, '..');
        const success = await VSCodeSecurityService.executeSecureCommand(
            command,
            'React Bridge Command',
            workspaceRoot
        );

        return {
            id,
            success,
            message: success ? `Command executed: ${command}` : `Command blocked: ${command}`
        };
    }

    private async handleProjectStart(id: string | undefined, projectId: string): Promise<BridgeResponse> {
        try {
            // Find project by ID first
            const project = await this.findProjectById(projectId);
            if (!project) {
                return {
                    id,
                    success: false,
                    error: `Project not found: ${projectId}`
                };
            }
            
            const result = await this.projectService.startProject(project);
            return {
                id,
                success: result.success,
                message: result.message
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to start project'
            };
        }
    }

    private async handleProjectStop(id: string | undefined, projectId: string): Promise<BridgeResponse> {
        try {
            // Find project by ID first
            const project = await this.findProjectById(projectId);
            if (!project) {
                return {
                    id,
                    success: false,
                    error: `Project not found: ${projectId}`
                };
            }
            
            const result = await this.projectService.stopProject(project);
            return {
                id,
                success: result.success,
                message: result.message
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to stop project'
            };
        }
    }

    private async handleProjectStatus(id: string | undefined, projectId?: string): Promise<BridgeResponse> {
        try {
            if (projectId) {
                const project = await this.findProjectById(projectId);
                if (!project) {
                    return {
                        id,
                        success: false,
                        error: `Project not found: ${projectId}`
                    };
                }
                
                const status = await this.portDetectionService.getEnhancedProjectStatus(project);
                return {
                    id,
                    success: true,
                    result: { projectId, status }
                };
            } else {
                // Return all project statuses - need to load projects first
                const projects = await this.loadProjectsFromManifest();
                const statuses = await this.portDetectionService.checkProjectStatuses(projects);
                return {
                    id,
                    success: true,
                    result: statuses
                };
            }
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get project status'
            };
        }
    }

    private async handleOpenInVSCode(id: string | undefined, projectPath: string): Promise<BridgeResponse> {
        try {
            const fullPath = path.isAbsolute(projectPath) ? projectPath : path.join(this.portfolioPath, projectPath);
            const uri = vscode.Uri.file(fullPath);
            await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true });
            
            return {
                id,
                success: true,
                message: `Opened in VS Code: ${path.basename(fullPath)}`
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to open in VS Code'
            };
        }
    }

    private async handleOpenFolder(id: string | undefined, folderPath: string): Promise<BridgeResponse> {
        try {
            const fullPath = path.isAbsolute(folderPath) ? folderPath : path.join(this.portfolioPath, folderPath);
            const workspaceRoot = path.join(this.portfolioPath, '..');
            
            const success = await VSCodeSecurityService.executeSecureCommand(
                `explorer "${fullPath}"`,
                'Open Folder',
                workspaceRoot
            );
            
            return {
                id,
                success,
                message: success ? `Opened folder: ${path.basename(fullPath)}` : 'Failed to open folder'
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to open folder'
            };
        }
    }

    private async handleLivePreview(id: string | undefined, url: string, title?: string): Promise<BridgeResponse> {
        try {
            // Try Live Preview extension first
            const livePreviewExtension = vscode.extensions.getExtension('ms-vscode.live-server');
            
            if (livePreviewExtension) {
                if (!livePreviewExtension.isActive) {
                    await livePreviewExtension.activate();
                }
                
                await vscode.commands.executeCommand('livePreview.start.externalServer', {
                    serverPath: url,
                    serverName: title || 'Portfolio Project'
                });
                
                return {
                    id,
                    success: true,
                    message: `Live Preview opened: ${title || url}`
                };
            } else {
                // Fallback to Edge browser
                await vscode.env.openExternal(vscode.Uri.parse(url));
                return {
                    id,
                    success: true,
                    message: `Opened in Edge browser: ${title || url}`
                };
            }
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to open Live Preview'
            };
        }
    }

    private async handleGitOperation(id: string | undefined, command: string, projectPath: string): Promise<BridgeResponse> {
        try {
            const fullPath = path.isAbsolute(projectPath) ? projectPath : path.join(this.portfolioPath, projectPath);
            const workspaceRoot = path.join(this.portfolioPath, '..');
            
            const success = await VSCodeSecurityService.executeProjectCommand(
                fullPath,
                command,
                'Git Operation',
                workspaceRoot
            );
            
            return {
                id,
                success,
                message: success ? `Git operation completed: ${command}` : `Git operation blocked: ${command}`
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Git operation failed'
            };
        }
    }

    private async handleFileSave(id: string | undefined, filePath: string, content: string): Promise<BridgeResponse> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return {
                    id,
                    success: false,
                    error: 'No workspace folder open'
                };
            }

            const fullPath = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
            
            // Ensure directory exists
            const dirPath = vscode.Uri.joinPath(fullPath, '..');
            await vscode.workspace.fs.createDirectory(dirPath);
            
            // Write file
            await vscode.workspace.fs.writeFile(fullPath, Buffer.from(content, 'utf8'));
            
            return {
                id,
                success: true,
                message: `File saved: ${filePath}`
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to save file'
            };
        }
    }

    private async handleFileDelete(id: string | undefined, filePath: string): Promise<BridgeResponse> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return {
                    id,
                    success: false,
                    error: 'No workspace folder open'
                };
            }

            const fullPath = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
            await vscode.workspace.fs.delete(fullPath);
            
            return {
                id,
                success: true,
                message: `File deleted: ${filePath}`
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete file'
            };
        }
    }

    private async handleWorkspaceAddProject(id: string | undefined, project: any): Promise<BridgeResponse> {
        try {
            let projectPath: string;
            
            if (path.isAbsolute(project.path)) {
                projectPath = project.path;
            } else if (project.path === '.') {
                projectPath = this.portfolioPath;
            } else if (project.path?.startsWith('../Projects/')) {
                projectPath = path.resolve(this.portfolioPath, project.path);
            } else if (project.path?.startsWith('projects/')) {
                projectPath = path.join(this.portfolioPath, project.path);
            } else {
                projectPath = path.join(this.portfolioPath, 'projects', project.path || project.id);
            }
            
            const projectUri = vscode.Uri.file(projectPath);
            
            const success = vscode.workspace.updateWorkspaceFolders(
                vscode.workspace.workspaceFolders?.length || 0,
                0,
                { uri: projectUri, name: project.title }
            );
            
            return {
                id,
                success,
                message: success ? `Added ${project.title} to workspace` : `Failed to add ${project.title} to workspace`
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add project to workspace'
            };
        }
    }

    private async handleNotification(id: string | undefined, text: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<BridgeResponse> {
        try {
            switch (level) {
                case 'warning':
                    vscode.window.showWarningMessage(text);
                    break;
                case 'error':
                    vscode.window.showErrorMessage(text);
                    break;
                default:
                    vscode.window.showInformationMessage(text);
            }
            
            return {
                id,
                success: true,
                message: 'Notification displayed'
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: 'Failed to show notification'
            };
        }
    }

    private async handleVSCodeCommand(id: string | undefined, command: string, args?: any[]): Promise<BridgeResponse> {
        try {
            const result = await vscode.commands.executeCommand(command, ...(args || []));
            return {
                id,
                success: true,
                result,
                message: `VS Code command executed: ${command}`
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'VS Code command failed'
            };
        }
    }

    private async handleRefreshProjects(id: string | undefined): Promise<BridgeResponse> {
        try {
            // Load projects from manifest
            const projects = await this.loadProjectsFromManifest();
            
            // Refresh port detection cache
            await this.portDetectionService.refreshAll(projects);
            
            // Get fresh project data with status
            const projectData = {
                projects: projects,
                statuses: await this.portDetectionService.checkProjectStatuses(projects)
            };
            
            return {
                id,
                success: true,
                result: projectData,
                message: 'Projects refreshed successfully'
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to refresh projects'
            };
        }
    }

    // Broadcast message to all connected clients
    public broadcast(message: any): void {
        const data = JSON.stringify(message);
        this.clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });
    }

    // Get connection status
    public isRunning(): boolean {
        return this.server !== null;
    }

    public getConnectedClients(): number {
        return this.clients.size;
    }

    // Helper methods

    private async loadProjectsFromManifest(): Promise<any[]> {
        try {
            const manifestPath = path.join(this.portfolioPath, 'projects', 'manifest.json');
            if (!fs.existsSync(manifestPath)) {
                return [];
            }
            
            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent);
            return manifest.projects || [];
        } catch (error) {
            console.error('Failed to load projects from manifest:', error);
            return [];
        }
    }

    private async findProjectById(projectId: string): Promise<any | null> {
        try {
            const projects = await this.loadProjectsFromManifest();
            return projects.find(p => p.id === projectId) || null;
        } catch (error) {
            console.error('Failed to find project by ID:', error);
            return null;
        }
    }

    private async handleProjectLaunchAll(id: string | undefined): Promise<BridgeResponse> {
        try {
            const workspaceRoot = path.join(this.portfolioPath, '..');
            const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\start-all-enhanced.ps1';
            
            const success = await VSCodeSecurityService.executeSecureCommand(
                command,
                'Launch All Projects',
                workspaceRoot
            );

            return {
                id,
                success,
                message: success ? 'All projects launch command executed' : 'Launch all projects command blocked'
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to launch all projects'
            };
        }
    }

    private async handleProjectKillAll(id: string | undefined): Promise<BridgeResponse> {
        try {
            const workspaceRoot = path.join(this.portfolioPath, '..');
            const command = 'cd D:\\ClaudeWindows\\claude-dev-portfolio; .\\scripts\\kill-all-servers.ps1';
            
            const success = await VSCodeSecurityService.executeSecureCommand(
                command,
                'Kill All Projects',
                workspaceRoot
            );

            return {
                id,
                success,
                message: success ? 'All projects kill command executed' : 'Kill all projects command blocked'
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to kill all projects'
            };
        }
    }

    private async handleEnhancedProjectLaunch(id: string | undefined, data: any): Promise<BridgeResponse> {
        try {
            const { projectIds, forceRestart } = data;
            const workspaceRoot = path.join(this.portfolioPath, '..');
            
            // Build enhanced launch command
            const baseCommand = 'cd D:\\ClaudeWindows\\claude-dev-portfolio';
            const scriptCommand = '.\\scripts\\launch-projects-enhanced.ps1';
            const projectArgs = projectIds ? `-ProjectIds "${projectIds.join(',')}"` : '';
            const forceArgs = forceRestart ? '-ForceRestart' : '';
            
            const command = `${baseCommand}; ${scriptCommand} ${projectArgs} ${forceArgs}`.trim();
            
            const success = await VSCodeSecurityService.executeSecureCommand(
                command,
                'Enhanced Project Launch',
                workspaceRoot
            );

            return {
                id,
                success,
                message: success ? 'Enhanced project launch executed' : 'Enhanced project launch blocked'
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Enhanced project launch failed'
            };
        }
    }

    private async handleProjectStatusSync(id: string | undefined): Promise<BridgeResponse> {
        try {
            // Load all projects and get their current status
            const projects = await this.loadProjectsFromManifest();
            const statuses = await this.portDetectionService.checkProjectStatuses(projects);
            
            // Broadcast status update to all connected clients
            this.broadcast({
                type: 'project-status-update',
                data: {
                    projects: projects,
                    statuses: statuses,
                    timestamp: Date.now()
                }
            });

            return {
                id,
                success: true,
                result: { projects, statuses },
                message: 'Project status synchronized'
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to sync project status'
            };
        }
    }

    // Terminal-related handlers

    private async handleTerminalCreate(id: string | undefined, data: any, terminalId?: string): Promise<BridgeResponse> {
        try {
            const { workbranchId, projectId, shell, title, cwd } = data;
            
            console.log(`🏗️ Creating terminal session for workbranch: ${workbranchId}, project: ${projectId}`);
            
            const response = await this.terminalService.createSession(
                workbranchId,
                shell || 'powershell',
                undefined, // WebSocket will be handled by terminal service separately
                title,
                cwd
            );

            console.log(`📋 Terminal service response:`, response);

            if (response.success && response.data?.sessionId) {
                // Store the mapping between terminal ID and session ID
                // Use the terminalId from the message, not the message id
                const actualTerminalId = terminalId || id; // Use terminalId from parameter
                this.terminalSessionMap.set(actualTerminalId!, response.data.sessionId);
                console.log(`🗺️ Terminal mapping stored: ${actualTerminalId} -> ${response.data.sessionId}`);
            }

            return {
                id,
                success: response.success,
                result: {
                    ...response.data,
                    terminalId: id, // Include the original terminal ID for mapping
                    workbranchId,
                    projectId
                },
                message: response.message || (response.success ? 'Terminal session created' : 'Failed to create terminal session')
            };
        } catch (error) {
            console.error('❌ Error creating terminal session:', error);
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create terminal session'
            };
        }
    }

    private async handleTerminalDestroy(id: string | undefined, sessionId: string): Promise<BridgeResponse> {
        try {
            const response = await this.terminalService.destroySession(sessionId);

            return {
                id,
                success: response.success,
                message: response.message || (response.success ? 'Terminal session destroyed' : 'Failed to destroy terminal session')
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to destroy terminal session'
            };
        }
    }

    private async handleTerminalCommand(id: string | undefined, terminalIdOrSessionId: string, command: string): Promise<BridgeResponse> {
        try {
            console.log(`🔍🔍🔍 TERMINAL COMMAND HANDLER ENTRY 🔍🔍🔍`);
            console.log(`🔍 Terminal command debug:`, {
                messageId: id,
                terminalIdOrSessionId,
                command,
                availableMappings: Array.from(this.terminalSessionMap.keys()),
                sessionMapSize: this.terminalSessionMap.size
            });
            console.log('Terminal service status:', this.terminalService.getStatus());
            
            // Check if this is a terminal ID that needs to be mapped to session ID
            let actualSessionId = terminalIdOrSessionId;
            
            if (this.terminalSessionMap.has(terminalIdOrSessionId)) {
                actualSessionId = this.terminalSessionMap.get(terminalIdOrSessionId)!;
                console.log(`🗺️ Using mapped session ID: ${terminalIdOrSessionId} -> ${actualSessionId}`);
            } else {
                console.log(`📋 Using direct session ID: ${actualSessionId}`);
                console.log(`⚠️ No mapping found for: ${terminalIdOrSessionId}`);
            }
            
            console.log(`🎯 About to execute command "${command}" in session ${actualSessionId}`);
            const response = await this.terminalService.executeCommand(actualSessionId, command);
            console.log(`📤 Command execution result:`, response);

            return {
                id,
                success: response.success,
                message: response.message || (response.success ? 'Command executed' : 'Failed to execute command')
            };
        } catch (error) {
            console.error('❌❌❌ TERMINAL COMMAND ERROR ❌❌❌:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to execute terminal command'
            };
        }
    }

    private async handleTerminalResize(id: string | undefined, sessionId: string, cols: number, rows: number): Promise<BridgeResponse> {
        try {
            const response = await this.terminalService.resizeTerminal(sessionId, cols, rows);

            return {
                id,
                success: response.success,
                message: response.message || (response.success ? 'Terminal resized' : 'Failed to resize terminal')
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to resize terminal'
            };
        }
    }

    private async handleTerminalData(id: string | undefined, sessionId: string, data: string): Promise<BridgeResponse> {
        try {
            const response = await this.terminalService.sendData(sessionId, data);

            return {
                id,
                success: response.success,
                message: response.message || (response.success ? 'Data sent to terminal' : 'Failed to send data to terminal')
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send data to terminal'
            };
        }
    }

    private async handleTerminalStatus(id: string | undefined): Promise<BridgeResponse> {
        try {
            const status = this.terminalService.getStatus();

            return {
                id,
                success: true,
                result: status,
                message: 'Terminal service status retrieved'
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get terminal status'
            };
        }
    }

    private async handleTerminalListSessions(id: string | undefined, workbranchId?: string): Promise<BridgeResponse> {
        try {
            const status = this.terminalService.getStatus();
            
            let sessions = status.activeSessions;
            if (workbranchId) {
                sessions = sessions.filter(session => session.workbranchId === workbranchId);
            }

            return {
                id,
                success: true,
                result: { sessions, totalSessions: sessions.length },
                message: `Found ${sessions.length} terminal session(s)`
            };
        } catch (error) {
            return {
                id,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to list terminal sessions'
            };
        }
    }

    // Get terminal service instance for external access
    public getTerminalService(): TerminalService {
        return this.terminalService;
    }
}