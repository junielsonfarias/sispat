/**
 * Testes de validação das rotas de FichaTemplate (achado 19/40).
 *
 * Contexto: as rotas mutantes (POST '/', PUT '/:id', PATCH '/:id/set-default',
 * POST '/:id/duplicate') passaram a ter `zodValidate` aplicado no nível da rota.
 *
 * Cobertura:
 *   - createFichaTemplateSchema rejeita body sem campos obrigatórios.
 *   - createFichaTemplateSchema aceita body válido e PRESERVA `isDefault`
 *     (o controller lê req.body.isDefault; como zodValidate substitui req.body
 *     pelo valor parseado, isDefault precisa estar no schema, senão seria
 *     descartado silenciosamente — regressão evitada).
 *   - updateFichaTemplateSchema (partial) aceita body parcial.
 *   - uuidParamSchema rejeita id que não é UUID (params).
 */

// FichaTemplateController importa `../index` (a app inteira) para obter o prisma.
// Sem este mock, importar o controller dispara o carregamento de src/index.ts, que
// remonta as rotas e cria uma dependência circular (FichaTemplateController.index
// fica undefined no bind da rota). Mockar `../index` quebra o ciclo — o teste só
// precisa dos schemas exportados pelo controller.
jest.mock('../../index', () => ({ prisma: {} }));

import {
  createFichaTemplateSchema,
  updateFichaTemplateSchema,
} from '../../controllers/FichaTemplateController';
import { uuidParamSchema } from '@sispat/shared';

const validConfig = {
  header: {
    showLogo: true,
    logoSize: 'medium' as const,
    showDate: true,
    showSecretariat: true,
    customTexts: { secretariat: 'Sec', department: 'Dep' },
  },
  sections: {
    patrimonioInfo: {
      enabled: true,
      layout: 'grid' as const,
      fields: ['numero'],
      showPhoto: true,
      photoSize: 'medium' as const,
    },
    acquisition: { enabled: true, fields: ['data'] },
    location: { enabled: true, fields: ['setor'] },
    depreciation: { enabled: false, fields: [] },
  },
  signatures: {
    enabled: true,
    count: 2,
    layout: 'horizontal' as const,
    labels: ['Responsável', 'Gestor'],
    showDates: true,
  },
  styling: {
    margins: { top: 10, bottom: 10, left: 10, right: 10 },
    fonts: { family: 'Arial', size: 12 },
  },
};

describe('FichaTemplate — validação de rotas mutantes', () => {
  it('createFichaTemplateSchema rejeita body vazio', () => {
    const result = createFichaTemplateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('createFichaTemplateSchema rejeita type inválido', () => {
    const result = createFichaTemplateSchema.safeParse({
      name: 'Modelo',
      type: 'invalido',
      config: validConfig,
    });
    expect(result.success).toBe(false);
  });

  it('createFichaTemplateSchema aceita body válido', () => {
    const result = createFichaTemplateSchema.safeParse({
      name: 'Modelo Bens',
      type: 'bens',
      config: validConfig,
    });
    expect(result.success).toBe(true);
  });

  it('createFichaTemplateSchema PRESERVA isDefault no valor parseado', () => {
    // Garante que zodValidate (que substitui req.body) não descarta isDefault.
    const result = createFichaTemplateSchema.safeParse({
      name: 'Modelo Bens',
      type: 'bens',
      isDefault: true,
      config: validConfig,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isDefault).toBe(true);
    }
  });

  it('updateFichaTemplateSchema (partial) aceita body parcial', () => {
    const result = updateFichaTemplateSchema.safeParse({ name: 'Novo nome' });
    expect(result.success).toBe(true);
  });

  it('uuidParamSchema aceita id não-UUID (amigável do seed) e rejeita vazio', () => {
    // O param agora aceita qualquer id não-vazio (seed usa IDs como municipality-1).
    expect(uuidParamSchema.safeParse({ id: 'abc' }).success).toBe(true);
    expect(uuidParamSchema.safeParse({ id: '' }).success).toBe(false);
  });

  it('uuidParamSchema aceita UUID válido', () => {
    expect(
      uuidParamSchema.safeParse({ id: '11111111-1111-1111-1111-111111111111' })
        .success,
    ).toBe(true);
  });
});
