import { 
  User, 
  Municipality, 
  Patrimonio, 
  Imovel, 
  Sector, 
  Local, 
  ActivityLog,
  HistoricoEntry,
  Note,
  Emprestimo,
  Transferencia,
  SubPatrimonio,
  Inventory,
  InventoryItem,
  ManutencaoTask,
  Notification,
  SystemConfiguration,
  GeneralDocument,
  CustomizationSettings,
  Theme,
  ReportTemplate,
  LabelTemplate,
  ExcelCsvTemplate,
  NumberingPattern,
  FormFieldConfig,
  ImovelFieldConfig,
  ConditionalFormattingRule,
  UserReportConfig,
  Version,
  RollbackHistoryEntry,
  StorageHistoryPoint,
  AcquisitionForm,
  TipoBem
} from '@/types'

// Dados mockados do município
export const mockMunicipality: Municipality = {
  id: 'municipality-1',
  name: 'Prefeitura Municipal de São Paulo',
  logoUrl: '/logo-prefeitura.png',
  supervisorId: 'user-1',
  fullAddress: 'Viaduto do Chá, 15 - Centro, São Paulo - SP, 01002-020',
  cnpj: '12.345.678/0001-90',
  contactEmail: 'contato@prefeitura.sp.gov.br',
  mayorName: 'João Silva',
  mayorCpf: '123.456.789-00',
  accessStartDate: '2024-01-01',
  accessEndDate: '2024-12-31',
  history: [
    {
      date: new Date('2024-01-01'),
      user: 'Sistema',
      change: 'Sistema inicializado'
    }
  ]
}

// Dados mockados dos usuários
export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Super Usuário',
    email: 'superuser@prefeitura.sp.gov.br',
    role: 'superuser',
    avatarUrl: '/avatars/superuser.jpg',
    sector: 'TI',
    responsibleSectors: ['TI', 'Administração'],
    municipalityId: 'municipality-1'
  },
  {
    id: 'user-2',
    name: 'Administrador',
    email: 'admin@prefeitura.sp.gov.br',
    role: 'admin',
    avatarUrl: '/avatars/admin.jpg',
    sector: 'Administração',
    responsibleSectors: ['Administração'],
    municipalityId: 'municipality-1'
  },
  {
    id: 'user-3',
    name: 'Supervisor',
    email: 'supervisor@prefeitura.sp.gov.br',
    role: 'supervisor',
    avatarUrl: '/avatars/supervisor.jpg',
    sector: 'Patrimônio',
    responsibleSectors: ['Patrimônio'],
    municipalityId: 'municipality-1'
  },
  {
    id: 'user-4',
    name: 'Usuário Comum',
    email: 'usuario@prefeitura.sp.gov.br',
    role: 'usuario',
    avatarUrl: '/avatars/usuario.jpg',
    sector: 'Educação',
    responsibleSectors: ['Educação'],
    municipalityId: 'municipality-1'
  },
  {
    id: 'user-5',
    name: 'Visualizador',
    email: 'visualizador@prefeitura.sp.gov.br',
    role: 'visualizador',
    avatarUrl: '/avatars/visualizador.jpg',
    sector: 'Contabilidade',
    responsibleSectors: ['Contabilidade'],
    municipalityId: 'municipality-1'
  }
]

// Dados mockados dos setores
export const mockSectors: Sector[] = [
  {
    id: 'sector-1',
    name: 'Gabinete do Prefeito',
    sigla: 'GAB',
    codigo: '001',
    endereco: 'Viaduto do Chá, 15 - Centro',
    cnpj: '12.345.678/0001-90',
    responsavel: 'João Silva',
    parentId: null,
    municipalityId: 'municipality-1'
  },
  {
    id: 'sector-2',
    name: 'Secretaria de Educação',
    sigla: 'SED',
    codigo: '002',
    endereco: 'Rua da Educação, 100',
    cnpj: '12.345.678/0001-90',
    responsavel: 'Maria Santos',
    parentId: null,
    municipalityId: 'municipality-1'
  },
  {
    id: 'sector-3',
    name: 'Escola Municipal João Silva',
    sigla: 'EMJS',
    codigo: '003',
    endereco: 'Rua da Escola, 200',
    cnpj: '12.345.678/0001-90',
    responsavel: 'Pedro Costa',
    parentId: 'sector-2',
    municipalityId: 'municipality-1'
  }
]

// Dados mockados dos locais
export const mockLocals: Local[] = [
  {
    id: 'local-1',
    name: 'Almoxarifado Central',
    sectorId: 'sector-1',
    municipalityId: 'municipality-1'
  },
  {
    id: 'local-2',
    name: 'Sala dos Professores',
    sectorId: 'sector-3',
    municipalityId: 'municipality-1'
  },
  {
    id: 'local-3',
    name: 'Laboratório de Informática',
    sectorId: 'sector-3',
    municipalityId: 'municipality-1'
  }
]

// Dados mockados dos patrimônios
export const mockPatrimonios: Patrimonio[] = [
  {
    id: 'patrimonio-1',
    numero_patrimonio: 'SP-2024-001',
    descricao_bem: 'Notebook Dell Inspiron 15',
    tipo: 'Equipamento de Informática',
    marca: 'Dell',
    modelo: 'Inspiron 15 3000',
    cor: 'Preto',
    numero_serie: 'DL123456789',
    data_aquisicao: new Date('2024-01-15'),
    valor_aquisicao: 2500.00,
    quantidade: 1,
    numero_nota_fiscal: 'NF-001-2024',
    forma_aquisicao: 'Compra Direta',
    setor_responsavel: 'Secretaria de Educação',
    local_objeto: 'Sala dos Professores',
    status: 'ativo',
    situacao_bem: 'OTIMO',
    fotos: ['/fotos/notebook-1.jpg', '/fotos/notebook-2.jpg'],
    documentos: ['/docs/notebook-manual.pdf', '/docs/notebook-garantia.pdf'],
    historico_movimentacao: [
      {
        date: new Date('2024-01-15'),
        action: 'Cadastro',
        details: 'Patrimônio cadastrado no sistema',
        user: 'Administrador',
        origem: 'Sistema',
        destino: 'Secretaria de Educação'
      }
    ],
    entityName: 'Patrimônio',
    notes: [
      {
        id: 'note-1',
        text: 'Equipamento em perfeito estado',
        date: new Date('2024-01-15'),
        userId: 'user-2',
        userName: 'Administrador'
      }
    ],
    municipalityId: 'municipality-1',
    customFields: {
      'processador': 'Intel Core i5',
      'memoria_ram': '8GB',
      'armazenamento': '256GB SSD'
    },
    metodo_depreciacao: 'Linear',
    vida_util_anos: 5,
    valor_residual: 250.00,
    createdAt: new Date('2024-01-15'),
    createdBy: 'Administrador',
    updatedAt: new Date('2024-01-15'),
    updatedBy: 'Administrador',
    eh_kit: false,
    quantidade_unidades: 1
  },
  {
    id: 'patrimonio-2',
    numero_patrimonio: 'SP-2024-002',
    descricao_bem: 'Projetor Epson PowerLite',
    tipo: 'Equipamento de Projeção',
    marca: 'Epson',
    modelo: 'PowerLite 1781W',
    cor: 'Branco',
    numero_serie: 'EP987654321',
    data_aquisicao: new Date('2024-02-10'),
    valor_aquisicao: 1200.00,
    quantidade: 1,
    numero_nota_fiscal: 'NF-002-2024',
    forma_aquisicao: 'Compra Direta',
    setor_responsavel: 'Secretaria de Educação',
    local_objeto: 'Laboratório de Informática',
    status: 'ativo',
    situacao_bem: 'BOM',
    fotos: ['/fotos/projetor-1.jpg'],
    documentos: ['/docs/projetor-manual.pdf'],
    historico_movimentacao: [
      {
        date: new Date('2024-02-10'),
        action: 'Cadastro',
        details: 'Patrimônio cadastrado no sistema',
        user: 'Administrador',
        origem: 'Sistema',
        destino: 'Secretaria de Educação'
      }
    ],
    entityName: 'Patrimônio',
    municipalityId: 'municipality-1',
    customFields: {
      'resolucao': 'WXGA (1280x800)',
      'luminosidade': '3200 lumens',
      'conectividade': 'WiFi, HDMI, USB'
    },
    metodo_depreciacao: 'Linear',
    vida_util_anos: 4,
    valor_residual: 120.00,
    eh_kit: false,
    quantidade_unidades: 1,
    createdAt: new Date('2024-02-10'),
    createdBy: 'Administrador',
    updatedAt: new Date('2024-02-10'),
    updatedBy: 'Administrador'
  }
]

// Dados mockados dos imóveis
export const mockImoveis: Imovel[] = [
  {
    id: 'imovel-1',
    numero_patrimonio: 'IM-2024-001',
    denominacao: 'Paço Municipal',
    endereco: 'Viaduto do Chá, 15 - Centro, São Paulo - SP',
    setor: 'Gabinete do Prefeito',
    data_aquisicao: new Date('1950-01-01'),
    valor_aquisicao: 5000000.00,
    area_terreno: 5000.00,
    area_construida: 3000.00,
    latitude: -23.5505,
    longitude: -46.6333,
    descricao: 'Sede histórica da prefeitura municipal, construída em estilo neoclássico com arquitetura imponente.',
    observacoes: 'Prédio tombado pelo patrimônio histórico. Requer manutenção especializada.',
    tipo_imovel: 'publico',
    situacao: 'ativo',
    fotos: ['/fotos/paco-1.jpg', '/fotos/paco-2.jpg'],
    documentos: ['/docs/paco-planta.pdf', '/docs/paco-escritura.pdf'],
    historico: [
      {
        date: new Date('1950-01-01'),
        action: 'Construção',
        details: 'Prédio construído para sede da prefeitura',
        user: 'Sistema',
        origem: 'Sistema',
        destino: 'Gabinete do Prefeito'
      }
    ],
    municipalityId: 'municipality-1',
    customFields: {
      'tipo_construcao': 'Alvenaria',
      'numero_pavimentos': '5',
      'ano_construcao': '1950'
    }
  }
]

// Dados mockados dos logs de atividade
export const mockActivityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    userId: 'user-2',
    userName: 'Administrador',
    action: 'PATRIMONIO_CREATE',
    details: 'Criado patrimônio SP-2024-001',
    sector: 'Secretaria de Educação',
    municipalityId: 'municipality-1'
  },
  {
    id: 'log-2',
    timestamp: new Date('2024-02-10T14:30:00Z'),
    userId: 'user-2',
    userName: 'Administrador',
    action: 'PATRIMONIO_CREATE',
    details: 'Criado patrimônio SP-2024-002',
    sector: 'Secretaria de Educação',
    municipalityId: 'municipality-1'
  },
  {
    id: 'log-3',
    timestamp: new Date('2024-01-01T08:00:00Z'),
    userId: 'user-1',
    userName: 'Super Usuário',
    action: 'LOGIN_SUCCESS',
    details: 'Login realizado com sucesso',
    municipalityId: 'municipality-1'
  }
]

// Dados mockados das transferências
export const mockTransferencias: Transferencia[] = [
  {
    id: 'transfer-1',
    patrimonioId: 'patrimonio-1',
    patrimonioNumero: 'SP-2024-001',
    patrimonioDescricao: 'Notebook Dell Inspiron 15',
    type: 'transferencia',
    setorOrigem: 'Secretaria de Educação',
    setorDestino: 'Gabinete do Prefeito',
    solicitanteId: 'user-3',
    solicitanteNome: 'Supervisor',
    dataSolicitacao: new Date('2024-03-01'),
    motivo: 'Necessidade de equipamento para reuniões',
    status: 'pendente',
    municipalityId: 'municipality-1'
  }
]

// Dados mockados dos empréstimos
export const mockEmprestimos: Emprestimo[] = [
  {
    id: 'emprestimo-1',
    data_emprestimo: new Date('2024-02-15'),
    data_devolucao_prevista: new Date('2024-03-15'),
    destinatario: 'João Silva',
    termo_responsabilidade_url: '/docs/termo-1.pdf',
    data_devolucao_real: new Date('2024-03-10')
  }
]

// Dados mockados dos sub-patrimônios
export const mockSubPatrimonios: SubPatrimonio[] = [
  {
    id: 'sub-1',
    patrimonio_id: 'patrimonio-1',
    numero_subpatrimonio: 'SP-2024-001-01',
    status: 'ativo',
    localizacao_especifica: 'Mesa do Professor João',
    observacoes: 'Equipamento em uso regular',
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15')
  }
]

// Dados mockados dos inventários
export const mockInventarios: Inventory[] = [
  {
    id: 'inventory-1',
    name: 'Inventário 2024 - Secretaria de Educação',
    sectorName: 'Secretaria de Educação',
    status: 'completed',
    createdAt: new Date('2024-01-01'),
    finalizedAt: new Date('2024-01-31'),
    items: [
      {
        patrimonioId: 'patrimonio-1',
        numero_patrimonio: 'SP-2024-001',
        descricao_bem: 'Notebook Dell Inspiron 15',
        status: 'found'
      }
    ],
    scope: 'sector',
    municipalityId: 'municipality-1'
  }
]

// Dados mockados das tarefas de manutenção
export const mockManutencaoTasks: ManutencaoTask[] = [
  {
    id: 'task-1',
    imovelId: 'imovel-1',
    title: 'Manutenção do Sistema Elétrico',
    description: 'Verificar e corrigir problemas no sistema elétrico do prédio',
    assignedTo: 'user-4',
    priority: 'Alta',
    dueDate: new Date('2024-04-01'),
    status: 'A Fazer',
    attachments: ['/docs/manutencao-eletrica.pdf'],
    createdAt: new Date('2024-03-01'),
    municipalityId: 'municipality-1'
  }
]

// Dados mockados das notificações
export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'user-2',
    title: 'Nova Transferência Solicitada',
    description: 'Transferência do patrimônio SP-2024-001 solicitada',
    type: 'transfer',
    link: '/transferencias/transfer-1',
    timestamp: new Date('2024-03-01T10:00:00Z'),
    isRead: false
  }
]

// Dados mockados da configuração do sistema
export const mockSystemConfiguration: SystemConfiguration = {
  id: 'config-1',
  contactInfo: 'contato@prefeitura.sp.gov.br',
  defaultSystemMessage: 'Bem-vindo ao SISPAT 2.0'
}

// Dados mockados dos documentos gerais
export const mockGeneralDocuments: GeneralDocument[] = [
  {
    id: 'doc-1',
    fileName: 'Manual do Usuário.pdf',
    fileUrl: '/docs/manual-usuario.pdf',
    fileSize: 2048000,
    fileType: 'application/pdf',
    uploadedAt: new Date('2024-01-01'),
    uploadedBy: {
      id: 'user-1',
      name: 'Super Usuário'
    },
    municipalityId: 'municipality-1'
  }
]

// Dados mockados das configurações de personalização
export const mockCustomizationSettings: CustomizationSettings = {
  activeLogoUrl: '/logo-prefeitura.png',
  secondaryLogoUrl: '/logo-secundario.png',
  backgroundType: 'color',
  backgroundColor: '#f8f9fa',
  backgroundImageUrl: '',
  backgroundVideoUrl: '',
  videoLoop: false,
  videoMuted: true,
  layout: 'center',
  welcomeTitle: 'Bem-vindo ao SISPAT 2.0',
  welcomeSubtitle: 'Sistema Integrado de Patrimônio',
  primaryColor: '#2563eb',
  buttonTextColor: '#ffffff',
  fontFamily: 'Inter',
  browserTitle: 'SISPAT 2.0',
  faviconUrl: '/favicon.ico',
  loginFooterText: 'Prefeitura Municipal de São Paulo',
  systemFooterText: 'SISPAT 2.0 - Sistema Integrado de Patrimônio',
  superUserFooterText: 'Área do Super Usuário'
}

// Dados mockados dos temas
export const mockThemes: Theme[] = [
  {
    id: 'theme-1',
    name: 'Tema Padrão',
    colors: {
      background: '#ffffff',
      foreground: '#0f172a',
      card: '#ffffff',
      cardForeground: '#0f172a',
      popover: '#ffffff',
      popoverForeground: '#0f172a',
      primary: '#2563eb',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      accent: '#f1f5f9',
      accentForeground: '#0f172a',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      border: '#e2e8f0',
      input: '#e2e8f0',
      ring: '#2563eb'
    },
    borderRadius: '0.5rem',
    fontFamily: 'Inter',
    municipalityId: 'municipality-1'
  }
]

// Dados mockados dos templates de relatório
export const mockReportTemplates: ReportTemplate[] = [
  {
    id: 'template-1',
    name: 'Relatório de Patrimônios Ativos',
    fields: ['numero_patrimonio', 'descricao_bem', 'valor_aquisicao', 'setor_responsavel'],
    filters: {
      status: ['ativo']
    },
    layout: [],
    municipalityId: 'municipality-1'
  }
]

// Dados mockados dos templates de etiqueta
export const mockLabelTemplates: LabelTemplate[] = [
  {
    id: 'label-1',
    name: 'Etiqueta Padrão',
    width: 100,
    height: 50,
    isDefault: true,
    elements: [
      {
        id: 'elem-1',
        type: 'PATRIMONIO_FIELD',
        x: 10,
        y: 10,
        width: 80,
        height: 15,
        content: 'numero_patrimonio',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center'
      }
    ],
    municipalityId: 'municipality-1'
  }
]

// Dados mockados dos templates Excel/CSV
export const mockExcelCsvTemplates: ExcelCsvTemplate[] = [
  {
    id: 'excel-1',
    name: 'Exportação Padrão',
    municipalityId: 'municipality-1',
    columns: [
      { key: 'numero_patrimonio', header: 'Número do Patrimônio' },
      { key: 'descricao_bem', header: 'Descrição' },
      { key: 'valor_aquisicao', header: 'Valor' }
    ],
    conditionalFormatting: []
  }
]

// Dados mockados dos padrões de numeração
export const mockNumberingPatterns: NumberingPattern = {
  municipalityId: 'municipality-1',
  components: [
    {
      id: 'comp-1',
      type: 'text',
      value: 'SP'
    },
    {
      id: 'comp-2',
      type: 'year',
      format: 'YYYY'
    },
    {
      id: 'comp-3',
      type: 'sequence',
      length: 3
    }
  ]
}

// Dados mockados dos campos de formulário
export const mockFormFields: FormFieldConfig[] = [
  {
    id: 'field-1',
    key: 'processador',
    label: 'Processador',
    type: 'TEXT',
    required: false,
    isCustom: true,
    isSystem: false
  }
]

// Dados mockados dos campos de imóvel
export const mockImovelFields: ImovelFieldConfig[] = [
  {
    id: 'imovel-field-1',
    key: 'tipo_construcao',
    label: 'Tipo de Construção',
    type: 'SELECT',
    required: false,
    options: ['Alvenaria', 'Concreto', 'Madeira', 'Metal'],
    isCustom: true,
    isSystem: false
  }
]

// Dados mockados das regras de formatação condicional
export const mockConditionalFormattingRules: ConditionalFormattingRule[] = [
  {
    id: 'rule-1',
    column: 'status',
    operator: 'equals',
    value: 'inativo',
    style: 'highlight_red'
  }
]

// Dados mockados das configurações de relatório do usuário
export const mockUserReportConfigs: UserReportConfig[] = [
  {
    id: 'user-report-1',
    userId: 'user-2',
    name: 'Meu Relatório Padrão',
    columns: ['numero_patrimonio', 'descricao_bem', 'valor_aquisicao'],
    filters: {},
    format: 'pdf'
  }
]

// Dados mockados das versões
export const mockVersions: Version[] = [
  {
    version: '2.0.0',
    releaseDate: '2024-01-01',
    changelog: [
      'Versão inicial do SISPAT 2.0',
      'Sistema completo de gestão patrimonial',
      'Interface moderna e responsiva'
    ]
  }
]

// Dados mockados do histórico de rollback
export const mockRollbackHistory: RollbackHistoryEntry[] = [
  {
    id: 'rollback-1',
    timestamp: '2024-01-01T10:00:00Z',
    fromVersion: '1.0.0',
    toVersion: '2.0.0',
    status: 'success'
  }
]

// Dados mockados do histórico de armazenamento
export const mockStorageHistory: StorageHistoryPoint[] = [
  {
    date: '2024-01-01',
    usedGB: 2.5
  },
  {
    date: '2024-02-01',
    usedGB: 3.2
  },
  {
    date: '2024-03-01',
    usedGB: 4.1
  }
]

// Dados mockados para dashboard
export const mockDashboardStats = {
  totalPatrimonios: 2,
  totalImoveis: 1,
  totalUsuarios: 5,
  totalSetores: 3,
  totalLocais: 3,
  valorTotal: 154850.00,
  patrimoniosAtivos: 2,
  patrimoniosInativos: 0,
  patrimoniosManutencao: 0,
  patrimoniosBaixados: 0,
  patrimoniosExtraviados: 0,
  transferenciasPendentes: 1,
  manutencoesPendentes: 1,
  ultimasAtividades: mockActivityLogs.slice(0, 5),
  patrimoniosRecentes: mockPatrimonios.slice(0, 2),
  setoresComMaisPatrimonios: [
    { setor: 'Secretaria de Educação', quantidade: 2 },
    { setor: 'Gabinete do Prefeito', quantidade: 0 }
  ]
}

// Dados mockados para autenticação
export const mockAuthData = {
  user: mockUsers[0], // Super Usuário
  token: 'mock-jwt-token-12345',
  refreshToken: 'mock-refresh-token-67890',
  expiresIn: 3600
}

// Dados mockados para consulta pública
export const mockPublicPatrimonio = {
  id: 'patrimonio-1',
  numero_patrimonio: 'SP-2024-001',
  descricao_bem: 'Notebook Dell Inspiron 15',
  tipo: 'Equipamento de Informática',
  marca: 'Dell',
  modelo: 'Inspiron 15 3000',
  cor: 'Preto',
  numero_serie: 'DL123456789',
  data_aquisicao: '2024-01-15',
  valor_aquisicao: 2500.00,
  status: 'ativo',
  situacao_bem: 'OTIMO',
  setor_responsavel: 'Secretaria de Educação',
  local_objeto: 'Sala dos Professores',
  municipalityName: 'Prefeitura Municipal de São Paulo',
  municipalityLogo: '/logo-prefeitura.png'
}

// Dados mockados para formas de aquisição
export const mockAcquisitionForms: AcquisitionForm[] = [
  {
    id: 'acquisition-form-1',
    nome: 'Compra Direta',
    descricao: 'Aquisição através de compra direta',
    ativo: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    municipalityId: 'municipality-1'
  },
  {
    id: 'acquisition-form-2',
    nome: 'Doação',
    descricao: 'Bem recebido através de doação',
    ativo: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    municipalityId: 'municipality-1'
  },
  {
    id: 'acquisition-form-3',
    nome: 'Transferência',
    descricao: 'Bem transferido de outro órgão',
    ativo: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    municipalityId: 'municipality-1'
  },
  {
    id: 'acquisition-form-4',
    nome: 'Licitação',
    descricao: 'Aquisição através de processo licitatório',
    ativo: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    municipalityId: 'municipality-1'
  },
  {
    id: 'acquisition-form-5',
    nome: 'Convênio',
    descricao: 'Aquisição através de convênio',
    ativo: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    municipalityId: 'municipality-1'
  }
]

// Dados mockados para tipos de bens
export const mockTiposBens: TipoBem[] = [
  {
    id: 'tipo-bem-1',
    nome: 'Equipamento de Informática',
    descricao: 'Computadores, notebooks, tablets e equipamentos relacionados',
    codigo: 'INFO',
    ativo: true,
    municipalityId: 'municipality-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'tipo-bem-2',
    nome: 'Mobiliário',
    descricao: 'Mesas, cadeiras, armários e outros móveis',
    codigo: 'MOB',
    ativo: true,
    municipalityId: 'municipality-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'tipo-bem-3',
    nome: 'Veículo',
    descricao: 'Carros, motos, caminhões e outros veículos',
    codigo: 'VEIC',
    ativo: true,
    municipalityId: 'municipality-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'tipo-bem-4',
    nome: 'Equipamento Médico',
    descricao: 'Equipamentos e instrumentos médicos',
    codigo: 'MED',
    ativo: true,
    municipalityId: 'municipality-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'tipo-bem-5',
    nome: 'Equipamento de Limpeza',
    descricao: 'Aspiradores, enceradeiras e equipamentos de limpeza',
    codigo: 'LIMP',
    ativo: false,
    municipalityId: 'municipality-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]
