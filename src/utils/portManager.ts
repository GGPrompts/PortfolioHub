// Port management system for portfolio projects
import { Project } from '../store/portfolioStore';

export interface PortStatus {
  port: number;
  available: boolean;
  projectId?: string;
}

// Default port assignments
export const DEFAULT_PORTS = {
  'portfolio': 3000,
  '3d-matrix-cards': 3005,
  'matrix-cards': 3002,
  'sleak-card': 3003,
  'ggprompts-main': 9323,
  'ggprompts-style-guide': 3001,
  '3d-file-system': 3004
};

// Fallback ports if defaults are taken
const FALLBACK_PORTS = [3004, 3005, 3006, 3007, 3008, 5175, 5176, 5177];

// Check if a port is available
export async function checkPort(port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    
    await fetch(`http://localhost:${port}`, { 
      mode: 'no-cors',
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    return true; // Port is in use
  } catch {
    return false; // Port is available
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
  
  // Check if running on default port
  const defaultPort = DEFAULT_PORTS[project.id];
  if (defaultPort && await checkPort(defaultPort)) {
    return defaultPort;
  }
  
  // Check fallback ports
  for (const port of FALLBACK_PORTS) {
    if (await checkPort(port)) {
      // Additional check could be done here to verify it's actually our project
      return port;
    }
  }
  
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