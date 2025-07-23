"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortDetectionService = void 0;
const http = __importStar(require("http"));
const child_process_1 = require("child_process");
class PortDetectionService {
    constructor() {
        this.cache = new Map();
        this.CACHE_TTL = 10000; // 10 seconds cache
    }
    static getInstance() {
        if (!PortDetectionService.instance) {
            PortDetectionService.instance = new PortDetectionService();
        }
        return PortDetectionService.instance;
    }
    /**
     * Check multiple projects for status and detect conflicts
     */
    async checkProjectStatuses(projects) {
        console.log('🔍 Starting comprehensive project status check...');
        // Get all processes using ports first
        const allPortProcesses = await this.getAllPortProcesses();
        const results = [];
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
    async checkSingleProject(project, allPortProcesses) {
        const projectPorts = [];
        const warnings = [];
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
        }
        else {
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
        let status = 'inactive';
        const runningPorts = projectPorts.filter(p => p.isRunning);
        if (runningPorts.length === 0) {
            status = 'inactive';
        }
        else if (runningPorts.length === 1) {
            status = 'active';
            // Check if running on unexpected port
            if (runningPorts[0].port !== project.localPort) {
                warnings.push(`Running on unexpected port ${runningPorts[0].port} instead of configured ${project.localPort}`);
            }
        }
        else {
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
    async getAllPortProcesses() {
        return new Promise((resolve) => {
            const portProcesses = [];
            // Use netstat to get port information with process details
            const netstat = (0, child_process_1.spawn)('netstat', ['-ano'], { shell: true });
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
                    const match = line.match(/^\s*TCP\s+.*:(\d+)\s+.*LISTENING\s+(\d+)/);
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
    async getProcessName(pid) {
        return new Promise((resolve) => {
            const tasklist = (0, child_process_1.spawn)('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { shell: true });
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
    async checkHttpResponse(port) {
        // Check cache first
        const cached = this.cache.get(port);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
            return cached.info.isRunning;
        }
        return new Promise((resolve) => {
            // Try root path first, then favicon.ico as fallback
            const tryPath = (path) => {
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
                req.on('error', (error) => {
                    if (path === '/') {
                        // If root fails, try favicon.ico
                        console.log(`🔍 Port ${port}/ failed (${error.code || error.message}), trying /favicon.ico...`);
                        tryPath('/favicon.ico');
                    }
                    else {
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
                    }
                    else {
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
    async findProjectOnOtherPorts(project, allPortProcesses) {
        const duplicates = [];
        // Define port ranges to scan based on project type
        let portsToCheck = [];
        if (project.id === 'ggprompts') {
            portsToCheck = [9323, 9324, 9325, 9326, 9327, 9328, 9329, 9330];
        }
        else if (project.localPort < 4000) {
            // React apps typically use 3000-3099 range
            portsToCheck = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];
        }
        else if (project.localPort >= 5000) {
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
    detectPortConflicts(projectStatuses) {
        const portToProjects = new Map();
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
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Port detection cache cleared');
    }
    /**
     * Get cache statistics for debugging
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}
exports.PortDetectionService = PortDetectionService;
//# sourceMappingURL=portDetectionService.js.map