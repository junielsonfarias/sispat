import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ActivityLogAction } from '@/types';
import { useActivityLog } from '@/contexts/ActivityLogContext';

const actionLabels: Record<ActivityLogAction, string> = {
  LOGIN_SUCCESS: 'Login bem-sucedido',
  LOGIN_FAIL: 'Falha de Login',
  LOGOUT: 'Logout',
  PATRIMONIO_CREATE: 'Criação de Patrimônio',
  PATRIMONIO_UPDATE: 'Atualização de Patrimônio',
  PATRIMONIO_DELETE: 'Exclusão de Patrimônio',
  USER_ROLE_CHANGE: 'Alteração de Perfil',
  USER_CREATE: 'Criação de Usuário',
  USER_DELETE: 'Exclusão de Usuário',
};

const ActivityLogPage = () => {
  const { logs } = useActivityLog();
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const filteredLogs = logs.filter(log => {
    const userMatch =
      filterUser === '' ||
      log.userName.toLowerCase().includes(filterUser.toLowerCase());
    const actionMatch = filterAction === '' || log.action === filterAction;
    return userMatch && actionMatch;
  });

  return (
    <div className='flex flex-col gap-6'>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to='/dashboard/admin'>Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Registros de Atividade</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className='text-2xl font-bold'>Registros de Atividade</h1>
      <Card>
        <CardHeader>
          <CardTitle>Log de Atividades do Sistema</CardTitle>
          <CardDescription>
            Acompanhe todas as ações realizadas no sistema.
          </CardDescription>
          <div className='flex items-center gap-4 pt-4'>
            <Input
              placeholder='Filtrar por usuário...'
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className='max-w-sm'
            />
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className='w-[280px]'>
                <SelectValue placeholder='Filtrar por ação...' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>Todas as Ações</SelectItem>
                {Object.entries(actionLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data e Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(
                      new Date(log.timestamp),
                      "dd/MM/yyyy 'às' HH:mm:ss",
                      {
                        locale: ptBR,
                      }
                    )}
                  </TableCell>
                  <TableCell>{log.userName}</TableCell>
                  <TableCell>{actionLabels[log.action]}</TableCell>
                  <TableCell>{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogPage;
