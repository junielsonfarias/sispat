import { describe, it, expect } from 'vitest'
import { generatePreview } from '../numbering-pattern-utils'
import { NumberingPatternComponent } from '@/types'

describe('numbering-pattern-utils', () => {
  describe('generatePreview', () => {
    it('deve gerar preview com apenas ano', () => {
      const components: NumberingPatternComponent[] = [
        { id: '1', type: 'year', format: 'YYYY' }
      ]
      
      const preview = generatePreview(components)
      expect(preview).toMatch(/^\d{4}$/)
      expect(preview).toBe(new Date().getFullYear().toString())
    })

    it('deve gerar preview com ano curto', () => {
      const components: NumberingPatternComponent[] = [
        { id: '1', type: 'year', format: 'YY' }
      ]
      
      const preview = generatePreview(components)
      expect(preview).toMatch(/^\d{2}$/)
      expect(preview).toBe(new Date().getFullYear().toString().slice(-2))
    })

    it('deve gerar preview com texto fixo', () => {
      const components: NumberingPatternComponent[] = [
        { id: '1', type: 'text', value: 'PAT' }
      ]
      
      const preview = generatePreview(components)
      expect(preview).toBe('PAT')
    })

    it('deve gerar preview com código de setor', () => {
      const components: NumberingPatternComponent[] = [
        { id: '1', type: 'sector', sectorCodeLength: 2 }
      ]
      
      const preview = generatePreview(components)
      expect(preview).toBe('XX')
    })

    it('deve gerar preview com sequencial', () => {
      const components: NumberingPatternComponent[] = [
        { id: '1', type: 'sequence', length: 6 }
      ]
      
      const preview = generatePreview(components)
      expect(preview).toBe('000001')
    })

    it('deve gerar preview completo com múltiplos componentes', () => {
      const components: NumberingPatternComponent[] = [
        { id: '1', type: 'year', format: 'YYYY' },
        { id: '2', type: 'text', value: '-' },
        { id: '3', type: 'sector', sectorCodeLength: 2 },
        { id: '4', type: 'text', value: '-' },
        { id: '5', type: 'sequence', length: 6 }
      ]
      
      const preview = generatePreview(components)
      const currentYear = new Date().getFullYear()
      expect(preview).toBe(`${currentYear}-XX-000001`)
    })

    it('deve retornar string vazia para array vazio', () => {
      const components: NumberingPatternComponent[] = []
      const preview = generatePreview(components)
      expect(preview).toBe('')
    })

    it('deve lidar com valores indefinidos graciosamente', () => {
      const components: NumberingPatternComponent[] = [
        { id: '1', type: 'text', value: undefined } as any
      ]
      
      const preview = generatePreview(components)
      expect(preview).toBe('')
    })

    it('deve gerar preview com formato padrão recomendado', () => {
      const components: NumberingPatternComponent[] = [
        { id: '1', type: 'year', format: 'YYYY' },
        { id: '2', type: 'sector', sectorCodeLength: 2 },
        { id: '3', type: 'sequence', length: 6 }
      ]
      
      const preview = generatePreview(components)
      const currentYear = new Date().getFullYear()
      expect(preview).toBe(`${currentYear}XX000001`)
    })
  })
})

