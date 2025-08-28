import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { DatePickerWithRange } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import {
    SearchableSelect,
    SearchableSelectOption,
} from '@/components/ui/searchable-select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useActivityLog } from '@/contexts/ActivityLogContext'
import { useSectors } from '@/contexts/SectorContext'
import { useAuth } from '@/hooks/useAuth'
import { ActivityLogAction } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { DateRange } from 'react-day-picker'
import { Link } from 'react-router-dom'

const actionLabels: Record<ActivityLogAction, string> = {
  LOGIN_SUCCESS: 'Login bem-sucedido',
  LOGIN_FAIL: 'Falha de Login',
  LOGOUT: 'Logout',
  PATRIMONIO_CREATE: 'Criação de Patrimônio',
  PATRIMONIO_UPDATE: 'Atualização de Patrimônio',
  PATRIMONIO_DELETE: 'Exclusão de Patrimônio',
  PATRIMONIO_SECTOR_CHANGE: 'Mudança de Setor do Bem',
  USER_ROLE_CHANGE: 'Alteração de Perfil',
  USER_CREATE: 'Criação de Usuário',
  USER_UPDATE: 'Atualização de Usuário',
  USER_DELETE: 'Exclusão de Usuário',
  PASSWORD_VIEW: 'Visualização de Senha',
  PASSWORD_CHANGE: 'Alteração de Senha',
  SECTOR_CREATE: 'Criação de Setor',
  SECTOR_UPDATE: 'Atualização de Setor',
  SECTOR_DELETE: 'Exclusão de Setor',
  FORM_FIELD_CREATE: 'Criação de Campo',
  FORM_FIELD_UPDATE: 'Atualização de Campo',
  FORM_FIELD_DELETE: 'Exclusão de Campo',
  FORM_FIELD_REORDER: 'Reordenação de Campos',
  FORM_FIELD_ROLLBACK: 'Reversão de Campos',
  SYNC_START: 'Início de Sincronização',
  SYNC_SUCCESS: 'Sucesso na Sincronização',
  SYNC_FAIL: 'Falha na Sincronização',
  SYNC_CANCEL: 'Sincronização Cancelada',
}

const actionOptions: SearchableSelectOption[] = [
  { value: 'all', label: 'Todas as Ações' },
  ...Object.entries(actionLabels).map(([key, label]) => ({
    value: key,
    label,
  })),
]

const ActivityLogPage = () => {
  const { logs: allLogs } = useActivityLog()
  const { user } = useAuth()
  const { sectors } = useSectors()
  const [filterUser, setFilterUser] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [filterSector, setFilterSector] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const logs = useMemo(() => {
    if (!allLogs) return []
    if (user?.role === 'superuser') return allLogs
    if (user?.municipalityId) {
      return allLogs.filter((l) => l.municipalityId === user.municipalityId)
    }
    return []
  }, [allLogs, user])

  const sectorOptions: SearchableSelectOption[] = useMemo(
    () => [
      { value: 'all', label: 'Todos os Setores' },
      ...sectors.map((s) => ({ value: s.name, label: s.name })),
    ],
    [sectors],
  )

  const filteredLogs = logs.filter((log) => {
    const userMatch =
      !filterUser ||
      log.userName.toLowerCase().includes(filterUser.toLowerCase())
    const actionMatch = filterAction === 'all' || log.action === filterAction
    const sectorMatch = filterSector === 'all' || log.sector === filterSector
    const dateMatch =
      !dateRange?.from ||
      (new Date(log.timestamp) >= dateRange.from &&
        (!dateRange.to || new Date(log.timestamp) <= dateRange.to))

    return userMatch && actionMatch && sectorMatch && dateMatch
  })

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/configuracoes">Configurações</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Registros de Atividade</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="text-2xl font-bold">Registros de Atividade</h1>
      <Card>
        <CardHeader>
          <CardTitle>Log de Atividades do Sistema</CardTitle>
          <CardDescription>
            Acompanhe todas as ações realizadas no sistema.
          </CardDescription>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            <Input
              placeholder="Filtrar por usuário..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            />
            <SearchableSelect
              options={actionOptions}
              value={filterAction}
              onChange={(value) => setFilterAction(value || 'all')}
              placeholder="Filtrar por ação..."
            />
            <SearchableSelect
              options={sectorOptions}
              value={filterSector}
              onChange={(value) => setFilterSector(value || 'all')}
              placeholder="Filtrar por setor..."
            />
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data e Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(
                      new Date(log.timestamp),
                      "dd/MM/yyyy 'às' HH:mm:ss",
                      {
                        locale: ptBR,
                      },
                    )}
                  </TableCell>
                  <TableCell>{log.userName}</TableCell>
                  <TableCell>{actionLabels[log.action]}</TableCell>
                  <TableCell>{log.sector}</TableCell>
                  <TableCell>{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default ActivityLogPage
