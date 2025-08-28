import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  municipalityId?: string;
  municipalityName?: string;
  isActive: boolean;
  createdAt: string;
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<User[]>('/users');
      setUsers(response);
      setFilteredUsers(response);
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
      await api.put(`/users/${userId}`, { isActive });
      await fetchUsers(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao atualizar status do usuário:', error);
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

  useEffect(() => {
    void fetchUsers();
  }, []);

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
            <div className='space-y-4'>
              {filteredUsers.map(userItem => (
                <div
                  key={userItem.id}
                  className='flex items-center justify-between p-4 border rounded-lg'
                >
                  <div className='flex items-center gap-4'>
                    <div>
                      <h3 className='font-medium'>{userItem.name}</h3>
                      <p className='text-sm text-gray-500'>{userItem.email}</p>
                      {userItem.municipalityName && (
                        <p className='text-xs text-gray-400'>
                          {userItem.municipalityName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    {getRoleBadge(userItem.role)}
                    {getStatusBadge(userItem.isActive)}
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        handleStatusChange(userItem.id, !userItem.isActive)
                      }
                    >
                      {userItem.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
