/**
 * Normalizadores de fotos/documentos.
 *
 * O banco guarda String[], mas o front-end pode enviar objetos
 * `{ id, file_url, file_name }` vindos do ImageUpload — então aceitamos
 * ambos os formatos e devolvemos sempre array de strings.
 *
 * `sanitizeIncomingUrls` é usado na entrada (create/update) e rejeita
 * `blob:` URLs (que são referências locais do navegador e nunca devem
 * persistir no banco — vide HISTORICO_CORRECOES).
 *
 * `normalizeUrlArray` é usado na saída (list/get) e apenas converte; é
 * defensivo para limpar lixo legado (ex: `[object Object]` que ficou no
 * banco antes destes guards).
 *
 * `normalizeOnRead` aplica `normalizeUrlArray` em campos `fotos` e
 * `documentos` de uma entidade qualquer.
 */

import { logWarn } from '../config/logger';

export const extractUrlFromAny = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    const candidate =
      (typeof v.file_url === 'string' && v.file_url) ||
      (typeof v.url === 'string' && v.url) ||
      (typeof v.id === 'string' && v.id) ||
      (typeof v.fileName === 'string' && v.fileName) ||
      null;
    return candidate || null;
  }
  if (value === null || value === undefined) return null;
  return String(value);
};

export const normalizeUrlArray = (arr: unknown): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(extractUrlFromAny)
    .filter((v): v is string => Boolean(v && v.trim() !== ''))
    .filter((v) => v !== '[object Object]');
};

export const sanitizeIncomingUrls = (arr: unknown): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => {
      const url = extractUrlFromAny(item);
      if (!url) return null;
      if (url.startsWith('blob:')) {
        logWarn('URL blob- bloqueada', { url });
        return null;
      }
      if (url === '[object Object]') return null;
      return url;
    })
    .filter((v): v is string => Boolean(v && v.trim() !== ''));
};

export const normalizeOnRead = <T extends { fotos?: unknown; documentos?: unknown }>(
  entity: T,
): T => {
  if (entity.fotos !== undefined) {
    (entity as { fotos: string[] }).fotos = normalizeUrlArray(entity.fotos);
  }
  if (entity.documentos !== undefined) {
    (entity as { documentos: string[] }).documentos = normalizeUrlArray(
      entity.documentos,
    );
  }
  return entity;
};
