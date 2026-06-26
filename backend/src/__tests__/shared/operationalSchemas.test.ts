/**
 * Testes para os schemas operacionais (@sispat/shared) — Sprint 21.
 *
 * Cobre os 9 domínios: inventario, transfer, manutencao, notification,
 * customization, document, labelTemplate, formaAquisicao, emprestimo.
 * Foco em pontos onde o Zod traz ganho real vs o express-validator:
 * enums tipados, coerce numérico, strict mode.
 */

import {
  // inventario
  createInventarioSchema,
  updateInventarioSchema,
  inventarioScopeSchema,
  inventarioStatusSchema,
  // transfer
  createTransferSchema,
  approveTransferSchema,
  rejectTransferSchema,
  // manutencao
  createManutencaoSchema,
  updateManutencaoSchema,
  manutencaoTipoSchema,
  manutencaoPrioridadeSchema,
  manutencaoStatusSchema,
  // notification
  createNotificationSchema,
  // customization
  saveCustomizationSchema,
  // document
  createDocumentSchema,
  updateDocumentSchema,
  // labelTemplate
  createLabelTemplateSchema,
  updateLabelTemplateSchema,
  labelUnitSchema,
  // formaAquisicao
  createFormaAquisicaoSchema,
  updateFormaAquisicaoSchema,
  // emprestimo
  createEmprestimoSchema,
  devolverEmprestimoSchema,
  // auditLog
  createAuditLogSchema,
} from '@sispat/shared';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('@sispat/shared — inventario', () => {
  it('createInventarioSchema exige title + setor', () => {
    expect(createInventarioSchema.safeParse({}).success).toBe(false);
    expect(createInventarioSchema.safeParse({ title: 'X' }).success).toBe(false);
    expect(createInventarioSchema.safeParse({ title: 'X', setor: 'TI' }).success).toBe(true);
  });

  it('inventarioScopeSchema aceita 3 valores', () => {
    ['sector', 'location', 'specific_location'].forEach((v) => {
      expect(inventarioScopeSchema.safeParse(v).success).toBe(true);
    });
    expect(inventarioScopeSchema.safeParse('outro').success).toBe(false);
  });

  it('updateInventarioSchema rejeita campo extra (strict)', () => {
    expect(updateInventarioSchema.safeParse({ title: 'X', foo: 1 }).success).toBe(false);
  });

  it('inventarioStatusSchema aceita os 3 status', () => {
    ['em_andamento', 'concluido', 'cancelado'].forEach((v) => {
      expect(inventarioStatusSchema.safeParse(v).success).toBe(true);
    });
  });
});

describe('@sispat/shared — transfer', () => {
  const base = {
    patrimonioId: validUuid,
    setorOrigem: 'TI',
    setorDestino: 'RH',
    motivo: 'Reorg',
    dataTransferencia: '2026-05-15',
  };

  it('createTransferSchema exige patrimonioId UUID + setores + motivo + data', () => {
    expect(createTransferSchema.safeParse(base).success).toBe(true);
  });

  it('rejeita patrimonioId não-UUID', () => {
    expect(createTransferSchema.safeParse({ ...base, patrimonioId: 'abc' }).success).toBe(false);
  });

  it('rejeita data inválida', () => {
    expect(createTransferSchema.safeParse({ ...base, dataTransferencia: 'ontem' }).success).toBe(
      false,
    );
  });

  it('approveTransferSchema aceita body vazio (observacoes opcional)', () => {
    expect(approveTransferSchema.safeParse({}).success).toBe(true);
  });

  it('rejectTransferSchema strict rejeita campo extra', () => {
    expect(rejectTransferSchema.safeParse({ motivo: 'x', extra: 1 }).success).toBe(false);
  });
});

describe('@sispat/shared — manutencao', () => {
  const base = {
    tipo: 'corretiva',
    titulo: 'Trocar lâmpada',
    descricao: 'Lâmpada da sala 2 queimada.',
    prioridade: 'media',
    dataPrevista: '2026-05-20',
  };

  it('createManutencaoSchema sem patrimonio nem imovel é aceito pelo schema (controller faz XOR)', () => {
    expect(createManutencaoSchema.safeParse(base).success).toBe(true);
  });

  it('aceita patrimonioId UUID', () => {
    expect(createManutencaoSchema.safeParse({ ...base, patrimonioId: validUuid }).success).toBe(
      true,
    );
  });

  it('manutencaoTipoSchema rejeita outro valor', () => {
    expect(manutencaoTipoSchema.safeParse('expressa').success).toBe(false);
  });

  it('manutencaoPrioridadeSchema aceita 4 valores', () => {
    ['baixa', 'media', 'alta', 'urgente'].forEach((v) => {
      expect(manutencaoPrioridadeSchema.safeParse(v).success).toBe(true);
    });
  });

  it('manutencaoStatusSchema aceita 4 valores', () => {
    ['pendente', 'em_andamento', 'concluida', 'cancelada'].forEach((v) => {
      expect(manutencaoStatusSchema.safeParse(v).success).toBe(true);
    });
  });

  it('custo coerce string→número', () => {
    const r = createManutencaoSchema.safeParse({
      ...base,
      custo: '123.45' as unknown as number,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.custo).toBe(123.45);
  });

  it('custo negativo rejeitado', () => {
    expect(createManutencaoSchema.safeParse({ ...base, custo: -1 }).success).toBe(false);
  });

  it('updateManutencaoSchema strict', () => {
    expect(updateManutencaoSchema.safeParse({ titulo: 'X', foo: 1 }).success).toBe(false);
  });
});

describe('@sispat/shared — notification', () => {
  it('exige tipo + titulo + mensagem', () => {
    expect(createNotificationSchema.safeParse({}).success).toBe(false);
    expect(
      createNotificationSchema.safeParse({
        tipo: 'INFO',
        titulo: 'Alerta',
        mensagem: 'Algo aconteceu',
      }).success,
    ).toBe(true);
  });

  it('userId opcional mas UUID quando presente', () => {
    expect(
      createNotificationSchema.safeParse({
        tipo: 'X',
        titulo: 'X',
        mensagem: 'X',
        userId: 'abc',
      }).success,
    ).toBe(false);
  });
});

describe('@sispat/shared — customization', () => {
  it('aceita payload vazio (tudo opcional)', () => {
    expect(saveCustomizationSchema.safeParse({}).success).toBe(true);
  });

  it('backgroundType enum', () => {
    expect(saveCustomizationSchema.safeParse({ backgroundType: 'invalido' }).success).toBe(false);
    expect(saveCustomizationSchema.safeParse({ backgroundType: 'image' }).success).toBe(true);
  });

  it('videoLoop coerce string→bool', () => {
    const r = saveCustomizationSchema.safeParse({ videoLoop: 'true' as unknown as boolean });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.videoLoop).toBe(true);
  });
});

describe('@sispat/shared — document', () => {
  it('createDocumentSchema aceita publico como string ("true")', () => {
    const r = createDocumentSchema.safeParse({ publico: 'true' as unknown as boolean });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.publico).toBe(true);
  });

  it('updateDocumentSchema strict', () => {
    expect(updateDocumentSchema.safeParse({ titulo: 'X', foo: 1 }).success).toBe(false);
  });
});

describe('@sispat/shared — labelTemplate', () => {
  // Campos em inglês (name/width/height/elements) — casam com Prisma + controller.
  const baseTemplate = { name: 'Etq 100x50', width: 100, height: 50, elements: [] };

  it('createLabelTemplateSchema exige name/width/height/elements', () => {
    expect(createLabelTemplateSchema.safeParse({}).success).toBe(false);
    // só o name não basta — width/height/elements são obrigatórios.
    expect(createLabelTemplateSchema.safeParse({ name: 'Etq 100x50' }).success).toBe(false);
    expect(createLabelTemplateSchema.safeParse(baseTemplate).success).toBe(true);
  });

  it('width positivo inteiro via coerce', () => {
    expect(createLabelTemplateSchema.safeParse({ ...baseTemplate, width: 0 }).success).toBe(false);
    expect(createLabelTemplateSchema.safeParse({ ...baseTemplate, width: 100 }).success).toBe(true);
    const r = createLabelTemplateSchema.safeParse({
      ...baseTemplate,
      width: '100' as unknown as number,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.width).toBe(100);
  });

  it('labelUnitSchema aceita mm/cm/in', () => {
    ['mm', 'cm', 'in'].forEach((u) => {
      expect(labelUnitSchema.safeParse(u).success).toBe(true);
    });
    expect(labelUnitSchema.safeParse('m').success).toBe(false);
  });

  it('updateLabelTemplateSchema strict', () => {
    expect(updateLabelTemplateSchema.safeParse({ name: 'X', foo: 1 }).success).toBe(false);
  });
});

describe('@sispat/shared — formaAquisicao', () => {
  it('createFormaAquisicaoSchema exige nome', () => {
    expect(createFormaAquisicaoSchema.safeParse({}).success).toBe(false);
    expect(createFormaAquisicaoSchema.safeParse({ nome: 'Compra Direta' }).success).toBe(true);
  });

  it('updateFormaAquisicaoSchema strict', () => {
    expect(updateFormaAquisicaoSchema.safeParse({ nome: 'X', foo: 1 }).success).toBe(false);
  });
});

describe('@sispat/shared — emprestimo', () => {
  const base = {
    patrimonioId: validUuid,
    responsavel: 'Maria',
    dataEmprestimo: '2026-05-12',
  };

  it('createEmprestimoSchema exige patrimonioId + responsavel + dataEmprestimo', () => {
    expect(createEmprestimoSchema.safeParse(base).success).toBe(true);
  });

  it('rejeita patrimonioId não-UUID', () => {
    expect(createEmprestimoSchema.safeParse({ ...base, patrimonioId: 'abc' }).success).toBe(false);
  });

  it('rejeita data inválida', () => {
    expect(
      createEmprestimoSchema.safeParse({ ...base, dataEmprestimo: 'ontem' }).success,
    ).toBe(false);
  });

  it('devolverEmprestimoSchema strict, body vazio aceito', () => {
    expect(devolverEmprestimoSchema.safeParse({}).success).toBe(true);
    expect(devolverEmprestimoSchema.safeParse({ foo: 1 }).success).toBe(false);
  });
});

describe('@sispat/shared — auditLog', () => {
  it('createAuditLogSchema exige action', () => {
    expect(createAuditLogSchema.safeParse({}).success).toBe(false);
    expect(createAuditLogSchema.safeParse({ action: '' }).success).toBe(false);
    expect(createAuditLogSchema.safeParse({ action: 'LOGIN' }).success).toBe(true);
  });

  it('aceita campos opcionais (entityType, entityId, details)', () => {
    const r = createAuditLogSchema.safeParse({
      action: 'UPDATE_PATRIMONIO',
      entityType: 'patrimonio',
      entityId: validUuid,
      details: { campo: 'valor', antes: 1, depois: 2 },
    });
    expect(r.success).toBe(true);
  });

  it('strict: rejeita campos extras (anti mass-assignment, ex.: userId/municipalityId forjados)', () => {
    expect(
      createAuditLogSchema.safeParse({ action: 'LOGIN', userId: 'forjado' }).success,
    ).toBe(false);
    expect(
      createAuditLogSchema.safeParse({ action: 'LOGIN', municipalityId: 'outro-tenant' })
        .success,
    ).toBe(false);
    expect(
      createAuditLogSchema.safeParse({ action: 'LOGIN', ipAddress: '1.2.3.4' }).success,
    ).toBe(false);
  });

  it('details deve ser objeto, não string/array soltos', () => {
    expect(
      createAuditLogSchema.safeParse({ action: 'X', details: 'texto' }).success,
    ).toBe(false);
    expect(
      createAuditLogSchema.safeParse({ action: 'X', details: [1, 2] }).success,
    ).toBe(false);
  });

  it('action rejeita string acima de 100 chars', () => {
    expect(
      createAuditLogSchema.safeParse({ action: 'a'.repeat(101) }).success,
    ).toBe(false);
  });
});
