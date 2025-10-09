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
      expect(formatCurrency(1000)).toBe('R$ 1.000,00')
      expect(formatCurrency(1500.50)).toBe('R$ 1.500,50')
      expect(formatCurrency(0)).toBe('R$ 0,00')
    })

    it('should handle negative values', () => {
      expect(formatCurrency(-500)).toBe('R$ -500,00')
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2025-01-15')
      expect(formatDate(date)).toMatch(/15\/01\/2025/)
    })

    it('should handle Date object', () => {
      const date = new Date(2025, 0, 15) // Jan 15, 2025
      const formatted = formatDate(date)
      expect(formatted).toContain('15')
      expect(formatted).toContain('01')
      expect(formatted).toContain('2025')
    })
  })
})

