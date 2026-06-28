/**
 * Testes para os schemas de patrimônio e imóvel (@sispat/shared) — Sprint 22.
 *
 * Foco nas propriedades que NÃO podem regredir:
 *  - .passthrough() nos schemas de BODY do backend: o `zodValidate` substitui
 *    req.body pelo objeto parseado e o service lê campos extras (sectorId,
 *    localId, tipoId, acquisitionFormId, customFields, url_documentos). Sem
 *    passthrough esses campos seriam descartados → bug silencioso de dados.
 *  - Regras de negócio mais estritas no FRONTEND (valor > 0; kit >= 2 unidades;
 *    endereço de imóvel >= 5 chars) preservadas da migração.
 *  - fotos aceitam string OU objeto { file_url } | { url }.
 */

import {
  createPatrimonioBodySchema,
  updatePatrimonioBodySchema,
  patrimonioCreateSchema,
  addNoteSchema,
  registrarBaixaSchema,
  createImovelBodySchema,
  updateImovelBodySchema,
  imovelFrontendSchema,
} from '@sispat/shared';

describe('patrimonio — schema de body do backend (Sprint 22)', () => {
  const validCreate = {
    numero_patrimonio: 'PAT-001',
    descricao_bem: 'Mesa de escritório',
    tipo: 'Mobiliário',
    forma_aquisicao: 'Compra',
    data_aquisicao: '2024-01-15T00:00:00.000Z',
    valor_aquisicao: 100,
    setor_responsavel: 'Administração',
    local_objeto: 'Sala 1',
  };

  it('PRESERVA campos extras (sectorId/localId/tipoId/acquisitionFormId) via passthrough', () => {
    const parsed = createPatrimonioBodySchema.parse({
      ...validCreate,
      sectorId: '11111111-1111-1111-1111-111111111111',
      localId: '22222222-2222-2222-2222-222222222222',
      tipoId: '33333333-3333-3333-3333-333333333333',
      acquisitionFormId: '44444444-4444-4444-4444-444444444444',
    });
    expect(parsed.sectorId).toBe('11111111-1111-1111-1111-111111111111');
    expect(parsed.localId).toBe('22222222-2222-2222-2222-222222222222');
    expect(parsed.tipoId).toBe('33333333-3333-3333-3333-333333333333');
    expect(parsed.acquisitionFormId).toBe('44444444-4444-4444-4444-444444444444');
  });

  it('aceita valor_aquisicao = 0 no backend (bens de valor simbólico/doados)', () => {
    expect(() =>
      createPatrimonioBodySchema.parse({ ...validCreate, valor_aquisicao: 0 }),
    ).not.toThrow();
  });

  it('rejeita numero_patrimonio com caracteres inválidos', () => {
    const r = createPatrimonioBodySchema.safeParse({ ...validCreate, numero_patrimonio: 'PAT 001!' });
    expect(r.success).toBe(false);
  });

  it('update também preserva campos extras via passthrough', () => {
    const parsed = updatePatrimonioBodySchema.parse({
      descricao_bem: 'Atualizada',
      sectorId: '55555555-5555-5555-5555-555555555555',
    });
    expect((parsed as Record<string, unknown>).sectorId).toBe(
      '55555555-5555-5555-5555-555555555555',
    );
  });

  it('fotos aceitam string OU objeto { file_url } / { url }', () => {
    const parsed = createPatrimonioBodySchema.parse({
      ...validCreate,
      fotos: ['https://x/a.jpg', { file_url: 'https://x/b.jpg' }, { url: 'https://x/c.jpg' }],
    });
    expect(parsed.fotos).toHaveLength(3);
    const bad = createPatrimonioBodySchema.safeParse({ ...validCreate, fotos: [{ nope: 1 }] });
    expect(bad.success).toBe(false);
  });
});

describe('patrimonio — schema de formulário do frontend (regras estritas preservadas)', () => {
  const base = {
    descricao_bem: 'Mesa',
    tipo: 'Mobiliário',
    forma_aquisicao: 'Compra',
    data_aquisicao: '2024-01-15T00:00:00.000Z',
    valor_aquisicao: 100,
    setor_responsavel: 'Administração',
    local_objeto: 'Sala 1',
  };

  it('rejeita valor_aquisicao = 0 no frontend (deve ser > 0)', () => {
    const r = patrimonioCreateSchema.safeParse({ ...base, valor_aquisicao: 0 });
    expect(r.success).toBe(false);
  });

  it('rejeita kit com quantidade_unidades = 1 (mínimo 2)', () => {
    const r = patrimonioCreateSchema.safeParse({ ...base, quantidade_unidades: 1 });
    expect(r.success).toBe(false);
    const ok = patrimonioCreateSchema.safeParse({ ...base, quantidade_unidades: 2 });
    expect(ok.success).toBe(true);
  });
});

describe('patrimonio — sub-rotas notes e baixa (Sprint 22)', () => {
  it('addNote exige text de 1 a 2000 caracteres', () => {
    expect(addNoteSchema.safeParse({ text: 'ok' }).success).toBe(true);
    expect(addNoteSchema.safeParse({ text: '' }).success).toBe(false);
    expect(addNoteSchema.safeParse({ text: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('baixa: data_baixa/motivo_baixa são opcionais no schema (controller exige)', () => {
    // o schema aceita vazio; a obrigatoriedade é checada no controller
    expect(registrarBaixaSchema.safeParse({}).success).toBe(true);
  });

  it('baixa: valida data inválida e tamanho do motivo, e PRESERVA observacoes', () => {
    expect(
      registrarBaixaSchema.safeParse({ data_baixa: 'nao-e-data' }).success,
    ).toBe(false);
    expect(
      registrarBaixaSchema.safeParse({ motivo_baixa: 'x'.repeat(501) }).success,
    ).toBe(false);
    const parsed = registrarBaixaSchema.parse({
      data_baixa: '2024-02-01T00:00:00.000Z',
      motivo_baixa: 'Obsoleto',
      documentos_baixa: ['https://x/doc.pdf'],
      observacoes: 'Sucateado',
    });
    expect(parsed.observacoes).toBe('Sucateado');
    expect(parsed.documentos_baixa).toEqual(['https://x/doc.pdf']);
  });
});

describe('imovel — schemas (Sprint 22)', () => {
  const validBackendCreate = {
    numero_patrimonio: 'IM-001',
    denominacao: 'Prédio da Prefeitura',
    endereco: 'Rua Principal, 100',
    data_aquisicao: '2024-01-15T00:00:00.000Z',
    valor_aquisicao: 50000,
  };

  it('backend create PRESERVA campos extras (sectorId/customFields/url_documentos) via passthrough', () => {
    const parsed = createImovelBodySchema.parse({
      ...validBackendCreate,
      sectorId: '11111111-1111-1111-1111-111111111111',
      url_documentos: 'https://drive.google.com/x',
      customFields: { matricula: '123' },
    });
    const obj = parsed as Record<string, unknown>;
    expect(obj.sectorId).toBe('11111111-1111-1111-1111-111111111111');
    expect(obj.url_documentos).toBe('https://drive.google.com/x');
    expect(obj.customFields).toEqual({ matricula: '123' });
  });

  it('backend update preserva campos extras via passthrough', () => {
    const parsed = updateImovelBodySchema.parse({
      denominacao: 'Novo nome',
      customFields: { x: 1 },
    });
    expect((parsed as Record<string, unknown>).customFields).toEqual({ x: 1 });
  });

  it('frontend exige endereço com no mínimo 5 caracteres', () => {
    const bad = imovelFrontendSchema.safeParse({
      numero_patrimonio: 'IM-001',
      denominacao: 'Prédio',
      endereco: 'Rua',
      cidade: 'São Paulo',
      estado: 'SP',
      data_aquisicao: '2024-01-15T00:00:00.000Z',
      valor_aquisicao: 50000,
    });
    expect(bad.success).toBe(false);
  });

  it('backend create aceita endereço estruturado (cep/bairro/cidade/estado)', () => {
    const ok = createImovelBodySchema.safeParse({
      ...validBackendCreate,
      cep: '68820-000',
      bairro: 'Centro',
      cidade: 'São Sebastião da Boa Vista',
      estado: 'PA',
    });
    expect(ok.success).toBe(true);
  });

  it('backend create rejeita UF inválida (3+ letras)', () => {
    const bad = createImovelBodySchema.safeParse({ ...validBackendCreate, estado: 'PARA' });
    expect(bad.success).toBe(false);
  });

  it('backend update aceita endereço estruturado parcial', () => {
    const ok = updateImovelBodySchema.safeParse({ bairro: 'Vila Nova', estado: 'pa' });
    expect(ok.success).toBe(true);
  });

  it('backend create aceita tipo_posse válido e rejeita inválido (Art. 13 §3)', () => {
    const ok = createImovelBodySchema.safeParse({ ...validBackendCreate, tipo_posse: 'cessao' });
    expect(ok.success).toBe(true);
    const bad = createImovelBodySchema.safeParse({ ...validBackendCreate, tipo_posse: 'invalido' });
    expect(bad.success).toBe(false);
  });

  it('frontend default de tipo_posse é proprio', () => {
    const parsed = imovelFrontendSchema.parse({
      numero_patrimonio: 'IM-001',
      denominacao: 'Prédio',
      endereco: 'Rua Principal, 100',
      cidade: 'São Paulo',
      estado: 'SP',
      data_aquisicao: '2024-01-15T00:00:00.000Z',
      valor_aquisicao: 50000,
    });
    expect((parsed as Record<string, unknown>).tipo_posse).toBe('proprio');
  });
});
