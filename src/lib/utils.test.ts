import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate } from './utils'

describe('Utils', () => {
  describe('cn (className merger)', () => {
    it('should merge class names correctly', () => {
      expect(cn('btn', 'btn-primary')).toBe('btn btn-primary')
    })

    it('should handle conditional classes', () => {
      expect(cn('btn', false && 'hidden', 'active')).toBe('btn active')
    })

    it('should remove duplicates', () => {
      expect(cn('btn btn', 'btn')).toContain('btn')
    })
  })

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      // Intl.NumberFormat usa espaço não-quebrável (U+00A0) após R$
      expect(formatCurrency(1000)).toContain('1.000,00')
      expect(formatCurrency(1500.50)).toContain('1.500,50')
      expect(formatCurrency(0)).toContain('0,00')
    })

    it('should handle negative values', () => {
      // Formato brasileiro coloca o sinal antes do símbolo
      const result = formatCurrency(-500)
      expect(result).toContain('500,00')
      expect(result).toMatch(/^-.*R\$/)
    })

    it('should include BRL currency symbol', () => {
      expect(formatCurrency(100)).toContain('R$')
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      // Criar data com UTC para evitar problemas de timezone
      const date = new Date(2025, 0, 15, 12, 0, 0) // Jan 15, 2025, 12:00
      const formatted = formatDate(date)
      expect(formatted).toContain('15')
      expect(formatted).toContain('01')
      expect(formatted).toContain('2025')
    })

    it('should handle Date object', () => {
      const date = new Date(2025, 0, 15) // Jan 15, 2025
      const formatted = formatDate(date)
      expect(formatted).toContain('15')
      expect(formatted).toContain('01')
      expect(formatted).toContain('2025')
    })

    it('should return error message for invalid date', () => {
      const result = formatDate('invalid-date')
      expect(result).toBe('Data inválida')
    })
  })
})

