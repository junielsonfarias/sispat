/**
 * Testes para os schemas Zod compartilhados (@sispat/shared) — Sprint 20.
 *
 * Cobre: common (UUID/pagination), user, sector, local, tipoBem.
 * Os schemas de auth já têm cobertura em `middlewares/zodValidate.test.ts`.
 */

import {
  // common
  uuidParamSchema,
  paginationQuerySchema,
  // user
  createUserSchema,
  updateUserSchema,
  userRoleSchema,
  // sector
  createSectorSchema,
  updateSectorSchema,
  // local
  createLocalSchema,
  updateLocalSchema,
  // tipoBem
  createTipoBemSchema,
  updateTipoBemSchema,
} from '@sispat/shared';

describe('@sispat/shared — common', () => {
  describe('uuidParamSchema', () => {
    it('aceita UUID v4', () => {
      const r = uuidParamSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' });
      expect(r.success).toBe(true);
    });

    it('aceita id não-vazio (UUID ou amigável do seed) e rejeita vazio', () => {
      // Param :id aceita qualquer string não-vazia (seed usa IDs como municipality-1).
      expect(uuidParamSchema.safeParse({ id: 'abc' }).success).toBe(true);
      expect(uuidParamSchema.safeParse({ id: '' }).success).toBe(false);
    });
  });

  describe('paginationQuerySchema', () => {
    it('aceita query vazia (todos opcionais)', () => {
      expect(paginationQuerySchema.safeParse({}).success).toBe(true);
    });

    it('coerce page/limit de string para número', () => {
      const r = paginationQuerySchema.safeParse({ page: '3', limit: '50' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.page).toBe(3);
        expect(r.data.limit).toBe(50);
      }
    });

    it('clampa limit em 100', () => {
      expect(paginationQuerySchema.safeParse({ limit: '200' }).success).toBe(false);
    });

    it('rejeita page negativo', () => {
      expect(paginationQuerySchema.safeParse({ page: '-1' }).success).toBe(false);
    });

    it('aceita sortOrder asc|desc', () => {
      expect(paginationQuerySchema.safeParse({ sortOrder: 'asc' }).success).toBe(true);
      expect(paginationQuerySchema.safeParse({ sortOrder: 'foo' }).success).toBe(false);
    });
  });
});

describe('@sispat/shared — user', () => {
  describe('userRoleSchema', () => {
    it('aceita os 5 papéis válidos', () => {
      ['superuser', 'admin', 'supervisor', 'usuario', 'visualizador'].forEach((r) => {
        expect(userRoleSchema.safeParse(r).success).toBe(true);
      });
    });

    it('rejeita papel desconhecido', () => {
      expect(userRoleSchema.safeParse('root').success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    const valid = {
      name: 'João da Silva',
      email: 'joao@x.gov',
      password: 'Abcd1234!XyZ',
      role: 'usuario',
    };

    it('aceita payload válido', () => {
      expect(createUserSchema.safeParse(valid).success).toBe(true);
    });

    it('exige nome ≥ 2 chars', () => {
      expect(createUserSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
    });

    it('rejeita nome com dígitos', () => {
      expect(createUserSchema.safeParse({ ...valid, name: 'João123' }).success).toBe(false);
    });

    it('rejeita senha que passava na regra antiga (8 chars)', () => {
      expect(createUserSchema.safeParse({ ...valid, password: 'Abcd123!' }).success).toBe(false);
    });

    it('aceita senha forte (12+ com símbolo)', () => {
      expect(createUserSchema.safeParse({ ...valid, password: 'Abcd1234!XyZ' }).success).toBe(true);
    });

    it('responsibleSectors opcional', () => {
      const r = createUserSchema.safeParse({ ...valid, responsibleSectors: ['TI', 'RH'] });
      expect(r.success).toBe(true);
    });
  });

  describe('updateUserSchema', () => {
    it('aceita update parcial', () => {
      expect(updateUserSchema.safeParse({ name: 'Novo Nome' }).success).toBe(true);
    });

    it('rejeita campos extras (strict)', () => {
      const r = updateUserSchema.safeParse({ password: 'Abcd1234!XyZ' });
      expect(r.success).toBe(false);
    });

    it('isActive bool aceito', () => {
      expect(updateUserSchema.safeParse({ isActive: false }).success).toBe(true);
    });
  });
});

describe('@sispat/shared — sector', () => {
  describe('createSectorSchema', () => {
    it('aceita name obrigatório, codigo opcional', () => {
      expect(createSectorSchema.safeParse({ name: 'TI' }).success).toBe(true);
    });

    it('exige codigo uppercase', () => {
      expect(createSectorSchema.safeParse({ name: 'TI', codigo: 'ti-01' }).success).toBe(false);
      expect(createSectorSchema.safeParse({ name: 'TI', codigo: 'TI-01' }).success).toBe(true);
    });

    it('parentId UUID quando presente', () => {
      expect(createSectorSchema.safeParse({ name: 'TI', parentId: 'xxx' }).success).toBe(false);
      expect(
        createSectorSchema.safeParse({
          name: 'TI',
          parentId: '550e8400-e29b-41d4-a716-446655440000',
        }).success,
      ).toBe(true);
    });
  });

  describe('updateSectorSchema (strict)', () => {
    it('rejeita campos desconhecidos', () => {
      expect(updateSectorSchema.safeParse({ name: 'X', foo: 1 }).success).toBe(false);
    });
  });
});

describe('@sispat/shared — local', () => {
  it('createLocalSchema exige sectorId UUID', () => {
    expect(createLocalSchema.safeParse({ name: 'Sala 1' }).success).toBe(false);
    expect(
      createLocalSchema.safeParse({
        name: 'Sala 1',
        sectorId: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true);
  });

  it('updateLocalSchema permite mudar sectorId (opcional)', () => {
    expect(updateLocalSchema.safeParse({ name: 'Sala Nova' }).success).toBe(true);
  });
});

describe('@sispat/shared — tipoBem', () => {
  it('createTipoBemSchema aceita campos opcionais', () => {
    expect(createTipoBemSchema.safeParse({ nome: 'Mobiliário' }).success).toBe(true);
  });

  it('vidaUtilPadrao deve ser inteiro 1-100', () => {
    expect(createTipoBemSchema.safeParse({ nome: 'X', vidaUtilPadrao: 0 }).success).toBe(false);
    expect(createTipoBemSchema.safeParse({ nome: 'X', vidaUtilPadrao: 101 }).success).toBe(false);
    expect(createTipoBemSchema.safeParse({ nome: 'X', vidaUtilPadrao: 10 }).success).toBe(true);
  });

  it('taxaDepreciacao 0-100', () => {
    expect(createTipoBemSchema.safeParse({ nome: 'X', taxaDepreciacao: -1 }).success).toBe(false);
    expect(createTipoBemSchema.safeParse({ nome: 'X', taxaDepreciacao: 100.5 }).success).toBe(
      false,
    );
    expect(createTipoBemSchema.safeParse({ nome: 'X', taxaDepreciacao: 12.5 }).success).toBe(
      true,
    );
  });

  it('coerce numérico (vem como string da query)', () => {
    const r = createTipoBemSchema.safeParse({
      nome: 'X',
      vidaUtilPadrao: '20' as unknown as number,
      taxaDepreciacao: '5.5' as unknown as number,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.vidaUtilPadrao).toBe(20);
      expect(r.data.taxaDepreciacao).toBe(5.5);
    }
  });
});
