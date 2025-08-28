import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Activity, Shield, Users, FileText, Download, Trash2, Search,
  Filter, Calendar, Eye, AlertTriangle, CheckCircle, Clock, User, Database
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AuditLog {
  id: string
  user_id: string
  user_email: string
  action: string
  resource_type: string
  resource_id: string
  resource_name: string
  severity: string
  category: string
  description: string
  ip_address: string
  created_at: string
  old_values?: any
  new_values?: any
  metadata?: any
}

interface AuditStats {
  summary: {
    total_events: number
    unique_users: number
    unique_actions: number
    unique_resources: number
    high_severity_events: number
    medium_severity_events: number
    low_severity_events: number
    info_events: number
  }
  topActions: Array<{ action: string; count: number; unique_users: number }>
  topResources: Array<{ resource_type: string; count: number }>
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    severity: '',
    category: '',
    startDate: '',
    endDate: '',
    limit: 100
  })
  const [activeTab, setActiveTab] = useState('logs')
  const { user } = useAuth()

  useEffect(() => {
    fetchAuditData()
  }, [filters])

  const fetchAuditData = async () => {
    try {
      setIsLoading(true)
      
      // Buscar logs
      const logsParams = new URLSearchParams({
        limit: filters.limit.toString(),
        ...(filters.action && { action: filters.action }),
        ...(filters.resourceType && { resourceType: filters.resourceType }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.category && { category: filters.category }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      })

      const logsResponse = await fetch(`/api/audit/logs?${logsParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setLogs(logsData.data)
      }

      // Buscar estatísticas
      const statsResponse = await fetch('/api/audit/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.data)
      }
    } catch (error) {
      console.error('Erro ao buscar dados de auditoria:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao carregar dados de auditoria'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const exportLogs = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        format,
        ...(filters.action && { action: filters.action }),
        ...(filters.resourceType && { resourceType: filters.resourceType }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.category && { category: filters.category }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      })

      const response = await fetch(`/api/audit/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: 'Exportação Concluída',
          description: `Logs exportados em formato ${format.toUpperCase()}`
        })
      }
    } catch (error) {
      console.error('Erro ao exportar logs:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao exportar logs'
      })
    }
  }

  const cleanupLogs = async () => {
    try {
      const response = await fetch('/api/audit/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ retentionDays: 90 })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: 'Limpeza Concluída',
          description: result.message
        })
        fetchAuditData() // Recarregar dados
      }
    } catch (error) {
      console.error('Erro ao limpar logs:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao limpar logs antigos'
      })
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'default'
      default: return 'outline'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'medium': return <Clock className="h-4 w-4" />
      case 'low': return <CheckCircle className="h-4 w-4" />
      default: return <Eye className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
  }

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filters.action && log.action !== filters.action) return false
      if (filters.resourceType && log.resource_type !== filters.resourceType) return false
      if (filters.severity && log.severity !== filters.severity) return false
      if (filters.category && log.category !== filters.category) return false
      return true
    })
  }, [logs, filters])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando logs de auditoria...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs de Auditoria</h1>
          <p className="text-muted-foreground">
            Monitoramento completo de todas as atividades do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportLogs('csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={() => exportLogs('json')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar JSON
          </Button>
          <Button onClick={cleanupLogs} variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Antigos
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="action">Ação</Label>
                  <Select value={filters.action} onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as ações" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as ações</SelectItem>
                      <SelectItem value="LOGIN">Login</SelectItem>
                      <SelectItem value="LOGOUT">Logout</SelectItem>
                      <SelectItem value="CREATE">Criar</SelectItem>
                      <SelectItem value="UPDATE">Atualizar</SelectItem>
                      <SelectItem value="DELETE">Excluir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="resourceType">Tipo de Recurso</Label>
                  <Select value={filters.resourceType} onValueChange={(value) => setFilters(prev => ({ ...prev, resourceType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os recursos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os recursos</SelectItem>
                      <SelectItem value="USER">Usuário</SelectItem>
                      <SelectItem value="PATRIMONIO">Patrimônio</SelectItem>
                      <SelectItem value="IMOVEL">Imóvel</SelectItem>
                      <SelectItem value="MUNICIPALITY">Município</SelectItem>
                      <SelectItem value="SECURITY">Segurança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="severity">Severidade</Label>
                  <Select value={filters.severity} onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as severidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as severidades</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="info">Informação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as categorias</SelectItem>
                      <SelectItem value="authentication">Autenticação</SelectItem>
                      <SelectItem value="data_management">Gestão de Dados</SelectItem>
                      <SelectItem value="security">Segurança</SelectItem>
                      <SelectItem value="general">Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logs de Auditoria ({filteredLogs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {log.user_email || 'Sistema'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          {log.resource_type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(log.severity)}>
                          {getSeverityIcon(log.severity)}
                          <span className="ml-1">{log.severity}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total de Eventos</p>
                        <p className="text-2xl font-bold">{stats.summary.total_events}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Usuários Únicos</p>
                        <p className="text-2xl font-bold">{stats.summary.unique_users}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Alta Severidade</p>
                        <p className="text-2xl font-bold">{stats.summary.high_severity_events}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Ações Únicas</p>
                        <p className="text-2xl font-bold">{stats.summary.unique_actions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Principais Ações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.topActions.map((action) => (
                        <div key={action.action} className="flex items-center justify-between">
                          <span className="font-medium">{action.action}</span>
                          <Badge variant="outline">{action.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Principais Recursos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.topResources.map((resource) => (
                        <div key={resource.resource_type} className="flex items-center justify-between">
                          <span className="font-medium">{resource.resource_type}</span>
                          <Badge variant="outline">{resource.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Esta seção mostra eventos de segurança e atividades suspeitas detectadas pelo sistema.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Eventos de Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Implementação de monitoramento de eventos de segurança em desenvolvimento.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
