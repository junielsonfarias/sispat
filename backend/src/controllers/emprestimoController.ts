import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logActivity } from '../utils/activityLogger';
import { logError, logInfo, logWarn } from '../config/logger';

/**
 * GET /api/emprestimos
 * Lista empréstimos do município (com filtros opcionais).
 */
export const listEmprestimos = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { status, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));

    const agora = new Date();
    const where: Record<string, unknown> = {
      patrimonio: { municipalityId: req.user.municipalityId },
    };
    // 'atrasado' não é um valor persistido: é derivado (empréstimo ativo cuja
    // devolução prevista já passou). Traduz o filtro para a condição de data —
    // assim relatórios/consultas por 'atrasado' funcionam sem cron nem dado stale.
    if (status === 'atrasado') {
      where.status = 'ativo';
      where.dataDevolucao = null;
      where.dataPrevDevolucao = { lt: agora };
    } else if (status) {
      where.status = status;
    }

    const [emprestimos, total] = await Promise.all([
      prisma.emprestimo.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { dataEmprestimo: 'desc' },
        include: {
          patrimonio: {
            select: {
              id: true,
              numero_patrimonio: true,
              descricao_bem: true,
              status: true,
            },
          },
        },
      }),
      prisma.emprestimo.count({ where }),
    ]);

    // Anexa o status derivado 'atrasado' (sem persistir): ativo + vencido.
    const emprestimosComStatus = emprestimos.map((e) => ({
      ...e,
      isAtrasado:
        e.status === 'ativo' && !e.dataDevolucao && e.dataPrevDevolucao < agora,
    }));

    res.json({
      emprestimos: emprestimosComStatus,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logError('Erro ao listar empréstimos', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao listar empréstimos' });
  }
};

/**
 * POST /api/emprestimos
 * Cria empréstimo, marca patrimônio como `emprestado`.
 */
export const createEmprestimo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const {
      patrimonioId,
      responsavel,
      setor,
      dataEmprestimo,
      dataPrevDevolucao,
      motivo,
      observacoes,
    } = req.body ?? {};

    if (!patrimonioId || !responsavel || !dataEmprestimo || !dataPrevDevolucao || !motivo) {
      res.status(400).json({
        error: 'Campos obrigatórios: patrimonioId, responsavel, dataEmprestimo, dataPrevDevolucao, motivo',
      });
      return;
    }

    const patrimonio = await prisma.patrimonio.findUnique({
      where: { id: patrimonioId },
      select: {
        id: true,
        numero_patrimonio: true,
        descricao_bem: true,
        status: true,
        municipalityId: true,
      },
    });
    if (!patrimonio) {
      res.status(404).json({ error: 'Patrimônio não encontrado' });
      return;
    }

    // Tenant isolation
    if (
      req.user.role !== 'superuser' &&
      patrimonio.municipalityId !== req.user.municipalityId
    ) {
      res.status(403).json({ error: 'Sem permissão para este patrimônio' });
      return;
    }

    if (patrimonio.status !== 'ativo') {
      res.status(400).json({
        error: `Patrimônio não pode ser emprestado (status: ${patrimonio.status})`,
      });
      return;
    }

    // Bloqueia empréstimo duplicado em aberto
    const existing = await prisma.emprestimo.findFirst({
      where: { patrimonioId, status: 'ativo' },
      select: { id: true },
    });
    if (existing) {
      res.status(400).json({ error: 'Patrimônio já está com empréstimo ativo' });
      return;
    }

    const [emprestimo] = await prisma.$transaction([
      prisma.emprestimo.create({
        data: {
          patrimonioId,
          numero_patrimonio: patrimonio.numero_patrimonio,
          descricao_bem: patrimonio.descricao_bem,
          responsavel,
          setor: setor ?? '',
          dataEmprestimo: new Date(dataEmprestimo),
          dataPrevDevolucao: new Date(dataPrevDevolucao),
          motivo,
          observacoes,
          status: 'ativo',
        },
      }),
      prisma.patrimonio.update({
        where: { id: patrimonioId },
        data: { status: 'emprestado', updatedBy: req.user.userId },
      }),
      prisma.historicoEntry.create({
        data: {
          patrimonioId,
          action: 'EMPRÉSTIMO',
          details: `Emprestado para ${responsavel}. Motivo: ${motivo}. Devolução prevista: ${new Date(dataPrevDevolucao).toLocaleDateString('pt-BR')}`,
          user: req.user.email,
        },
      }),
    ]);

    await logActivity(req, 'CREATE_EMPRESTIMO', 'EMPRESTIMO', emprestimo.id, `Empréstimo de ${patrimonio.numero_patrimonio}`);

    logInfo('Empréstimo criado', { emprestimoId: emprestimo.id, patrimonioId });
    res.status(201).json({ emprestimo });
  } catch (error) {
    logError('Erro ao criar empréstimo', error, { userId: req.user?.userId });
    res.status(500).json({ error: 'Erro ao criar empréstimo' });
  }
};

/**
 * POST /api/emprestimos/:id/devolver
 * Marca devolução. Pode receber dataDevolucao no body (default: agora).
 */
export const devolverEmprestimo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;
    const { dataDevolucao, observacoes } = req.body ?? {};

    const emprestimo = await prisma.emprestimo.findUnique({
      where: { id },
      include: {
        patrimonio: { select: { id: true, municipalityId: true, status: true } },
      },
    });
    if (!emprestimo) {
      res.status(404).json({ error: 'Empréstimo não encontrado' });
      return;
    }

    if (
      req.user.role !== 'superuser' &&
      emprestimo.patrimonio.municipalityId !== req.user.municipalityId
    ) {
      res.status(403).json({ error: 'Sem permissão para este empréstimo' });
      return;
    }

    if (emprestimo.status === 'devolvido') {
      res.status(400).json({ error: 'Empréstimo já foi devolvido' });
      return;
    }

    const dataDevolucaoDate = dataDevolucao ? new Date(dataDevolucao) : new Date();

    await prisma.$transaction([
      prisma.emprestimo.update({
        where: { id },
        data: {
          status: 'devolvido',
          dataDevolucao: dataDevolucaoDate,
          observacoes: observacoes ?? emprestimo.observacoes,
        },
      }),
      // Libera o patrimônio se ainda estava marcado como emprestado
      ...(emprestimo.patrimonio.status === 'emprestado'
        ? [
            prisma.patrimonio.update({
              where: { id: emprestimo.patrimonioId },
              data: { status: 'ativo', updatedBy: req.user.userId },
            }),
          ]
        : []),
      prisma.historicoEntry.create({
        data: {
          patrimonioId: emprestimo.patrimonioId,
          action: 'DEVOLUÇÃO',
          details: `Empréstimo devolvido. Responsável: ${emprestimo.responsavel}${observacoes ? `. Observações: ${observacoes}` : ''}`,
          user: req.user.email,
        },
      }),
    ]);

    await logActivity(req, 'DEVOLVER_EMPRESTIMO', 'EMPRESTIMO', id, 'Devolução registrada');
    logInfo('Empréstimo devolvido', { emprestimoId: id, patrimonioId: emprestimo.patrimonioId });

    const updated = await prisma.emprestimo.findUnique({
      where: { id },
      include: {
        patrimonio: {
          select: { id: true, numero_patrimonio: true, descricao_bem: true, status: true },
        },
      },
    });

    res.json({ emprestimo: updated });
  } catch (error) {
    logError('Erro ao devolver empréstimo', error, {
      emprestimoId: req.params.id,
      userId: req.user?.userId,
    });
    res.status(500).json({ error: 'Erro ao registrar devolução' });
  }
};

/**
 * GET /api/emprestimos/:id
 */
export const getEmprestimo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const emprestimo = await prisma.emprestimo.findUnique({
      where: { id: req.params.id },
      include: {
        patrimonio: {
          select: {
            id: true,
            numero_patrimonio: true,
            descricao_bem: true,
            status: true,
            municipalityId: true,
            sector: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!emprestimo) {
      res.status(404).json({ error: 'Empréstimo não encontrado' });
      return;
    }

    if (
      req.user.role !== 'superuser' &&
      emprestimo.patrimonio.municipalityId !== req.user.municipalityId
    ) {
      res.status(403).json({ error: 'Sem permissão para este empréstimo' });
      return;
    }

    res.json({ emprestimo });
  } catch (error) {
    logError('Erro ao buscar empréstimo', error, { emprestimoId: req.params.id });
    res.status(500).json({ error: 'Erro ao buscar empréstimo' });
  }
};
