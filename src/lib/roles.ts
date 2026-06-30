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

// Nome de exibição de cada papel (fonte ÚNICA). Use `getRoleLabel(role)` para
// renderizar o papel na UI em vez de mostrar `user.role` cru (o id `usuario`).
// O id interno NÃO muda (banco/JWT/rotas continuam usando 'usuario').
export const ROLE_LABELS: Record<string, string> = {
  superuser: 'Superusuário',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  usuario: 'Responsável Patrimonial',
  visualizador: 'Visualizador',
}

/** Label amigável do papel; cai no próprio id se for desconhecido. */
export const getRoleLabel = (role: string | undefined): string =>
  role ? ROLE_LABELS[role] ?? role : ''

// 'superuser' nunca é ofertado nos formulários municipais de usuário.
const ASSIGNABLE_ROLE_OPTIONS: SearchableSelectOption[] = [
  { value: 'admin', label: ROLE_LABELS.admin },
  { value: 'supervisor', label: ROLE_LABELS.supervisor },
  { value: 'usuario', label: ROLE_LABELS.usuario },
  { value: 'visualizador', label: ROLE_LABELS.visualizador },
]

// Papéis que `actorRole` pode atribuir (nível <= ao seu).
export const assignableRoleOptions = (
  actorRole: string | undefined,
): SearchableSelectOption[] => {
  const level = ROLE_LEVELS[actorRole ?? ''] ?? 0
  return ASSIGNABLE_ROLE_OPTIONS.filter((o) => ROLE_LEVELS[o.value] <= level)
}
