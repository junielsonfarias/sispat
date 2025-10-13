import { describe, it, expect } from 'vitest'
import { buildSectorTree, getSubSectorIds, isCircularDependency } from '../sector-utils'
import { Sector } from '@/types'

describe('sector-utils', () => {
  const mockSectors: Sector[] = [
    {
      id: 'sector-1',
      name: 'Administração',
      codigo: '01',
      parentId: null,
      municipalityId: 'mun-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Sector,
    {
      id: 'sector-2',
      name: 'Finanças',
      codigo: '02',
      parentId: 'sector-1',
      municipalityId: 'mun-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Sector,
    {
      id: 'sector-3',
      name: 'Contabilidade',
      codigo: '03',
      parentId: 'sector-2',
      municipalityId: 'mun-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Sector,
    {
      id: 'sector-4',
      name: 'Educação',
      codigo: '04',
      parentId: null,
      municipalityId: 'mun-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Sector,
  ]

  describe('buildSectorTree', () => {
    it('deve construir árvore de setores corretamente', () => {
      const tree = buildSectorTree(mockSectors)
      
      expect(tree).toHaveLength(2) // Apenas raízes
      expect(tree[0].id).toBe('sector-1')
      expect(tree[1].id).toBe('sector-4')
    })

    it('deve incluir children corretamente', () => {
      const tree = buildSectorTree(mockSectors)
      
      const adminSector = tree.find(s => s.id === 'sector-1')
      expect(adminSector?.children).toHaveLength(1)
      expect(adminSector?.children[0].id).toBe('sector-2')
    })

    it('deve construir árvore de 3 níveis', () => {
      const tree = buildSectorTree(mockSectors)
      
      const adminSector = tree.find(s => s.id === 'sector-1')
      const financesSector = adminSector?.children[0]
      
      expect(financesSector?.children).toHaveLength(1)
      expect(financesSector?.children[0].id).toBe('sector-3')
    })

    it('deve retornar array vazio para lista vazia', () => {
      const tree = buildSectorTree([])
      expect(tree).toEqual([])
    })

    it('deve lidar com setores sem parentId (raízes)', () => {
      const rootSectors: Sector[] = [
        { id: '1', name: 'A', codigo: '01', parentId: null } as Sector,
        { id: '2', name: 'B', codigo: '02', parentId: null } as Sector,
      ]
      
      const tree = buildSectorTree(rootSectors)
      expect(tree).toHaveLength(2)
    })
  })

  describe('getSubSectorIds', () => {
    it('deve retornar o próprio ID se não tiver filhos', () => {
      const subIds = getSubSectorIds('sector-4', mockSectors)
      
      expect(subIds).toHaveLength(1)
      expect(subIds).toContain('sector-4')
    })

    it('deve retornar todos os IDs descendentes', () => {
      const subIds = getSubSectorIds('sector-1', mockSectors)
      
      expect(subIds).toHaveLength(3)
      expect(subIds).toContain('sector-1')
      expect(subIds).toContain('sector-2')
      expect(subIds).toContain('sector-3')
    })

    it('deve retornar apenas filho direto', () => {
      const subIds = getSubSectorIds('sector-2', mockSectors)
      
      expect(subIds).toHaveLength(2)
      expect(subIds).toContain('sector-2')
      expect(subIds).toContain('sector-3')
    })

    it('deve lidar com setores inexistentes', () => {
      const subIds = getSubSectorIds('sector-inexistente', mockSectors)
      
      expect(subIds).toHaveLength(1)
      expect(subIds).toContain('sector-inexistente')
    })

    it('deve evitar loops infinitos em dependências circulares', () => {
      const circularSectors: Sector[] = [
        { id: '1', parentId: '2' } as Sector,
        { id: '2', parentId: '1' } as Sector,
      ]
      
      const subIds = getSubSectorIds('1', circularSectors)
      
      // Deve ter implementação que evita loops
      expect(subIds.length).toBeGreaterThan(0)
      expect(subIds.length).toBeLessThan(10) // Não deve ficar em loop infinito
    })
  })

  describe('isCircularDependency', () => {
    it('deve retornar false se não houver parentId', () => {
      const result = isCircularDependency('sector-1', null, mockSectors)
      expect(result).toBe(false)
    })

    it('deve retornar true se setor é seu próprio pai', () => {
      const result = isCircularDependency('sector-1', 'sector-1', mockSectors)
      expect(result).toBe(true)
    })

    it('deve detectar dependência circular direta', () => {
      // sector-2 tem pai sector-1
      // Tentando fazer sector-1 filho de sector-2 criaria um loop
      const result = isCircularDependency('sector-1', 'sector-2', mockSectors)
      expect(result).toBe(true)
    })

    it('deve detectar dependência circular indireta', () => {
      // sector-3 → sector-2 → sector-1
      // Tentando fazer sector-1 filho de sector-3 criaria um loop
      const result = isCircularDependency('sector-1', 'sector-3', mockSectors)
      expect(result).toBe(true)
    })

    it('deve retornar false para relações válidas', () => {
      // sector-4 não tem relação com sector-1
      const result = isCircularDependency('sector-1', 'sector-4', mockSectors)
      expect(result).toBe(false)
    })

    it('deve retornar false para setores sem hierarquia', () => {
      const flatSectors: Sector[] = [
        { id: '1', parentId: null } as Sector,
        { id: '2', parentId: null } as Sector,
      ]
      
      const result = isCircularDependency('1', '2', flatSectors)
      expect(result).toBe(false)
    })
  })
})

