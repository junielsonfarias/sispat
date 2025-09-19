import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useMunicipalities } from '@/contexts/MunicipalityContext';
import { toast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Key, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { logError, logInfo } from '../../utils/frontendLogger';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  municipalityId?: string;
  municipalityName?: string;
  isActive: boolean;
  createdAt: string;
}

const passwordSchema = z
  .object({
    newPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

const userEditSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  role: z.string().min(1, 'Função é obrigatória'),
  municipalityId: z.string().optional(),
});

export default function UserManagement() {
  const { user } = useAuth();
  const { municipalities } = useMunicipalities();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showUserEditDialog, setShowUserEditDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<User[]>('/users');
      // Adicionar nome do município aos usuários
      const usersWithMunicipality = response.map(user => {
        const municipality = municipalities.find(
          m => m.id === user.municipalityId
        );
        return {
          ...user,
          municipalityName: municipality?.name || 'Sem município',
        };
      });
      setUsers(usersWithMunicipality);
      setFilteredUsers(usersWithMunicipality);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(
      user =>
        user.name.toLowerCase().includes(term.toLowerCase()) ||
        user.email.toLowerCase().includes(term.toLowerCase()) ||
        user.role.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    try {
      logInfo('🔍 Atualizando status do usuário:', { userId, isActive });
      await api.put(`/users/${userId}`, { isActive });
      await fetchUsers(); // Recarregar lista
      toast({
        title: 'Status atualizado',
        description: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso.`,
      });
    } catch (error) {
      logError('Erro ao atualizar status do usuário:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status do usuário.',
        variant: 'destructive',
      });
    }
  };

  const handleEditPassword = (userItem: UserData) => {
    setEditingUser(userItem);
    setShowPasswordDialog(true);
  };

  const handleEditUser = (userItem: UserData) => {
    setEditingUser(userItem);
    setShowUserEditDialog(true);
  };

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const userEditForm = useForm<z.infer<typeof userEditSchema>>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: '',
      email: '',
      role: '',
      municipalityId: 'none',
    },
  });

  const onSubmitPassword = async (data: z.infer<typeof passwordSchema>) => {
    if (!editingUser) return;

    try {
      await api.put(`/users/${editingUser.id}/password`, {
        password: data.newPassword,
      });

      toast({
        title: 'Senha atualizada',
        description: `Senha do usuário ${editingUser.name} foi atualizada com sucesso.`,
      });

      setShowPasswordDialog(false);
      setEditingUser(null);
      passwordForm.reset();
    } catch (error) {
      logError('Erro ao atualizar senha:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar senha do usuário.',
        variant: 'destructive',
      });
    }
  };

  const onSubmitUserEdit = async (data: z.infer<typeof userEditSchema>) => {
    if (!editingUser) return;

    try {
      // Converter "none" para null para o backend
      const submitData = {
        ...data,
        municipalityId:
          data.municipalityId === 'none' ? null : data.municipalityId,
      };

      await api.put(`/users/${editingUser.id}`, submitData);

      toast({
        title: 'Usuário atualizado',
        description: `Dados do usuário ${editingUser.name} foram atualizados com sucesso.`,
      });

      setShowUserEditDialog(false);
      setEditingUser(null);
      userEditForm.reset();
      await fetchUsers(); // Recarregar lista
    } catch (error) {
      logError('Erro ao atualizar usuário:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar dados do usuário.',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      superuser: 'destructive',
      supervisor: 'default',
      admin: 'secondary',
      usuario: 'outline',
      visualizador: 'outline',
    } as const;

    return (
      <Badge variant={variants[role as keyof typeof variants] ?? 'outline'}>
        {role}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant='default'>Ativo</Badge>
    ) : (
      <Badge variant='secondary'>Inativo</Badge>
    );
  };

  // Agrupar usuários por município
  const groupedUsers = useMemo(() => {
    const groups: { [key: string]: UserData[] } = {};

    filteredUsers.forEach(user => {
      const municipalityName = user.municipalityName || 'Sem município';
      if (!groups[municipalityName]) {
        groups[municipalityName] = [];
      }
      groups[municipalityName].push(user);
    });

    return groups;
  }, [filteredUsers]);

  useEffect(() => {
    void fetchUsers();
  }, [municipalities]);

  // Popular formulário quando usuário for selecionado para edição
  useEffect(() => {
    if (editingUser && showUserEditDialog) {
      userEditForm.reset({
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        municipalityId: editingUser.municipalityId || 'none',
      });
    }
  }, [editingUser, showUserEditDialog, userEditForm]);

  if (!user || user.role !== 'superuser') {
    return (
      <div className='flex items-center justify-center h-64'>
        <p className='text-gray-500'>
          Acesso negado. Apenas superusuários podem acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Gerenciamento de Usuários</h1>
          <p className='text-gray-600'>Gerencie todos os usuários do sistema</p>
        </div>
        <Button onClick={() => void fetchUsers()} disabled={isLoading}>
          {isLoading ? 'Carregando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Usuários</CardTitle>
          <CardDescription>
            Digite para filtrar usuários por nome, email ou função
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder='Buscar usuários...'
            value={searchTerm}
            onChange={e => handleSearch(e.target.value)}
            className='max-w-md'
          />
        </CardContent>
      </Card>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Lista de todos os usuários cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className='text-gray-500'>Carregando usuários...</p>
          ) : filteredUsers.length === 0 ? (
            <p className='text-gray-500'>
              {searchTerm
                ? 'Nenhum usuário encontrado para a busca.'
                : 'Nenhum usuário cadastrado.'}
            </p>
          ) : (
            <div className='space-y-6'>
              {Object.entries(groupedUsers).map(
                ([municipalityName, municipalityUsers]) => (
                  <div key={municipalityName} className='space-y-3'>
                    <div className='flex items-center gap-2'>
                      <h3 className='text-lg font-semibold text-gray-800'>
                        {municipalityName}
                      </h3>
                      <Badge variant='outline'>
                        {municipalityUsers.length} usuário(s)
                      </Badge>
                    </div>
                    <div className='space-y-3 ml-4'>
                      {municipalityUsers.map(userItem => (
                        <div
                          key={userItem.id}
                          className='flex items-center justify-between p-4 border rounded-lg bg-gray-50'
                        >
                          <div className='flex items-center gap-4'>
                            <div>
                              <h4 className='font-medium'>{userItem.name}</h4>
                              <p className='text-sm text-gray-500'>
                                {userItem.email}
                              </p>
                            </div>
                          </div>

                          <div className='flex items-center gap-2'>
                            {getRoleBadge(userItem.role)}
                            {getStatusBadge(userItem.isActive)}
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleEditUser(userItem)}
                            >
                              <User className='h-4 w-4 mr-1' />
                              Editar
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleEditPassword(userItem)}
                            >
                              <Key className='h-4 w-4 mr-1' />
                              Senha
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() =>
                                handleStatusChange(
                                  userItem.id,
                                  !userItem.isActive
                                )
                              }
                            >
                              {userItem.isActive ? 'Desativar' : 'Ativar'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para editar senha */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Editar Senha</DialogTitle>
            <DialogDescription>
              Alterar senha do usuário {editingUser?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
              className='space-y-4'
            >
              <FormField
                control={passwordForm.control}
                name='newPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder='Digite a nova senha'
                          {...field}
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className='h-4 w-4' />
                          ) : (
                            <Eye className='h-4 w-4' />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder='Confirme a nova senha'
                          {...field}
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className='h-4 w-4' />
                          ) : (
                            <Eye className='h-4 w-4' />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setEditingUser(null);
                    passwordForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type='submit'>Atualizar Senha</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar usuário */}
      <Dialog open={showUserEditDialog} onOpenChange={setShowUserEditDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Alterar dados do usuário {editingUser?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...userEditForm}>
            <form
              onSubmit={userEditForm.handleSubmit(onSubmitUserEdit)}
              className='space-y-4'
            >
              <FormField
                control={userEditForm.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder='Nome do usuário' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userEditForm.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='email@exemplo.com'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userEditForm.control}
                name='role'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Selecione a função' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='superuser'>Superusuário</SelectItem>
                        <SelectItem value='supervisor'>Supervisor</SelectItem>
                        <SelectItem value='admin'>Administrador</SelectItem>
                        <SelectItem value='usuario'>Usuário</SelectItem>
                        <SelectItem value='visualizador'>
                          Visualizador
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userEditForm.control}
                name='municipalityId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Município</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Selecione o município' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='none'>Sem município</SelectItem>
                        {municipalities.map(municipality => (
                          <SelectItem
                            key={municipality.id}
                            value={municipality.id}
                          >
                            {municipality.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setShowUserEditDialog(false);
                    setEditingUser(null);
                    userEditForm.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type='submit'>Atualizar Usuário</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
