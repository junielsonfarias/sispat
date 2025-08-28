// Configurações centralizadas do aplicativo SISPAT
export const APP_CONFIG = {
  // Informações básicas
  name: 'SISPAT',
  fullName: 'Sistema de Gestão Patrimonial',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  description:
    'Sistema completo de gestão patrimonial para municípios e organizações públicas',

  // URLs e endpoints
  apiBaseUrl: '/api',
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',

  // Configurações de autenticação
  auth: {
    tokenKey: 'sispat_auth_token',
    sessionTimeout: 30 * 60 * 1000, // 30 minutos
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutos
  },

  // Configurações de upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxFiles: 5,
  },

  // Configurações de paginação
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },

  // Configurações de relatórios
  reports: {
    maxExportRows: 10000,
    defaultFormat: 'pdf',
  },

  // Configurações de notificações
  notifications: {
    autoHideDuration: 5000,
    maxNotifications: 10,
  },

  // Configurações de desenvolvimento
  development: {
    enableDebugLogs: import.meta.env.DEV,
    enableErrorReporting: true,
  },
} as const;

// Tipos para as configurações
export type AppConfig = typeof APP_CONFIG;
