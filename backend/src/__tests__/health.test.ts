// O endpoint /ready faz `prisma.$queryRaw\`SELECT 1\`` e devolve 503 se o banco
// não responde. Mockamos o módulo de banco/redis para testar o CAMINHO DE SUCESSO
// da rota sem precisar de Postgres/Redis reais (teste unitário da rota de saúde).
jest.mock('../config/database', () => ({
  prisma: { $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]) },
}))
jest.mock('../config/redis', () => ({
  redisCache: { getStatus: jest.fn(() => 'disabled') },
}))

import request from 'supertest'
import express from 'express'
import healthRoutes from '../routes/healthRoutes'

describe('Health Routes', () => {
  let app: express.Application

  beforeAll(() => {
    app = express()
    app.use(express.json())
    app.use('/api/health', healthRoutes)
  })

  describe('GET /api/health', () => {
    it('deve retornar status 200 e healthy', async () => {
      const response = await request(app).get('/api/health')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('status')
      expect(response.body.status).toBe('healthy')
    })

    it('deve retornar timestamp', async () => {
      const response = await request(app).get('/api/health')

      expect(response.body).toHaveProperty('timestamp')
      expect(typeof response.body.timestamp).toBe('string')
    })
  })

  describe('GET /api/health/ready', () => {
    it('deve retornar status de prontidão', async () => {
      const response = await request(app).get('/api/health/ready')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('ready')
    })
  })

  describe('GET /api/health/live', () => {
    it('deve retornar status de vitalidade', async () => {
      const response = await request(app).get('/api/health/live')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('alive')
      expect(response.body.alive).toBe(true)
    })
  })
})

