import * as http from 'http';
import * as vscode from 'vscode';
import { spawn } from 'child_process';

export interface PortInfo {
    port: number;
    isRunning: boolean;
    processId?: number;
    processName?: string;
    commandLine?: string;
}

export interface ProjectStatusInfo {
    projectId: string;
    status: 'active' | 'inactive' | 'multiple' | 'unknown';
    ports: PortInfo[];
    warnings: string[];
}

export class PortDetectionService {
    private static instance: PortDetectionService;
    private cache = new Map<number, { info: PortInfo; timestamp: number }>();
    private readonly CACHE_TTL = 10000; // 10 seconds cache

    public static getInstance(): PortDetectionService {
        if (!PortDetectionService.instance) {
            PortDetectionService.instance = new PortDetectionService();
        }
        return PortDetectionService.instance;
    }

    /**
     * Check multiple projects for status and detect conflicts
     */
    public async checkProjectStatuses(projects: any[]): Promise<ProjectStatusInfo[]> {
        console.log('🔍 Starting comprehensive project status check...');
        
        // Get all processes using ports first
        const allPortProcesses = await this.getAllPortProcesses();
        
        const results: ProjectStatusInfo[] = [];
        
        for (const project of projects) {
            const statusInfo = await this.checkSingleProject(project, allPortProcesses);
            results.push(statusInfo);
        }

        // Check for port conflicts between projects
        this.detectPortConflicts(results);
        
        console.log('📊 Project Status Summary:');
        results.forEach(info => {
            const status = info.status.toUpperCase();
            const portList = info.ports.map(p => `${p.port}(${p.processName || 'unknown'})`).join(', ');
            console.log(`  ${info.projectId}: ${status} - Ports: [${portList}]`);
            if (info.warnings.length > 0) {
                info.warnings.forEach(warning => console.log(`    ⚠️ ${warning}`));
            }
        });

        return results;
    }

    /**
     * Check a single project's status
     */
    private async checkSingleProject(project: any, allPortProcesses: PortInfo[]): Promise<ProjectStatusInfo> {
        const projectPorts: PortInfo[] = [];
        const warnings: string[] = [];

        if (!project.localPort) {
            return {
                projectId: project.id,
                status: 'inactive',
                ports: [],
                warnings: ['No port configured']
            };
        }

        // Check the project's configured port
        const configuredPortInfo = allPortProcesses.find(p => p.port === project.localPort);
        if (configuredPortInfo) {
            // Verify it's actually serving HTTP content
            const httpRunning = await this.checkHttpResponse(project.localPort);
            configuredPortInfo.isRunning = httpRunning;
            projectPorts.push(configuredPortInfo);
        } else {
            // Port not in process list, still check HTTP response
            const httpRunning = await this.checkHttpResponse(project.localPort);
            projectPorts.push({
                port: project.localPort,
                isRunning: httpRunning,
                processId: undefined,
                processName: httpRunning ? 'HTTP Server' : undefined
            });
        }

        // Look for this project running on other ports (duplicate detection)
        const potentialDuplicates = await this.findProjectOnOtherPorts(project, allPortProcesses);
        projectPorts.push(...potentialDuplicates);

        // Determine overall status
        let status: 'active' | 'inactive' | 'multiple' | 'unknown' = 'inactive';
        const runningPorts = projectPorts.filter(p => p.isRunning);

        if (runningPorts.length === 0) {
            status = 'inactive';
        } else if (runningPorts.length === 1) {
            status = 'active';
            
            // Check if running on unexpected port
            if (runningPorts[0].port !== project.localPort) {
                warnings.push(`Running on unexpected port ${runningPorts[0].port} instead of configured ${project.localPort}`);
            }
        } else {
            status = 'multiple';
            warnings.push(`Multiple instances detected on ports: ${runningPorts.map(p => p.port).join(', ')}`);
        }

        return {
            projectId: project.id,
            status,
            ports: projectPorts,
            warnings
        };
    }

    /**
     * Get all processes using ports via netstat
     */
    private async getAllPortProcesses(): Promise<PortInfo[]> {
        return new Promise((resolve) => {
            const portProcesses: PortInfo[] = [];
            
            // Use netstat to get port information with process details
            const netstat = spawn('netstat', ['-ano'], { shell: true });
            let output = '';

            netstat.stdout.on('data', (data) => {
                output += data.toString();
            });

            netstat.on('close', async (code) => {
                if (code !== 0) {
                    console.error('❌ netstat command failed, falling back to basic checking');
                    resolve([]);
                    return;
                }

                // Parse netstat output
                const lines = output.split('\n');
                for (const line of lines) {
                    // Match both IPv4 and IPv6 formats
                    // IPv4: TCP    127.0.0.1:9323         0.0.0.0:0              LISTENING       13480
                    // IPv6: TCP    [::1]:9323             [::]:0                 LISTENING       13480
                    const match = line.match(/^\s*TCP\s+(?:\[.*?\]|[\d.]+):(\d+)\s+.*LISTENING\s+(\d+)/);
                    if (match) {
                        const port = parseInt(match[1]);
                        const pid = parseInt(match[2]);
                        
                        // Filter for relevant ports (3000-3099, 5000-5999, 8000-8099, 9000-9999)
                        if ((port >= 3000 && port <= 3099) || 
                            (port >= 5000 && port <= 5999) || 
                            (port >= 8000 && port <= 8099) || 
                            (port >= 9000 && port <= 9999)) {
                            
                            const processName = await this.getProcessName(pid);
                            portProcesses.push({
                                port,
                                isRunning: true,
                                processId: pid,
                                processName
                            });
                        }
                    }
                }

                console.log(`🔍 Found ${portProcesses.length} processes using development ports`);
                resolve(portProcesses);
            });

            netstat.on('error', (error) => {
                console.error('❌ netstat error:', error);
                resolve([]);
            });
        });
    }

    /**
     * Get process name from PID
     */
    private async getProcessName(pid: number): Promise<string> {
        return new Promise((resolve) => {
            const tasklist = spawn('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { shell: true });
            let output = '';

            tasklist.stdout.on('data', (data) => {
                output += data.toString();
            });

            tasklist.on('close', () => {
                const match = output.match(/"([^"]+)"/);
                resolve(match ? match[1] : 'Unknown');
            });

            tasklist.on('error', () => {
                resolve('Unknown');
            });
        });
    }

    /**
     * Check if a port is serving HTTP content
     */
    private async checkHttpResponse(port: number): Promise<boolean> {
        // Check cache first
        const cached = this.cache.get(port);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
            return cached.info.isRunning;
        }

        return new Promise((resolve) => {
            // Try root path first, then favicon.ico as fallback
            const tryPath = (path: string) => {
                const req = http.request({
                    hostname: 'localhost',
                    port: port,
                    path: path,
                    method: 'GET',
                    timeout: 3000
                }, (res) => {
                    // Any HTTP response indicates server is running
                    const isRunning = res.statusCode !== undefined;
                    console.log(`🔍 Port ${port}${path} responded with status ${res.statusCode} - ${isRunning ? 'ACTIVE' : 'INACTIVE'}`);
                    
                    // Cache the result
                    this.cache.set(port, {
                        info: { port, isRunning },
                        timestamp: Date.now()
                    });
                    
                    resolve(isRunning);
                });

                req.on('error', (error: any) => {
                    if (path === '/') {
                        // If root fails, try favicon.ico
                        console.log(`🔍 Port ${port}/ failed (${error.code || error.message}), trying /favicon.ico...`);
                        tryPath('/favicon.ico');
                    } else {
                        console.log(`🔍 Port ${port} error: ${error.code || error.message} - INACTIVE`);
                        
                        // Cache the negative result
                        this.cache.set(port, {
                            info: { port, isRunning: false },
                            timestamp: Date.now()
                        });
                        
                        resolve(false);
                    }
                });

                req.on('timeout', () => {
                    console.log(`🔍 Port ${port}${path} timeout`);
                    req.destroy();
                    if (path === '/') {
                        tryPath('/favicon.ico');
                    } else {
                        resolve(false);
                    }
                });

                req.end();
            };

            // Start with root path
            tryPath('/');
        });
    }

    /**
     * Look for project running on unexpected ports
     */
    private async findProjectOnOtherPorts(project: any, allPortProcesses: PortInfo[]): Promise<PortInfo[]> {
        const duplicates: PortInfo[] = [];
        
        // Define port ranges to scan based on project type
        let portsToCheck: number[] = [];
        
        if (project.id === 'ggprompts') {
            portsToCheck = [9323, 9324, 9325, 9326, 9327, 9328, 9329, 9330];
        } else if (project.localPort < 4000) {
            // React apps typically use 3000-3099 range
            portsToCheck = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];
        } else if (project.localPort >= 5000) {
            // Vite/Next.js apps typically use 5173-5179 range
            portsToCheck = [5173, 5174, 5175, 5176, 5177, 5178, 5179];
        }

        // Remove the configured port since we already checked it
        portsToCheck = portsToCheck.filter(port => port !== project.localPort);

        for (const port of portsToCheck) {
            const processInfo = allPortProcesses.find(p => p.port === port);
            if (processInfo) {
                // Check if it's serving HTTP and could be our project
                const httpRunning = await this.checkHttpResponse(port);
                if (httpRunning) {
                    duplicates.push({
                        ...processInfo,
                        isRunning: httpRunning
                    });
                }
            }
        }

        return duplicates;
    }

    /**
     * Detect port conflicts between projects
     */
    private detectPortConflicts(projectStatuses: ProjectStatusInfo[]): void {
        const portToProjects = new Map<number, string[]>();

        // Build map of ports to projects
        projectStatuses.forEach(status => {
            status.ports.forEach(portInfo => {
                if (portInfo.isRunning) {
                    const projects = portToProjects.get(portInfo.port) || [];
                    projects.push(status.projectId);
                    portToProjects.set(portInfo.port, projects);
                }
            });
        });

        // Add warnings for conflicts
        portToProjects.forEach((projects, port) => {
            if (projects.length > 1) {
                const conflictMessage = `Port ${port} conflict with: ${projects.join(', ')}`;
                projects.forEach(projectId => {
                    const status = projectStatuses.find(s => s.projectId === projectId);
                    if (status && !status.warnings.includes(conflictMessage)) {
                        status.warnings.push(conflictMessage);
                    }
                });
            }
        });
    }

    /**
     * Clear the cache (useful for forcing fresh status checks)
     */
    public clearCache(): void {
        this.cache.clear();
        console.log('🗑️ Port detection cache cleared');
    }

    /**
     * Get cache statistics for debugging
     */
    public getCacheStats(): { size: number; keys: number[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * Enhanced refresh that clears caches and re-detects all ports
     */
    public async refreshAll(projects: any[]): Promise<ProjectStatusInfo[]> {
        console.log('🔄 Starting enhanced refresh - clearing caches and re-detecting ports...');
        
        // Clear all caches
        this.clearCache();
        
        // Get fresh port data
        const results = await this.checkProjectStatuses(projects);
        
        // Log detected ports for debugging
        results.forEach(result => {
            const runningPorts = result.ports.filter(p => p.isRunning);
            if (runningPorts.length > 0) {
                console.log(`🔍 ${result.projectId}: Running on ports [${runningPorts.map(p => p.port).join(', ')}]${result.warnings.length > 0 ? ' ⚠️ ' + result.warnings.join(', ') : ''}`);
            }
        });
        
        return results;
    }

    /**
     * Smart port detection for Vite/dev servers that auto-increment ports
     */
    public async detectActualPort(project: any): Promise<number | null> {
        const basePort = project.localPort;
        
        // Define comprehensive port ranges based on common dev server behavior
        let portsToCheck: number[] = [];
        
        if (basePort >= 5000 && basePort < 6000) {
            // Vite typically tries 5173, then 5174, 5175, etc.
            portsToCheck = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];
        } else if (basePort >= 3000 && basePort < 4000) {
            // React/Express apps typically use 3000-3010
            portsToCheck = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];
        } else if (basePort >= 9000) {
            // Custom ports like GGPrompts
            const range = Array.from({length: 10}, (_, i) => basePort + i);
            portsToCheck = range;
        } else {
            // Generic range around the configured port
            portsToCheck = [basePort - 2, basePort - 1, basePort, basePort + 1, basePort + 2];
        }

        // Check each port for HTTP response
        for (const port of portsToCheck) {
            const isRunning = await this.checkHttpResponse(port);
            if (isRunning) {
                console.log(`✅ Found ${project.id} running on port ${port}${port !== basePort ? ` (configured: ${basePort})` : ''}`);
                return port;
            }
        }

        console.log(`❌ No running instance found for ${project.id} in port range [${portsToCheck.join(', ')}]`);
        return null;
    }

    /**
     * Get comprehensive port status for debugging
     */
    public async getPortRangeStatus(startPort: number, endPort: number): Promise<PortInfo[]> {
        const results: PortInfo[] = [];
        
        for (let port = startPort; port <= endPort; port++) {
            const isRunning = await this.checkHttpResponse(port);
            if (isRunning) {
                results.push({
                    port,
                    isRunning: true,
                    processName: 'HTTP Server'
                });
            }
        }
        
        return results;
    }

    /**
     * Enhanced project status check with smart port detection
     */
    public async getEnhancedProjectStatus(project: any): Promise<ProjectStatusInfo & { actualPort?: number }> {
        // First, try the regular detection
        const allPortProcesses = await this.getAllPortProcesses();
        const standardStatus = await this.checkSingleProject(project, allPortProcesses);
        
        // If no running instance found, try smart port detection
        if (standardStatus.status === 'inactive') {
            const actualPort = await this.detectActualPort(project);
            if (actualPort && actualPort !== project.localPort) {
                // Found running on different port
                const actualPortInfo: PortInfo = {
                    port: actualPort,
                    isRunning: true,
                    processName: 'HTTP Server (Auto-detected)'
                };
                
                return {
                    ...standardStatus,
                    status: 'active',
                    ports: [actualPortInfo],
                    actualPort,
                    warnings: [`Running on port ${actualPort} instead of configured ${project.localPort} (Vite auto-increment)`]
                };
            }
        }
        
        // If found running, check if it's on the expected port
        const runningPorts = standardStatus.ports.filter(p => p.isRunning);
        if (runningPorts.length === 1 && runningPorts[0].port !== project.localPort) {
            return {
                ...standardStatus,
                actualPort: runningPorts[0].port
            };
        }
        
        return standardStatus;
    }
}