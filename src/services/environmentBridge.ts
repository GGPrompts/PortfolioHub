/**
 * Environment Bridge Service
 * 
 * Smart detection and communication layer between React app and available backends:
 * - VS Code Extension (via WebSocket bridge)
 * - Remote Server (future - via HTTP API)
 * - Clipboard Fallback (current web behavior)
 */

export type EnvironmentMode = 'vscode-local' | 'web-local' | 'remote';

export interface BridgeMessage {
    type: string;
    id?: string;
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

export interface EnvironmentCapabilities {
    commands: boolean;
    fileOperations: boolean;
    livePreview: boolean;
    projectManagement: boolean;
    notifications: boolean;
}

class EnvironmentBridge {
    private mode: EnvironmentMode = 'web-local';
    private wsConnection: WebSocket | null = null;
    private capabilities: EnvironmentCapabilities = {
        commands: false,
        fileOperations: false,
        livePreview: false,
        projectManagement: false,
        notifications: false
    };
    private connectionAttempted = false;
    private messageId = 0;
    private pendingMessages = new Map<string, { resolve: Function; reject: Function }>();

    async initialize(): Promise<EnvironmentMode> {
        if (this.connectionAttempted) {
            return this.mode;
        }

        this.connectionAttempted = true;

        // Detect environment
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Local environment - try to connect to VS Code bridge
            const connected = await this.tryConnectToVSCode();
            if (connected) {
                this.mode = 'vscode-local';
                console.log('🔗 Environment: VS Code Local - Enhanced features available');
            } else {
                // Check if VS Code Server is running for enhanced clipboard mode
                const remoteVSCodeAvailable = await this.checkRemoteVSCodeServer();
                if (remoteVSCodeAvailable) {
                    this.mode = 'web-local';
                    console.log('📱 Environment: Web Local with VS Code Server - Enhanced clipboard mode');
                } else {
                    this.mode = 'web-local';
                    console.log('📱 Environment: Web Local - Basic clipboard mode');
                }
            }
        } else {
            // Remote environment (future)
            this.mode = 'remote';
            console.log('🌍 Environment: Remote - API commands available');
        }

        return this.mode;
    }

    private async checkRemoteVSCodeServer(): Promise<boolean> {
        try {
            // Check if VS Code Server is accessible
            const response = await fetch('http://localhost:8080', { 
                method: 'HEAD', 
                mode: 'no-cors',
                signal: AbortSignal.timeout(2000)
            });
            return true; // Server is running
        } catch {
            return false; // Server not accessible
        }
    }

    private async tryConnectToVSCode(): Promise<boolean> {
        try {
            console.log('🔍 Attempting to connect to VS Code bridge...');
            
            // Detect if we're in a VS Code webview where WebSocket connections are restricted
            const isVSCodeWebview = window.location.protocol === 'vscode-webview:' || 
                                   window.location.hostname.includes('vscode-webview') ||
                                   (window as any).vscode !== undefined;
            
            if (isVSCodeWebview) {
                console.log('📱 VS Code webview detected - WebSocket blocked, using clipboard mode');
                return false;
            }
            
            this.wsConnection = new WebSocket('ws://localhost:8123');
            
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log('⏰ VS Code bridge connection timeout - falling back to clipboard mode');
                    if (this.wsConnection) {
                        this.wsConnection.close();
                        this.wsConnection = null;
                    }
                    resolve(false);
                }, 2000); // Reduced timeout for faster fallback

                this.wsConnection!.onopen = () => {
                    clearTimeout(timeout);
                    console.log('✅ Connected to VS Code bridge');
                    this.setupMessageHandling();
                    resolve(true);
                };

                this.wsConnection!.onerror = (error) => {
                    clearTimeout(timeout);
                    console.log('❌ Failed to connect to VS Code bridge:', error);
                    this.wsConnection = null;
                    resolve(false);
                };

                this.wsConnection!.onclose = () => {
                    clearTimeout(timeout);
                    console.log('🔌 VS Code bridge connection closed');
                    this.wsConnection = null;
                    this.mode = 'web-local';
                    this.updateCapabilities(false);
                };
            });
        } catch (error) {
            console.log('❌ VS Code bridge connection failed:', error);
            this.wsConnection = null;
            return false;
        }
    }

    private setupMessageHandling(): void {
        if (!this.wsConnection) return;

        this.wsConnection.onmessage = (event) => {
            try {
                const response: BridgeResponse = JSON.parse(event.data);
                
                // Handle connection confirmation
                if (response.type === 'connected' && response.capabilities) {
                    this.capabilities = response.capabilities;
                    this.updateCapabilities(true);
                    console.log('🎯 VS Code capabilities loaded:', this.capabilities);
                    return;
                }

                // Handle message responses
                if (response.id && this.pendingMessages.has(response.id)) {
                    const { resolve, reject } = this.pendingMessages.get(response.id)!;
                    this.pendingMessages.delete(response.id);

                    if (response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response.error || 'Command failed'));
                    }
                }
            } catch (error) {
                console.error('Failed to parse bridge message:', error);
            }
        };
    }

    private updateCapabilities(connected: boolean): void {
        if (connected) {
            // Capabilities set from VS Code response
            console.log('🚀 Enhanced VS Code features enabled');
        } else {
            this.capabilities = {
                commands: false,
                fileOperations: false,
                livePreview: false,
                projectManagement: false,
                notifications: false
            };
            console.log('📋 Fallback to clipboard mode');
        }
    }

    private generateMessageId(): string {
        return `msg_${++this.messageId}_${Date.now()}`;
    }

    private async sendMessage(message: BridgeMessage): Promise<BridgeResponse> {
        if (this.mode === 'vscode-local' && this.wsConnection?.readyState === WebSocket.OPEN) {
            return new Promise((resolve, reject) => {
                const id = this.generateMessageId();
                message.id = id;
                
                this.pendingMessages.set(id, { resolve, reject });
                
                // Set timeout for response
                setTimeout(() => {
                    if (this.pendingMessages.has(id)) {
                        this.pendingMessages.delete(id);
                        reject(new Error('Message timeout'));
                    }
                }, 10000); // 10 second timeout

                this.wsConnection!.send(JSON.stringify(message));
            });
        } else {
            throw new Error('VS Code bridge not available');
        }
    }

    // Public API Methods

    async executeCommand(command: string, projectPath?: string): Promise<boolean> {
        try {
            switch (this.mode) {
                case 'vscode-local':
                    const response = await this.sendMessage({
                        type: 'execute-command',
                        command,
                        projectPath
                    });
                    this.showNotification(response.message || `Executed: ${command}`, response.success ? 'info' : 'error');
                    return response.success;

                case 'web-local':
                    // Enhanced clipboard mode with VS Code Server detection
                    const smartCommand = await this.createSmartClipboardCommand(command, projectPath);
                    await navigator.clipboard.writeText(smartCommand);
                    this.showNotification(`📋 Command copied to clipboard - paste in terminal to execute`, 'info');
                    return true; // Successfully copied to clipboard

                case 'remote':
                    // Future: API call to remote server
                    const remoteCommand = await this.createSmartClipboardCommand(command, projectPath, true);
                    await navigator.clipboard.writeText(remoteCommand);
                    this.showNotification(`🌍 Remote command copied with server instructions`, 'info');
                    return true; // Successfully copied to clipboard

                default:
                    throw new Error('Unknown environment mode');
            }
        } catch (error) {
            console.error('Command execution failed:', error);
            try {
                // Fallback to clipboard
                await navigator.clipboard.writeText(command);
                this.showNotification(`⚠️ Command execution failed - copied to clipboard for manual execution`, 'warning');
                return true; // Successfully copied as fallback
            } catch (clipboardError) {
                this.showNotification(`❌ Command failed and clipboard unavailable`, 'error');
                return false;
            }
        }
    }

    private async createSmartClipboardCommand(command: string, projectPath?: string, isRemote: boolean = false): Promise<string> {
        const vsCodeServerRunning = await this.checkRemoteVSCodeServer();
        
        if (vsCodeServerRunning) {
            // VS Code Server is running - provide enhanced instructions
            return `# 🚀 VS Code Server Command (Enhanced Mode)
# VS Code Server detected at: http://localhost:8080
# 
# OPTION 1 - Command Palette (Recommended):
# 1. Open: http://localhost:8080 in browser
# 2. Press: Ctrl+Shift+P (Command Palette)
# 3. Type: ${command}
#
# OPTION 2 - Terminal (For CLI commands):
# 1. Open: http://localhost:8080 in browser  
# 2. Press: Ctrl+\` (New Terminal)
# 3. Execute: ${command}
${projectPath ? `# 4. Directory: ${projectPath}` : ''}
#
# Raw Command:
${command}`;
        } else {
            // Standard clipboard mode
            return `# 📋 Command for execution:
${projectPath ? `# Directory: ${projectPath}` : ''}
${command}`;
        }
    }

    async startProject(projectId: string): Promise<boolean> {
        if (this.mode === 'vscode-local') {
            try {
                const response = await this.sendMessage({
                    type: 'project-start',
                    projectId
                });
                this.showNotification(response.message || `Started project: ${projectId}`, response.success ? 'info' : 'error');
                return response.success;
            } catch (error) {
                console.error('Project start failed:', error);
                return false;
            }
        } else {
            // Fallback to clipboard command
            await navigator.clipboard.writeText(`# Start project: ${projectId}`);
            this.showNotification(`📋 Project start command copied for: ${projectId}`, 'info');
            return false;
        }
    }

    async stopProject(projectId: string): Promise<boolean> {
        if (this.mode === 'vscode-local') {
            try {
                const response = await this.sendMessage({
                    type: 'project-stop',
                    projectId
                });
                this.showNotification(response.message || `Stopped project: ${projectId}`, response.success ? 'info' : 'error');
                return response.success;
            } catch (error) {
                console.error('Project stop failed:', error);
                return false;
            }
        } else {
            // Fallback to clipboard command
            await navigator.clipboard.writeText(`# Stop project: ${projectId}`);
            this.showNotification(`📋 Project stop command copied for: ${projectId}`, 'info');
            return false;
        }
    }

    async openInVSCode(projectPath: string): Promise<boolean> {
        if (this.mode === 'vscode-local') {
            try {
                const response = await this.sendMessage({
                    type: 'open-in-vscode',
                    projectPath
                });
                return response.success;
            } catch (error) {
                console.error('VS Code open failed:', error);
                return false;
            }
        } else {
            await navigator.clipboard.writeText(`code "${projectPath}"`);
            this.showNotification(`📋 VS Code command copied: code "${projectPath}"`, 'info');
            return false;
        }
    }

    async openFolder(folderPath: string): Promise<boolean> {
        if (this.mode === 'vscode-local') {
            try {
                const response = await this.sendMessage({
                    type: 'open-folder',
                    projectPath: folderPath
                });
                return response.success;
            } catch (error) {
                console.error('Folder open failed:', error);
                return false;
            }
        } else {
            const command = process.platform === 'win32' ? `explorer "${folderPath}"` : `open "${folderPath}"`;
            await navigator.clipboard.writeText(command);
            this.showNotification(`📋 Folder command copied: ${command}`, 'info');
            return false;
        }
    }

    async openLivePreview(url: string, title?: string): Promise<boolean> {
        if (this.mode === 'vscode-local') {
            try {
                const response = await this.sendMessage({
                    type: 'live-preview',
                    url,
                    title
                });
                if (response.success) {
                    return true;
                } else {
                    // VS Code Live Preview failed, fallback to browser
                    window.open(url, '_blank');
                    this.showNotification(`🌐 Live Preview unavailable - opened in browser: ${title || url}`, 'info');
                    return true;
                }
            } catch (error) {
                console.error('Live Preview failed:', error);
                // Fallback to regular browser
                window.open(url, '_blank');
                this.showNotification(`🌐 Live Preview error - opened in browser: ${title || url}`, 'info');
                return true;
            }
        } else {
            // Regular browser fallback (web-local mode)
            window.open(url, '_blank');
            this.showNotification(`🌐 Opened in new browser tab: ${title || url}`, 'info');
            return true;
        }
    }

    async gitOperation(command: string, projectPath: string): Promise<boolean> {
        if (this.mode === 'vscode-local') {
            try {
                const response = await this.sendMessage({
                    type: 'git-operation',
                    command,
                    projectPath
                });
                return response.success;
            } catch (error) {
                console.error('Git operation failed:', error);
                return false;
            }
        } else {
            await navigator.clipboard.writeText(`cd "${projectPath}" && ${command}`);
            this.showNotification(`📋 Git command copied: ${command}`, 'info');
            return false;
        }
    }

    async saveFile(filePath: string, content: string): Promise<boolean> {
        if (this.mode === 'vscode-local') {
            try {
                const response = await this.sendMessage({
                    type: 'file-save',
                    data: { path: filePath, content }
                });
                return response.success;
            } catch (error) {
                console.error('File save failed:', error);
                return false;
            }
        } else {
            this.showNotification('File saving only available in VS Code mode', 'warning');
            return false;
        }
    }

    async deleteFile(filePath: string): Promise<boolean> {
        if (this.mode === 'vscode-local') {
            try {
                const response = await this.sendMessage({
                    type: 'file-delete',
                    data: { path: filePath }
                });
                return response.success;
            } catch (error) {
                console.error('File delete failed:', error);
                return false;
            }
        } else {
            this.showNotification('File deletion only available in VS Code mode', 'warning');
            return false;
        }
    }

    async addProjectToWorkspace(project: any): Promise<boolean> {
        if (this.mode === 'vscode-local') {
            try {
                const response = await this.sendMessage({
                    type: 'workspace-add-project',
                    data: { project }
                });
                return response.success;
            } catch (error) {
                console.error('Add to workspace failed:', error);
                return false;
            }
        } else {
            await navigator.clipboard.writeText(`# Add to workspace: ${project.title}`);
            this.showNotification(`📋 Workspace command copied for: ${project.title}`, 'info');
            return false;
        }
    }

    async refreshProjects(): Promise<any> {
        if (this.mode === 'vscode-local') {
            try {
                const response = await this.sendMessage({
                    type: 'refresh-projects'
                });
                return response.result;
            } catch (error) {
                console.error('Project refresh failed:', error);
                return null;
            }
        } else {
            this.showNotification('Project refresh only available in VS Code mode', 'warning');
            return null;
        }
    }

    private showNotification(text: string, level: 'info' | 'warning' | 'error' = 'info'): void {
        if (this.mode === 'vscode-local') {
            // Send to VS Code for native notifications
            try {
                this.sendMessage({
                    type: 'notification',
                    data: { text, level }
                });
            } catch (error) {
                // Fallback to browser alert
                this.browserNotification(text, level);
            }
        } else {
            // Browser notifications
            this.browserNotification(text, level);
        }
    }

    private browserNotification(text: string, level: 'info' | 'warning' | 'error'): void {
        console.log(`Notification (${level}): ${text}`);
        
        // You can integrate with your existing notification system here
        // For now, using browser alerts as fallback
        if (level === 'error') {
            console.error(`❌ ${text}`);
        } else if (level === 'warning') {
            console.warn(`⚠️ ${text}`);
        } else {
            console.info(`ℹ️ ${text}`);
        }
    }

    // Getter methods for React components

    getMode(): EnvironmentMode {
        return this.mode;
    }

    getCapabilities(): EnvironmentCapabilities {
        return { ...this.capabilities };
    }

    isVSCodeAvailable(): boolean {
        return this.mode === 'vscode-local' && this.wsConnection?.readyState === WebSocket.OPEN;
    }

    isConnected(): boolean {
        return this.wsConnection?.readyState === WebSocket.OPEN || false;
    }

    async getConnectionStatus(): Promise<string> {
        switch (this.mode) {
            case 'vscode-local':
                return this.isConnected() ? '🔗 VS Code Connected' : '❌ VS Code Disconnected';
            case 'web-local':
                const serverRunning = await this.checkRemoteVSCodeServer();
                return serverRunning ? '📋 Smart Clipboard (VS Code Server Detected)' : '📋 Basic Clipboard Mode';
            case 'remote':
                return '🌍 Remote Mode';
            default:
                return '❓ Unknown';
        }
    }
}

// Singleton instance
export const environmentBridge = new EnvironmentBridge();

// Initialize on module load
environmentBridge.initialize();

export default environmentBridge;