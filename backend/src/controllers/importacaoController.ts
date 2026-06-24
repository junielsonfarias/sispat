/**
 * importacaoController — preview e confirmação da importação de bens móveis a
 * partir do relatório "Movimentos de Liquidação" (SIAFIC). O preview faz upload
 * do PDF em memória, extrai o texto e devolve os itens parseados + mapeamentos;
 * o confirmar cria os patrimônios (1 por unidade) em transação.
 */

import { Request, Response } from 'express';
import multer from 'multer';
import { logError } from '../config/logger';
import {
  Actor,
  ImportacaoValidationError,
  extrairTextoPdf,
  parseRelatorioLiquidacao,
  importarPatrimonios,
  ItemConfirmado,
} from '../services/importacaoMaterialService';

// Upload em memória (não persiste em disco — o PDF é só lido e descartado).
export const uploadRelatorio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
}).single('arquivo');

const buildActor = (req: Request): Actor | null => {
  if (!req.user?.userId || !req.user.role || !req.user.municipalityId) return null;
  return {
    userId: req.user.userId,
    role: req.user.role,
    municipalityId: req.user.municipalityId,
    email: req.user.email,
    name: (req.user as { name?: string }).name,
  };
};

// %PDF-  (magic bytes do PDF)
const ehPdf = (buf: Buffer): boolean =>
  buf.length > 4 && buf.subarray(0, 5).toString('latin1') === '%PDF-';

export const previewImportacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const file = (req as Request & { file?: { buffer: Buffer } }).file;
  if (!file?.buffer) {
    res.status(400).json({ error: 'Envie o arquivo PDF no campo "arquivo".' });
    return;
  }
  if (!ehPdf(file.buffer)) {
    res.status(400).json({ error: 'O arquivo enviado não é um PDF válido.' });
    return;
  }
  try {
    const texto = await extrairTextoPdf(file.buffer);
    const parsed = parseRelatorioLiquidacao(texto);
    if (parsed.itens.length === 0) {
      res.status(422).json({
        error:
          'Nenhum item de material permanente reconhecido no relatório. Confirme que é o relatório de Movimentos de Liquidação (4.4.90.52).',
        avisos: parsed.avisos,
      });
      return;
    }
    res.json(parsed);
  } catch (error) {
    logError('❌ Erro ao processar o relatório de importação', error);
    res.status(500).json({ error: 'Erro ao ler o relatório PDF.' });
  }
};

export const confirmarImportacao = async (req: Request, res: Response): Promise<void> => {
  const actor = buildActor(req);
  if (!actor) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const itens = (req.body?.itens ?? []) as ItemConfirmado[];
  try {
    const resultado = await importarPatrimonios(itens, actor);
    res.status(201).json(resultado);
  } catch (error) {
    if (error instanceof ImportacaoValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    logError('❌ Erro ao confirmar a importação', error);
    res.status(500).json({ error: 'Erro ao importar os patrimônios.' });
  }
};
