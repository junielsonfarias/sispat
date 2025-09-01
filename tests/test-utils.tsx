import { render, RenderOptions } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

// Create comprehensive mock values for all contexts
const mockAuthValue = {
  user: null,
  login: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
  checkAuth: jest.fn(),
  token: null,
}

const mockMunicipalityValue = {
  municipalities: [],
  isLoading: false,
  fetchMunicipalities: jest.fn(),
  selectedMunicipality: null,
  setSelectedMunicipality: jest.fn(),
}

const mockPatrimonioValue = {
  patrimonios: [],
  isLoading: false,
  fetchPatrimonios: jest.fn(),
  createPatrimonio: jest.fn(),
  updatePatrimonio: jest.fn(),
  deletePatrimonio: jest.fn(),
  getPatrimonio: jest.fn(),
  searchPatrimonios: jest.fn(),
  totalCount: 0,
  currentPage: 1,
  setCurrentPage: jest.fn(),
  filters: {},
  setFilters: jest.fn(),
}

const mockActivityLogValue = {
  logs: [],
  isLoading: false,
  fetchLogs: jest.fn(),
  totalCount: 0,
  currentPage: 1,
  setCurrentPage: jest.fn(),
}

const mockSectorValue = {
  sectors: [],
  isLoading: false,
  fetchSectors: jest.fn(),
  createSector: jest.fn(),
  updateSector: jest.fn(),
  deleteSector: jest.fn(),
}

const mockLocalValue = {
  locals: [],
  isLoading: false,
  fetchLocals: jest.fn(),
  createLocal: jest.fn(),
  updateLocal: jest.fn(),
  deleteLocal: jest.fn(),
}

const mockThemeValue = {
  theme: 'light' as const,
  setTheme: jest.fn(),
  toggleTheme: jest.fn(),
}

const mockNotificationValue = {
  notifications: [],
  addNotification: jest.fn(),
  removeNotification: jest.fn(),
  markAsRead: jest.fn(),
}

// Mock all context providers with comprehensive values
const MockProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="mock-providers">
      {children}
    </div>
  )
}

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    initialEntries?: string[]
    wrapper?: React.ComponentType<any>
  }
) => {
  const { initialEntries = ['/'], wrapper, ...renderOptions } = options || {}

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const content = (
      <MockProviders>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </MockProviders>
    )
    
    return wrapper ? React.createElement(wrapper, {}, content) : content
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock fetch responses
export const mockFetch = (response: any, status = 200) => {
  const mockResponse = {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  }
  
  vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)
}

// Mock user data
export const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin' as const,
  municipalityId: '1',
}

// Mock municipality data
export const mockMunicipality = {
  id: '1',
  name: 'Município Teste',
  code: 'MT001',
  state: 'TE',
  active: true,
}

// Mock patrimonio data
export const mockPatrimonio = {
  id: 'p001',
  numero_patrimonio: '2024001',
  descricao: 'Computador Desktop',
  categoria: 'Equipamentos de Informática',
  valor: 2500.00,
  status: 'ativo' as const,
  municipality_id: '1',
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

