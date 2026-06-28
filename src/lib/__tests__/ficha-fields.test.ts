import { describe, it, expect } from 'vitest'
import {
  FICHA_FIELDS_BY_TYPE,
  FICHA_DEFAULT_FIELDS_BY_TYPE,
  FICHA_SECTION_META_BY_TYPE,
  FICHA_SECTION_KEYS,
  type FichaType,
} from '../ficha-fields'

const TYPES: FichaType[] = ['bens', 'imoveis']

describe('ficha-fields', () => {
  // Guarda contra o bug em que um default usava chave inexistente (ex.: 'vida_util'
  // em vez de 'vida_util_anos') e o campo era descartado silenciosamente.
  it('todo campo default existe nos campos disponíveis do tipo/seção', () => {
    for (const type of TYPES) {
      for (const section of FICHA_SECTION_KEYS) {
        const available = new Set(
          FICHA_FIELDS_BY_TYPE[type][section].map((f) => f.value),
        )
        for (const key of FICHA_DEFAULT_FIELDS_BY_TYPE[type][section]) {
          expect(
            available.has(key),
            `default "${key}" (${type}/${section}) não está em FICHA_FIELDS_BY_TYPE`,
          ).toBe(true)
        }
      }
    }
  })

  it('não há valores de campo duplicados dentro de uma seção', () => {
    for (const type of TYPES) {
      for (const section of FICHA_SECTION_KEYS) {
        const values = FICHA_FIELDS_BY_TYPE[type][section].map((f) => f.value)
        expect(new Set(values).size).toBe(values.length)
      }
    }
  })

  it('cada tipo define as 4 seções com título e descrição', () => {
    for (const type of TYPES) {
      for (const section of FICHA_SECTION_KEYS) {
        const meta = FICHA_SECTION_META_BY_TYPE[type][section]
        expect(meta.title.length).toBeGreaterThan(0)
        expect(meta.description.length).toBeGreaterThan(0)
        expect(FICHA_FIELDS_BY_TYPE[type][section].length).toBeGreaterThan(0)
      }
    }
  })
})
