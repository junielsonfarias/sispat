import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  detectAllowedFile,
  mimeMatchesDetected,
  validateFileOnDisk,
} from '../../utils/file-validation';

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
});
