import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Mock providers para testes
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Mock data helpers
export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  municipalityId: '1',
  ...overrides,
})

export const createMockPatrimonio = (overrides = {}) => ({
  id: 'pat-1',
  numero_patrimonio: '2025-001',
  descricao_bem: 'Notebook Test',
  tipo: 'Eletrônico',
  marca: 'Dell',
  modelo: 'Latitude',
  cor: 'Preto',
  numero_serie: 'SN123456',
  data_aquisicao: new Date('2025-01-01'),
  valor_aquisicao: 3500,
  quantidade: 1,
  numero_nota_fiscal: 'NF-001',
  forma_aquisicao: 'Compra',
  setor_responsavel: 'TI',
  local_objeto: 'Sala 1',
  status: 'ativo',
  situacao_bem: 'OTIMO',
  fotos: [],
  documentos: [],
  historico_movimentacao: [],
  entityName: 'Prefeitura Test',
  municipalityId: '1',
  createdAt: new Date(),
  createdBy: 'user-1',
  ...overrides,
})

export const createMockImovel = (overrides = {}) => ({
  id: 'imov-1',
  numero_patrimonio: '2025-I-001',
  denominacao: 'Prédio Test',
  endereco: 'Rua Test, 123',
  setor: 'Educação',
  area_total: 500,
  area_construida: 300,
  municipalityId: '1',
  ...overrides,
})

