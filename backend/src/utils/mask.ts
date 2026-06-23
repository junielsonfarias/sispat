/**
 * Utilitários de mascaramento de PII para logs (LGPD).
 *
 * Nunca registre email/CPF em claro nos logs de produção — use estas funções.
 */

/**
 * Mascara um email preservando apenas os 2 primeiros caracteres do local-part
 * e o domínio: `joao.silva@x.gov` -> `jo***@x.gov`.
 */
export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '[sem-email]';
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}
