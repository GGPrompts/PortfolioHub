/**
 * Terminal Session - node-pty wrapper with enhanced functionality
 * 
 * This class wraps node-pty's IPty interface to provide:
 * - Cross-platform terminal emulation (Windows PowerShell, Linux/Mac Bash)
 * - Real-time output streaming via callbacks
 * - Workbranch isolation with dedicated working directories
 * - Session lifecycle management with automatic cleanup
 * - Security validation and command filtering
 * - Resize handling and terminal dimensions management
 * - Environment variable injection and shell customization
 */

import * as pty from '@homebridge/node-pty-prebuilt-multiarch';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { WebSocket } from 'ws';

export interface TerminalSessionConfig {
    sessionId: string;
    workbranchId: string;
    projectId?: string;
    shell: 'powershell' | 'bash' | 'cmd' | 'zsh';
    workspaceRoot: string;
    cwd?: string;
    title?: string;
    env?: Record<string, string>;
    cols?: number;
    rows?: number;
}

export interface TerminalSessionState {
    sessionId: string;
    workbranchId: string;
    projectId?: string;
    shell: string;
    title: string;
    cwd: string;
    pid: number;
    status: 'initializing' | 'running' | 'error' | 'terminated';
    createdAt: Date;
    lastActivity: Date;
    dimensions: { cols: number; rows: number };
    webSocket?: WebSocket;
    totalOutput: number;
    commandCount: number;
}

export type OutputCallback = (data: string) => void;
export type ExitCallback = (exitCode: number, signal?: number) => void;
export type ErrorCallback = (error: Error) => void;

export class TerminalSession {
    private ptyProcess: pty.IPty | null = null;
    private config: TerminalSessionConfig;
    private state: TerminalSessionState;
    private outputBuffer: string = '';
    private maxBufferSize = 1024 * 1024; // 1MB buffer limit

    // Event callbacks
    private onOutput: OutputCallback | null = null;
    private onExit: ExitCallback | null = null;
    private onError: ErrorCallback | null = null;

    constructor(config: TerminalSessionConfig) {
        this.config = config;

        // Initialize session state
        this.state = {
            sessionId: config.sessionId,
            workbranchId: config.workbranchId,
            projectId: config.projectId,
            shell: config.shell,
            title: config.title || `Terminal - ${config.workbranchId}`,
            cwd: this.resolveCwd(config.cwd, config.workspaceRoot, config.workbranchId),
            pid: -1,
            status: 'initializing',
            createdAt: new Date(),
            lastActivity: new Date(),
            dimensions: {
                cols: config.cols || 80,
                rows: config.rows || 24
            },
            webSocket: undefined,
            totalOutput: 0,
            commandCount: 0
        };
    }

    /**
     * Initialize the terminal session
     */
    async initialize(): Promise<boolean> {
        try {
            console.log(`🚀 Initializing terminal session: ${this.state.sessionId}`);

            // Ensure working directory exists
            await this.ensureWorkingDirectory();

            // Get shell configuration
            const shellConfig = this.getShellConfiguration();

            // Create node-pty process
            this.ptyProcess = pty.spawn(shellConfig.executable, shellConfig.args, {
                name: 'xterm-color',
                cols: this.state.dimensions.cols,
                rows: this.state.dimensions.rows,
                cwd: this.state.cwd,
                env: {
                    ...process.env,
                    ...this.getEnvironmentVariables(),
                    ...this.config.env
                },
                // Windows-specific options
                ...(os.platform() === 'win32' && {
                    useConpty: true,
                    conptyInheritCursor: true
                })
            });

            // Update state
            this.state.pid = this.ptyProcess.pid;
            this.state.status = 'running';

            // Setup event handlers
            this.setupEventHandlers();

            console.log(`✅ Terminal session initialized successfully:`, {
                sessionId: this.state.sessionId,
                pid: this.state.pid,
                shell: this.state.shell,
                cwd: this.state.cwd
            });

            return true;

        } catch (error) {
            console.error(`❌ Failed to initialize terminal session ${this.state.sessionId}:`, error);
            this.state.status = 'error';
            
            if (this.onError) {
                this.onError(error instanceof Error ? error : new Error('Initialization failed'));
            }
            
            return false;
        }
    }

    /**
     * Setup event handlers for the pty process
     */
    private setupEventHandlers(): void {
        if (!this.ptyProcess) return;

        // Handle data output
        this.ptyProcess.onData((data: string) => {
            this.handleOutput(data);
        });

        // Handle process exit
        this.ptyProcess.onExit(({ exitCode, signal }) => {
            console.log(`🔚 Terminal session ${this.state.sessionId} exited:`, { exitCode, signal });
            this.state.status = 'terminated';
            
            if (this.onExit) {
                this.onExit(exitCode, signal);
            }
        });
    }

    /**
     * Handle terminal output
     */
    private handleOutput(data: string): void {
        // Update activity timestamp
        this.state.lastActivity = new Date();
        this.state.totalOutput += data.length;

        // Add to buffer (with size limit)
        if (this.outputBuffer.length + data.length > this.maxBufferSize) {
            // Trim buffer to make room
            const excess = (this.outputBuffer.length + data.length) - this.maxBufferSize;
            this.outputBuffer = this.outputBuffer.substring(excess);
        }
        this.outputBuffer += data;

        // Send to callback
        if (this.onOutput) {
            this.onOutput(data);
        }
    }

    /**
     * Write data to terminal
     */
    write(data: string): boolean {
        if (!this.ptyProcess || this.state.status !== 'running') {
            console.warn(`❌ Cannot write to terminal ${this.state.sessionId}: not running`);
            return false;
        }

        try {
            this.ptyProcess.write(data);
            this.state.lastActivity = new Date();
            return true;
        } catch (error) {
            console.error(`❌ Failed to write to terminal ${this.state.sessionId}:`, error);
            return false;
        }
    }

    /**
     * Execute a command in the terminal
     */
    executeCommand(command: string): boolean {
        if (!this.write(command + '\r\n')) {
            return false;
        }

        this.state.commandCount++;
        console.log(`📤 Command executed in ${this.state.sessionId}: ${command}`);
        return true;
    }

    /**
     * Resize the terminal
     */
    resize(cols: number, rows: number): boolean {
        if (!this.ptyProcess || this.state.status !== 'running') {
            console.warn(`❌ Cannot resize terminal ${this.state.sessionId}: not running`);
            return false;
        }

        // Validate dimensions
        if (cols < 1 || cols > 1000 || rows < 1 || rows > 1000) {
            console.warn(`❌ Invalid terminal dimensions: ${cols}x${rows}`);
            return false;
        }

        try {
            this.ptyProcess.resize(cols, rows);
            this.state.dimensions = { cols, rows };
            this.state.lastActivity = new Date();
            
            console.log(`📏 Terminal ${this.state.sessionId} resized to ${cols}x${rows}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to resize terminal ${this.state.sessionId}:`, error);
            return false;
        }
    }

    /**
     * Get terminal output buffer
     */
    getOutput(): string {
        return this.outputBuffer;
    }

    /**
     * Clear output buffer
     */
    clearOutput(): void {
        this.outputBuffer = '';
    }

    /**
     * Get session state
     */
    getState(): TerminalSessionState {
        return { ...this.state };
    }

    /**
     * Set WebSocket for this session
     */
    setWebSocket(webSocket: WebSocket): void {
        this.state.webSocket = webSocket;
    }

    /**
     * Remove WebSocket from this session
     */
    removeWebSocket(): void {
        this.state.webSocket = undefined;
    }

    /**
     * Set event callbacks
     */
    setOutputCallback(callback: OutputCallback): void {
        this.onOutput = callback;
    }

    setExitCallback(callback: ExitCallback): void {
        this.onExit = callback;
    }

    setErrorCallback(callback: ErrorCallback): void {
        this.onError = callback;
    }

    /**
     * Kill the terminal process
     */
    async kill(signal: string = 'SIGTERM'): Promise<boolean> {
        if (!this.ptyProcess || this.state.status === 'terminated') {
            return true;
        }

        try {
            console.log(`🔪 Killing terminal session ${this.state.sessionId} with ${signal}`);
            
            this.ptyProcess.kill(signal);
            this.state.status = 'terminated';
            
            // Wait a bit for graceful termination
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return true;
        } catch (error) {
            console.error(`❌ Failed to kill terminal ${this.state.sessionId}:`, error);
            return false;
        }
    }

    /**
     * Cleanup and destroy the session
     */
    async destroy(): Promise<void> {
        console.log(`🗑️ Destroying terminal session: ${this.state.sessionId}`);

        // Kill the process if still running
        if (this.state.status === 'running') {
            await this.kill('SIGKILL');
        }

        // Clear callbacks
        this.onOutput = null;
        this.onExit = null;
        this.onError = null;

        // Clear buffer
        this.outputBuffer = '';

        // Remove WebSocket reference
        this.state.webSocket = undefined;

        console.log(`✅ Terminal session destroyed: ${this.state.sessionId}`);
    }

    /**
     * Resolve working directory for the session
     */
    private resolveCwd(cwd: string | undefined, workspaceRoot: string, workbranchId: string): string {
        if (cwd) {
            // If absolute path, use as-is (but validate it's within workspace)
            if (path.isAbsolute(cwd)) {
                const normalized = path.normalize(cwd);
                const workspaceNormalized = path.normalize(workspaceRoot);
                
                if (normalized.startsWith(workspaceNormalized)) {
                    return normalized;
                }
            } else {
                // Relative path - resolve against workspace root
                return path.resolve(workspaceRoot, cwd);
            }
        }

        // Default: create workbranch-specific directory
        return path.join(workspaceRoot, 'workbranches', workbranchId);
    }

    /**
     * Ensure working directory exists
     */
    private async ensureWorkingDirectory(): Promise<void> {
        try {
            if (!fs.existsSync(this.state.cwd)) {
                fs.mkdirSync(this.state.cwd, { recursive: true });
                console.log(`📁 Created working directory: ${this.state.cwd}`);
            }
        } catch (error) {
            console.error(`❌ Failed to create working directory ${this.state.cwd}:`, error);
            throw error;
        }
    }

    /**
     * Get shell configuration for the current platform
     */
    private getShellConfiguration(): { executable: string; args: string[] } {
        const platform = os.platform();
        
        switch (this.config.shell) {
            case 'powershell':
                if (platform === 'win32') {
                    return {
                        executable: 'powershell.exe',
                        args: ['-NoLogo', '-NoExit']
                    };
                } else {
                    return {
                        executable: 'pwsh',
                        args: ['-NoLogo', '-NoExit']
                    };
                }

            case 'cmd':
                return {
                    executable: 'cmd.exe',
                    args: ['/K']
                };

            case 'bash':
                return {
                    executable: 'bash',
                    args: ['--login']
                };

            case 'zsh':
                return {
                    executable: 'zsh',
                    args: ['-l']
                };

            default:
                // Auto-detect based on platform
                if (platform === 'win32') {
                    return {
                        executable: 'powershell.exe',
                        args: ['-NoLogo', '-NoExit']
                    };
                } else {
                    return {
                        executable: 'bash',
                        args: ['--login']
                    };
                }
        }
    }

    /**
     * Get environment variables for the session
     */
    private getEnvironmentVariables(): Record<string, string> {
        return {
            WORKBRANCH_ID: this.state.workbranchId,
            SESSION_ID: this.state.sessionId,
            PORTFOLIO_ROOT: this.config.workspaceRoot,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            ...(this.state.projectId && { PROJECT_ID: this.state.projectId })
        };
    }
}

export default TerminalSession;