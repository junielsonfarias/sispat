import { useThrottle } from '@/hooks/use-debounce';
import { useInactivityTimeout } from '@/hooks/use-inactivity-timeout';
import { api } from '@/services/api';
import { User } from '@/types';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivityLog } from './ActivityLogContext';

interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  users: User[];
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    municipalityId: string | null,
    rememberMe: boolean
  ) => Promise<User>;
  logout: (options?: { sessionExpired?: boolean }) => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  unlockUser: (userId: string) => Promise<void>;
  updateUser: (userId: string, userData: Partial<User>) => Promise<User>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<void>;
  addUser: (
    userData: Omit<
      User,
      'id' | 'avatarUrl' | 'failedLoginAttempts' | 'lockoutUntil'
    >
  ) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
  manualRefreshUsers: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { logActivity } = useActivityLog();
  const navigate = useNavigate();

  const logout = useCallback(
    (options?: { sessionExpired?: boolean }) => {
      if (user) {
        logActivity(user, 'LOGOUT', 'Logout realizado com sucesso.');
      }
      setUser(null);
      // Don't clear municipalities and users data on logout
      // Only clear auth token
      localStorage.removeItem('sispat_auth_token');
      sessionStorage.removeItem('sispat_auth_token');

      // Forçar navegação para login
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            sessionExpired: options?.sessionExpired,
          },
        });
      }, 100);
    },
    [user, logActivity, navigate]
  );

  useInactivityTimeout(
    () => logout({ sessionExpired: true }),
    1800000 // 30 minutes
  );

  const ensureSuperuserExists = useCallback(async () => {
    try {
      await api.post('/auth/ensure-superuser', {});
    } catch (error) {
      console.error('Failed to ensure superuser exists:', error);
    }
  }, []);

  const fetchUsersInternal = useCallback(async () => {
    try {
      console.log('Fetching users...');
      const usersData = await api.get<User[]>('/users');
      console.log('Users API response:', usersData);
      if (Array.isArray(usersData)) {
        setUsers(usersData);
        console.log('Users set successfully:', usersData);
        // Store in localStorage for persistence
        localStorage.setItem('sispat_users', JSON.stringify(usersData));
      } else {
        console.error('API for users did not return an array:', usersData);
        setUsers([]);
        localStorage.removeItem('sispat_users');
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
      setUsers([]);
      localStorage.removeItem('sispat_users');
    }
  }, []);

  // Throttle fetchUsers to prevent too many API calls
  const fetchUsers = useThrottle(fetchUsersInternal, 2000); // Max 1 call per 2 seconds

  const fetchCurrentUser = useCallback(async () => {
    await ensureSuperuserExists();

    // Try to load users from localStorage first
    const cachedUsers = localStorage.getItem('sispat_users');
    if (cachedUsers) {
      try {
        const parsed = JSON.parse(cachedUsers);
        if (Array.isArray(parsed)) {
          console.log('Loading users from cache:', parsed);
          setUsers(parsed);
        }
      } catch (error) {
        console.error('Failed to parse cached users:', error);
        localStorage.removeItem('sispat_users');
      }
    }

    const token =
      localStorage.getItem('sispat_auth_token') ||
      sessionStorage.getItem('sispat_auth_token');
    if (token) {
      try {
        console.log('🔍 Fetching current user from /auth/me...');
        const currentUser = await api.get<User>('/auth/me');
        console.log('✅ Current user data received:', {
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          municipalityId: currentUser.municipalityId,
          sectors: currentUser.sectors,
          sector: currentUser.sector,
          responsibleSectors: currentUser.responsibleSectors,
        });
        setUser(currentUser);
        // Fetch fresh users after successful authentication
        await fetchUsers();
      } catch (error) {
        console.error('❌ Error fetching current user:', error);
        localStorage.removeItem('sispat_auth_token');
        sessionStorage.removeItem('sispat_auth_token');
        setUser(null);
      }
    }
    setIsLoading(false);
  }, [ensureSuperuserExists]);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Separate effect for user-dependent auto-refresh
  useEffect(() => {
    if (!user) return;

    // Set up auto-refresh for users every 5 minutes (300 seconds)
    // Only refresh if user is active and authenticated
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('Auto-refreshing users (5min interval)...');
        fetchUsers();
      }
    }, 300000); // 5 minutes (300 seconds)

    // Refresh when tab becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible - refreshing users...');
        fetchUsers();
      }
    };

    // Refresh when window gains focus
    const handleFocus = () => {
      console.log('Window focused - refreshing users...');
      fetchUsers();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, fetchUsers]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      municipalityId: string | null,
      rememberMe: boolean
    ): Promise<User> => {
      try {
        const { token, user: loggedInUser } = await api.post<LoginResponse>(
          '/auth/login',
          { email, password, municipalityId }
        );
        if (rememberMe) {
          localStorage.setItem('sispat_auth_token', token);
        } else {
          sessionStorage.setItem('sispat_auth_token', token);
        }
        setUser(loggedInUser);
        logActivity(loggedInUser, 'LOGIN_SUCCESS', 'Login bem-sucedido.');
        return loggedInUser;
      } catch (error) {
        logActivity(
          { email },
          'LOGIN_FAIL',
          `Tentativa de login falhou para o e-mail ${email}.`
        );
        throw error;
      }
    },
    [logActivity]
  );

  const forgotPassword = async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  };

  const resetPassword = async (
    token: string,
    newPassword: string
  ): Promise<void> => {
    await api.post('/auth/reset-password', { token, newPassword });
  };

  const unlockUser = async (userId: string): Promise<void> => {
    await api.post(`/users/${userId}/unlock`, {});
  };

  const updateUser = async (
    userId: string,
    userData: Partial<User>
  ): Promise<User> => {
    console.log('🔄 AuthContext - updateUser iniciado com:', {
      userId,
      userData,
    });
    try {
      const updatedUser = await api.put<User>(`/users/${userId}`, userData);
      console.log('✅ AuthContext - updateUser resposta da API:', updatedUser);
      // Refresh the entire list to ensure consistency
      await fetchUsers();
      if (user?.id === userId) {
        setUser(updatedUser);
      }
      return updatedUser;
    } catch (error) {
      console.error('❌ AuthContext - Erro no updateUser:', error);
      throw error;
    }
  };

  const updateUserPassword = async (
    userId: string,
    newPassword: string
  ): Promise<void> => {
    await api.put(`/users/${userId}/password`, { password: newPassword });
  };

  const addUser = async (
    userData: Omit<
      User,
      'id' | 'avatarUrl' | 'failedLoginAttempts' | 'lockoutUntil'
    >
  ): Promise<User> => {
    const newUser = await api.post<User>('/users', userData);
    // Refresh the entire list to ensure consistency
    await fetchUsers();
    return newUser;
  };

  const refreshUsers = async () => {
    await fetchUsers();
  };

  // Manual refresh with debounce to prevent spam
  const manualRefreshUsers = useCallback(async () => {
    console.log('Manual refresh triggered by user');
    await fetchUsers();
  }, [fetchUsers]);

  const deleteUser = async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`);
    // Refresh the entire list to ensure consistency
    await fetchUsers();
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        users,
        isLoading,
        login,
        logout,
        forgotPassword,
        resetPassword,
        unlockUser,
        updateUser,
        updateUserPassword,
        addUser,
        deleteUser,
        refreshUsers,
        manualRefreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
