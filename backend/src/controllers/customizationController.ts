import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logError, logInfo, logWarn, logDebug } from '../config/logger';

/**
 * Campos atualizáveis na customização. Lista whitelist mantida explícita
 * (em vez de `Object.keys(body)`) para evitar mass-assignment de campos
 * internos como `id`, `municipalityId`, `createdAt`, etc.
 */
const ALLOWED_FIELDS = [
  'activeLogoUrl',
  'secondaryLogoUrl',
  'backgroundType',
  'backgroundColor',
  'backgroundImageUrl',
  'backgroundVideoUrl',
  'videoLoop',
  'videoMuted',
  'layout',
  'welcomeTitle',
  'welcomeSubtitle',
  'primaryColor',
  'buttonTextColor',
  'fontFamily',
  'browserTitle',
  'faviconUrl',
  'loginFooterText',
  'systemFooterText',
  'superUserFooterText',
  'prefeituraName',
  'secretariaResponsavel',
  'departamentoResponsavel',
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

const ALLOWED_ROLES_WRITE = ['superuser', 'supervisor', 'admin'] as const;

/**
 * Campos que armazenam URLs e portanto precisam de validação de protocolo.
 * Sem isso, um admin malicioso poderia gravar `javascript:alert(1)` em
 * `activeLogoUrl` e o frontend renderizaria como href/src → XSS estocado.
 *
 * Aceita:
 *  - `http://...` e `https://...` (URLs absolutas válidas)
 *  - `/uploads/...` (caminhos relativos, vindos do /api/upload)
 *  - string vazia (limpar o campo)
 */
const URL_FIELDS = new Set<AllowedField>([
  'activeLogoUrl',
  'secondaryLogoUrl',
  'backgroundImageUrl',
  'backgroundVideoUrl',
  'faviconUrl',
]);

const isSafeUrl = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '') return true; // limpar campo
  if (trimmed.startsWith('/uploads/')) return true; // upload local
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Buscar customização do município (público - para tela de login)
 * GET /api/customization/public
 */
export const getPublicCustomization = async (req: Request, res: Response): Promise<void> => {
  try {
    logDebug('🌐 Buscando customização pública (sem autenticação)');

    const municipality = await prisma.municipality.findFirst({ select: { id: true } });

    if (!municipality) {
      logWarn('❌ Nenhum município encontrado');
      res.status(404).json({ error: 'Município não encontrado' });
      return;
    }

    const customization =
      (await prisma.customization.findUnique({ where: { municipalityId: municipality.id } })) ?? {
        id: 'default',
        municipalityId: municipality.id,
        primaryColor: '#2563eb',
        backgroundColor: '#f1f5f9',
        welcomeTitle: 'Bem-vindo ao SISPAT',
        welcomeSubtitle: 'Sistema de Gestão de Patrimônio',
      };

    logDebug('✅ Customização pública carregada');
    res.json({ customization });
  } catch (error) {
    logError('❌ Erro ao buscar customização pública', error);
    res.status(500).json({ error: 'Erro ao buscar customização' });
  }
};

/**
 * Buscar customização do município (autenticado)
 * GET /api/customization
 */
export const getCustomization = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { municipalityId } = req.user;

    // Cria com defaults na primeira leitura — evita estado inconsistente.
    const customization = await prisma.customization.upsert({
      where: { municipalityId },
      update: {},
      create: { municipalityId },
    });

    res.json({ customization });
  } catch (error) {
    logError('Erro ao buscar customização', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao buscar customização' });
  }
};

/**
 * Salvar customização do município
 * PUT /api/customization
 */
export const saveCustomization = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (!ALLOWED_ROLES_WRITE.includes(req.user.role as (typeof ALLOWED_ROLES_WRITE)[number])) {
      logWarn('❌ Acesso negado para salvar customização', {
        role: req.user.role,
        allowedRoles: ALLOWED_ROLES_WRITE,
      });
      res.status(403).json({
        error: 'Sem permissão para alterar customização',
        userRole: req.user.role,
        allowedRoles: ALLOWED_ROLES_WRITE,
      });
      return;
    }

    const { municipalityId } = req.user;
    const body = (req.body ?? {}) as Record<string, unknown>;

    // Whitelist: aceita apenas campos permitidos.
    const data: Prisma.CustomizationUpdateInput = {};
    const rejectedUrlFields: string[] = [];
    for (const field of ALLOWED_FIELDS) {
      if (body[field] === undefined) continue;
      // Validação extra para campos de URL — bloqueia javascript:/data:/etc.
      if (URL_FIELDS.has(field) && !isSafeUrl(body[field])) {
        rejectedUrlFields.push(field);
        continue;
      }
      (data as Record<AllowedField, unknown>)[field] = body[field];
    }

    if (rejectedUrlFields.length > 0) {
      logWarn('❌ URLs rejeitadas em saveCustomization', {
        fields: rejectedUrlFields,
        userId: req.user.userId,
      });
      res.status(400).json({
        error: 'URL inválida (use http://, https:// ou caminho /uploads/)',
        fields: rejectedUrlFields,
      });
      return;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
      return;
    }

    const customization = await prisma.customization.upsert({
      where: { municipalityId },
      update: data,
      create: { ...(data as Prisma.CustomizationCreateInput), municipalityId },
    });

    logInfo('✅ Customização salva', {
      customizationId: customization.id,
      municipalityId,
      fields: Object.keys(data),
    });

    res.json({
      message: 'Customização salva com sucesso',
      customization,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError('❌ Erro ao salvar customização', err, { userId: req.user?.userId });
    res.status(500).json({
      error: 'Erro ao salvar customização',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

/**
 * Resetar customização para valores padrão
 * POST /api/customization/reset
 */
export const resetCustomization = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (!ALLOWED_ROLES_WRITE.includes(req.user.role as (typeof ALLOWED_ROLES_WRITE)[number])) {
      res.status(403).json({
        error: 'Sem permissão para resetar customização',
        userRole: req.user.role,
        allowedRoles: ALLOWED_ROLES_WRITE,
      });
      return;
    }

    const { municipalityId } = req.user;

    // Transação: deleta e recria com defaults do schema atomicamente.
    const customization = await prisma.$transaction(async (tx) => {
      await tx.customization.deleteMany({ where: { municipalityId } });
      return tx.customization.create({ data: { municipalityId } });
    });

    logInfo('🔄 Customização resetada', { municipalityId, userId: req.user.userId });

    res.json({
      message: 'Customização resetada com sucesso',
      customization,
    });
  } catch (error) {
    logError('Erro ao resetar customização', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao resetar customização' });
  }
};
