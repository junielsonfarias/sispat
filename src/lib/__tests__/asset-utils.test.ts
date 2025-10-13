import { describe, it, expect } from 'vitest'
import { generatePatrimonialNumber } from '../asset-utils'
import { Patrimonio, Sector } from '@/types'

describe('asset-utils', () => {
  describe('generatePatrimonialNumber', () => {
    const mockSectors: Sector[] = [
      {
        id: 'sector-1',
        name: 'Administração',
        codigo: '01',
        municipalityId: 'mun-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Sector,
      {
        id: 'sector-2',
        name: 'Educação',
        codigo: '02',
        municipalityId: 'mun-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Sector,
    ]

    it('deve gerar número para primeiro patrimônio do setor', () => {
      const patrimonios: Patrimonio[] = []
      const numero = generatePatrimonialNumber('sector-1', mockSectors, patrimonios)
      
      const currentYear = new Date().getFullYear()
      expect(numero).toBe(`${currentYear}01000001`)
    })

    it('deve incrementar sequencial corretamente', () => {
      const currentYear = new Date().getFullYear()
      const patrimonios: Patrimonio[] = [
        { numero_patrimonio: `${currentYear}01000001` } as Patrimonio,
        { numero_patrimonio: `${currentYear}01000002` } as Patrimonio,
      ]
      
      const numero = generatePatrimonialNumber('sector-1', mockSectors, patrimonios)
      expect(numero).toBe(`${currentYear}01000003`)
    })

    it('deve gerar número independente por setor', () => {
      const currentYear = new Date().getFullYear()
      const patrimonios: Patrimonio[] = [
        { numero_patrimonio: `${currentYear}01000001` } as Patrimonio,
        { numero_patrimonio: `${currentYear}01000002` } as Patrimonio,
      ]
      
      // Setor diferente deve iniciar em 000001
      const numero = generatePatrimonialNumber('sector-2', mockSectors, patrimonios)
      expect(numero).toBe(`${currentYear}02000001`)
    })

    it('deve ignorar patrimônios de anos anteriores', () => {
      const currentYear = new Date().getFullYear()
      const lastYear = currentYear - 1
      
      const patrimonios: Patrimonio[] = [
        { numero_patrimonio: `${lastYear}01000050` } as Patrimonio,
        { numero_patrimonio: `${currentYear}01000001` } as Patrimonio,
      ]
      
      const numero = generatePatrimonialNumber('sector-1', mockSectors, patrimonios)
      expect(numero).toBe(`${currentYear}01000002`)
    })

    it('deve lançar erro se setor não existir', () => {
      const patrimonios: Patrimonio[] = []
      
      expect(() => {
        generatePatrimonialNumber('sector-inexistente', mockSectors, patrimonios)
      }).toThrow('Setor inválido ou sem código definido.')
    })

    it('deve lançar erro se setor não tiver código', () => {
      const sectorsWithoutCode: Sector[] = [
        {
          id: 'sector-3',
          name: 'Sem Código',
          codigo: '',
          municipalityId: 'mun-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Sector,
      ]
      
      const patrimonios: Patrimonio[] = []
      
      expect(() => {
        generatePatrimonialNumber('sector-3', sectorsWithoutCode, patrimonios)
      }).toThrow('Setor inválido ou sem código definido.')
    })

    it('deve lidar com array vazio de patrimônios', () => {
      const numero = generatePatrimonialNumber('sector-1', mockSectors, [])
      
      const currentYear = new Date().getFullYear()
      expect(numero).toBe(`${currentYear}01000001`)
    })

    it('deve lidar com patrimônios não relacionados ao setor', () => {
      const currentYear = new Date().getFullYear()
      const patrimonios: Patrimonio[] = [
        { numero_patrimonio: `${currentYear}02000001` } as Patrimonio, // Setor 02
        { numero_patrimonio: `${currentYear}03000001` } as Patrimonio, // Setor 03
      ]
      
      const numero = generatePatrimonialNumber('sector-1', mockSectors, patrimonios)
      expect(numero).toBe(`${currentYear}01000001`)
    })

    it('deve encontrar o maior sequencial corretamente', () => {
      const currentYear = new Date().getFullYear()
      const patrimonios: Patrimonio[] = [
        { numero_patrimonio: `${currentYear}01000001` } as Patrimonio,
        { numero_patrimonio: `${currentYear}01000005` } as Patrimonio,
        { numero_patrimonio: `${currentYear}01000003` } as Patrimonio,
      ]
      
      const numero = generatePatrimonialNumber('sector-1', mockSectors, patrimonios)
      expect(numero).toBe(`${currentYear}01000006`)
    })

    it('deve formatar sequencial com zeros à esquerda', () => {
      const currentYear = new Date().getFullYear()
      const patrimonios: Patrimonio[] = [
        { numero_patrimonio: `${currentYear}01000099` } as Patrimonio,
      ]
      
      const numero = generatePatrimonialNumber('sector-1', mockSectors, patrimonios)
      expect(numero).toBe(`${currentYear}01000100`)
      expect(numero).toHaveLength(12) // 4 + 2 + 6
    })
  })
})

