// Evita carregar src/index.ts (que importa cookie-parser e abre conexões).
// isAllowedDocumentFile é pura — não usa prisma.
jest.mock('../../index', () => ({ prisma: {} }));

import { isAllowedDocumentFile } from '../../controllers/documentController';

/**
 * Endurecimento do fileFilter de upload de documentos.
 * O filtro antigo usava regex NÃO ancorada testada por substring tanto na
 * extensão quanto no mimetype, permitindo bypasses como 'x.php.pdf' e
 * mimetypes contendo a substring de um tipo permitido.
 */
describe('isAllowedDocumentFile', () => {
  describe('aceita arquivos legítimos', () => {
    it.each([
      ['foto.jpg', 'image/jpeg'],
      ['foto.jpeg', 'image/jpeg'],
      ['imagem.png', 'image/png'],
      ['anim.gif', 'image/gif'],
      ['contrato.pdf', 'application/pdf'],
      ['oficio.doc', 'application/msword'],
      ['oficio.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ['planilha.xls', 'application/vnd.ms-excel'],
      ['planilha.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      ['nota.txt', 'text/plain'],
      ['FOTO.PDF', 'application/pdf'], // case-insensitive na extensão
    ])('aceita %s (%s)', (name, mime) => {
      expect(isAllowedDocumentFile(name, mime)).toBe(true);
    });
  });

  describe('bloqueia bypasses', () => {
    it('rejeita extensão dupla (x.php.pdf) com mimetype malicioso', () => {
      // antes passava: 'pdf' aparecia como substring na extensão e no mimetype
      expect(isAllowedDocumentFile('x.php.pdf', 'application/x-httpd-php')).toBe(false);
    });

    it('rejeita arquivo .php mesmo com nome contendo token permitido', () => {
      expect(isAllowedDocumentFile('pdf-relatorio.php', 'application/pdf')).toBe(false);
    });

    it('rejeita mimetype com substring de tipo permitido', () => {
      // 'txt' aparece como substring — antes passava
      expect(isAllowedDocumentFile('shell.txt.sh', 'application/x-sh; name=evil.txt')).toBe(false);
    });

    it('rejeita mimetype não whitelisted mesmo com extensão válida', () => {
      expect(isAllowedDocumentFile('arquivo.pdf', 'application/octet-stream')).toBe(false);
    });

    it('rejeita extensão não permitida mesmo com mimetype válido', () => {
      expect(isAllowedDocumentFile('script.js', 'application/pdf')).toBe(false);
    });

    it('rejeita SVG (XSS estocado)', () => {
      expect(isAllowedDocumentFile('logo.svg', 'image/svg+xml')).toBe(false);
    });

    it('rejeita arquivo sem extensão', () => {
      expect(isAllowedDocumentFile('arquivo', 'application/pdf')).toBe(false);
    });
  });
});
