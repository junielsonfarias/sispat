import { describe, it, expect } from 'vitest'
import { formatCurrency, cn } from '../utils'

describe('Utils', () => {
  describe('formatCurrency', () => {
    // Intl.NumberFormat insere um espaço não-quebrável (U+00A0 ou U+202F) entre
    // o símbolo e o número; normalizamos para um espaço comum para a comparação
    // ser estável entre versões de ICU/Node.
    const norm = (s: string) => s.replace(/\s/g, ' ')

    it('should format positive values correctly', () => {
      expect(norm(formatCurrency(1234.56))).toBe('R$ 1.234,56')
    })

    it('should format zero', () => {
      expect(norm(formatCurrency(0))).toBe('R$ 0,00')
    })

    it('should format large values', () => {
      expect(norm(formatCurrency(1000000))).toBe('R$ 1.000.000,00')
    })

    it('should format decimal values', () => {
      expect(norm(formatCurrency(99.99))).toBe('R$ 99,99')
    })

    it('should handle small decimals', () => {
      expect(norm(formatCurrency(0.01))).toBe('R$ 0,01')
    })
  })

  describe('cn (classNames)', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'truthy', false && 'falsy')
      expect(result).toContain('base')
      expect(result).toContain('truthy')
      expect(result).not.toContain('falsy')
    })

    it('should handle undefined and null', () => {
      const result = cn('base', undefined, null, 'valid')
      expect(result).toContain('base')
      expect(result).toContain('valid')
    })

    it('should merge tailwind classes correctly', () => {
      const result = cn('p-4', 'p-6') // p-6 should override p-4
      expect(result).toContain('p-6')
    })
  })
})

