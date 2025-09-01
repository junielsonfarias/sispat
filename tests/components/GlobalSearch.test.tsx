import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import GlobalSearch from '../../src/components/GlobalSearch'

// Mock fetch
global.fetch = vi.fn()

// Mock the router navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock the auth hook
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      name: 'Test User',
      role: 'admin',
      municipalityId: '1',
    },
  }),
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  FileText: () => <div data-testid="file-icon">File</div>,
  Building: () => <div data-testid="building-icon">Building</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Loader2: () => <div data-testid="loader-icon">Loading</div>,
}))

const renderGlobalSearch = () => {
  return render(
    <MemoryRouter>
      <GlobalSearch />
    </MemoryRouter>
  )
}

describe('GlobalSearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockClear()
  })

  it('should render search input', () => {
    renderGlobalSearch()
    
    const searchInput = screen.getByPlaceholderText(/buscar/i)
    expect(searchInput).toBeInTheDocument()
  })

  it('should render search icon', () => {
    renderGlobalSearch()
    
    const searchIcon = screen.getByTestId('search-icon')
    expect(searchIcon).toBeInTheDocument()
  })

  it('should update input value when typing', () => {
    renderGlobalSearch()
    
    const searchInput = screen.getByPlaceholderText(/buscar/i)
    fireEvent.change(searchInput, { target: { value: 'test search' } })
    
    expect(searchInput).toHaveValue('test search')
  })

  it('should show loading state when searching', async () => {
    // Mock a delayed response
    vi.mocked(fetch).mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    )
    
    renderGlobalSearch()
    
    const searchInput = screen.getByPlaceholderText(/buscar/i)
    fireEvent.change(searchInput, { target: { value: 'test' } })
    
    // Should show loading indicator
    await waitFor(() => {
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    })
  })

  it('should display search results', async () => {
    const mockResults = {
      patrimonios: [
        {
          id: 'p1',
          numero_patrimonio: '2024001',
          descricao: 'Computador Desktop',
          categoria: 'Equipamentos',
        }
      ],
      imoveis: [
        {
          id: 'i1',
          codigo: 'IMV001',
          descricao: 'Prédio Administrativo',
          endereco: 'Rua Principal, 123',
        }
      ],
      usuarios: [
        {
          id: 'u1',
          name: 'João Silva',
          email: 'joao@example.com',
          role: 'admin',
        }
      ]
    }
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockResults }),
    })
    
    renderGlobalSearch()
    
    const searchInput = screen.getByPlaceholderText(/buscar/i)
    fireEvent.change(searchInput, { target: { value: 'computador' } })
    
    await waitFor(() => {
      expect(screen.getByText('2024001')).toBeInTheDocument()
      expect(screen.getByText('Computador Desktop')).toBeInTheDocument()
      expect(screen.getByText('IMV001')).toBeInTheDocument()
      expect(screen.getByText('João Silva')).toBeInTheDocument()
    })
  })

  it('should navigate to item when clicked', async () => {
    const mockResults = {
      patrimonios: [
        {
          id: 'p1',
          numero_patrimonio: '2024001',
          descricao: 'Computador Desktop',
          categoria: 'Equipamentos',
        }
      ],
      imoveis: [],
      usuarios: []
    }
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockResults }),
    })
    
    renderGlobalSearch()
    
    const searchInput = screen.getByPlaceholderText(/buscar/i)
    fireEvent.change(searchInput, { target: { value: 'computador' } })
    
    await waitFor(() => {
      expect(screen.getByText('2024001')).toBeInTheDocument()
    })
    
    const resultItem = screen.getByText('2024001')
    fireEvent.click(resultItem)
    
    expect(mockNavigate).toHaveBeenCalledWith('/bens-cadastrados/ver/p1')
  })

  it('should handle search errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Search failed'))
    
    renderGlobalSearch()
    
    const searchInput = screen.getByPlaceholderText(/buscar/i)
    fireEvent.change(searchInput, { target: { value: 'test' } })
    
    await waitFor(() => {
      expect(screen.getByText(/erro ao buscar/i)).toBeInTheDocument()
    })
  })

  it('should clear results when input is empty', async () => {
    const mockResults = {
      patrimonios: [
        {
          id: 'p1',
          numero_patrimonio: '2024001',
          descricao: 'Computador Desktop',
          categoria: 'Equipamentos',
        }
      ],
      imoveis: [],
      usuarios: []
    }
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockResults }),
    })
    
    renderGlobalSearch()
    
    const searchInput = screen.getByPlaceholderText(/buscar/i)
    
    // First search
    fireEvent.change(searchInput, { target: { value: 'computador' } })
    
    await waitFor(() => {
      expect(screen.getByText('2024001')).toBeInTheDocument()
    })
    
    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } })
    
    await waitFor(() => {
      expect(screen.queryByText('2024001')).not.toBeInTheDocument()
    })
  })

  it('should debounce search requests', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { patrimonios: [], imoveis: [], usuarios: [] } }),
    })
    
    renderGlobalSearch()
    
    const searchInput = screen.getByPlaceholderText(/buscar/i)
    
    // Type multiple characters quickly
    fireEvent.change(searchInput, { target: { value: 't' } })
    fireEvent.change(searchInput, { target: { value: 'te' } })
    fireEvent.change(searchInput, { target: { value: 'tes' } })
    fireEvent.change(searchInput, { target: { value: 'test' } })
    
    // Wait for debounce
    await waitFor(() => {
      // Should only make one request after debounce
      expect(fetch).toHaveBeenCalledTimes(1)
    }, { timeout: 1000 })
  })

  it('should show "no results" message when no items found', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        success: true, 
        data: { patrimonios: [], imoveis: [], usuarios: [] } 
      }),
    })
    
    renderGlobalSearch()
    
    const searchInput = screen.getByPlaceholderText(/buscar/i)
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
    
    await waitFor(() => {
      expect(screen.getByText(/nenhum resultado encontrado/i)).toBeInTheDocument()
    })
  })

  it('should categorize results correctly', async () => {
    const mockResults = {
      patrimonios: [
        {
          id: 'p1',
          numero_patrimonio: '2024001',
          descricao: 'Computador Desktop',
          categoria: 'Equipamentos',
        }
      ],
      imoveis: [
        {
          id: 'i1',
          codigo: 'IMV001',
          descricao: 'Prédio Administrativo',
          endereco: 'Rua Principal, 123',
        }
      ],
      usuarios: [
        {
          id: 'u1',
          name: 'João Silva',
          email: 'joao@example.com',
          role: 'admin',
        }
      ]
    }
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockResults }),
    })
    
    renderGlobalSearch()
    
    const searchInput = screen.getByPlaceholderText(/buscar/i)
    fireEvent.change(searchInput, { target: { value: 'test' } })
    
    await waitFor(() => {
      // Should show category headers
      expect(screen.getByText(/patrimônios/i)).toBeInTheDocument()
      expect(screen.getByText(/imóveis/i)).toBeInTheDocument()
      expect(screen.getByText(/usuários/i)).toBeInTheDocument()
      
      // Should show category icons
      expect(screen.getByTestId('file-icon')).toBeInTheDocument()
      expect(screen.getByTestId('building-icon')).toBeInTheDocument()
      expect(screen.getByTestId('users-icon')).toBeInTheDocument()
    })
  })
})
