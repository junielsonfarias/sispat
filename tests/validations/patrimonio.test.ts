import { describe, it, expect } from '@jest/globals'
import { patrimonioSchema } from '../../src/lib/validations/patrimonioSchema'

describe('Patrimonio Validation Schema', () => {
  it('should validate a valid patrimonio object', () => {
    const validPatrimonio = {
      numero_patrimonio: '2024001',
      descricao: 'Computador Desktop',
      categoria: 'Equipamentos de Informática',
      valor: 2500.00,
      status: 'ativo',
      setor_responsavel: 'TI',
      local_atual: 'Sala 101',
      data_aquisicao: '2024-01-15',
      observacoes: 'Equipamento em perfeito estado'
    }

    const result = patrimonioSchema.safeParse(validPatrimonio)
    expect(result.success).toBe(true)
  })

  it('should reject patrimonio with missing required fields', () => {
    const invalidPatrimonio = {
      descricao: 'Computador Desktop',
      // Missing numero_patrimonio
      categoria: 'Equipamentos de Informática',
    }

    const result = patrimonioSchema.safeParse(invalidPatrimonio)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1)
      expect(result.error.issues[0].path).toContain('numero_patrimonio')
    }
  })

  it('should reject patrimonio with invalid status', () => {
    const invalidPatrimonio = {
      numero_patrimonio: '2024001',
      descricao: 'Computador Desktop',
      categoria: 'Equipamentos de Informática',
      valor: 2500.00,
      status: 'invalid_status', // Invalid status
      setor_responsavel: 'TI',
      local_atual: 'Sala 101',
    }

    const result = patrimonioSchema.safeParse(invalidPatrimonio)
    expect(result.success).toBe(false)
    if (!result.success) {
      const statusError = result.error.issues.find(issue => issue.path.includes('status'))
      expect(statusError).toBeDefined()
    }
  })

  it('should reject patrimonio with negative value', () => {
    const invalidPatrimonio = {
      numero_patrimonio: '2024001',
      descricao: 'Computador Desktop',
      categoria: 'Equipamentos de Informática',
      valor: -100, // Negative value
      status: 'ativo',
      setor_responsavel: 'TI',
      local_atual: 'Sala 101',
    }

    const result = patrimonioSchema.safeParse(invalidPatrimonio)
    expect(result.success).toBe(false)
    if (!result.success) {
      const valueError = result.error.issues.find(issue => issue.path.includes('valor'))
      expect(valueError).toBeDefined()
    }
  })
})
