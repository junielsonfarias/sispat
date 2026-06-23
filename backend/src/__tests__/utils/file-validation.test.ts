import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  detectAllowedFile,
  mimeMatchesDetected,
  validateFileOnDisk,
  isOle2Container,
  isZipContainer,
  looksLikeText,
  documentContentMatches,
  validateDocumentOnDisk,
} from '../../utils/file-validation';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DOC_MIME = 'application/msword';

describe('file-validation', () => {
  describe('detectAllowedFile', () => {
    it('detecta JPEG por FF D8 FF', () => {
      const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0, 0, 0, 0, 0, 0]);
      expect(detectAllowedFile(buf)).toEqual({ kind: 'jpeg', mime: 'image/jpeg' });
    });

    it('detecta PNG por 89 50 4E 47 0D 0A 1A 0A', () => {
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
      expect(detectAllowedFile(buf)).toEqual({ kind: 'png', mime: 'image/png' });
    });

    it('detecta GIF87a e GIF89a', () => {
      const gif87 = Buffer.from('GIF87a', 'ascii');
      const gif89 = Buffer.from('GIF89a', 'ascii');
      const padded87 = Buffer.concat([gif87, Buffer.alloc(6)]);
      const padded89 = Buffer.concat([gif89, Buffer.alloc(6)]);
      expect(detectAllowedFile(padded87)).toEqual({ kind: 'gif', mime: 'image/gif' });
      expect(detectAllowedFile(padded89)).toEqual({ kind: 'gif', mime: 'image/gif' });
    });

    it('detecta WebP por RIFF...WEBP', () => {
      const buf = Buffer.concat([
        Buffer.from('RIFF', 'ascii'),
        Buffer.from([0, 0, 0, 0]),
        Buffer.from('WEBP', 'ascii'),
      ]);
      expect(detectAllowedFile(buf)).toEqual({ kind: 'webp', mime: 'image/webp' });
    });

    it('detecta PDF por %PDF', () => {
      const buf = Buffer.from('%PDF-1.4\n00000000', 'ascii');
      expect(detectAllowedFile(buf)).toEqual({ kind: 'pdf', mime: 'application/pdf' });
    });

    it('rejeita SVG (XML inicia com <?xml ou <svg)', () => {
      const buf1 = Buffer.from('<?xml version="1.0"?>', 'ascii');
      const buf2 = Buffer.from('<svg xmlns="http"  ', 'ascii');
      expect(detectAllowedFile(buf1)).toBeNull();
      expect(detectAllowedFile(buf2)).toBeNull();
    });

    it('rejeita executável ELF', () => {
      const buf = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(detectAllowedFile(buf)).toBeNull();
    });

    it('rejeita executável Windows (MZ)', () => {
      const buf = Buffer.from([0x4d, 0x5a, 0x90, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(detectAllowedFile(buf)).toBeNull();
    });

    it('rejeita buffer com menos de 12 bytes', () => {
      expect(detectAllowedFile(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
    });
  });

  describe('mimeMatchesDetected', () => {
    it('aceita match exato', () => {
      expect(mimeMatchesDetected('image/png', { kind: 'png', mime: 'image/png' })).toBe(true);
    });

    it('aceita image/jpg como alias de image/jpeg', () => {
      expect(mimeMatchesDetected('image/jpg', { kind: 'jpeg', mime: 'image/jpeg' })).toBe(true);
    });

    it('rejeita mimetype inconsistente', () => {
      expect(mimeMatchesDetected('image/png', { kind: 'jpeg', mime: 'image/jpeg' })).toBe(false);
    });
  });

  describe('validateFileOnDisk', () => {
    it('detecta PNG real lendo do disco', async () => {
      const tmpFile = path.join(os.tmpdir(), `sispat-test-${Date.now()}.png`);
      const pngHeader = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.alloc(20),
      ]);
      await fs.promises.writeFile(tmpFile, pngHeader);
      try {
        const result = await validateFileOnDisk(tmpFile);
        expect(result).toEqual({ kind: 'png', mime: 'image/png' });
      } finally {
        await fs.promises.unlink(tmpFile);
      }
    });

    it('rejeita arquivo com conteúdo não permitido', async () => {
      const tmpFile = path.join(os.tmpdir(), `sispat-test-${Date.now()}.fake`);
      await fs.promises.writeFile(tmpFile, Buffer.from('NOT A REAL IMAGE FILE'));
      try {
        const result = await validateFileOnDisk(tmpFile);
        expect(result).toBeNull();
      } finally {
        await fs.promises.unlink(tmpFile);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Validação de documentos (Office + texto)
  // -------------------------------------------------------------------------

  describe('isOle2Container', () => {
    it('detecta assinatura OLE2 (doc/xls legado)', () => {
      const buf = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);
      expect(isOle2Container(buf)).toBe(true);
    });
    it('rejeita header não-OLE2', () => {
      expect(isOle2Container(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]))).toBe(false);
    });
  });

  describe('isZipContainer', () => {
    it('aceita PK\\x03\\x04 (local file)', () => {
      expect(isZipContainer(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
    });
    it('aceita PK\\x05\\x06 (empty) e PK\\x07\\x08 (spanned)', () => {
      expect(isZipContainer(Buffer.from([0x50, 0x4b, 0x05, 0x06]))).toBe(true);
      expect(isZipContainer(Buffer.from([0x50, 0x4b, 0x07, 0x08]))).toBe(true);
    });
    it('rejeita PDF e header curto', () => {
      expect(isZipContainer(Buffer.from('%PDF', 'ascii'))).toBe(false);
      expect(isZipContainer(Buffer.from([0x50, 0x4b]))).toBe(false);
    });
  });

  describe('looksLikeText', () => {
    it('aceita texto puro e arquivo vazio', () => {
      expect(looksLikeText(Buffer.from('Relatório de bens\nlinha 2\t tab', 'utf8'))).toBe(true);
      expect(looksLikeText(Buffer.alloc(0))).toBe(true);
    });
    it('rejeita conteúdo com byte NUL (binário)', () => {
      expect(looksLikeText(Buffer.from([0x48, 0x69, 0x00, 0x21]))).toBe(false);
    });
  });

  describe('documentContentMatches', () => {
    it('aceita docx/xlsx quando o conteúdo é ZIP', () => {
      const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(documentContentMatches(zip, DOCX_MIME)).toBe(true);
      expect(documentContentMatches(zip, XLSX_MIME)).toBe(true);
    });
    it('aceita doc legado quando o conteúdo é OLE2', () => {
      const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);
      expect(documentContentMatches(ole, DOC_MIME)).toBe(true);
    });
    it('aceita text/plain com conteúdo textual', () => {
      expect(documentContentMatches(Buffer.from('apenas texto', 'utf8'), 'text/plain')).toBe(true);
    });
    it('aceita pdf/imagem reaproveitando o detector estrito', () => {
      const pdf = Buffer.from('%PDF-1.7\n0000', 'ascii');
      expect(documentContentMatches(pdf, 'application/pdf')).toBe(true);
    });
    it('rejeita docx falso (executável renomeado)', () => {
      const mz = Buffer.from([0x4d, 0x5a, 0x90, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(documentContentMatches(mz, DOCX_MIME)).toBe(false);
    });
    it('rejeita quando o conteúdo real diverge do mime declarado', () => {
      const pdf = Buffer.from('%PDF-1.7\n0000', 'ascii');
      expect(documentContentMatches(pdf, DOCX_MIME)).toBe(false);
    });
  });

  describe('validateDocumentOnDisk', () => {
    it('valida um docx (ZIP) real no disco', async () => {
      const tmpFile = path.join(os.tmpdir(), `sispat-doc-${Date.now()}.docx`);
      await fs.promises.writeFile(
        tmpFile,
        Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(32)]),
      );
      try {
        expect(await validateDocumentOnDisk(tmpFile, DOCX_MIME)).toBe(true);
      } finally {
        await fs.promises.unlink(tmpFile);
      }
    });

    it('rejeita executável renomeado para .xlsx', async () => {
      const tmpFile = path.join(os.tmpdir(), `sispat-doc-${Date.now()}.xlsx`);
      await fs.promises.writeFile(tmpFile, Buffer.from([0x4d, 0x5a, 0x90, 0, 0, 0, 0, 0]));
      try {
        expect(await validateDocumentOnDisk(tmpFile, XLSX_MIME)).toBe(false);
      } finally {
        await fs.promises.unlink(tmpFile);
      }
    });
  });
});
