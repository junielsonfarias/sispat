/**
 * Constantes do sistema SISPAT 2.0
 */

// Sistema single-municipality
export const MUNICIPALITY_ID = '1'

// Configurações de API
export const API_TIMEOUT = 30000
export const API_RETRY_ATTEMPTS = 3

// Configurações de paginação
export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100

// Configurações de upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']

// Configurações de cache
export const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

// Configurações de timeout de inatividade
export const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutos

// Versão atual do sistema
export const CURRENT_VERSION = '2.0.0'

// Configurações de relatórios
export const REPORT_MAX_ROWS = 10000
export const REPORT_DEFAULT_FORMAT = 'pdf'

// Configurações de backup
export const BACKUP_RETENTION_DAYS = 30
export const AUTO_BACKUP_ENABLED = true

// Configurações de logs
export const LOG_LEVEL = import.meta.env.DEV ? 'debug' : 'info'
export const LOG_MAX_FILES = 10
export const LOG_MAX_SIZE = '10MB'
