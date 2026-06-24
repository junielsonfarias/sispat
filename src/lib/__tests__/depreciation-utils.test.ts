import { describe, it, expect } from 'vitest'
import { calculateDepreciation } from '../depreciation-utils'
import type { Patrimonio } from '@/types'

// `calculateDepreciation` recebe um Patrimonio e lê apenas valor_aquisicao,
// data_aquisicao, vida_util_anos e valor_residual. Helper monta o mínimo.
const makePatrimonio = (over: Partial<Patrimonio>): Patrimonio =>
  ({
    valor_aquisicao: 10000,
    data_aquisicao: new Date('2020-01-01'),
    vida_util_anos: 10,
    valor_residual: 1000,
    metodo_depreciacao: 'Linear',
    ...over,
  }) as Patrimonio

describe('Depreciation Utils', () => {
  describe('calculateDepreciation', () => {
    it('should calculate linear depreciation correctly', () => {
      const result = calculateDepreciation(makePatrimonio({}))

      expect(result).toBeDefined()
      expect(result.accumulatedDepreciation).toBeGreaterThan(0)
      expect(result.bookValue).toBeLessThan(10000)
      // taxa linear = 100 / vida_util_anos = 100 / 10 = 10
      expect(result.depreciationRate).toBe(10)
    })

    it('should handle zero residual value', () => {
      const result = calculateDepreciation(
        makePatrimonio({
          valor_aquisicao: 5000,
          data_aquisicao: new Date('2022-01-01'),
          vida_util_anos: 5,
          valor_residual: 0,
        }),
      )

      // com residual 0, o valor contábil pode chegar a 0 (nunca negativo)
      expect(result.bookValue).toBeGreaterThanOrEqual(0)
    })

    it('should not depreciate beyond residual value', () => {
      const result = calculateDepreciation(
        makePatrimonio({
          data_aquisicao: new Date('2000-01-01'), // 25 anos atrás (> vida útil)
        }),
      )

      // valor contábil nunca abaixo do residual; depreciação acumulada nunca
      // ultrapassa o valor depreciável (valor_aquisicao - valor_residual).
      expect(result.bookValue).toBeGreaterThanOrEqual(1000)
      expect(result.accumulatedDepreciation).toBeLessThanOrEqual(9000)
      // 25 anos > vida útil de 10 anos → totalmente depreciado
      expect(result.isFullyDepreciated).toBe(true)
    })
  })
})
