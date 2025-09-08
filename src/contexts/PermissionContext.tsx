import { Permission, Role, UserRole } from '@/types';
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

const defaultRoles: Role[] = [
  {
    id: 'superuser',
    name: 'Superusuário',
    permissions: ['superuser:access', 'permissions:manage'],
  },
  {
    id: 'admin',
    name: 'Administrador',
    permissions: [
      'bens:create',
      'bens:read',
      'bens:update',
      'bens:delete',
      'users:create',
      'users:read',
      'users:update',
      'users:delete',
      'settings:read',
      'settings:update',
      'reports:generate',
      'reports:manage_templates',
    ],
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    permissions: [
      'bens:create',
      'bens:read',
      'bens:update',
      'reports:generate',
    ],
  },
  {
    id: 'usuario',
    name: 'Usuário',
    permissions: ['bens:create', 'bens:read', 'bens:update'],
  },
  {
    id: 'visualizador',
    name: 'Visualizador',
    permissions: ['bens:read'],
  },
];

interface PermissionContextType {
  roles: Role[];
  updateRolePermissions: (roleId: UserRole, permissions: Permission[]) => void;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
  const [roles, setRoles] = useState<Role[]>(defaultRoles);

  useEffect(() => {
    const stored = localStorage.getItem('sispat_roles_permissions');
    if (stored) {
      setRoles(JSON.parse(stored));
    }
  }, []);

  const updateRolePermissions = (
    roleId: UserRole,
    permissions: Permission[]
  ) => {
    const newRoles = roles.map(role =>
      role.id === roleId ? { ...role, permissions } : role
    );
    setRoles(newRoles);
    localStorage.setItem('sispat_roles_permissions', JSON.stringify(newRoles));
  };

  return (
    <PermissionContext.Provider value={{ roles, updateRolePermissions }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissionsContext = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error(
      'usePermissionsContext must be used within a PermissionProvider'
    );
  }
  return context;
};
