import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

const setAuth = (auth: { isAuthenticated: boolean; isLoading?: boolean; role?: string | null }) =>
  (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading ?? false,
    user: auth.role ? { role: auth.role } : null,
  })

// Renderiza um conjunto de rotas-alvo + a rota protegida no caminho informado.
const renderAt = (path: string, allowedRoles?: ('admin' | 'usuario' | 'superuser')[]) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route path="/superuser" element={<div>SUPERUSER</div>} />
        <Route path="/dashboard" element={<div>DASHBOARD</div>} />
        <Route path="/" element={<div>HOME</div>} />
        <Route
          path="/protegida"
          element={
            <ProtectedRoute allowedRoles={allowedRoles as never}>
              <div>PROTEGIDA</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/superuser/area"
          element={
            <ProtectedRoute>
              <div>SU-AREA</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => vi.clearAllMocks())

describe('ProtectedRoute', () => {
  it('não autenticado → redireciona para /login', () => {
    setAuth({ isAuthenticated: false })
    renderAt('/protegida')
    expect(screen.getByText('LOGIN')).toBeInTheDocument()
    expect(screen.queryByText('PROTEGIDA')).not.toBeInTheDocument()
  })

  it('carregando → não renderiza o conteúdo protegido (fallback)', () => {
    setAuth({ isAuthenticated: false, isLoading: true })
    renderAt('/protegida')
    expect(screen.queryByText('PROTEGIDA')).not.toBeInTheDocument()
    expect(screen.queryByText('LOGIN')).not.toBeInTheDocument()
  })

  it('superuser fora de /superuser → vai para /superuser', () => {
    setAuth({ isAuthenticated: true, role: 'superuser' })
    renderAt('/protegida', ['admin'])
    expect(screen.getByText('SUPERUSER')).toBeInTheDocument()
  })

  it('não-superuser em /superuser/* → vai para /', () => {
    setAuth({ isAuthenticated: true, role: 'admin' })
    renderAt('/superuser/area')
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })

  it('papel permitido → renderiza o conteúdo', () => {
    setAuth({ isAuthenticated: true, role: 'admin' })
    renderAt('/protegida', ['admin'])
    expect(screen.getByText('PROTEGIDA')).toBeInTheDocument()
  })

  it('papel não permitido → vai para /dashboard', () => {
    setAuth({ isAuthenticated: true, role: 'usuario' })
    renderAt('/protegida', ['admin'])
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument()
    expect(screen.queryByText('PROTEGIDA')).not.toBeInTheDocument()
  })
})
