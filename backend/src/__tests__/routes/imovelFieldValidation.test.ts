/**
 * Testes de validação das rotas de ImovelCustomField (achado 20/40).
 *
 * Contexto: as rotas mutantes (POST '/', PUT '/:id', PUT '/reorder') passaram
 * a ter `zodValidate` aplicado no nível da rota — antes só havia authorize().
 *
 * Cobertura:
 *   - createImovelFieldSchema rejeita body sem campos obrigatórios e com type
 *     inválido, e aceita body válido preservando campos opcionais.
 *   - updateImovelFieldSchema (strict) aceita body parcial e rejeita campo
 *     desconhecido (proteção contra mass-assignment, ex.: municipalityId).
 *   - reorderImovelFieldsSchema exige array fieldOrders com {id UUID, displayOrder}.
 *   - uuidParamSchema rejeita id que não é UUID (params).
 */

import {
  createImovelFieldSchema,
  updateImovelFieldSchema,
  reorderImovelFieldsSchema,
  uuidParamSchema,
} from '@sispat/shared';

describe('ImovelCustomField — validação de rotas mutantes', () => {
  it('createImovelFieldSchema rejeita body vazio', () => {
    expect(createImovelFieldSchema.safeParse({}).success).toBe(false);
  });

  it('createImovelFieldSchema rejeita type inválido', () => {
    const result = createImovelFieldSchema.safeParse({
      name: 'area_total',
      label: 'Área total',
      type: 'invalido',
    });
    expect(result.success).toBe(false);
  });

  it('createImovelFieldSchema aceita body válido', () => {
    const result = createImovelFieldSchema.safeParse({
      name: 'area_total',
      label: 'Área total',
      type: 'number',
      required: true,
      displayOrder: 3,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('area_total');
      expect(result.data.type).toBe('number');
    }
  });

  it('updateImovelFieldSchema (partial) aceita body parcial', () => {
    const result = updateImovelFieldSchema.safeParse({ label: 'Novo rótulo' });
    expect(result.success).toBe(true);
  });

  it('updateImovelFieldSchema rejeita campo desconhecido (anti mass-assignment)', () => {
    const result = updateImovelFieldSchema.safeParse({
      label: 'Novo rótulo',
      municipalityId: '2',
    });
    expect(result.success).toBe(false);
  });

  it('reorderImovelFieldsSchema rejeita fieldOrders ausente', () => {
    expect(reorderImovelFieldsSchema.safeParse({}).success).toBe(false);
  });

  it('reorderImovelFieldsSchema rejeita id não-UUID em fieldOrders', () => {
    const result = reorderImovelFieldsSchema.safeParse({
      fieldOrders: [{ id: 'abc', displayOrder: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('reorderImovelFieldsSchema aceita fieldOrders válido', () => {
    const result = reorderImovelFieldsSchema.safeParse({
      fieldOrders: [
        { id: '11111111-1111-1111-1111-111111111111', displayOrder: 0 },
        { id: '22222222-2222-2222-2222-222222222222', displayOrder: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('uuidParamSchema rejeita id que não é UUID', () => {
    expect(uuidParamSchema.safeParse({ id: 'reorder' }).success).toBe(false);
  });

  it('uuidParamSchema aceita UUID válido', () => {
    expect(
      uuidParamSchema.safeParse({ id: '11111111-1111-1111-1111-111111111111' })
        .success,
    ).toBe(true);
  });
});
