import type { SearchableSelectOption } from '@/components/ui/searchable-select'

// Hierarquia de papéis — espelha ROLE_LEVELS do backend (userController.ts).
// Um ator só pode atribuir papéis de nível <= ao seu (anti-escalada): um
// supervisor (2) não cria/edita admin (3); admin/superuser sim. O backend é a
// trava real (canAssignRole); aqui apenas ajustamos as opções da UI.
export const ROLE_LEVELS: Record<string, number> = {
  superuser: 4,
  admin: 3,
  supervisor: 2,
  usuario: 1,
  visualizador: 0,
}

// 'superuser' nunca é ofertado nos formulários municipais de usuário.
const ASSIGNABLE_ROLE_OPTIONS: SearchableSelectOption[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'usuario', label: 'Usuário' },
  { value: 'visualizador', label: 'Visualizador' },
]

// Papéis que `actorRole` pode atribuir (nível <= ao seu).
export const assignableRoleOptions = (
  actorRole: string | undefined,
): SearchableSelectOption[] => {
  const level = ROLE_LEVELS[actorRole ?? ''] ?? 0
  return ASSIGNABLE_ROLE_OPTIONS.filter((o) => ROLE_LEVELS[o.value] <= level)
}
