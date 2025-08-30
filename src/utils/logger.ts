// Logger para o frontend
export const logInfo = (message: string, meta?: any) => {
  console.log(`[INFO] ${message}`, meta || '');
};

export const logWarning = (message: string, meta?: any) => {
  console.warn(`[WARN] ${message}`, meta || '');
};

export const logError = (message: string, error?: any, meta?: any) => {
  console.error(`[ERROR] ${message}`, error || '', meta || '');
};

export const logDebug = (message: string, meta?: any) => {
  if (process.env['NODE_ENV'] === 'development') {
    console.debug(`[DEBUG] ${message}`, meta || '');
  }
};

export default {
  logInfo,
  logWarning,
  logError,
  logDebug,
};
