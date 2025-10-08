import { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  PlusCircle,
  Edit,
  Trash2,
  Unlock,
  MoreHorizontal,
  KeyRound,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { User } from '@/types'
import { toast } from '@/hooks/use-toast'
import { UserCreateForm } from '@/components/admin/UserCreateForm'
import { UserEditForm } from '@/components/admin/UserEditForm'
import { UserPasswordChangeForm } from '@/components/admin/UserPasswordChangeForm'
import { MUNICIPALITY_NAME } from '@/config/municipality'

export default function UserManagement() {
  const { users, deleteUser, unlockUser } = useAuth()
  const [isCreateUserDialogOpen, setCreateUserDialogOpen] = useState(false)
  const [isEditUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [isChangePasswordDialogOpen, setChangePasswordDialogOpen] =
    useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const manageableUsers = useMemo(
    () => users.filter((u) => u.role !== 'superuser'),
    [users],
  )

  const handleUserCreated = () => setCreateUserDialogOpen(false)
  const handleUserUpdated = () => {
    setEditUserDialogOpen(false)
    setSelectedUser(null)
  }
  const handlePasswordChanged = () => {
    setChangePasswordDialogOpen(false)
    setSelectedUser(null)
  }

  const handleEditClick = (user: User) => {
    setSelectedUser(user)
    setEditUserDialogOpen(true)
  }

  const handleChangePasswordClick = (user: User) => {
    setSelectedUser(user)
    setChangePasswordDialogOpen(true)
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId)
      toast({ title: 'Sucesso', description: 'Usuário excluído com sucesso!' })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir usuário',
        variant: 'destructive',
      })
    }
  }

  const handleUnlockUser = async (user: User) => {
    try {
      await unlockUser(user.id)
      toast({
        title: 'Sucesso',
        description: `Usuário ${user.name} desbloqueado.`,
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível desbloquear o usuário.',
        variant: 'destructive',
      })
    }
  }

  const isUserLocked = (user: User) =>
    user.lockoutUntil && new Date(user.lockoutUntil) > new Date()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
        <Dialog
          open={isCreateUserDialogOpen}
          onOpenChange={setCreateUserDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo usuário.
              </DialogDescription>
            </DialogHeader>
            <UserCreateForm onSuccess={handleUserCreated} />
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Todos os Usuários</CardTitle>
          <CardDescription>
            Gerencie todos os usuários do sistema de {MUNICIPALITY_NAME}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manageableUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {isUserLocked(user) ? (
                      <Badge variant="destructive">Bloqueado</Badge>
                    ) : (
                      <Badge variant="default">Ativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleEditClick(user)}
                        >
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleChangePasswordClick(user)
                          }
                        >
                          <KeyRound className="mr-2 h-4 w-4" /> Alterar
                          Senha
                        </DropdownMenuItem>
                        {isUserLocked(user) && (
                          <DropdownMenuItem
                            onClick={() => handleUnlockUser(user)}
                          >
                            <Unlock className="mr-2 h-4 w-4" />{' '}
                            Desbloquear
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />{' '}
                              Excluir
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Tem certeza?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteUser(user.id)
                                }
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isEditUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Edite as informações do usuário selecionado.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <UserEditForm user={selectedUser} onSuccess={handleUserUpdated} />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={isChangePasswordDialogOpen}
        onOpenChange={setChangePasswordDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Altere a senha do usuário selecionado.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <UserPasswordChangeForm
              user={selectedUser}
              onSuccess={handlePasswordChanged}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
