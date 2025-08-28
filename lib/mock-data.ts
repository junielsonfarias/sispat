import {
  User,
  Patrimonio,
  UserRole,
  ActivityLog,
  ActivityLogAction,
  Note,
} from '@/types'
import { generateId } from '@/lib/utils'

let mockUsers: Record<string, User> = {
  '1': {
    id: '1',
    name: 'Junielson Castro Farias',
    email: 'junielsonfarias@gmail.com',
    password: 'Tiko6273@',
    role: 'superuser',
    avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male&seed=1',
    sector: 'Sistema',
    failedLoginAttempts: 0,
    lockoutUntil: null,
  },
  '2': {
    id: '2',
    name: 'Usuário Padrão',
    email: 'usuario@sispat.com',
    password: 'Password123!',
    role: 'usuario',
    avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=female&seed=2',
    sector: 'Secretaria de Educação',
    responsibleSectors: ['Secretaria de Educação'],
    failedLoginAttempts: 0,
    lockoutUntil: null,
    municipalityId: '1',
  },
  '3': {
    id: '3',
    name: 'Visitante',
    email: 'visualizador@sispat.com',
    password: 'Password123!',
    role: 'visualizador',
    avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male&seed=3',
    sector: 'Gabinete',
    responsibleSectors: ['Gabinete'],
    failedLoginAttempts: 0,
    lockoutUntil: null,
    municipalityId: '1',
  },
  '4': {
    id: '4',
    name: 'Supervisor Geral',
    email: 'supervisor@sispat.com',
    password: 'Password123!',
    role: 'supervisor',
    avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=female&seed=4',
    sector: 'Controladoria',
    responsibleSectors: ['Secretaria de Saúde', 'Administração'],
    failedLoginAttempts: 0,
    lockoutUntil: null,
    municipalityId: '1',
  },
}

let mockActivityLogs: ActivityLog[] = [
  {
    id: 'log1',
    timestamp: new Date(new Date().setDate(new Date().getDate() - 1)),
    userId: '1',
    userName: 'Superusuário Principal',
    action: 'LOGIN_SUCCESS',
    details: 'Login bem-sucedido.',
  },
  {
    id: 'log_sector_change',
    timestamp: new Date(new Date().setDate(new Date().getDate() - 1)),
    userId: '4',
    userName: 'Supervisor Geral',
    action: 'PATRIMONIO_SECTOR_CHANGE',
    details:
      'Setor do bem 2024002 alterado de "Administração" para "Secretaria de Saúde".',
    sector: 'Secretaria de Saúde',
    municipalityId: '1',
  },
  {
    id: 'log2',
    timestamp: new Date(new Date().setDate(new Date().getDate() - 2)),
    userId: '2',
    userName: 'Usuário Padrão',
    action: 'PATRIMONIO_CREATE',
    details: 'Criou o patrimônio P005 (Impressora Multifuncional HP).',
    municipalityId: '1',
  },
  {
    id: 'log3',
    timestamp: new Date(new Date().setDate(new Date().getDate() - 2)),
    userId: '1',
    userName: 'Superusuário Principal',
    action: 'USER_ROLE_CHANGE',
    details: 'Alterou o perfil de "Visitante" para "visualizador".',
  },
  {
    id: 'log4',
    timestamp: new Date(),
    userId: '2',
    userName: 'Usuário Padrão',
    action: 'LOGIN_FAIL',
    details: 'Tentativa de login falhou para o e-mail usuario@sispat.com.',
    municipalityId: '1',
  },
]

let mockPatrimonios: Patrimonio[] = [
  {
    id: 'p001',
    numero_patrimonio: '2024001',
    descricao_bem: 'Notebook Dell Vostro 15',
    tipo: 'Eletrônico',
    marca: 'Dell',
    modelo: 'Vostro 15',
    cor: 'Preto',
    numero_serie: 'SN123456',
    data_aquisicao: new Date('2024-01-15'),
    valor_aquisicao: 4500.0,
    quantidade: 1,
    numero_nota_fiscal: 'NF-001',
    forma_aquisicao: 'Compra Direta',
    setor_responsavel: 'Secretaria de Educação',
    local_objeto: 'Sala 101',
    status: 'ativo',
    situacao_bem: 'OTIMO',
    fotos: ['gdrive:1_aBcDeFgHiJkLmNoPqRsTuVwXyZ'],
    documentos: [],
    historico_movimentacao: [
      {
        date: new Date('2024-01-15'),
        action: 'Criação',
        details: 'Bem cadastrado no sistema.',
        user: 'Superusuário Principal',
      },
    ],
    entityName: 'Prefeitura de São Sebastião da Boa Vista',
    notes: [],
    municipalityId: '1',
    metodo_depreciacao: 'Linear',
    vida_util_anos: 5,
    valor_residual: 450,
  },
  {
    id: 'p002',
    numero_patrimonio: '2024002',
    descricao_bem: 'Cadeira de Escritório Giratória',
    tipo: 'Mobiliário',
    marca: 'Flexform',
    modelo: 'Basic',
    cor: 'Azul',
    numero_serie: 'N/A',
    data_aquisicao: new Date('2023-11-20'),
    valor_aquisicao: 350.0,
    quantidade: 1,
    numero_nota_fiscal: 'NF-002',
    forma_aquisicao: 'Licitação',
    setor_responsavel: 'Administração',
    local_objeto: 'Recepção',
    status: 'ativo',
    situacao_bem: 'BOM',
    fotos: ['gdrive:2_aBcDeFgHiJkLmNoPqRsTuVwXyZ'],
    documentos: [],
    historico_movimentacao: [
      {
        date: new Date('2024-03-01'),
        action: 'Transferência',
        details: 'Movido da Secretaria de Obras para a Administração.',
        user: 'Usuário Padrão',
      },
      {
        date: new Date('2023-11-20'),
        action: 'Criação',
        details: 'Bem cadastrado no sistema.',
        user: 'Superusuário Principal',
      },
    ],
    entityName: 'Prefeitura de São Sebastião da Boa Vista',
    notes: [],
    municipalityId: '1',
    metodo_depreciacao: 'Linear',
    vida_util_anos: 10,
    valor_residual: 35,
  },
  {
    id: 'p003',
    numero_patrimonio: '2024003',
    descricao_bem: 'Projetor Epson PowerLite',
    tipo: 'Eletrônico',
    marca: 'Epson',
    modelo: 'PowerLite S41+',
    cor: 'Branco',
    numero_serie: 'SN789012',
    data_aquisicao: new Date('2024-02-10'),
    valor_aquisicao: 2200.0,
    quantidade: 1,
    numero_nota_fiscal: 'NF-003',
    forma_aquisicao: 'Compra Direta',
    setor_responsavel: 'Secretaria de Educação',
    local_objeto: 'Auditório',
    status: 'manutencao',
    situacao_bem: 'REGULAR',
    fotos: ['gdrive:3_aBcDeFgHiJkLmNoPqRsTuVwXyZ'],
    documentos: [],
    historico_movimentacao: [
      {
        date: new Date('2024-03-01'),
        action: 'Manutenção',
        details: 'Enviado para manutenção.',
        user: 'Usuário Padrão',
      },
      {
        date: new Date('2024-02-10'),
        action: 'Criação',
        details: 'Bem cadastrado no sistema.',
        user: 'Superusuário Principal',
      },
    ],
    entityName: 'Prefeitura de São Sebastião da Boa Vista',
    notes: [],
    municipalityId: '1',
    metodo_depreciacao: 'Linear',
    vida_util_anos: 5,
    valor_residual: 220,
  },
  {
    id: 'p004',
    numero_patrimonio: '2024004',
    descricao_bem: 'Mesa de Reunião 8 lugares',
    tipo: 'Mobiliário',
    marca: 'Marelli',
    modelo: 'Concept',
    cor: 'Madeira',
    numero_serie: 'N/A',
    data_aquisicao: new Date('2022-05-30'),
    valor_aquisicao: 1800.0,
    quantidade: 1,
    numero_nota_fiscal: 'NF-004',
    forma_aquisicao: 'Licitação',
    setor_responsavel: 'Gabinete',
    local_objeto: 'Sala de Reuniões',
    status: 'baixado',
    situacao_bem: 'PESSIMO',
    fotos: ['gdrive:4_aBcDeFgHiJkLmNoPqRsTuVwXyZ'],
    documentos: [],
    historico_movimentacao: [
      {
        date: new Date('2024-04-15'),
        action: 'Baixa',
        details: 'Item danificado sem possibilidade de reparo.',
        user: 'Superusuário Principal',
      },
      {
        date: new Date('2022-05-30'),
        action: 'Criação',
        details: 'Bem cadastrado no sistema.',
        user: 'Superusuário Principal',
      },
    ],
    data_baixa: new Date('2024-04-15'),
    motivo_baixa: 'Item danificado sem possibilidade de reparo.',
    entityName: 'Prefeitura de São Sebastião da Boa Vista',
    notes: [],
    municipalityId: '1',
    metodo_depreciacao: 'Linear',
    vida_util_anos: 10,
    valor_residual: 0,
  },
  {
    id: 'p005',
    numero_patrimonio: '2024005',
    descricao_bem: 'Impressora Multifuncional HP',
    tipo: 'Eletrônico',
    marca: 'HP',
    modelo: 'LaserJet Pro M428fdw',
    cor: 'Branco',
    numero_serie: 'SN345678',
    data_aquisicao: new Date('2023-08-01'),
    valor_aquisicao: 1500.0,
    quantidade: 1,
    numero_nota_fiscal: 'NF-005',
    forma_aquisicao: 'Compra Direta',
    setor_responsavel: 'Secretaria de Saúde',
    local_objeto: 'Recepção UBS',
    status: 'ativo',
    situacao_bem: 'RUIM',
    fotos: [],
    documentos: [],
    historico_movimentacao: [
      {
        date: new Date('2023-08-01'),
        action: 'Criação',
        details: 'Bem cadastrado no sistema.',
        user: 'Usuário Padrão',
      },
    ],
    entityName: 'Prefeitura de São Sebastião da Boa Vista',
    notes: [],
    municipalityId: '1',
    metodo_depreciacao: 'Linear',
    vida_util_anos: 5,
    valor_residual: 150,
  },
]

const newMockData: Patrimonio[] = [
  {
    id: 'p006',
    numero_patrimonio: '2024006',
    descricao_bem: 'Monitor Gamer LG UltraGear 27"',
    tipo: 'Eletrônico',
    marca: 'LG',
    modelo: 'UltraGear 27GL850',
    cor: 'Preto com detalhes em vermelho',
    numero_serie: 'SNLG987654',
    data_aquisicao: new Date(),
    valor_aquisicao: 2800.0,
    quantidade: 1,
    numero_nota_fiscal: 'NF-006',
    forma_aquisicao: 'Compra Direta',
    setor_responsavel: 'Administração',
    local_objeto: 'Sala de TI',
    status: 'ativo',
    situacao_bem: 'OTIMO',
    fotos: ['gdrive:6_aBcDeFgHiJkLmNoPqRsTuVwXyZ'],
    documentos: [],
    historico_movimentacao: [
      {
        date: new Date(),
        action: 'Criação',
        details: 'Bem cadastrado no sistema via sincronização.',
        user: 'Sistema',
      },
    ],
    entityName: 'Prefeitura de São Sebastião da Boa Vista',
    notes: [],
    municipalityId: '1',
    metodo_depreciacao: 'Linear',
    vida_util_anos: 5,
    valor_residual: 280,
  },
  {
    id: 'p005',
    numero_patrimonio: '2024005',
    descricao_bem: 'Impressora Multifuncional HP',
    tipo: 'Eletrônico',
    marca: 'HP',
    modelo: 'LaserJet Pro M428fdw',
    cor: 'Branco',
    numero_serie: 'SN345678',
    data_aquisicao: new Date('2023-08-01'),
    valor_aquisicao: 1500.0,
    quantidade: 1,
    numero_nota_fiscal: 'NF-005',
    forma_aquisicao: 'Compra Direta',
    setor_responsavel: 'Secretaria de Saúde',
    local_objeto: 'Consultório 2',
    status: 'ativo',
    situacao_bem: 'BOM',
    fotos: [],
    documentos: [],
    historico_movimentacao: [
      {
        date: new Date(),
        action: 'Atualização',
        details: 'Situação e localização atualizadas via sincronização.',
        user: 'Sistema',
      },
      {
        date: new Date('2023-08-01'),
        action: 'Criação',
        details: 'Bem cadastrado no sistema.',
        user: 'Usuário Padrão',
      },
    ],
    entityName: 'Prefeitura de São Sebastião da Boa Vista',
    notes: [],
    municipalityId: '1',
    metodo_depreciacao: 'Linear',
    vida_util_anos: 5,
    valor_residual: 150,
  },
]

export const getNewMockPatrimonios = (): Patrimonio[] => {
  return JSON.parse(JSON.stringify(newMockData))
}

export const getMockUsers = (): Record<string, User> =>
  JSON.parse(JSON.stringify(mockUsers))
export const getMockActivityLogs = (): ActivityLog[] =>
  JSON.parse(JSON.stringify(mockActivityLogs))
export const getMockPatrimonios = (): Patrimonio[] =>
  JSON.parse(JSON.stringify(mockPatrimonios))

export const logActivity = (
  user: Partial<User>,
  action: ActivityLogAction,
  details: string,
): void => {
  const newLog: ActivityLog = {
    id: `log${mockActivityLogs.length + 1}`,
    timestamp: new Date(),
    userId: user.id || 'system',
    userName: user.name || 'System',
    action,
    details,
  }
  mockActivityLogs.unshift(newLog)
}

interface AddUserParams {
  name: string
  email: string
  role: UserRole
  password?: string
  responsibleSectors?: string[]
}

export const addUser = async (
  userData: AddUserParams,
): Promise<{ success: boolean; message: string; newUser?: User }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const emailExists = Object.values(mockUsers).some(
        (user) => user.email === userData.email,
      )

      if (emailExists) {
        resolve({ success: false, message: 'E-mail já cadastrado.' })
        return
      }

      const newId = `${Object.keys(mockUsers).length + 1}`
      const newUser: User = {
        id: newId,
        name: userData.name,
        email: userData.email,
        password: userData.password || 'Password123!',
        role: userData.role,
        avatarUrl: `https://img.usecurling.com/ppl/medium?seed=${newId}`,
        sector: 'Administração',
        responsibleSectors: userData.responsibleSectors || [],
        failedLoginAttempts: 0,
        lockoutUntil: null,
      }

      mockUsers[newId] = newUser

      resolve({
        success: true,
        message: 'Usuário criado com sucesso!',
        newUser,
      })
    }, 500)
  })
}

export const updateUser = async (
  userId: string,
  userData: Partial<User>,
): Promise<{ success: boolean; message: string; updatedUser?: User }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!mockUsers[userId]) {
        resolve({ success: false, message: 'Usuário não encontrado.' })
        return
      }

      mockUsers[userId] = { ...mockUsers[userId], ...userData }

      resolve({
        success: true,
        message: 'Usuário atualizado com sucesso!',
        updatedUser: mockUsers[userId],
      })
    }, 500)
  })
}

export const deleteUser = async (
  userId: string,
): Promise<{ success: boolean; message: string }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!mockUsers[userId]) {
        resolve({ success: false, message: 'Usuário não encontrado.' })
        return
      }

      delete mockUsers[userId]

      resolve({
        success: true,
        message: 'Usuário excluído com sucesso!',
      })
    }, 500)
  })
}

export const addPatrimonioNote = async (
  patrimonioId: string,
  noteData: { text: string; userId: string; userName: string },
): Promise<{
  success: boolean
  message?: string
  updatedPatrimonio?: Patrimonio
}> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const patrimonioIndex = mockPatrimonios.findIndex(
        (p) => p.id === patrimonioId,
      )

      if (patrimonioIndex === -1) {
        resolve({ success: false, message: 'Patrimônio não encontrado.' })
        return
      }

      const newNote: Note = {
        id: generateId(),
        text: noteData.text,
        date: new Date(),
        userId: noteData.userId,
        userName: noteData.userName,
      }

      const updatedPatrimonio = { ...mockPatrimonios[patrimonioIndex] }
      if (!updatedPatrimonio.notes) {
        updatedPatrimonio.notes = []
      }
      updatedPatrimonio.notes.unshift(newNote)

      mockPatrimonios[patrimonioIndex] = updatedPatrimonio

      resolve({
        success: true,
        updatedPatrimonio,
      })
    }, 300)
  })
}

type PatrimonioCreationData = Omit<
  Patrimonio,
  | 'id'
  | 'numero_patrimonio'
  | 'status'
  | 'historico_movimentacao'
  | 'entityName'
  | 'notes'
  | 'fotos'
  | 'data_aquisicao'
> & { data_aquisicao: string; fotos: string[] }

export const addPatrimonio = async (
  data: PatrimonioCreationData,
  creatingUser: User,
): Promise<{
  success: boolean
  message: string
  newPatrimonio?: Patrimonio
}> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!data.descricao_bem || !data.setor_responsavel) {
        resolve({
          success: false,
          message: 'Dados inválidos. Descrição e setor são obrigatórios.',
        })
        return
      }

      const lastPatrimonio = [...mockPatrimonios].sort((a, b) =>
        a.numero_patrimonio.localeCompare(b.numero_patrimonio),
      )[mockPatrimonios.length - 1]
      const lastNumber = lastPatrimonio
        ? parseInt(lastPatrimonio.numero_patrimonio.slice(4))
        : 0
      const newPatrimonioNumber = `2024${(lastNumber + 1)
        .toString()
        .padStart(3, '0')}`

      const newPatrimonio: Patrimonio = {
        ...data,
        id: generateId(),
        numero_patrimonio: newPatrimonioNumber,
        data_aquisicao: new Date(data.data_aquisicao),
        status: 'ativo',
        fotos: data.fotos,
        historico_movimentacao: [
          {
            date: new Date(),
            action: 'Criação',
            details: 'Bem cadastrado no sistema.',
            user: creatingUser.name,
          },
        ],
        entityName: 'Prefeitura de São Sebastião da Boa Vista',
        notes: [],
      }

      mockPatrimonios.push(newPatrimonio)

      logActivity(
        creatingUser,
        'PATRIMONIO_CREATE',
        `Criou o patrimônio ${newPatrimonio.numero_patrimonio} (${newPatrimonio.descricao_bem}).`,
      )

      resolve({
        success: true,
        message: 'Patrimônio cadastrado com sucesso!',
        newPatrimonio,
      })
    }, 1000)
  })
}
