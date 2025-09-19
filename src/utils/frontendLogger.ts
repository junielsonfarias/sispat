// Utilitário de log para frontend (React/TS)
// Desativa logs em produção automaticamente

const isProd = process.env.NODE_ENV === 'production';

export const logInfo = (...args: any[]) => {
  if (!isProd) console.info('[INFO]', ...args);
};

export const logWarn = (...args: any[]) => {
  if (!isProd) console.warn('[WARN]', ...args);
};

export const logError = (...args: any[]) => {
  if (!isProd) console.error('[ERROR]', ...args);
};

export const logDebug = (...args: any[]) => {
  if (!isProd) console.debug('[DEBUG]', ...args);
};
