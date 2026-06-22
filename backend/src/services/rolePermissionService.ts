import { prisma } from '../index';

/** Service de RolePermission — extraído do configController. Global (sem tenant). */

export interface UpsertRolePermissionInput {
  name: string;
  permissions: string[];
}

export const listRolePermissions = () =>
  prisma.rolePermission.findMany({ orderBy: { roleId: 'asc' } });

export const upsertRolePermission = (roleId: string, input: UpsertRolePermissionInput) =>
  prisma.rolePermission.upsert({
    where: { roleId },
    update: { name: input.name, permissions: input.permissions },
    create: { roleId, name: input.name, permissions: input.permissions },
  });
