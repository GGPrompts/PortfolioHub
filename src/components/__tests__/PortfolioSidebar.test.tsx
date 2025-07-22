import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortfolioSidebar } from '../PortfolioSidebar';

// Mock the store
const mockStore = {
  projects: [
    {
      id: 'matrix-cards',
      title: 'Matrix Cards', 
      localPort: 3002,
      status: 'active',
      displayType: 'external'
    },
    {
      id: 'ggprompts',
      title: 'GGPrompts',
      localPort: 9323,
      status: 'inactive',
      displayType: 'external'
    }
  ],
  selectedProject: null,
  sidebarCollapsed: false,
  setSelectedProject: vi.fn(),
  toggleSidebar: vi.fn(),
  refreshProjects: vi.fn()
};

vi.mock('../store/portfolioStore', () => ({
  usePortfolioStore: () => mockStore
}));

describe('PortfolioSidebar', () => {
  it('renders project list correctly', () => {
    render(<PortfolioSidebar />);
    
    expect(screen.getByText('Matrix Cards')).toBeInTheDocument();
    expect(screen.getByText('GGPrompts')).toBeInTheDocument();
  });

  it('shows correct status indicators', () => {
    render(<PortfolioSidebar />);
    
    // Should show active status for Matrix Cards
    const activeProject = screen.getByText('Matrix Cards').closest('.project-item');
    expect(activeProject).toHaveClass('active');
    
    // Should show inactive status for GGPrompts
    const inactiveProject = screen.getByText('GGPrompts').closest('.project-item');
    expect(inactiveProject).toHaveClass('inactive');
  });

  it('handles project selection', async () => {
    render(<PortfolioSidebar />);
    
    const matrixCardsProject = screen.getByText('Matrix Cards');
    fireEvent.click(matrixCardsProject);
    
    await waitFor(() => {
      expect(mockStore.setSelectedProject).toHaveBeenCalledWith(mockStore.projects[0]);
    });
  });

  it('handles sidebar collapse toggle', async () => {
    render(<PortfolioSidebar />);
    
    const collapseButton = screen.getByRole('button', { name: /toggle sidebar/i });
    fireEvent.click(collapseButton);
    
    expect(mockStore.toggleSidebar).toHaveBeenCalled();
  });

  it('displays port information correctly', () => {
    render(<PortfolioSidebar />);
    
    expect(screen.getByText('3002')).toBeInTheDocument();
    expect(screen.getByText('9323')).toBeInTheDocument();
  });
});