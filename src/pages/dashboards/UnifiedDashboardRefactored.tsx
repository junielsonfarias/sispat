import React, { useMemo } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/contexts/SyncContext'
import { useVersion } from '@/contexts/VersionContext'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useImovel } from '@/contexts/ImovelContext'
import { subMonths } from 'date-fns'
import { Flex } from '@/components/ui/responsive-container'
import { ErrorBoundary } from '@/components/ErrorBoundaries/ErrorBoundary'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { ChartsSection } from '@/components/dashboard/ChartsSection'
import { RecentPatrimonios } from '@/components/dashboard/RecentPatrimonios'
import { AlertsSection } from '@/components/dashboard/AlertsSection'

const UnifiedDashboard = () => {
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

  const handleSync = async () => {
    await startSync()
  }

  const handleUpdateVersion = async () => {
    await updateToLatestVersion()
  }

  return (
    <ErrorBoundary type="dashboard">
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
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <ErrorBoundary type="list">
            <StatsCards 
              stats={stats} 
              totalImoveis={totalImoveis} 
              valorTotalImoveis={valorTotalImoveis} 
            />
          </ErrorBoundary>

          {/* Gráficos */}
          <ErrorBoundary type="list">
            <ChartsSection patrimonios={dashboardData} imoveis={imoveis} />
          </ErrorBoundary>

          {/* Grid com Alertas e Patrimônios Recentes */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ErrorBoundary type="list">
              <AlertsSection patrimonios={dashboardData} stats={stats} />
            </ErrorBoundary>
            
            <ErrorBoundary type="list">
              <RecentPatrimonios patrimonios={dashboardData} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default UnifiedDashboard
