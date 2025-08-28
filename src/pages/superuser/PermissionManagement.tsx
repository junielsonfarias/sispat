import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { usePermissionsContext } from '@/contexts/PermissionContext'
import { Permission, UserRole } from '@/types'
import { toast } from '@/hooks/use-toast'
import { Save } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const allPermissions: { id: Permission; label: string; group: string }[] = [
  { id: 'bens:create', label: 'Criar Bens', group: 'Bens' },
  { id: 'bens:read', label: 'Visualizar Bens', group: 'Bens' },
  { id: 'bens:update', label: 'Editar Bens', group: 'Bens' },
  { id: 'bens:delete', label: 'Excluir Bens', group: 'Bens' },
  { id: 'users:create', label: 'Criar Usuários', group: 'Usuários' },
  { id: 'users:read', label: 'Visualizar Usuários', group: 'Usuários' },
  { id: 'users:update', label: 'Editar Usuários', group: 'Usuários' },
  { id: 'users:delete', label: 'Excluir Usuários', group: 'Usuários' },
  {
    id: 'settings:read',
    label: 'Visualizar Configurações',
    group: 'Configurações',
  },
  {
    id: 'settings:update',
    label: 'Editar Configurações',
    group: 'Configurações',
  },
  { id: 'reports:generate', label: 'Gerar Relatórios', group: 'Relatórios' },
  {
    id: 'reports:manage_templates',
    label: 'Gerenciar Modelos',
    group: 'Relatórios',
  },
]

const permissionGroups = [...new Set(allPermissions.map((p) => p.group))]

export default function PermissionManagement() {
  const { roles, updateRolePermissions } = usePermissionsContext()
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin')
  const [currentPermissions, setCurrentPermissions] = useState<Permission[]>([])

  useState(() => {
    const role = roles.find((r) => r.id === selectedRole)
    if (role) {
      setCurrentPermissions(role.permissions)
    }
  })

  const handleRoleChange = (roleId: UserRole) => {
    setSelectedRole(roleId)
    const role = roles.find((r) => r.id === roleId)
    setCurrentPermissions(role ? role.permissions : [])
  }

  const handlePermissionChange = (permission: Permission, checked: boolean) => {
    setCurrentPermissions((prev) =>
      checked ? [...prev, permission] : prev.filter((p) => p !== permission),
    )
  }

  const handleSave = () => {
    updateRolePermissions(selectedRole, currentPermissions)
    toast({ description: 'Permissões atualizadas com sucesso.' })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gerenciamento de Permissões</h1>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Salvar Permissões
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Permissões por Perfil</CardTitle>
          <CardDescription>
            Selecione um perfil para visualizar e editar suas permissões.
          </CardDescription>
          <div className="pt-4">
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles
                  .filter((r) => r.id !== 'superuser')
                  .map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {permissionGroups.map((group) => (
            <div key={group}>
              <h3 className="text-lg font-semibold mb-2">{group}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allPermissions
                  .filter((p) => p.group === group)
                  .map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={permission.id}
                        checked={currentPermissions.includes(permission.id)}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(permission.id, !!checked)
                        }
                      />
                      <Label htmlFor={permission.id}>{permission.label}</Label>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
