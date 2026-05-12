import { normalizeUrlArray, sanitizeIncomingUrls } from '../../services/patrimonioService';

// Suprime os logWarn dos sanitizers
jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

describe('patrimonioService — normalizers', () => {
  describe('normalizeUrlArray', () => {
    it('retorna [] para entrada não-array', () => {
      expect(normalizeUrlArray(undefined)).toEqual([]);
      expect(normalizeUrlArray(null)).toEqual([]);
      expect(normalizeUrlArray('not-array')).toEqual([]);
      expect(normalizeUrlArray(42)).toEqual([]);
    });

    it('mantém strings como estão', () => {
      expect(normalizeUrlArray(['/uploads/a.jpg', '/uploads/b.png'])).toEqual([
        '/uploads/a.jpg',
        '/uploads/b.png',
      ]);
    });

    it('extrai file_url de objetos', () => {
      expect(normalizeUrlArray([{ file_url: '/uploads/x.jpg', id: 'ignored' }])).toEqual([
        '/uploads/x.jpg',
      ]);
    });

    it('cai para url quando file_url ausente', () => {
      expect(normalizeUrlArray([{ url: '/uploads/y.jpg' }])).toEqual(['/uploads/y.jpg']);
    });

    it('cai para id como último recurso', () => {
      expect(normalizeUrlArray([{ id: '/uploads/z.jpg' }])).toEqual(['/uploads/z.jpg']);
    });

    it('descarta strings vazias', () => {
      expect(normalizeUrlArray(['/uploads/a.jpg', '', '   '])).toEqual(['/uploads/a.jpg']);
    });

    it('mistura strings e objetos sem perder ordem', () => {
      expect(
        normalizeUrlArray([
          '/uploads/1.jpg',
          { file_url: '/uploads/2.jpg' },
          { url: '/uploads/3.jpg' },
        ]),
      ).toEqual(['/uploads/1.jpg', '/uploads/2.jpg', '/uploads/3.jpg']);
    });
  });

  describe('sanitizeIncomingUrls', () => {
    it('bloqueia URLs blob: (string direta)', () => {
      expect(sanitizeIncomingUrls(['blob:http://x/abc', '/uploads/ok.jpg'])).toEqual([
        '/uploads/ok.jpg',
      ]);
    });

    it('bloqueia URLs blob: dentro de objetos', () => {
      expect(
        sanitizeIncomingUrls([
          { file_url: 'blob:http://x/abc' },
          { file_url: '/uploads/good.jpg' },
        ]),
      ).toEqual(['/uploads/good.jpg']);
    });

    it('retorna [] para entrada inválida', () => {
      expect(sanitizeIncomingUrls(undefined)).toEqual([]);
      expect(sanitizeIncomingUrls(null)).toEqual([]);
      expect(sanitizeIncomingUrls('foo')).toEqual([]);
    });

    it('aceita arrays vazios', () => {
      expect(sanitizeIncomingUrls([])).toEqual([]);
    });

    it('descarta valores vazios após extração', () => {
      expect(sanitizeIncomingUrls([{ file_url: '' }, '/uploads/x.jpg', { url: '' }])).toEqual([
        '/uploads/x.jpg',
      ]);
    });
  });
});
