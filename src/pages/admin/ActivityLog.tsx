import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ActivityLogAction } from '@/types'
import { fetchAuditLogs } from '@/services/auditLogService'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { DatePickerWithRange } from '@/components/ui/date-picker'
import { DateRange } from 'react-day-picker'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
} from '@/components/ui/pagination'

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

const actionOptions: SearchableSelectOption[] = Object.entries(
  actionLabels,
).map(([key, label]) => ({
  value: key,
  label: label,
}))

const ActivityLogPage = () => {
  const { users } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<{
    userId?: string
    action?: ActivityLogAction
    dateRange?: DateRange
  }>({})
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)

  const userOptions = useMemo(
    () => users.map((u) => ({ value: u.id, label: u.name })),
    [users],
  )

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true)
      try {
        const { data, count } = await fetchAuditLogs({
          page,
          pageSize,
          filters: {
            ...filters,
            startDate: filters.dateRange?.from?.toISOString(),
            endDate: filters.dateRange?.to?.toISOString(),
          },
        })
        // ✅ CORREÇÃO: Garantir que logs seja sempre um array
        setLogs(Array.isArray(data) ? data : [])
        setTotalCount(count || 0)
      } catch (error) {
        // Error handled by error boundary
      } finally {
        setIsLoading(false)
      }
    }
    loadLogs()
  }, [page, pageSize, filters])

  const pageCount = Math.ceil(totalCount / pageSize)

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
          <CardTitle>Filtros</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <SearchableSelect
              options={userOptions}
              value={filters.userId}
              onChange={(value) => setFilters({ ...filters, userId: value })}
              placeholder="Filtrar por usuário..."
              isClearable
            />
            <SearchableSelect
              options={actionOptions}
              value={filters.action}
              onChange={(value) =>
                setFilters({ ...filters, action: value as ActivityLogAction })
              }
              placeholder="Filtrar por ação..."
              isClearable
            />
            <DatePickerWithRange
              date={filters.dateRange}
              onDateChange={(date) =>
                setFilters({ ...filters, dateRange: date })
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            </div>
          ) : (
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
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(
                        new Date(log.createdAt || log.timestamp),
                        "dd/MM/yyyy 'às' HH:mm:ss",
                        { locale: ptBR },
                      )}
                    </TableCell>
                    <TableCell>{log.user?.name || log.user?.email}</TableCell>
                    <TableCell>
                      {actionLabels[log.action as ActivityLogAction] ||
                        log.action}
                    </TableCell>
                    <TableCell>{log.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-4 text-sm">
                  Página {page} de {pageCount}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={() => setPage(Math.min(pageCount, page + 1))}
                  className={
                    page === pageCount ? 'pointer-events-none opacity-50' : ''
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      </Card>
    </div>
  )
}

export default ActivityLogPage
