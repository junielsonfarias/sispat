import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock handlers para APIs
const handlers = [
  // Mock para health check
  rest.get('/api/health', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: 'test'
      })
    );
  }),

  // Mock para autenticação
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin'
        }
      })
    );
  }),

  // Mock para patrimônios
  rest.get('/api/patrimonios', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            id: 'test-patrimonio-id',
            numero_patrimonio: '001',
            descricao: 'Test Patrimonio',
            tipo: 'Equipamento',
            valor_aquisicao: 1000,
            status: 'ATIVO'
          }
        ],
        pagination: {
          totalItems: 1,
          totalPages: 1,
          currentPage: 1,
          limit: 10
        }
      })
    );
  }),

  // Mock para municípios
  rest.get('/api/municipalities', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            id: 'test-municipality-id',
            name: 'Test Municipality',
            state: 'SP'
          }
        ]
      })
    );
  }),

  // Mock para setores
  rest.get('/api/sectors', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            id: 'test-sector-id',
            name: 'Test Sector',
            municipality_id: 'test-municipality-id'
          }
        ]
      })
    );
  })
];

export const server = setupServer(...handlers);
