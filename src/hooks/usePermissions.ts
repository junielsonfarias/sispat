import { useAuth } from '@/hooks/useAuth';
import { usePermissionsContext } from '@/contexts/PermissionContext';
import { Permission } from '@/types';

export const usePermissions = () => {
  const { user } = useAuth();
  const { roles } = usePermissionsContext();

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    if (user.role === 'superuser') return true;

    const userRole = roles.find(r => r.id === user.role);
    if (!userRole) return false;

    return userRole.permissions.includes(permission);
  };

  return { hasPermission };
};
