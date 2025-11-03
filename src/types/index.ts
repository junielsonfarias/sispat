export type UserRole =
  | 'superuser'
  | 'supervisor'
  | 'admin'
  | 'usuario'
  | 'visualizador'

export interface MunicipalityHistoryEntry {
  date: Date
  user: string
  change: string
}

// Interface mantida para compatibilidade, mas agora representa o município único
export interface Municipality {
  id: string
  name: string
  logoUrl?: string
  supervisorId?: string
  fullAddress: string
  cnpj: string
  contactEmail: string
  mayorName: string
  mayorCpf: string
  accessStartDate?: string
  accessEndDate?: string
  history?: MunicipalityHistoryEntry[]
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl: string
  sector?: string
  responsibleSectors?: string[]
  password?: string
  failedLoginAttempts?: number
  lockoutUntil?: number | null
  municipalityId?: string
}

export type PatrimonioStatus =
  | 'ativo'
  | 'inativo'
  | 'manutencao'
  | 'baixado'
  | 'extraviado'
export type PatrimonioSituacao =
  | 'OTIMO'
  | 'BOM'
  | 'REGULAR'
  | 'RUIM'
  | 'PESSIMO'

export type SubPatrimonioStatus = 'ativo' | 'baixado' | 'manutencao'

export interface SubPatrimonio {
  id: string
  patrimonio_id: string
  numero_subpatrimonio: string
  status: SubPatrimonioStatus
  localizacao_especifica?: string
  observacoes?: string
  created_at: Date
  updated_at: Date
}

export interface HistoricoEntry {
  date: Date
  action: string
  details: string
  user: string
  origem?: string
  destino?: string
  documentosAnexos?: string[]
}

export interface Note {
  id: string
  text: string
  date: Date
  userId: string
  userName: string
}

export interface Emprestimo {
  id: string
  data_emprestimo: Date
  data_devolucao_prevista: Date
  destinatario: string
  termo_responsabilidade_url?: string
  data_devolucao_real?: Date
}

export type TransferenciaStatus = 'pendente' | 'aprovada' | 'rejeitada'
export type TransferenciaType = 'transferencia' | 'doacao'

export interface Transferencia {
  id: string
  patrimonioId: string
  patrimonioNumero: string
  patrimonioDescricao: string
  type: TransferenciaType
  setorOrigem: string
  setorDestino?: string
  destinatarioExterno?: string
  solicitanteId: string
  solicitanteNome: string
  dataSolicitacao: Date
  motivo: string
  documentosAnexos?: string[]
  status: TransferenciaStatus
  aprovadorId?: string
  aprovadorNome?: string
  dataAprovacao?: Date
  comentariosAprovador?: string
  municipalityId: string
}

export interface Patrimonio {
  id: string
  numero_patrimonio: string
  descricao_bem: string
  tipo: string
  marca: string
  modelo: string
  cor: string
  numero_serie: string
  data_aquisicao: Date
  valor_aquisicao: number
  quantidade: number
  numero_nota_fiscal: string
  forma_aquisicao: string
  numero_licitacao?: string
  ano_licitacao?: number
  setor_responsavel: string
  local_objeto: string
  status: PatrimonioStatus
  situacao_bem: PatrimonioSituacao
  fotos: string[]
  documentos: string[]
  historico_movimentacao: HistoricoEntry[]
  data_baixa?: Date
  motivo_baixa?: string
  documentos_baixa?: string[]
  entityName: string
  notes?: Note[]
  municipalityId: string
  customFields?: Record<string, any>
  metodo_depreciacao?: 'Linear'
  vida_util_anos?: number
  valor_residual?: number
  emprestimo_ativo?: Emprestimo
  eh_kit?: boolean
  quantidade_unidades?: number
  url_documentos?: string
  documentos_pdf?: File[]
  transferencia_pendente?: boolean
  doado?: boolean
  createdAt: Date
  createdBy: string
  updatedAt?: Date
  updatedBy?: string
}

export interface BaixaBemData {
  data_baixa: Date
  motivo_baixa: string
  documentos_baixa?: File[]
  observacoes?: string
}

export interface Imovel {
  id: string
  numero_patrimonio: string
  denominacao: string
  endereco: string
  cep?: string
  bairro?: string
  cidade?: string
  estado?: string
  setor: string
  data_aquisicao: Date
  valor_aquisicao: number
  area_terreno: number
  area_construida: number
  latitude?: number
  longitude?: number
  descricao?: string
  observacoes?: string
  tipo_imovel?: string
  situacao?: string
  fotos: string[]
  documentos: string[]
  url_documentos?: string
  documentos_pdf?: File[]
  historico: HistoricoEntry[]
  municipalityId: string
  customFields: Record<string, any>
}

export type ActivityLogAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAIL'
  | 'LOGOUT'
  | 'PATRIMONIO_CREATE'
  | 'PATRIMONIO_UPDATE'
  | 'PATRIMONIO_DELETE'
  | 'PATRIMONIO_SECTOR_CHANGE'
  | 'USER_ROLE_CHANGE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'PASSWORD_VIEW'
  | 'PASSWORD_CHANGE'
  | 'SECTOR_CREATE'
  | 'SECTOR_UPDATE'
  | 'SECTOR_DELETE'
  | 'FORM_FIELD_CREATE'
  | 'FORM_FIELD_UPDATE'
  | 'FORM_FIELD_DELETE'
  | 'FORM_FIELD_REORDER'
  | 'FORM_FIELD_ROLLBACK'
  | 'SYNC_START'
  | 'SYNC_SUCCESS'
  | 'SYNC_FAIL'
  | 'SYNC_CANCEL'

export interface ActivityLog {
  id: string
  timestamp: Date
  userId: string
  userName: string
  action: ActivityLogAction
  details: string
  sector?: string
  municipalityId?: string
}

export interface Theme {
  id: string
  name: string
  colors: {
    background: string
    foreground: string
    card: string
    cardForeground: string
    popover: string
    popoverForeground: string
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    muted: string
    mutedForeground: string
    accent: string
    accentForeground: string
    destructive: string
    destructiveForeground: string
    border: string
    input: string
    ring: string
  }
  borderRadius: string
  fontFamily: string
  municipalityId?: string
}

export interface ReportComponentStyle {
  fontFamily?: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold' | 'lighter' | 'bolder'
  fontStyle?: 'normal' | 'italic'
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  color?: string
  backgroundColor?: string
  padding?: number
  paddingTop?: number
  paddingBottom?: number
  paddingLeft?: number
  paddingRight?: number
  borderColor?: string
  borderWidth?: number
  borderStyle?: 'solid' | 'dashed' | 'dotted'
  borderBottomWidth?: number
  borderTopWidth?: number
}

export type ReportComponentType =
  | 'HEADER'
  | 'TABLE'
  | 'TEXT'
  | 'CHART'
  | 'IMAGE'
  | 'FOOTER'

export interface ReportComponent {
  id: string
  type: ReportComponentType
  x: number
  y: number
  w: number
  h: number
  props?: Record<string, any>
  styles?: ReportComponentStyle
}

export type ReportTemplate = {
  id: string
  name: string
  fields: (keyof Patrimonio)[]
  filters: {
    status?: PatrimonioStatus[]
    setor?: string
    dateRange?: { from: Date; to: Date }
  }
  layout: ReportComponent[]
  municipalityId: string
}

export interface ReportFilters {
  status?: PatrimonioStatus
  situacao_bem?: PatrimonioSituacao
  setor?: string
  tipo?: string
  dateRange?: { from?: Date; to?: Date }
}

export type LabelElementType = 'PATRIMONIO_FIELD' | 'TEXT' | 'QR_CODE' | 'LOGO'

export interface LabelElement {
  id: string
  type: LabelElementType
  x: number
  y: number
  width: number
  height: number
  content: keyof Patrimonio | keyof Imovel | string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  textAlign: 'left' | 'center' | 'right'
}

export interface LabelTemplate {
  id: string
  name: string
  width: number
  height: number
  isDefault?: boolean
  elements: LabelElement[]
  municipalityId: string
}

export interface Sector {
  id: string
  name: string
  sigla: string
  codigo: string
  endereco?: string
  cnpj?: string
  responsavel?: string
  parentId: string | null
  municipalityId: string
}

export type InventoryItemStatus = 'found' | 'not_found'

export interface InventoryItem {
  patrimonioId: string
  numero_patrimonio: string
  descricao_bem: string
  status: InventoryItemStatus
}

export type InventoryStatus = 'in_progress' | 'completed'

export interface Inventory {
  id: string
  name: string
  sectorName: string
  status: InventoryStatus
  createdAt: Date
  finalizedAt?: Date
  items: InventoryItem[]
  scope: 'sector' | 'location' | 'specific_location'
  locationType?: string
  specificLocationId?: string
  municipalityId: string
}

export interface Local {
  id: string
  name: string
  sectorId: string
  municipalityId: string
}

export interface StorageHistoryPoint {
  date: string
  usedGB: number
}

export type FormFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'SELECT'
  | 'CURRENCY'

export interface FormFieldConfig {
  id: string
  key: string
  label: string
  type: FormFieldType
  required: boolean
  defaultValue?: string | number
  options?: string[]
  isCustom: boolean
  isSystem: boolean
}

export interface ImovelFieldConfig extends FormFieldConfig {
  // Campos específicos para imóveis podem ser adicionados aqui
}

export interface ConditionalFormattingRule {
  id: string
  column: keyof Patrimonio
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains'
  value: string | number
  style: 'highlight_yellow' | 'highlight_red' | 'bold_text' | 'red_text'
}

export interface ExcelCsvTemplate {
  id: string
  name: string
  municipalityId: string
  columns: { key: keyof Patrimonio; header: string }[]
  conditionalFormatting?: ConditionalFormattingRule[]
}

export interface NumberingPatternComponent {
  id: string
  type: 'text' | 'year' | 'sequence' | 'sector'
  value?: string
  format?: 'YYYY' | 'YY'
  length?: number
  sectorCodeLength?: number // Para código do setor
}

export interface NumberingPattern {
  municipalityId: string
  components: NumberingPatternComponent[]
}

export type ManutencaoTaskStatus = 'A Fazer' | 'Em Progresso' | 'Concluída'
export type ManutencaoTaskPriority = 'Baixa' | 'Média' | 'Alta'

export interface ManutencaoTask {
  id: string
  imovelId: string
  title: string
  description: string
  assignedTo?: string
  priority: ManutencaoTaskPriority
  dueDate: Date
  status: ManutencaoTaskStatus
  attachments: string[]
  createdAt: Date
  municipalityId: string
}

export interface ImovelReportTemplate {
  id: string
  name: string
  fields: (keyof Imovel | `customFields.${string}`)[]
  filters: Record<string, unknown>
  municipalityId: string
}

export interface Version {
  version: string
  releaseDate: string
  changelog: string[]
}

export interface RollbackHistoryEntry {
  id: string
  timestamp: string
  fromVersion: string
  toVersion: string
  status: 'success' | 'failure'
}

export interface CustomizationSettings {
  activeLogoUrl: string
  secondaryLogoUrl: string
  backgroundType: 'color' | 'image' | 'video'
  backgroundColor: string
  backgroundImageUrl: string
  backgroundVideoUrl: string
  videoLoop: boolean
  videoMuted: boolean
  layout: 'left' | 'center' | 'right'
  welcomeTitle: string
  welcomeSubtitle: string
  primaryColor: string
  buttonTextColor: string
  fontFamily: string
  browserTitle: string
  faviconUrl: string
  loginFooterText: string
  systemFooterText: string
  superUserFooterText?: string
}

export interface SystemConfiguration {
  id: string
  contactInfo: string
  defaultSystemMessage: string
}

export interface GeneralDocument {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  uploadedAt: Date
  uploadedBy: {
    id: string
    name: string
  }
  municipalityId: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  description: string
  type: 'transfer' | 'document' | 'assignment' | 'general'
  link: string
  timestamp: Date
  isRead: boolean
}

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

export interface UserReportConfig {
  id: string
  userId: string
  name: string
  columns: (keyof Patrimonio)[]
  filters: Record<string, unknown>
  format: 'csv' | 'xlsx' | 'pdf'
}

export interface AcquisitionForm {
  id: string
  nome: string
  descricao?: string
  ativo: boolean
  createdAt: Date
  updatedAt: Date
  municipalityId: string
}

export interface TipoBem {
  id: string
  nome: string
  descricao?: string
  codigo: string
  ativo: boolean
  municipalityId: string
  createdAt: Date
  updatedAt: Date
}
