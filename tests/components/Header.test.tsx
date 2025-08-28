import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import Header from '../../src/components/Header'

// Mock the contexts and hooks
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    },
    logout: vi.fn(),
  }),
}))

vi.mock('../../src/contexts/CustomizationContext', () => ({
  useCustomization: () => ({
    getSettingsForMunicipality: () => ({
      primaryColor: '#3b82f6',
      logoUrl: '/logo.png',
      systemName: 'SISPAT Test',
    }),
  }),
}))

vi.mock('../../src/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Bell: () => <div data-testid="bell-icon">Bell</div>,
  User: () => <div data-testid="user-icon">User</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>,
  LogOut: () => <div data-testid="logout-icon">LogOut</div>,
  Menu: () => <div data-testid="menu-icon">Menu</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
}))

const renderHeader = () => {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  )
}

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the header with logo and system name', () => {
    renderHeader()
    
    expect(screen.getByAltText('Logo')).toBeInTheDocument()
    expect(screen.getByText('SISPAT Test')).toBeInTheDocument()
  })

  it('should display user information', () => {
    renderHeader()
    
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should render navigation menu button', () => {
    renderHeader()
    
    const menuButton = screen.getByTestId('menu-icon')
    expect(menuButton).toBeInTheDocument()
  })

  it('should render notifications bell', () => {
    renderHeader()
    
    const bellIcon = screen.getByTestId('bell-icon')
    expect(bellIcon).toBeInTheDocument()
  })

  it('should render user menu dropdown', () => {
    renderHeader()
    
    const userIcon = screen.getByTestId('user-icon')
    expect(userIcon).toBeInTheDocument()
  })

  it('should open user menu when clicked', () => {
    renderHeader()
    
    const userMenuTrigger = screen.getByRole('button', { name: /menu do usuário/i })
    fireEvent.click(userMenuTrigger)
    
    // Check if dropdown menu items appear
    expect(screen.getByText('Perfil')).toBeInTheDocument()
    expect(screen.getByText('Configurações')).toBeInTheDocument()
    expect(screen.getByText('Sair')).toBeInTheDocument()
  })

  it('should handle logout when logout button is clicked', () => {
    const mockLogout = vi.fn()
    
    // Override the mock for this test
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
      },
      logout: mockLogout,
    })
    
    renderHeader()
    
    const userMenuTrigger = screen.getByRole('button', { name: /menu do usuário/i })
    fireEvent.click(userMenuTrigger)
    
    const logoutButton = screen.getByText('Sair')
    fireEvent.click(logoutButton)
    
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('should render search functionality', () => {
    renderHeader()
    
    const searchIcon = screen.getByTestId('search-icon')
    expect(searchIcon).toBeInTheDocument()
  })

  it('should apply custom styling from customization context', () => {
    renderHeader()
    
    const logo = screen.getByAltText('Logo')
    expect(logo).toHaveAttribute('src', '/logo.png')
  })

  it('should be responsive and show mobile menu', () => {
    renderHeader()
    
    // Check for mobile menu trigger
    const menuButton = screen.getByTestId('menu-icon')
    expect(menuButton).toBeInTheDocument()
    
    fireEvent.click(menuButton)
    
    // Mobile menu should open (implementation specific)
    // This would depend on how the mobile menu is implemented
  })

  it('should display notification count when there are unread notifications', () => {
    // Override the notification mock for this test
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [
        { id: '1', title: 'Test Notification', read: false },
        { id: '2', title: 'Another Notification', read: false },
      ],
      unreadCount: 2,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    })
    
    renderHeader()
    
    // Should show notification count badge
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should handle different user roles correctly', () => {
    // Test with different user role
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: '2',
        name: 'Super User',
        email: 'super@example.com',
        role: 'superuser',
      },
      logout: vi.fn(),
    })
    
    renderHeader()
    
    expect(screen.getByText('Super User')).toBeInTheDocument()
  })
})
