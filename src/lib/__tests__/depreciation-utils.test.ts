import { describe, it, expect } from 'vitest'
import { calculateDepreciation } from '../depreciation-utils'

describe('Depreciation Utils', () => {
  describe('calculateDepreciation', () => {
    it('should calculate linear depreciation correctly', () => {
      const result = calculateDepreciation({
        valorAquisicao: 10000,
        dataAquisicao: new Date('2020-01-01'),
        vidaUtilAnos: 10,
        valorResidual: 1000,
        metodoDepreciacao: 'Linear',
      })

      expect(result).toBeDefined()
      expect(result.valorDepreciado).toBeGreaterThan(0)
      expect(result.valorAtual).toBeLessThan(10000)
      expect(result.taxaDepreciacaoAnual).toBe(10)
    })

    it('should handle zero residual value', () => {
      const result = calculateDepreciation({
        valorAquisicao: 5000,
        dataAquisicao: new Date('2022-01-01'),
        vidaUtilAnos: 5,
        valorResidual: 0,
        metodoDepreciacao: 'Linear',
      })

      expect(result.valorResidual).toBe(0)
    })

    it('should not depreciate beyond residual value', () => {
      const result = calculateDepreciation({
        valorAquisicao: 10000,
        dataAquisicao: new Date('2000-01-01'), // 25 anos atrás
        vidaUtilAnos: 10,
        valorResidual: 1000,
        metodoDepreciacao: 'Linear',
      })

      expect(result.valorAtual).toBeGreaterThanOrEqual(result.valorResidual)
      expect(result.percentualDepreciado).toBeLessThanOrEqual(100)
    })
  })
})

