// Port management system for portfolio projects
import { Project } from '../store/portfolioStore';

export interface PortStatus {
  port: number;
  available: boolean;
  projectId?: string;
}

// Portfolio port (excluded from project detection)
export const PORTFOLIO_PORT = 5173;

// Default port assignments for projects only
export const DEFAULT_PORTS = {
  'claude-portfolio-unified': 5173,
  '3d-matrix-cards': 3005,
  'matrix-cards': 3002,
  'sleak-card': 3000,
  'ggprompts': 9323,
  'ggprompts-style-guide': 3001,
  '3d-file-system': 3004,
  'ggprompts-professional': 3006,
  'testproject': 3009

};

// Fallback ports if defaults are taken (excluding portfolio port 5173)
const FALLBACK_PORTS = [3007, 3008, 3009, 3010, 5174, 5175, 5176, 5177];

// Global flag to disable port checking (can be set by user preference)
export let portCheckingEnabled = true;

export function setPortCheckingEnabled(enabled: boolean) {
  portCheckingEnabled = enabled;
}

// Silent port checking to avoid console errors
export async function checkPort(port: number): Promise<boolean> {
  // Skip port checking if disabled
  if (!portCheckingEnabled) {
    return false;
  }
  
  try {
    // Use fetch with short timeout for more reliable detection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(`http://localhost:${port}/favicon.ico?t=${Date.now()}`, {
      method: 'HEAD',  // Use HEAD to avoid downloading content
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    
    // Any response (even 404) means the server is running
    return response.status !== undefined;
    
  } catch (error) {
    // Network errors mean port is not in use
    return false;
  }
}

// Find an available port for a project
export async function findAvailablePort(preferredPort: number | null): Promise<number | null> {
  if (!preferredPort) return null;
  
  // Check preferred port first
  const isPreferredAvailable = !(await checkPort(preferredPort));
  if (isPreferredAvailable) {
    return preferredPort;
  }
  
  // Try fallback ports
  for (const port of FALLBACK_PORTS) {
    const isAvailable = !(await checkPort(port));
    if (isAvailable) {
      return port;
    }
  }
  
  return null; // No available ports found
}

// Get status of all project ports
export async function getAllPortStatuses(): Promise<Map<string, PortStatus>> {
  const statuses = new Map<string, PortStatus>();
  
  for (const [projectId, defaultPort] of Object.entries(DEFAULT_PORTS)) {
    if (defaultPort) {
      const inUse = await checkPort(defaultPort);
      statuses.set(projectId, {
        port: defaultPort,
        available: !inUse,
        projectId: inUse ? projectId : undefined
      });
    }
  }
  
  return statuses;
}

// Check which projects are currently running
export async function getRunningProjects(): Promise<Set<string>> {
  const running = new Set<string>();
  const statuses = await getAllPortStatuses();
  
  statuses.forEach((status, projectId) => {
    if (!status.available && status.projectId) {
      running.add(projectId);
    }
  });
  
  return running;
}

// Get the actual port a project is running on
export async function getProjectPort(project: Project): Promise<number | null> {
  if (project.displayType !== 'external' || !project.localPort) {
    return null;
  }
  
  // Only check the project's designated port
  const projectPort = project.localPort;
  if (await checkPort(projectPort)) {
    return projectPort;
  }
  
  // Project is not running
  return null;
}

// Launch URL builder with port detection
export async function getProjectUrl(project: Project): Promise<string | null> {
  if (project.displayType === 'iframe') {
    return `/${project.path}`;
  }
  
  if (project.displayType === 'external') {
    const port = await getProjectPort(project);
    if (port) {
      return `http://localhost:${port}`;
    }
  }
  
  return null;
}
