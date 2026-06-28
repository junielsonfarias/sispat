import { describe, it, expect } from 'vitest'
import {
  FICHA_FIELDS_BY_TYPE,
  FICHA_DEFAULT_FIELDS_BY_TYPE,
  FICHA_SECTION_META_BY_TYPE,
  FICHA_SECTION_KEYS,
  resolveSectionFields,
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

  describe('resolveSectionFields (auto-heal)', () => {
    it('mantém os campos válidos selecionados, na ordem', () => {
      expect(
        resolveSectionFields(['situacao', 'denominacao'], 'imoveis', 'patrimonioInfo'),
      ).toEqual(['situacao', 'denominacao'])
    })

    it('descarta campos inválidos e mantém os válidos', () => {
      expect(
        resolveSectionFields(['denominacao', 'descricao_bem', 'cor'], 'imoveis', 'patrimonioInfo'),
      ).toEqual(['denominacao'])
    })

    it('cai nos defaults do tipo quando NENHUM campo é válido (template legado de bem)', () => {
      // Imóvel salvo com campos de bem → usa os defaults de imóvel.
      expect(
        resolveSectionFields(['descricao_bem', 'marca', 'modelo'], 'imoveis', 'patrimonioInfo'),
      ).toEqual(FICHA_DEFAULT_FIELDS_BY_TYPE.imoveis.patrimonioInfo)
    })

    it('cai nos defaults quando o config não traz array (undefined/null/objeto)', () => {
      for (const raw of [undefined, null, {}, 'x'] as unknown[]) {
        expect(resolveSectionFields(raw, 'bens', 'depreciation')).toEqual(
          FICHA_DEFAULT_FIELDS_BY_TYPE.bens.depreciation,
        )
      }
    })

    it('lista vazia também cai nos defaults', () => {
      expect(resolveSectionFields([], 'imoveis', 'location')).toEqual(
        FICHA_DEFAULT_FIELDS_BY_TYPE.imoveis.location,
      )
    })
  })
})
