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
                this.mode = 'web-local';
                console.log('📱 Environment: Web Local - Clipboard commands available');
            }
        } else {
            // Remote environment (future)
            this.mode = 'remote';
            console.log('🌍 Environment: Remote - API commands available');
        }

        return this.mode;
    }

    private async tryConnectToVSCode(): Promise<boolean> {
        try {
            console.log('🔍 Attempting to connect to VS Code bridge...');
            
            this.wsConnection = new WebSocket('ws://localhost:8123');
            
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log('⏰ VS Code bridge connection timeout');
                    if (this.wsConnection) {
                        this.wsConnection.close();
                        this.wsConnection = null;
                    }
                    resolve(false);
                }, 3000); // 3 second timeout

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
                    await navigator.clipboard.writeText(command);
                    this.showNotification(`📋 Command copied to clipboard: ${command}`, 'info');
                    return false; // Indicates clipboard mode

                case 'remote':
                    // Future: API call to remote server
                    await navigator.clipboard.writeText(command);
                    this.showNotification(`🌍 Remote mode - command copied: ${command}`, 'info');
                    return false;

                default:
                    throw new Error('Unknown environment mode');
            }
        } catch (error) {
            console.error('Command execution failed:', error);
            // Fallback to clipboard
            await navigator.clipboard.writeText(command);
            this.showNotification(`❌ Command failed, copied to clipboard: ${command}`, 'error');
            return false;
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
                return response.success;
            } catch (error) {
                console.error('Live Preview failed:', error);
                // Fallback to regular browser
                window.open(url, '_blank');
                return false;
            }
        } else {
            // Regular browser fallback
            window.open(url, '_blank');
            this.showNotification(`🌐 Opened in browser: ${title || url}`, 'info');
            return false;
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

    getConnectionStatus(): string {
        switch (this.mode) {
            case 'vscode-local':
                return this.isConnected() ? '🔗 VS Code Connected' : '❌ VS Code Disconnected';
            case 'web-local':
                return '📋 Clipboard Mode';
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