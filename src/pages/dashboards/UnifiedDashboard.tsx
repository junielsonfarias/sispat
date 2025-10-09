import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Wrench,
  XCircle,
  Building2,
  AlertTriangle,
  Clock,
  PlusCircle,
  RefreshCw,
  Loader2,
  GitBranch,
  ArrowUpCircle,
  Activity,
  Users,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Bar,
  BarChart,
  Line,
  Pie,
  PieChart,
  ComposedChart,
  Cell,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/contexts/SyncContext'
import { useVersion } from '@/contexts/VersionContext'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useImovel } from '@/contexts/ImovelContext'
import { formatCurrency } from '@/lib/utils'
import { subMonths, format } from 'date-fns'
import { Flex } from '@/components/ui/responsive-container'

const UnifiedDashboard = () => {
  const [isAddWidgetDialogOpen, setAddWidgetDialogOpen] = useState(false)
  const { user } = useAuth()
  const { isSyncing, startSync } = useSync()
  const { patrimonios } = usePatrimonio()
  const { imoveis } = useImovel()
  const {
    currentVersion,
    latestVersion,
    isLatestVersion,
    isUpdating,
    updateToLatestVersion,
  } = useVersion()

  // Calcular estatísticas usando dados reais do backend (excluindo baixados)
  const patrimoniosAtivos = Array.isArray(patrimonios) ? patrimonios.filter(p => p.status !== 'baixado') : []
  const totalPatrimonios = patrimoniosAtivos.length
  const totalImoveis = Array.isArray(imoveis) ? imoveis.length : 0
  const valorTotalPatrimonios = patrimoniosAtivos.reduce((sum, p) => {
    const valor = p.valor_aquisicao || p.valorAquisicao || 0
    const numValor = typeof valor === 'number' ? valor : parseFloat(valor) || 0
    return sum + numValor
  }, 0)
  const valorTotalImoveis = Array.isArray(imoveis) ? imoveis.reduce((sum, i) => {
    const valor = i.valor_aquisicao || i.valor || 0
    const numValor = typeof valor === 'number' ? valor : parseFloat(valor) || 0
    return sum + numValor
  }, 0) : 0
  const valorTotal = valorTotalPatrimonios + valorTotalImoveis
  const patrimoniosEmManutencao = Array.isArray(patrimonios) ? patrimonios.filter(p => p.status === 'manutencao').length : 0

  // Usar apenas dados reais do backend
  const dashboardData = Array.isArray(patrimonios) ? patrimonios.map(p => ({
    ...p,
    data_aquisicao: p.data_aquisicao || p.dataAquisicao,
    valor_aquisicao: p.valor_aquisicao || p.valorAquisicao,
    situacao_bem: p.situacao_bem || (p.status === 'ativo' ? 'BOM' : p.status),
    tipo_bem: p.tipo,
    setor_responsavel: p.setor_responsavel || p.setorId || 'Sem Setor',
    historico_movimentacao: p.historico_movimentacao || p.historicoMovimentacao || []
  })) : []

  const stats = useMemo(() => {
    if (dashboardData.length === 0) {
      return {
        totalCount: 0,
        totalValue: 0,
        activePercentage: 0,
        maintenanceCount: 0,
        baixadosLastMonth: 0,
        setoresCount: 0,
      }
    }
    
    // Excluir bens baixados do cálculo de valor total
    const patrimoniosAtivosCalc = dashboardData.filter(p => p.status !== 'baixado')
    
    const totalValue = patrimoniosAtivosCalc.reduce(
      (acc, p) => {
        const valor = p.valor_aquisicao || p.valorAquisicao || p.valor || 0
        const numValor = typeof valor === 'number' ? valor : parseFloat(String(valor)) || 0
        return acc + numValor
      },
      0,
    )
    
    const activeCount = dashboardData.filter(p => p.status === 'ativo').length
    const maintenanceCount = dashboardData.filter(p => p.status === 'manutencao').length
    const baixadosLastMonth = dashboardData.filter(p => {
      if (!p.data_baixa) return false
      const baixaDate = new Date(p.data_baixa)
      const lastMonth = subMonths(new Date(), 1)
      return baixaDate >= lastMonth
    }).length
    
    const uniqueSetores = new Set(dashboardData.map(p => p.setor_responsavel)).size
    
    return {
      totalCount: dashboardData.length,
      totalValue,
      activePercentage: dashboardData.length > 0 ? Math.round((activeCount / dashboardData.length) * 100) : 0,
      maintenanceCount,
      baixadosLastMonth,
      setoresCount: uniqueSetores,
    }
  }, [dashboardData])

  // Dados para gráficos
  const evolutionData = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      months.push({
        month: format(date, 'MMM'),
        aquisicoes: Math.floor(Math.random() * 5) + 1,
        baixas: Math.floor(Math.random() * 3),
      })
    }
    return months
  }, [])

  const distributionData = useMemo(() => {
    const types = dashboardData.reduce((acc, p) => {
      const tipo = p.tipo_bem || 'Não Classificado'
      acc[tipo] = (acc[tipo] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
    
    return Object.entries(types).map(([name, value], index) => ({
      name,
      value,
      fill: colors[index % colors.length],
    }))
  }, [dashboardData])

  const topSetores = useMemo(() => {
    const setores = dashboardData.reduce((acc, p) => {
      const setor = p.setor_responsavel || 'Sem Setor'
      acc[setor] = (acc[setor] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(setores)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [dashboardData])

  const handleSync = async () => {
    await startSync()
  }

  const handleUpdateVersion = async () => {
    await updateToLatestVersion()
  }

  // Cards da primeira linha (3 cards principais)
  const firstRowCards = [
    {
      title: 'Total de Bens',
      value: totalPatrimonios.toString(),
      icon: Package,
      color: 'text-blue-500',
    },
    {
      title: 'Valor Total Estimado',
      value: `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: `Bens: R$ ${valorTotalPatrimonios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Imóveis: R$ ${valorTotalImoveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      title: 'Bens Ativos',
      value: `${stats.activePercentage}%`,
      icon: CheckCircle,
      color: 'text-green-500',
    },
  ]

  // Cards da segunda linha (demais cards)
  const secondRowCards = [
    {
      title: 'Imóveis',
      value: totalImoveis.toString(),
      icon: Building2,
      color: 'text-purple-500',
    },
    {
      title: 'Em Manutenção',
      value: patrimoniosEmManutencao.toString(),
      icon: Wrench,
      color: 'text-orange-500',
    },
    {
      title: 'Baixados Este Mês',
      value: stats.baixadosLastMonth.toString(),
      icon: XCircle,
      color: 'text-red-500',
    },
    {
      title: 'Setores Ativos',
      value: stats.setoresCount.toString(),
      icon: Building2,
      color: 'text-indigo-500',
    },
  ]

  return (
    <div className="flex-1 p-3 lg:p-4 xl:p-5">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-5">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Visão Geral</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-4 lg:mb-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
            <div>
              <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight text-gray-900 mb-1">
                Dashboard - Visão Geral
              </h1>
              <p className="text-sm lg:text-base text-gray-600 leading-relaxed">
                Visão completa do sistema de patrimônio e imóveis
              </p>
            </div>
            
            <Flex gap="sm" className="flex-wrap">
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Sincronizar
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => setAddWidgetDialogOpen(true)}
                size="sm"
                className="h-8 text-xs"
              >
                <PlusCircle className="mr-1 h-3 w-3" />
                Widget
              </Button>
            </Flex>
          </div>

          {/* Alertas de Sistema */}
          <div className="space-y-1">
            {/* Version Update Alert */}
            {!isLatestVersion && (
              <Alert className="border-blue-200 bg-blue-50 shadow-sm py-2">
                <ArrowUpCircle className="h-3 w-3" />
                <AlertTitle className="text-xs">Atualização Disponível</AlertTitle>
                <AlertDescription className="text-xs">
                  <div className="flex items-center justify-between">
                    <p>v{latestVersion} disponível (atual: v{currentVersion})</p>
                    <Button
                      onClick={handleUpdateVersion}
                      disabled={isUpdating}
                      size="sm"
                      className="text-xs h-6 px-2"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-1 h-2 w-2 animate-spin" />
                          Atualizando...
                        </>
                      ) : (
                        'Atualizar'
                      )}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Sync Status */}
            {isSyncing && (
              <Alert className="shadow-sm py-2">
                <GitBranch className="h-3 w-3" />
                <AlertTitle className="text-xs">Sincronizando...</AlertTitle>
                <AlertDescription className="text-xs">
                  Dados sendo sincronizados com o servidor
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Quick Links para Outros Dashboards */}
          {(user?.role === 'admin' || user?.role === 'supervisor') && (
            <div className="flex gap-2 flex-wrap">
              <Link to="/dashboard/depreciacao">
                <Button variant="outline" size="sm" className="gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Dashboard Depreciação
                </Button>
              </Link>
            </div>
          )}
        </div>
        
        {/* Stats Cards - Primeira Linha (Valor Total Estimado destacado) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 lg:gap-4 xl:gap-5 mb-4 lg:mb-5">
          {/* Card 1: Total de Bens - Menor */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden group cursor-pointer">
            <CardContent className="p-2 lg:p-3 xl:p-4 min-h-[70px] lg:min-h-[80px] h-full">
              <div className="flex flex-col justify-between h-full">
                <div className="mb-1 lg:mb-2">
                  <p className="text-xs lg:text-sm font-semibold text-blue-600 mb-1 leading-tight tracking-wide">
                    {firstRowCards[0].title}
                  </p>
                  <p className="text-sm lg:text-base xl:text-lg font-bold text-blue-900 leading-tight break-words">
                    {firstRowCards[0].value}
                  </p>
                </div>
                <div className="flex justify-end">
                  <div className="p-1 lg:p-1.5 bg-blue-200 rounded-md group-hover:scale-110 transition-transform duration-300">
                    {React.createElement(firstRowCards[0].icon, { 
                      className: "h-3 w-3 lg:h-4 lg:w-4 text-blue-700" 
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Valor Total Estimado - MAIOR (2 colunas) */}
          <Card className="lg:col-span-2 border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden group cursor-pointer">
            <CardContent className="p-4 lg:p-5 xl:p-6 min-h-[110px] lg:min-h-[120px] h-full">
              <div className="flex flex-col justify-between h-full">
                <div className="mb-3 lg:mb-4">
                  <p className="text-sm lg:text-base font-semibold text-green-600 mb-2 lg:mb-3 leading-tight tracking-wide">
                    {firstRowCards[1].title}
                  </p>
                  <p className="text-xl lg:text-2xl xl:text-3xl font-bold text-green-900 leading-tight break-words mb-2">
                    {firstRowCards[1].value}
                  </p>
                  {firstRowCards[1].subtitle && (
                    <p className="text-xs lg:text-sm text-green-600 leading-tight break-words line-clamp-2">
                      {firstRowCards[1].subtitle}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <div className="p-2 lg:p-3 bg-green-200 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    {React.createElement(firstRowCards[1].icon, { 
                      className: "h-4 w-4 lg:h-5 lg:w-5 text-green-700" 
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Bens Ativos - Menor */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden group cursor-pointer">
            <CardContent className="p-2 lg:p-3 xl:p-4 min-h-[70px] lg:min-h-[80px] h-full">
              <div className="flex flex-col justify-between h-full">
                <div className="mb-1 lg:mb-2">
                  <p className="text-xs lg:text-sm font-semibold text-green-600 mb-1 leading-tight tracking-wide">
                    {firstRowCards[2].title}
                  </p>
                  <p className="text-sm lg:text-base xl:text-lg font-bold text-green-900 leading-tight break-words">
                    {firstRowCards[2].value}
                  </p>
                </div>
                <div className="flex justify-end">
                  <div className="p-1 lg:p-1.5 bg-green-200 rounded-md group-hover:scale-110 transition-transform duration-300">
                    {React.createElement(firstRowCards[2].icon, { 
                      className: "h-3 w-3 lg:h-4 lg:w-4 text-green-700" 
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards - Segunda Linha (4 cards secundários) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 xl:gap-5 mb-5 lg:mb-6">
          {secondRowCards.map((card, index) => {
            const colorSchemes = [
              { bg: 'from-purple-50 to-purple-100', text: 'text-purple-600', textDark: 'text-purple-900', iconBg: 'bg-purple-200', iconColor: 'text-purple-700' },
              { bg: 'from-orange-50 to-orange-100', text: 'text-orange-600', textDark: 'text-orange-900', iconBg: 'bg-orange-200', iconColor: 'text-orange-700' },
              { bg: 'from-red-50 to-red-100', text: 'text-red-600', textDark: 'text-red-900', iconBg: 'bg-red-200', iconColor: 'text-red-700' },
              { bg: 'from-indigo-50 to-indigo-100', text: 'text-indigo-600', textDark: 'text-indigo-900', iconBg: 'bg-indigo-200', iconColor: 'text-indigo-700' }
            ]
            const scheme = colorSchemes[index % colorSchemes.length]
            
            return (
              <Card 
                key={card.title} 
                className={`border-0 shadow-md bg-gradient-to-br ${scheme.bg} hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden group cursor-pointer`}
              >
                <CardContent className="p-3 lg:p-4 xl:p-5 min-h-[80px] lg:min-h-[90px] h-full">
                  <div className="flex flex-col justify-between h-full">
                    <div className="mb-2 lg:mb-3">
                      <p className={`text-xs lg:text-sm font-semibold ${scheme.text} mb-1 lg:mb-2 leading-tight tracking-wide`}>
                        {card.title}
                      </p>
                      <p className={`text-base lg:text-lg xl:text-xl font-bold ${scheme.textDark} leading-tight break-words`}>
                        {card.value}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <div className={`p-1.5 lg:p-2 ${scheme.iconBg} rounded-md group-hover:scale-110 transition-transform duration-300`}>
                        {React.createElement(card.icon, { 
                          className: `h-3 w-3 lg:h-4 lg:w-4 ${scheme.iconColor}` 
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-5 xl:gap-6 mb-5 lg:mb-6">
          <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-base lg:text-lg font-bold text-gray-900">Evolução Patrimonial</CardTitle>
              <p className="text-xs text-gray-600 mt-1">Últimos 6 meses</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ChartContainer config={{}} className="h-[160px] lg:h-[180px] xl:h-[200px] w-full">
                <ComposedChart data={evolutionData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    axisLine={false}
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar
                    dataKey="aquisicoes"
                    fill="#3B82F6"
                    name="Aquisições"
                    radius={[3, 3, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="baixas"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Baixas"
                  />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-base lg:text-lg font-bold text-gray-900">Distribuição por Tipo</CardTitle>
              <p className="text-xs text-gray-600 mt-1">Classificação dos bens</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ChartContainer config={{}} className="h-[160px] lg:h-[180px] xl:h-[200px] w-full">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={distributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={50}
                    innerRadius={25}
                    paddingAngle={2}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend 
                    verticalAlign="bottom" 
                    height={25}
                    wrapperStyle={{ fontSize: '9px' }}
                  />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tables Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-5 xl:gap-6">
          <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-base lg:text-lg font-bold text-gray-900">Alertas e Notificações</CardTitle>
              <p className="text-xs text-gray-600 mt-1">Itens que requerem atenção</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow className="border-gray-200">
                      <TableHead className="w-[80px] text-xs font-semibold text-gray-700">Patrimônio</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-700">Descrição</TableHead>
                      <TableHead className="w-[120px] text-xs font-semibold text-gray-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData
                      .filter(p => p.status === 'manutencao' || p.situacao_bem === 'RUIM' || p.situacao_bem === 'PÉSSIMO')
                      .slice(0, 4)
                      .map((patrimonio) => (
                        <TableRow key={patrimonio.id} className="hover:bg-gray-50 border-gray-200">
                          <TableCell className="font-medium font-mono text-xs text-gray-900">
                            {patrimonio.numeroPatrimonio}
                          </TableCell>
                          <TableCell className="text-xs text-gray-700 truncate max-w-[150px]">{patrimonio.descricaoBem}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                patrimonio.status === 'manutencao'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                              className="flex items-center gap-1 w-fit text-xs"
                            >
                              {patrimonio.status === 'manutencao' ? (
                                <Clock className="h-3 w-3" />
                              ) : (
                                <AlertTriangle className="h-3 w-3" />
                              )}
                              {patrimonio.status === 'manutencao' ? 'Manutenção' : patrimonio.situacao_bem}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    {dashboardData.filter(p => p.status === 'manutencao' || p.situacao_bem === 'RUIM' || p.situacao_bem === 'PÉSSIMO').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-4">
                          Nenhum alerta encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3 px-4 pt-4">
              <CardTitle className="text-base lg:text-lg font-bold text-gray-900">Top Setores</CardTitle>
              <p className="text-xs text-gray-600 mt-1">Por quantidade de bens</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ChartContainer config={{}} className="h-[180px] lg:h-[200px] xl:h-[220px] w-full">
                <BarChart
                  layout="vertical"
                  data={topSetores}
                  margin={{ top: 10, right: 20, left: 60, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="value"
                    fill="#10B981"
                    radius={[0, 3, 3, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default UnifiedDashboard
