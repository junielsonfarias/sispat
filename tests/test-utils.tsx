import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Create comprehensive mock values for all contexts
const mockAuthValue = {
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
  checkAuth: vi.fn(),
  token: null,
}

const mockMunicipalityValue = {
  municipalities: [],
  isLoading: false,
  fetchMunicipalities: vi.fn(),
  selectedMunicipality: null,
  setSelectedMunicipality: vi.fn(),
}

const mockPatrimonioValue = {
  patrimonios: [],
  isLoading: false,
  fetchPatrimonios: vi.fn(),
  createPatrimonio: vi.fn(),
  updatePatrimonio: vi.fn(),
  deletePatrimonio: vi.fn(),
  getPatrimonio: vi.fn(),
  searchPatrimonios: vi.fn(),
  totalCount: 0,
  currentPage: 1,
  setCurrentPage: vi.fn(),
  filters: {},
  setFilters: vi.fn(),
}

const mockActivityLogValue = {
  logs: [],
  isLoading: false,
  fetchLogs: vi.fn(),
  totalCount: 0,
  currentPage: 1,
  setCurrentPage: vi.fn(),
}

const mockSectorValue = {
  sectors: [],
  isLoading: false,
  fetchSectors: vi.fn(),
  createSector: vi.fn(),
  updateSector: vi.fn(),
  deleteSector: vi.fn(),
}

const mockLocalValue = {
  locals: [],
  isLoading: false,
  fetchLocals: vi.fn(),
  createLocal: vi.fn(),
  updateLocal: vi.fn(),
  deleteLocal: vi.fn(),
}

const mockThemeValue = {
  theme: 'light' as const,
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
}

const mockNotificationValue = {
  notifications: [],
  addNotification: vi.fn(),
  removeNotification: vi.fn(),
  markAsRead: vi.fn(),
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
