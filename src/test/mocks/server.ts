import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock API responses for testing
export const handlers = [
  // Mock port checking
  rest.head('http://localhost:*', (req, res, ctx) => {
    const url = new URL(req.url);
    const port = parseInt(url.port);
    
    // Mock some ports as active, others as inactive
    const activePorts = [3001, 3002, 5173, 9323];
    
    if (activePorts.includes(port)) {
      return res(ctx.status(200));
    }
    
    return res.networkError('Port not available');
  }),

  // Mock project manifest
  rest.get('/projects/manifest.json', (req, res, ctx) => {
    return res(
      ctx.json({
        projects: [
          {
            id: 'matrix-cards',
            title: 'Matrix Cards',
            localPort: 3002,
            status: 'active'
          },
          {
            id: 'ggprompts',
            title: 'GGPrompts',
            localPort: 9323,
            status: 'active'
          }
        ]
      })
    );
  }),

  // Mock favicon requests
  rest.get('http://localhost:*/favicon.ico', (req, res, ctx) => {
    return res(ctx.status(404));
  })
];

export const server = setupServer(...handlers);