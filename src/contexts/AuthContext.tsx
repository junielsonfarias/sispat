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
    (options?: { sessionExpired?: boolean }) => {
      setUser(null)
      setUsers([])
      SecureStorage.removeItem('sispat_user')
      SecureStorage.removeItem('sispat_token')
      SecureStorage.removeItem('sispat_refresh_token')
      navigate('/login', { state: { sessionExpired: options?.sessionExpired } })
    },
    [navigate],
  )

  useInactivityTimeout(() => logout({ sessionExpired: true }), 1800000)

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const storedUser = SecureStorage.getItem('sispat_user')
        const storedToken = SecureStorage.getItem('sispat_token')
        
        // ✅ CORREÇÃO: Verificar se há token válido antes de fazer requisições
        if (storedUser && storedToken) {
          const loggedInUser: User = storedUser as User
          
          // ✅ CORREÇÃO: Primeiro definir o usuário para evitar redirecionamento
          setUser(loggedInUser)
          
          try {
            // Tentar buscar dados atualizados do usuário
            const [profile, allUsers] = await Promise.all([
              api.get<User>(`/users/${loggedInUser.id}`),
              api.get<User[]>('/users'),
            ])
            setUser(profile)
            setUsers(allUsers)
          } catch (apiError) {
            // Se a API falhar, manter o usuário do localStorage
            console.warn('Erro ao buscar dados atualizados do usuário:', apiError)
            setUsers([loggedInUser])
          }
        } else {
          // ✅ CORREÇÃO: Limpar dados inválidos
          setUser(null)
          SecureStorage.removeItem('sispat_user')
          SecureStorage.removeItem('sispat_token')
          SecureStorage.removeItem('sispat_refresh_token')
        }
      } catch (error) {
        // Error fetching user data - handled by error boundary
        console.error('Erro ao carregar dados do usuário:', error)
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
        token: string
        refreshToken: string
      }>('/auth/login', { email, password })
      
      const { user, token, refreshToken } = response
      
      setUser(user)
      setUsers([user]) // Inicializar com o usuário logado
      SecureStorage.setItem('sispat_user', user)
      SecureStorage.setItem('sispat_token', token)
      SecureStorage.setItem('sispat_refresh_token', refreshToken)
      
      // Buscar todos os usuários se for admin/superuser
      if (user.role === 'admin' || user.role === 'superuser') {
        try {
          const allUsers = await api.get<User[]>('/users')
          setUsers(allUsers)
        } catch (error) {
          console.warn('Erro ao buscar usuários:', error)
        }
      }
    } catch (error) {
      throw new Error('Credenciais inválidas.')
    }
  }

  const forgotPassword = async (email: string) => {
    try {
      await api.post('/auth/forgot-password', { email })
    } catch (error) {
      // Sempre mostrar sucesso por segurança (não revelar se email existe)
      console.warn('Erro ao enviar email de reset:', error)
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
