/**
 * Testes básicos para endpoints de patrimônios
 */

import request from 'supertest';
import { Express } from 'express';
import { prisma } from '../config/database';

describe('Patrimônios API', () => {
  let app: Express;
  let authToken: string;
  let testUserId: string;
  let testMunicipalityId: string;
  let testSectorId: string;

  beforeAll(async () => {
    // Importar app após configurar variáveis de ambiente
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only-minimum-32-chars';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/sispat_test';
    
    const { default: appModule } = await import('../index');
    app = appModule;

    // Criar usuário de teste
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: 'admin',
        municipalityId: testMunicipalityId || 'test-municipality-id',
        isActive: true,
      },
    });
    testUserId = testUser.id;

    // Obter token de autenticação (simplificado para teste)
    // Em produção, usar endpoint de login real
    authToken = 'test-token'; // Substituir por token real
  });

  afterAll(async () => {
    // Limpar dados de teste
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/patrimonios', () => {
    it('deve retornar 401 sem autenticação', async () => {
      const response = await request(app)
        .get('/api/patrimonios')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('deve retornar 200 com autenticação', async () => {
      const response = await request(app)
        .get('/api/patrimonios')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('patrimonios');
      expect(Array.isArray(response.body.patrimonios)).toBe(true);
    });

    it('deve suportar paginação', async () => {
      const response = await request(app)
        .get('/api/patrimonios?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });
  });

  describe('POST /api/patrimonios', () => {
    it('deve criar patrimônio com dados válidos', async () => {
      const patrimonioData = {
        numero_patrimonio: `TEST-${Date.now()}`,
        descricao_bem: 'Teste de Patrimônio',
        tipo: 'Móvel',
        data_aquisicao: new Date().toISOString(),
        valor_aquisicao: 1000,
        quantidade: 1,
        forma_aquisicao: 'Compra',
        setor_responsavel: 'Teste',
        local_objeto: 'Teste',
        status: 'ativo',
      };

      const response = await request(app)
        .post('/api/patrimonios')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patrimonioData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.numero_patrimonio).toBe(patrimonioData.numero_patrimonio);

      // Limpar
      await prisma.patrimonio.delete({
        where: { id: response.body.id },
      });
    });

    it('deve retornar 400 com dados inválidos', async () => {
      const response = await request(app)
        .post('/api/patrimonios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});

