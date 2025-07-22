import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkPort, findAvailablePort, getAllPortStatuses, getRunningProjects } from '../portManager';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('portManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkPort', () => {
    it('returns true when port is active', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200
      });

      const result = await checkPort(3002);
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3002/favicon.ico'),
        expect.objectContaining({
          method: 'HEAD',
          cache: 'no-cache'
        })
      );
    });

    it('returns false when port is inactive', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkPort(3999);
      expect(result).toBe(false);
    });

    it('handles timeout correctly', async () => {
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 3000);
        });
      });

      const result = await checkPort(3003);
      expect(result).toBe(false);
    });
  });

  describe('findAvailablePort', () => {
    it('returns preferred port when available', async () => {
      mockFetch.mockRejectedValue(new Error('Port not in use'));

      const result = await findAvailablePort(3005);
      expect(result).toBe(3005);
    });

    it('finds fallback port when preferred is taken', async () => {
      mockFetch
        .mockResolvedValueOnce({ status: 200 }) // Preferred port taken
        .mockRejectedValueOnce(new Error('Port not in use')); // First fallback available

      const result = await findAvailablePort(3005);
      expect(result).toBe(3007); // First fallback port
    });

    it('returns null when no ports available', async () => {
      mockFetch.mockResolvedValue({ status: 200 }); // All ports taken

      const result = await findAvailablePort(3005);
      expect(result).toBe(null);
    });
  });

  describe('getAllPortStatuses', () => {
    it('returns correct port statuses', async () => {
      mockFetch
        .mockResolvedValueOnce({ status: 200 }) // 3d-matrix-cards active
        .mockRejectedValueOnce(new Error('Not active')) // matrix-cards inactive
        .mockResolvedValueOnce({ status: 200 }); // ggprompts active

      const statuses = await getAllPortStatuses();
      
      expect(statuses.get('3d-matrix-cards')).toEqual({
        port: 3005,
        available: false,
        projectId: '3d-matrix-cards'
      });
      
      expect(statuses.get('matrix-cards')).toEqual({
        port: 3002,
        available: true,
        projectId: undefined
      });
    });
  });

  describe('getRunningProjects', () => {
    it('identifies running projects correctly', async () => {
      mockFetch
        .mockResolvedValueOnce({ status: 200 }) // 3d-matrix-cards running
        .mockRejectedValueOnce(new Error('Not running')) // matrix-cards not running
        .mockResolvedValueOnce({ status: 200 }); // ggprompts running

      const runningProjects = await getRunningProjects();
      
      expect(runningProjects.has('3d-matrix-cards')).toBe(true);
      expect(runningProjects.has('matrix-cards')).toBe(false);
      expect(runningProjects.has('ggprompts')).toBe(true);
    });
  });
});