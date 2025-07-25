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
        console.log('🔍🔍🔍 ENVIRONMENT BRIDGE INITIALIZING 🔍🔍🔍');
        console.log('Connection attempted before:', this.connectionAttempted);
        console.log('Current mode:', this.mode);
        console.log('Window location:', window.location.href);
        
        if (this.connectionAttempted) {
            console.log('🔍 Already attempted connection, returning current mode:', this.mode);
            return this.mode;
        }

        this.connectionAttempted = true;

        // Detect environment
        const hostname = window.location.hostname;
        console.log('🔍 Detected hostname:', hostname);
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            console.log('🔍 Local environment detected, trying VS Code bridge...');
            // Local environment - try to connect to VS Code bridge
            const connected = await this.tryConnectToVSCode();
            console.log('🔍 VS Code bridge connection result:', connected);
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
            // Check if VS Code Server is accessible on port 8080
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 2000);
            
            const response = await fetch('http://localhost:8080', { 
                method: 'HEAD', 
                mode: 'no-cors',
                signal: controller.signal
            });
            return true; // VS Code Server is running
        } catch {
            return false; // Server not accessible
        }
    }

    private async tryConnectToVSCode(): Promise<boolean> {
        try {
            console.log('🔍 Attempting to connect to VS Code bridge at ws://localhost:8123...');
            
            // Detect if we're in a VS Code webview where WebSocket connections are restricted
            const isVSCodeWebview = window.location.protocol === 'vscode-webview:' || 
                                   window.location.hostname.includes('vscode-webview') ||
                                   (window as any).vscode !== undefined;
            
            console.log('🔍 Environment check:', {
                protocol: window.location.protocol,
                hostname: window.location.hostname,
                isVSCodeWebview,
                hasVSCodeGlobal: !!(window as any).vscode
            });
            
            if (isVSCodeWebview) {
                console.log('📱 VS Code webview detected - WebSocket blocked, using clipboard mode');
                return false;
            }
            
            console.log('🔌 Creating WebSocket connection to ws://localhost:8123...');
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
                    console.log('🎉🎉🎉 CONNECTED TO VS CODE BRIDGE 🎉🎉🎉');
                    this.setupMessageHandling();
                    resolve(true);
                };

                this.wsConnection!.onerror = (error) => {
                    clearTimeout(timeout);
                    console.log('❌❌❌ FAILED TO CONNECT TO VS CODE BRIDGE ❌❌❌');
                    console.log('❌ Error details:', error);
                    console.log('❌ This will cause fallback to clipboard mode');
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

    async getProjectStatus(projectId: string): Promise<boolean> {
        if (this.mode === 'vscode-local') {
            try {
                const response = await this.sendMessage({
                    type: 'project-status',
                    projectId
                });
                return response.success && response.result?.isRunning || false;
            } catch (error) {
                console.error('Project status check failed:', error);
                return false;
            }
        } else {
            // In web mode, we can't directly check VS Code status
            // Return false as fallback
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
            // Send to VS Code for native notifications AND show in browser as backup
            try {
                this.sendMessage({
                    type: 'notification',
                    data: { text, level }
                });
                // Also show in browser for dual notification support
                this.browserNotification(text, level, true); // true = VS Code mode
            } catch (error) {
                // Fallback to browser alert
                this.browserNotification(text, level, false);
            }
        } else {
            // Browser notifications only
            this.browserNotification(text, level, false);
        }
    }

    private browserNotification(text: string, level: 'info' | 'warning' | 'error', isVSCodeMode: boolean = false): void {
        console.log(`Notification (${level}): ${text}`);
        
        // 1. Console logging with appropriate level
        const prefix = isVSCodeMode ? '[VS Code + Browser] ' : '[Browser] ';
        if (level === 'error') {
            console.error(`❌ ${prefix}${text}`);
        } else if (level === 'warning') {
            console.warn(`⚠️ ${prefix}${text}`);
        } else {
            console.info(`ℹ️ ${prefix}${text}`);
        }
        
        // 2. Browser native notifications (if supported and permitted)
        this.showNativeNotification(text, level, isVSCodeMode);
        
        // 3. Custom toast notification for visual feedback
        this.showToastNotification(text, level, isVSCodeMode);
    }
    
    private async showNativeNotification(text: string, level: 'info' | 'warning' | 'error', isVSCodeMode: boolean): Promise<void> {
        if (!('Notification' in window)) {
            return; // Browser doesn't support notifications
        }
        
        try {
            // Request permission if not already granted
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    return;
                }
            }
            
            if (Notification.permission === 'granted') {
                const title = isVSCodeMode ? 'Claude Portfolio (VS Code + Browser)' : 'Claude Portfolio';
                const icon = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : 'ℹ️';
                
                new Notification(`${icon} ${title}`, {
                    body: text,
                    icon: '/favicon.ico', // Assuming you have a favicon
                    tag: 'claude-portfolio', // Replaces previous notifications
                    requireInteraction: level === 'error' // Keep error notifications visible
                });
            }
        } catch (error) {
            console.warn('Native notification failed:', error);
        }
    }
    
    private showToastNotification(text: string, level: 'info' | 'warning' | 'error', isVSCodeMode: boolean): void {
        // Create a toast notification element that appears in the React app
        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `notification-toast notification-${level}`;
        
        const icon = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : level === 'info' ? 'ℹ️' : '🔔';
        const modeLabel = isVSCodeMode ? ' (VS Code + Browser)' : '';
        
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icon}</span>
                <div class="toast-text">
                    <div class="toast-title">Claude Portfolio${modeLabel}</div>
                    <div class="toast-message">${text}</div>
                </div>
                <button class="toast-close">×</button>
            </div>
        `;
        
        // Add close button event listener
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.removeToast(toastId);
            });
        }
        
        // Add styles if not already added
        this.ensureToastStyles();
        
        // Calculate position based on existing toasts (cascade effect)
        const existingToasts = document.querySelectorAll('.notification-toast');
        const topOffset = 20 + (existingToasts.length * 90); // 90px spacing between toasts
        toast.style.top = `${topOffset}px`;
        
        // Add to page
        document.body.appendChild(toast);
        
        // Add slide-in animation
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);
        
        // Auto-remove after delay (longer for errors)
        const delay = level === 'error' ? 8000 : level === 'warning' ? 6000 : 4000;
        setTimeout(() => {
            this.removeToast(toastId);
        }, delay);
    }
    
    private removeToast(toastId: string): void {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                toast.remove();
                this.updateToastPositions();
            }, 300);
        }
    }
    
    private updateToastPositions(): void {
        const toasts = document.querySelectorAll('.notification-toast');
        toasts.forEach((toast, index) => {
            const element = toast as HTMLElement;
            const newTop = 20 + (index * 90);
            element.style.top = `${newTop}px`;
        });
    }
    
    private ensureToastStyles(): void {
        if (document.getElementById('claude-toast-styles')) {
            return; // Styles already added
        }
        
        const styles = document.createElement('style');
        styles.id = 'claude-toast-styles';
        styles.textContent = `
            .notification-toast {
                position: fixed;
                right: 20px;
                z-index: 10000;
                min-width: 320px;
                max-width: 500px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
                border-left: 4px solid #007acc;
                margin-bottom: 10px;
            }
            
            .notification-toast.notification-error {
                border-left-color: #d73a49;
            }
            
            .notification-toast.notification-warning {
                border-left-color: #f9c74f;
            }
            
            .notification-toast.notification-info {
                border-left-color: #007acc;
            }
            
            .toast-content {
                display: flex;
                align-items: flex-start;
                padding: 16px;
                gap: 12px;
            }
            
            .toast-icon {
                font-size: 20px;
                flex-shrink: 0;
                margin-top: 2px;
            }
            
            .toast-text {
                flex: 1;
                min-width: 0;
            }
            
            .toast-title {
                font-weight: 600;
                font-size: 14px;
                color: #24292e;
                margin-bottom: 4px;
            }
            
            .toast-message {
                font-size: 13px;
                color: #586069;
                line-height: 1.4;
                word-wrap: break-word;
            }
            
            .toast-close {
                background: none;
                border: none;
                font-size: 18px;
                color: #586069;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                flex-shrink: 0;
            }
            
            .toast-close:hover {
                background: #f1f3f4;
                color: #24292e;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            /* Stack multiple toasts */
            .notification-toast:nth-child(n+2) {
                margin-top: 70px;
            }
        `;
        
        document.head.appendChild(styles);
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
                return '📋 Web Application Mode';
            case 'remote':
                return '🌍 Remote Mode';
            default:
                return '❓ Unknown';
        }
    }
    
    // New method for manual VS Code connection
    async attemptVSCodeConnection(): Promise<boolean> {
        console.log('🔄 Manually attempting VS Code connection...');
        this.connectionAttempted = false; // Reset connection flag
        const newMode = await this.initialize();
        
        if (newMode === 'vscode-local') {
            this.showNotification('✅ Successfully connected to VS Code!', 'info');
            return true;
        } else {
            this.showNotification('❌ VS Code connection failed - ensure VS Code extension is running', 'warning');
            return false;
        }
    }
    
    // Method to disconnect from VS Code (for testing or manual control)
    disconnectFromVSCode(): void {
        if (this.wsConnection) {
            this.wsConnection.close();
            this.wsConnection = null;
        }
        this.mode = 'web-local';
        this.updateCapabilities(false);
        this.showNotification('🔌 Disconnected from VS Code - switched to Web Application mode', 'info');
    }
}

// Singleton instance
export const environmentBridge = new EnvironmentBridge();

// Initialize on module load
environmentBridge.initialize();

// Expose to window for debugging and React component access
declare global {
    interface Window {
        environmentBridge: EnvironmentBridge;
    }
}

// Attach to window object for global access
(window as any).environmentBridge = environmentBridge;

// Export additional methods for React components
export const connectToVSCode = () => environmentBridge.attemptVSCodeConnection();
export const disconnectFromVSCode = () => environmentBridge.disconnectFromVSCode();
export const showBrowserNotification = (text: string, level: 'info' | 'warning' | 'error' = 'info') => {
    environmentBridge['showNotification'](text, level);
};

export default environmentBridge;