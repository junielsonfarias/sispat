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
