// Tipos base
export interface BaseEntity {
  id: string
  createdAt?: string
  updatedAt?: string
  deletedAt?: string
}

// Tipos de usuário e permissões
export type UserRole = 'superuser' | 'supervisor' | 'admin' | 'usuario' | 'visualizador'

export type Permission = 
  | 'superuser:access'
  | 'permissions:manage'
  | 'bens:create'
  | 'bens:read'
  | 'bens:update'
  | 'bens:delete'
  | 'users:create'
  | 'users:read'
  | 'users:update'
  | 'users:delete'
  | 'settings:read'
  | 'settings:update'
  | 'reports:generate'
  | 'reports:manage_templates'

export interface Role {
  id: UserRole
  name: string
  permissions: Permission[]
}

// Usuário
export interface User extends BaseEntity {
  name: string
  email: string
  password?: string
  role: UserRole
  municipalityId?: string
  municipalityName?: string
  sector?: string
  responsibleSectors?: string[]
  avatarUrl?: string
  isActive: boolean
  failedLoginAttempts?: number
  lockoutUntil?: string
}

// Município
export interface Municipality extends BaseEntity {
  name: string
  state: string
  logoUrl?: string
  supervisorId?: string
  fullAddress?: string
  contactEmail?: string
  mayorName?: string
  mayorCpf?: string
  accessStartDate?: string
  accessEndDate?: string
}

// Setor
export interface Sector extends BaseEntity {
  name: string
  codigo?: string
  sigla?: string
  endereco?: string
  cnpj?: string
  responsavel?: string
  municipalityId: string
  parentId?: string
  isActive: boolean
}

// Patrimônio
export interface Patrimonio extends BaseEntity {
  numero_patrimonio: string
  descricao: string
  tipo?: string
  marca?: string
  modelo?: string
  numero_serie?: string
  estado?: string
  valor_aquisicao?: number
  data_aquisicao?: string
  fornecedor?: string
  nota_fiscal?: string
  local_id?: string
  sector_id?: string
  municipality_id: string
  created_by: string
  cor?: string
  quantidade?: number
  fotos?: string
  documentos?: string
  metodo_depreciacao?: string
  vida_util_anos?: number
  valor_residual?: number
  forma_aquisicao?: string
  setor_responsavel?: string
  local_objeto?: string
  status?: string
  situacao_bem?: string
  // Campos adicionais para compatibilidade
  numero_nota_fiscal?: string
  data_baixa?: string
  motivo_baixa?: string
  entity_name?: string
  custom_fields?: Record<string, unknown>
  emprestimo_ativo?: boolean
  transferencia_pendente?: boolean
  doado?: boolean
}

// Imóvel
export interface Imovel extends BaseEntity {
  numero_patrimonio: string
  descricao: string
  endereco?: string
  area?: number
  tipo_imovel?: string
  valor_aquisicao?: number
  data_aquisicao?: string
  latitude?: number
  longitude?: number
  municipality_id: string
  created_by: string
  numero_imovel?: string
  tipo?: string
  valor_venal?: number
  status?: string
  // Campos adicionais para compatibilidade
  denominacao?: string
  setor?: string
  area_terreno?: number
  area_construida?: number
  fotos?: string
  documentos?: string
  historico?: string
  custom_fields?: Record<string, unknown>
}

// Local
export interface Local extends BaseEntity {
  name: string
  address?: string
  description?: string
  sector_id: string
  municipality_id: string
  created_by: string
  isActive: boolean
}

// Empréstimo
export interface Emprestimo extends BaseEntity {
  patrimonio_id: string
  solicitante_id: string
  destinatario: string
  data_emprestimo: string
  data_devolucao_prevista: string
  data_devolucao_real?: string
  status: 'ativo' | 'devolvido' | 'atrasado'
  observacoes?: string
  termo_responsabilidade_url?: string
}

// Transferência
export interface Transferencia extends BaseEntity {
  patrimonio_id: string
  setor_origem_id: string
  setor_destino_id: string
  solicitante_id: string
  data_solicitacao: string
  data_aprovacao?: string
  status: 'pendente' | 'aprovada' | 'rejeitada' | 'concluida'
  observacoes?: string
  // Campos adicionais para compatibilidade
  patrimonio_numero?: string
  patrimonio_descricao?: string
  type?: string
  setor_origem?: string
  setor_destino?: string
  destinatario_externo?: string
  solicitante_nome?: string
  documentos_anexos?: string
  aprovador_id?: string
  aprovador_nome?: string
  comentarios_aprovador?: string
  municipality_id?: string
}

// Inventário
export interface Inventario extends BaseEntity {
  name: string
  description?: string
  start_date: string
  end_date?: string
  status: 'pendente' | 'em_andamento' | 'concluido'
  sector_id: string
  municipality_id: string
  created_by: string
  // Campos adicionais para compatibilidade
  sector_name?: string
  items?: Record<string, unknown>
  scope?: string
  location_type?: string
}

// Log de Atividade
export interface ActivityLog extends BaseEntity {
  user_id: string
  action: string
  description: string
  ip_address?: string
  user_agent?: string
  // Campos adicionais para compatibilidade
  user_name?: string
  timestamp?: string
}

// Configurações do Sistema
export interface SystemSettings {
  id: string
  key: string
  value: string
  description?: string
  category?: string
  isPublic?: boolean
}

// Relatório
export interface Report extends BaseEntity {
  name: string
  type: string
  parameters: Record<string, unknown>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result_url?: string
  created_by: string
  created_at: string
  completed_at?: string
}

// Notificação
export interface Notification extends BaseEntity {
  user_id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  is_read: boolean
  created_at: string
  read_at?: string
}

// Backup
export interface Backup extends BaseEntity {
  filename: string
  type: 'manual' | 'automatic'
  size: number
  status: 'completed' | 'failed' | 'in_progress'
  created_at: string
  completed_at?: string
  error_message?: string
}

// API Response Types
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form Types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date' | 'file'
  required?: boolean
  options?: Array<{ value: string; label: string }>
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

// Filter Types
export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  field: string
  label: string
  type: 'text' | 'select' | 'date' | 'number'
  options?: FilterOption[]
}

// Search Types
export interface SearchResult<T> {
  items: T[]
  total: number
  query: string
  filters: Record<string, unknown>
}

// Chart Types
export interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string[]
  }>
}

// Dashboard Types
export interface DashboardMetric {
  title: string
  value: number
  change?: number
  changeType?: 'increase' | 'decrease'
  format?: 'number' | 'currency' | 'percentage'
}

export interface DashboardWidget {
  id: string
  title: string
  type: 'metric' | 'chart' | 'table' | 'list'
  data: DashboardMetric[] | ChartData | unknown[]
  config?: Record<string, unknown>
}

// Error Types
export interface ApiError {
  message: string
  code?: string
  details?: Record<string, unknown>
}

// Loading States
export interface LoadingState {
  isLoading: boolean
  error?: string
  data?: unknown
}

// Pagination
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// File Upload
export interface FileUpload {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  uploadedAt: string
  uploadedBy: string
}

// Audit Trail
export interface AuditTrailEntry {
  id: string
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete' | 'view'
  userId: string
  userName: string
  changes?: Record<string, { old: unknown; new: unknown }>
  timestamp: string
  ipAddress?: string
  userAgent?: string
}

// Export all types
export type {
  BaseEntity,
  User,
  Municipality,
  Sector,
  Patrimonio,
  Imovel,
  Local,
  Emprestimo,
  Transferencia,
  Inventario,
  ActivityLog,
  SystemSettings,
  Report,
  Notification,
  Backup,
  ApiResponse,
  PaginatedResponse,
  FormField,
  FilterOption,
  FilterConfig,
  SearchResult,
  ChartData,
  DashboardMetric,
  DashboardWidget,
  ApiError,
  LoadingState,
  PaginationParams,
  FileUpload,
  AuditTrailEntry
}
