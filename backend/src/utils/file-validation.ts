import fs from 'fs';

/**
 * Validação de tipo de arquivo por magic bytes (assinatura no início do
 * conteúdo), em vez de confiar apenas em `mimetype` ou extensão — que o
 * cliente pode falsificar.
 *
 * Mantemos uma whitelist conservadora: JPEG, PNG, GIF, WebP, PDF.
 * Bloqueamos explicitamente SVG (XML — pode conter `<script>`) e qualquer
 * outro tipo não listado.
 */

export type AllowedFileKind = 'jpeg' | 'png' | 'gif' | 'webp' | 'pdf';

export interface DetectedFile {
  kind: AllowedFileKind;
  mime: string;
}

/**
 * Inspeciona os primeiros bytes para descobrir o tipo real.
 * Retorna null se não bater com nenhum tipo permitido.
 */
export const detectAllowedFile = (header: Buffer): DetectedFile | null => {
  if (header.length < 12) return null;

  // JPEG: FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return { kind: 'jpeg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return { kind: 'png', mime: 'image/png' };
  }

  // GIF: "GIF87a" ou "GIF89a"
  if (
    header[0] === 0x47 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x38 &&
    (header[4] === 0x37 || header[4] === 0x39) &&
    header[5] === 0x61
  ) {
    return { kind: 'gif', mime: 'image/gif' };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return { kind: 'webp', mime: 'image/webp' };
  }

  // PDF: "%PDF"
  if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
    return { kind: 'pdf', mime: 'application/pdf' };
  }

  return null;
};

/**
 * Lê os primeiros bytes de um arquivo no disco e valida o tipo real.
 * Retorna o tipo detectado ou null se rejeitado.
 */
export const validateFileOnDisk = async (filePath: string): Promise<DetectedFile | null> => {
  const fd = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await fd.read(buffer, 0, 16, 0);
    return detectAllowedFile(buffer.subarray(0, bytesRead));
  } finally {
    await fd.close();
  }
};

/**
 * Verifica se um mimetype declarado pelo cliente bate com o conteúdo
 * detectado. Aceita aliases razoáveis (image/jpg ↔ image/jpeg).
 */
export const mimeMatchesDetected = (declaredMime: string, detected: DetectedFile): boolean => {
  if (declaredMime === detected.mime) return true;
  if (detected.kind === 'jpeg' && declaredMime === 'image/jpg') return true;
  return false;
};

// ---------------------------------------------------------------------------
// Validação de DOCUMENTOS (estende imagens/PDF com Office e texto puro).
//
// O upload de documentos aceita, além de imagens/PDF, os formatos do Office
// (doc/docx/xls/xlsx) e texto puro. Esses não cabem no detector estrito acima:
//   - Office moderno (docx/xlsx) é um contêiner ZIP (assinatura "PK").
//   - Office legado (doc/xls) é um contêiner OLE2 (Compound File Binary).
//   - Texto puro NÃO tem assinatura — usamos heurística de conteúdo.
// ---------------------------------------------------------------------------

// OLE2 / Compound File Binary (doc, xls, ppt legados): D0 CF 11 E0 A1 B1 1A E1
const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

export const isOle2Container = (header: Buffer): boolean =>
  header.length >= 8 && OLE2_SIGNATURE.every((byte, i) => header[i] === byte);

/**
 * Contêiner ZIP — base de docx/xlsx/pptx (OOXML). Aceita as três variantes
 * da assinatura: local file (PK\x03\x04), empty archive (PK\x05\x06) e
 * spanned (PK\x07\x08).
 */
export const isZipContainer = (header: Buffer): boolean => {
  if (header.length < 4) return false;
  if (header[0] !== 0x50 || header[1] !== 0x4b) return false;
  return (
    (header[2] === 0x03 && header[3] === 0x04) ||
    (header[2] === 0x05 && header[3] === 0x06) ||
    (header[2] === 0x07 && header[3] === 0x08)
  );
};

/**
 * Heurística para texto puro (txt não tem magic bytes). Rejeita se houver
 * byte NUL (sinal forte de binário) ou se a fração de caracteres imprimíveis
 * for baixa. Considera imprimíveis: tab/LF/CR, ASCII 0x20–0x7E e bytes altos
 * (≥0x80, presumindo continuação UTF-8).
 */
export const looksLikeText = (buffer: Buffer): boolean => {
  if (buffer.length === 0) return true; // arquivo vazio é texto trivial
  let printable = 0;
  for (const byte of buffer) {
    if (byte === 0x00) return false;
    if (
      byte === 0x09 ||
      byte === 0x0a ||
      byte === 0x0d ||
      (byte >= 0x20 && byte <= 0x7e) ||
      byte >= 0x80
    ) {
      printable++;
    }
  }
  return printable / buffer.length >= 0.9;
};

const OOXML_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
]);

const LEGACY_OFFICE_MIMES = new Set([
  'application/msword', // doc
  'application/vnd.ms-excel', // xls
]);

/**
 * Valida pelo CONTEÚDO se um header bate com o mimetype declarado de um
 * documento. Reaproveita o detector estrito para imagens/PDF e estende para
 * Office (ZIP/OLE2) e texto puro.
 */
export const documentContentMatches = (header: Buffer, declaredMime: string): boolean => {
  const mime = declaredMime.trim().toLowerCase();

  // imagens e PDF: o conteúdo precisa bater exatamente com o tipo declarado.
  const detected = detectAllowedFile(header);
  if (detected) return mimeMatchesDetected(mime, detected);

  if (OOXML_MIMES.has(mime)) return isZipContainer(header);
  if (LEGACY_OFFICE_MIMES.has(mime)) return isOle2Container(header);
  if (mime === 'text/plain') return looksLikeText(header);

  return false;
};

/**
 * Lê o início de um documento no disco e valida o conteúdo contra o mimetype
 * declarado. Retorna true se aceitável.
 */
export const validateDocumentOnDisk = async (
  filePath: string,
  declaredMime: string,
): Promise<boolean> => {
  const fd = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(512);
    const { bytesRead } = await fd.read(buffer, 0, 512, 0);
    return documentContentMatches(buffer.subarray(0, bytesRead), declaredMime);
  } finally {
    await fd.close();
  }
};
