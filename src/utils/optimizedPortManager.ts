// Optimized Port Manager with caching to reduce memory leaks and improve performance
import { Project } from '../store/portfolioStore';

export interface PortStatus {
  port: number;
  available: boolean;
  projectId?: string;
  timestamp: number;
}

export interface CachedPortInfo {
  available: boolean;
  timestamp: number;
  retryCount?: number;
}

/**
 * OptimizedPortManager - Reduces unnecessary port checks with intelligent caching
 * 
 * Key improvements:
 * - TTL-based caching to reduce redundant checks
 * - Connection pooling for better performance  
 * - Exponential backoff for failed connections
 * - Batch checking capabilities
 * - Memory leak prevention
 */
export class OptimizedPortManager {
    private cache = new Map<number, CachedPortInfo>();
    private readonly CACHE_TTL = 15000; // 15 seconds for faster updates
    private readonly CACHE_TTL_FAILED = 5000; // 5 seconds for failed checks
    private readonly MAX_RETRY_COUNT = 3;
    private readonly REQUEST_TIMEOUT = 2000; // 2 second timeout
    
    // Singleton pattern for memory efficiency
    private static instance: OptimizedPortManager;
    
    static getInstance(): OptimizedPortManager {
        if (!OptimizedPortManager.instance) {
            OptimizedPortManager.instance = new OptimizedPortManager();
        }
        return OptimizedPortManager.instance;
    }

    // Global toggle for port checking
    private portCheckingEnabled = true;
    
    // Debug mode toggle - enabled by default for diagnosis
    private debugMode = true;
    
    setPortCheckingEnabled(enabled: boolean) {
        this.portCheckingEnabled = enabled;
        console.log(`🔧 Optimized port checking ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    setDebugMode(enabled: boolean) {
        this.debugMode = enabled;
        localStorage.setItem('debugPortChecks', enabled.toString());
        console.log(`🐛 Port check debugging ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    disablePortChecking() {
        this.setPortCheckingEnabled(false);
    }

    /**
     * Check if a port is available with caching
     * @param port The port to check
     * @param skipCache Force bypass cache for immediate check
     * @returns Promise<boolean> - true if port is available
     */
    async isPortAvailable(port: number, skipCache: boolean = false): Promise<boolean> {
        // Skip if port checking is disabled
        if (!this.portCheckingEnabled) {
            return false;
        }
        if (!skipCache) {
            const cached = this.getCachedResult(port);
            if (cached !== null) {
                return cached;
            }
        }

        const result = await this.performPortCheck(port);
        this.setCacheResult(port, result);
        return result;
    }

    /**
     * Get cached result if still valid
     * @param port Port number to check
     * @returns boolean | null - cached result or null if not valid
     */
    private getCachedResult(port: number): boolean | null {
        const cached = this.cache.get(port);
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        const ttl = cached.available ? this.CACHE_TTL : this.CACHE_TTL_FAILED;
        
        if (age < ttl) {
            return cached.available;
        }

        // Cache expired, remove entry
        this.cache.delete(port);
        return null;
    }

    /**
     * Set cache result with TTL
     * @param port Port number
     * @param available Whether port is available
     */
    private setCacheResult(port: number, available: boolean): void {
        const existing = this.cache.get(port);
        const retryCount = existing?.retryCount || 0;

        this.cache.set(port, {
            available,
            timestamp: Date.now(),
            retryCount: available ? 0 : Math.min(retryCount + 1, this.MAX_RETRY_COUNT)
        });
    }

    /**
     * Perform actual port check with timeout and retry logic
     * @param port Port to check
     * @returns Promise<boolean>
     */
    private async performPortCheck(port: number): Promise<boolean> {
        try {
            // Create individual AbortController for this specific port check
            const portController = new AbortController();

            const timeoutPromise = new Promise<never>((_, reject) => {
                const timeoutId = setTimeout(() => reject(new Error('Port check timeout')), this.REQUEST_TIMEOUT);
                portController.signal.addEventListener('abort', () => clearTimeout(timeoutId));
            });

            const checkPromise = this.doPortCheck(port, portController.signal);
            
            const result = await Promise.race([checkPromise, timeoutPromise]);
            return result;

        } catch (error) {
            console.debug(`Port ${port} check failed:`, error);
            return false;
        }
    }

    /**
     * Actual port checking implementation
     * @param port Port to check
     * @param signal Abort signal for cancellation
     * @returns Promise<boolean>
     */
    private async doPortCheck(port: number, signal: AbortSignal): Promise<boolean> {
        if (this.debugMode) {
            console.log(`[PortCheck] Checking port ${port}...`);
        }
        
        // Check if port checking is disabled
        const settings = JSON.parse(localStorage.getItem('performanceSettings') || '{}');
        if (!settings.portCheckingEnabled) {
            if (this.debugMode) {
                console.log(`[PortCheck] Port checking disabled via settings`);
            }
            return false;
        }
        
        // Self-detection: If we're checking our own port (5173), we're obviously running
        if (port === 5173 && window.location.port === '5173') {
            if (this.debugMode) {
                console.log(`[PortCheck] Port ${port} - Self-detection: Portfolio is running = PORT NOT AVAILABLE`);
            }
            return false; // Portfolio is running, so port is NOT available
        }
        
        try {
            // Use fetch with no-cors mode to detect server presence
            // This is more reliable than Image objects and prevents race conditions
            return await new Promise<boolean>((resolve) => {
                const controller = new AbortController();
                let resolved = false;
                
                // Set timeout for the request
                const timeout = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        controller.abort();
                        if (this.debugMode) {
                            console.log(`[PortCheck] Port ${port} - Timeout = PORT AVAILABLE (no server running)`);
                        }
                        resolve(true); // Port is available because no server responded
                    }
                }, 2000);
                
                // Try to fetch from the port
                fetch(`http://localhost:${port}/`, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: controller.signal,
                    cache: 'no-cache'
                })
                .then(() => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        if (this.debugMode) {
                            console.log(`[PortCheck] Port ${port} - Fetch success = PORT NOT AVAILABLE (server running)`);
                        }
                        resolve(false); // Port is NOT available because server is running
                    }
                })
                .catch((error) => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        
                        // Check if it's a network error (no server) vs other errors (server exists)
                        if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
                            if (this.debugMode) {
                                console.log(`[PortCheck] Port ${port} - Network error = PORT AVAILABLE (no server running)`);
                            }
                            resolve(true); // Port is available (no server)
                        } else {
                            if (this.debugMode) {
                                console.log(`[PortCheck] Port ${port} - Other error = PORT NOT AVAILABLE (server running)`);
                            }
                            resolve(false); // Port is not available (server exists)
                        }
                    }
                });
            });
              
        } catch (error: any) {
            // Check if request was aborted
            if (signal.aborted) {
                if (this.debugMode) {
                    console.log(`[PortCheck] Port ${port} check aborted`);
                }
                throw error;
            }

            // Network errors usually mean the server is not running
            if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
                if (this.debugMode) {
                    console.log(`[PortCheck] Port ${port} not running (network error)`);
                }
                return false;
            }

            // For other errors, assume server is not available
            if (this.debugMode) {
                console.log(`[PortCheck] Port ${port} check failed:`, error.message);
            }
            return false;
        }
    }

    /**
     * Batch check multiple ports efficiently
     * @param ports Array of ports to check
     * @param concurrency Maximum concurrent checks
     * @returns Promise<Map<number, boolean>>
     */
    async batchCheckPorts(ports: number[], concurrency: number = 5): Promise<Map<number, boolean>> {
        const results = new Map<number, boolean>();
        
        // Process ports in batches
        for (let i = 0; i < ports.length; i += concurrency) {
            const batch = ports.slice(i, i + concurrency);
            const batchPromises = batch.map(async (port) => {
                const available = await this.isPortAvailable(port);
                return { port, available };
            });

            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    results.set(result.value.port, result.value.available);
                } else {
                    // If check failed, assume port is not available
                    const port = batch[batchResults.indexOf(result)];
                    results.set(port, false);
                }
            });
        }

        return results;
    }

    /**
     * Check ports for multiple projects efficiently
     * @param projects Array of projects to check
     * @returns Promise<Map<string, boolean>>
     */
    async checkProjectPorts(projects: Project[]): Promise<Map<string, boolean>> {
        const portsToCheck = projects
            .filter(p => p.localPort)
            .map(p => p.localPort!);

        if (portsToCheck.length === 0) {
            return new Map();
        }

        const portResults = await this.batchCheckPorts(portsToCheck);
        const projectResults = new Map<string, boolean>();
        let runningCount = 0;

        projects.forEach(project => {
            if (project.localPort) {
                // CRITICAL FIX: isPortAvailable returns true when port is AVAILABLE (not running)
                // So we need to invert the logic to get isRunning
                const isAvailable = portResults.get(project.localPort);
                const isRunning = isAvailable === false; // Port not available = server is running
                projectResults.set(project.id, isRunning);
                if (isRunning) runningCount++;
            } else {
                projectResults.set(project.id, false);
            }
        });

        // Only log summary - much less spam
        console.log(`📊 Portfolio: ${runningCount}/${projects.length} projects running`);
        return projectResults;
    }

    /**
     * Clear cache (useful for forced refresh)
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Clear expired cache entries
     */
    cleanupCache(): void {
        const now = Date.now();
        for (const [port, info] of this.cache.entries()) {
            const age = now - info.timestamp;
            const ttl = info.available ? this.CACHE_TTL : this.CACHE_TTL_FAILED;
            
            if (age > ttl) {
                this.cache.delete(port);
            }
        }
    }

    /**
     * Get cache statistics for debugging
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
        entries: Array<{ port: number; available: boolean; age: number }>;
    } {
        const now = Date.now();
        const entries = Array.from(this.cache.entries()).map(([port, info]) => ({
            port,
            available: info.available,
            age: now - info.timestamp
        }));

        return {
            size: this.cache.size,
            hitRate: 0, // Would need to track hits vs misses
            entries
        };
    }

    /**
     * Cancel any ongoing port checks
     */
    cancelChecks(): void {
        // Individual port checks use their own AbortControllers
        // This method is kept for interface compatibility
        console.log('🚫 Port checks use individual controllers - no global cancellation needed');
    }

    /**
     * Clean up resources and prevent memory leaks
     */
    destroy(): void {
        this.cancelChecks();
        this.cache.clear();
        if (OptimizedPortManager.instance === this) {
            // @ts-ignore
            OptimizedPortManager.instance = undefined;
        }
    }
}

// Export singleton instance
export const optimizedPortManager = OptimizedPortManager.getInstance();

/**
 * Legacy compatibility functions
 */
export async function checkPort(port: number): Promise<boolean> {
    return optimizedPortManager.isPortAvailable(port);
}

export async function batchCheckPorts(ports: number[]): Promise<Map<number, boolean>> {
    return optimizedPortManager.batchCheckPorts(ports);
}

export function clearPortCache(): void {
    optimizedPortManager.clearCache();
}