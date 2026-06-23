import { maskEmail } from '../../utils/mask';

describe('maskEmail', () => {
  it('mascara o local-part preservando 2 chars e o domínio', () => {
    expect(maskEmail('joao.silva@x.gov')).toBe('jo***@x.gov');
  });

  it('lida com local-part curto', () => {
    expect(maskEmail('a@b.com')).toBe('a***@b.com');
  });

  it('retorna placeholder para valores vazios/nulos', () => {
    expect(maskEmail('')).toBe('[sem-email]');
    expect(maskEmail(null)).toBe('[sem-email]');
    expect(maskEmail(undefined)).toBe('[sem-email]');
  });

  it('não vaza string sem @ válido', () => {
    expect(maskEmail('semarroba')).toBe('***');
    expect(maskEmail('@semlocal.com')).toBe('***');
  });

  it('nunca contém o local-part completo', () => {
    const masked = maskEmail('administrador@prefeitura.gov.br');
    expect(masked).toBe('ad***@prefeitura.gov.br');
    expect(masked).not.toContain('administrador');
  });
});
