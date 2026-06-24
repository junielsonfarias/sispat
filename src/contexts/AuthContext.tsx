import {
  createContext,
  useState,
  ReactNode,
  useEffect,
  useContext,
  useCallback,
} from 'react'
import { User } from '@/types'
import { useNavigate } from 'react-router-dom'
import { useInactivityTimeout } from '@/hooks/use-inactivity-timeout'
import { api } from '@/services/api-adapter'
import { SecureStorage } from '@/lib/storage-utils'
import { queryClient } from '@/lib/query-client'
import { logger } from '@/lib/logger'

export interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  users: User[]
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: (options?: { sessionExpired?: boolean }) => void
  updateUser: (userId: string, userData: Partial<User>) => Promise<User>
  addUser: (
    userData: Omit<
      User,
      'id' | 'avatarUrl' | 'failedLoginAttempts' | 'lockoutUntil'
    >,
  ) => Promise<User>
  deleteUser: (userId: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  validateResetToken: (token: string) => Promise<any>
  updateUserPassword: (userId: string, newPassword: string) => Promise<void>
  unlockUser: (userId: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const navigate = useNavigate()

  const logout = useCallback(
    (options?: { sessionExpired?: boolean; allDevices?: boolean }) => {
      // Revoga a sessão no servidor antes de limpar. Fire-and-forget: se falhar,
      // o frontend ainda sai. O backend lê o refresh do cookie HttpOnly (prod) ou
      // do body (dev, onde ainda há token no storage).
      const refreshToken = SecureStorage.getItem<string>('sispat_refresh_token')
      api
        .post('/auth/logout', {
          refreshToken: refreshToken ?? undefined,
          allDevices: options?.allDevices ?? false,
        })
        .catch(() => {
          // ignorar — limpar localmente é o que importa para o usuário
        })

      setUser(null)
      setUsers([])
      SecureStorage.removeItem('sispat_user')
      SecureStorage.removeItem('sispat_token')
      SecureStorage.removeItem('sispat_refresh_token')

      // Tenant isolation: limpa cache do React Query no logout para evitar que
      // um próximo usuário (em PC compartilhado) veja dados em cache do anterior.
      // F6 do PLANO_FRONTEND.
      queryClient.clear()

      navigate('/login', { state: { sessionExpired: options?.sessionExpired } })
    },
    [navigate],
  )

  useInactivityTimeout(() => logout({ sessionExpired: true }), 1800000)

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const storedUser = SecureStorage.getItem('sispat_user')

        // A sessão é validada pelo servidor (cookie HttpOnly em prod, fallback
        // Bearer em dev). Basta haver um usuário persistido para tentar restaurar;
        // se a sessão estiver inválida, as chamadas abaixo retornam 401 e o
        // interceptor do http-api cuida do refresh/redirect.
        if (storedUser) {
          const loggedInUser: User = storedUser as User

          // ✅ Primeiro definir o usuário para evitar redirecionamento
          setUser(loggedInUser)

          try {
            // Sempre atualiza o próprio perfil. A lista completa de usuários é
            // função de gestão (backend restringe a superuser/admin/supervisor),
            // então só a busca para esses papéis — evita um 403 desnecessário.
            const podeListarUsuarios = ['superuser', 'admin', 'supervisor'].includes(
              loggedInUser.role,
            )
            const [profile, allUsers] = await Promise.all([
              api.get<User>(`/users/${loggedInUser.id}`),
              podeListarUsuarios ? api.get<User[]>('/users') : Promise.resolve(null),
            ])
            setUser(profile)
            setUsers(allUsers ?? [profile])
          } catch (apiError) {
            // Se a API falhar, manter o usuário do localStorage
            logger.warn('Erro ao buscar dados atualizados do usuário:', { error: apiError })
            setUsers([loggedInUser])
          }
        } else {
          // ✅ Limpar dados inválidos
          setUser(null)
          SecureStorage.removeItem('sispat_user')
          SecureStorage.removeItem('sispat_token')
          SecureStorage.removeItem('sispat_refresh_token')
        }
      } catch (error) {
        // Error fetching user data - handled by error boundary
        logger.error('Erro ao carregar dados do usuário:', error)
        setUser(null)
        SecureStorage.removeItem('sispat_user')
        SecureStorage.removeItem('sispat_token')
        SecureStorage.removeItem('sispat_refresh_token')
      } finally {
        setIsLoading(false)
      }
    }
    fetchInitialData()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post<{
        user: User
        token?: string
        refreshToken?: string
      }>('/auth/login', { email, password })

      const { user, token, refreshToken } = response

      setUser(user)
      setUsers([user])
      SecureStorage.setItem('sispat_user', user)
      // Em produção o backend não devolve tokens no body (sessão via cookie
      // HttpOnly). Em dev (cross-origin) eles vêm e alimentam o fallback Bearer.
      if (token) SecureStorage.setItem('sispat_token', token)
      if (refreshToken) SecureStorage.setItem('sispat_refresh_token', refreshToken)

      if (user.role === 'admin' || user.role === 'superuser') {
        try {
          const allUsers = await api.get<User[]>('/users')
          setUsers(allUsers)
        } catch (error) {
          logger.warn('Erro ao buscar usuários:', { error })
        }
      }
    } catch (error: unknown) {
      // Diferencia mensagens por status (backend distingue 401 credenciais x 403 conta desativada)
      const err = error as {
        response?: { status?: number; data?: { error?: string; message?: string } }
        message?: string
      }
      const status = err.response?.status
      const backendMsg = err.response?.data?.error || err.response?.data?.message

      if (status === 403) {
        throw new Error(backendMsg || 'Conta desativada. Entre em contato com o administrador.')
      }
      if (status === 401) {
        throw new Error(backendMsg || 'Email ou senha incorretos.')
      }
      if (status === 429) {
        throw new Error(backendMsg || 'Muitas tentativas de login. Aguarde 15 minutos.')
      }
      throw new Error(backendMsg || err.message || 'Não foi possível fazer login.')
    }
  }

  const forgotPassword = async (email: string) => {
    try {
      await api.post('/auth/forgot-password', { email })
    } catch (error) {
      // Sempre mostrar sucesso por segurança (não revelar se email existe)
      logger.warn('Erro ao enviar email de reset:', { error })
    }
  }

  const resetPassword = async (token: string, password: string) => {
    try {
      await api.post('/auth/reset-password', { token, password })
    } catch (error) {
      throw new Error('Erro ao redefinir senha')
    }
  }

  const validateResetToken = async (token: string) => {
    try {
      const response = await api.get(`/auth/validate-reset-token/${token}`)
      return response
    } catch (error) {
      throw new Error('Token inválido ou expirado')
    }
  }


  const updateUserPassword = async (userId: string, newPassword: string) => {
    const updatedUser = await api.put<User>(`/users/${userId}`, {
      password: newPassword,
    })
    setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)))
  }

  const unlockUser = async (userId: string) => {
    const updatedUser = await api.put<User>(`/users/${userId}`, {
      lockoutUntil: null,
      failedLoginAttempts: 0,
    })
    setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)))
  }

  const updateUser = async (
    userId: string,
    userData: Partial<User>,
  ): Promise<User> => {
    const updatedUser = await api.put<User>(`/users/${userId}`, userData)
    setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)))
    if (user?.id === userId) setUser(updatedUser)
    return updatedUser
  }

  const addUser = async (
    userData: Omit<
      User,
      'id' | 'avatarUrl' | 'failedLoginAttempts' | 'lockoutUntil'
    >,
  ): Promise<User> => {
    const newUser = await api.post<User>('/users', userData)
    // Não adicionar novamente pois o mock API já adiciona à lista
    // setUsers((prev) => [...prev, newUser])
    return newUser
  }

  const deleteUser = async (userId: string) => {
    await api.delete(`/users/${userId}`)
    setUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        users,
        isLoading,
        login,
        logout,
        updateUser,
        addUser,
        deleteUser,
        forgotPassword,
        resetPassword,
        validateResetToken,
        updateUserPassword,
        unlockUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
