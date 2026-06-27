import { describe, it, expect } from 'vitest'
import { fromApi, toCreateBody, toUpdateBody } from '@/contexts/ImovelFieldContext'

// Adaptadores de payload imovel-field (boundary front<->backend). Foi aqui que
// nasceu a classe "contract bug": name<->key, type case, options JSON, enum.

describe('imovelField fromApi (backend -> front)', () => {
  const base = { id: 'f1', name: 'matricula', label: 'Matrícula', type: 'text' }

  it('mapeia name->key e label', () => {
    const r = fromApi({ ...base })
    expect(r.key).toBe('matricula')
    expect(r.label).toBe('Matrícula')
  })

  it('normaliza type para MAIÚSCULO e respeita a whitelist (currency -> CURRENCY)', () => {
    expect(fromApi({ ...base, type: 'currency' }).type).toBe('CURRENCY')
    expect(fromApi({ ...base, type: 'select' }).type).toBe('SELECT')
  })

  it('type desconhecido cai para TEXT', () => {
    expect(fromApi({ ...base, type: 'foobar' }).type).toBe('TEXT')
  })

  it('parseia options (JSON string) para array; inválido -> undefined', () => {
    expect(fromApi({ ...base, type: 'select', options: '["A","B"]' }).options).toEqual(['A', 'B'])
    expect(fromApi({ ...base, options: 'não-json' }).options).toBeUndefined()
  })

  it('isSystem deriva isCustom (inverso) e defaultValue null -> undefined', () => {
    const sys = fromApi({ ...base, isSystem: true, defaultValue: null })
    expect(sys.isSystem).toBe(true)
    expect(sys.isCustom).toBe(false)
    expect(sys.defaultValue).toBeUndefined()
    expect(fromApi({ ...base }).isCustom).toBe(true) // sem isSystem => custom
  })
})

describe('imovelField toCreateBody (front -> POST)', () => {
  it('mapeia key->name, type minúsculo e inclui isSystem', () => {
    const body = toCreateBody({ key: 'cartorio', label: 'Cartório', type: 'TEXT', required: true, isSystem: false } as never)
    expect(body).toMatchObject({ name: 'cartorio', label: 'Cartório', type: 'text', required: true, isSystem: false })
  })

  it('omite defaultValue/options quando ausentes', () => {
    const body = toCreateBody({ key: 'x', label: 'X', type: 'NUMBER' } as never)
    expect('defaultValue' in body).toBe(false)
    expect('options' in body).toBe(false)
  })
})

describe('imovelField toUpdateBody (front -> PUT strict)', () => {
  it('só inclui campos presentes, mapeia key->name e type minúsculo, SEM isSystem', () => {
    const body = toUpdateBody({ key: 'novo', type: 'CURRENCY' })
    expect(body).toEqual({ name: 'novo', type: 'currency' })
    expect('isSystem' in body).toBe(false)
    expect('label' in body).toBe(false)
  })

  it('objeto vazio quando nada muda', () => {
    expect(toUpdateBody({})).toEqual({})
  })
})
