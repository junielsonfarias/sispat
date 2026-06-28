import { describe, it, expect } from 'vitest'
import { getColumnValue, getColumnsWithLabels } from '../export-utils'
import type { Patrimonio } from '@/types'

const make = (partial: Record<string, unknown>): Patrimonio =>
  partial as unknown as Patrimonio

describe('export-utils / getColumnValue', () => {
  it('null/undefined viram string vazia', () => {
    expect(getColumnValue(make({ descricao_bem: null }), 'descricao_bem')).toBe('')
    expect(getColumnValue(make({}), 'descricao_bem')).toBe('')
  })

  it('número é formatado em pt-BR com 2 casas', () => {
    expect(getColumnValue(make({ valor_aquisicao: 1234.5 }), 'valor_aquisicao')).toBe('1.234,50')
    // Zero é valor válido (doação), não vira vazio.
    expect(getColumnValue(make({ valor_aquisicao: 0 }), 'valor_aquisicao')).toBe('0,00')
  })

  it('Date vira dd/MM/yyyy (tz-safe: Date construído em hora local)', () => {
    expect(
      getColumnValue(make({ data_aquisicao: new Date(2024, 2, 15) }), 'data_aquisicao'),
    ).toBe('15/03/2024')
  })

  it('string que NÃO parece ISO passa intacta (ex.: numero_patrimonio)', () => {
    expect(getColumnValue(make({ numero_patrimonio: '2025-001' }), 'numero_patrimonio')).toBe('2025-001')
    expect(getColumnValue(make({ numero_patrimonio: '2024' }), 'numero_patrimonio')).toBe('2024')
    expect(getColumnValue(make({ descricao_bem: 'Cadeira' }), 'descricao_bem')).toBe('Cadeira')
  })

  it('array vira a contagem (string)', () => {
    expect(getColumnValue(make({ fotos: ['a', 'b', 'c'] }), 'fotos')).toBe('3')
  })
})

describe('export-utils / getColumnsWithLabels', () => {
  it('mapeia chaves conhecidas para {key,label} e ignora chaves inexistentes', () => {
    const cols = getColumnsWithLabels(['numero_patrimonio', 'inexistente_xyz'] as (keyof Patrimonio)[])
    expect(cols.length).toBe(1)
    expect(cols[0].key).toBe('numero_patrimonio')
    expect(typeof cols[0].label).toBe('string')
    expect(cols[0].label.length).toBeGreaterThan(0)
  })
})
