import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useQuery } from '@tanstack/react-query'
import { useImovel } from '@/hooks/useImovel'
import { usePatrimonioStats } from '@/hooks/queries/use-patrimonio-stats'
import { api } from '@/services/api-adapter'
import type { Patrimonio } from '@/types'
import { ErrorBoundary } from '@/components/ErrorBoundaries/ErrorBoundary'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { ChartsSection } from '@/components/dashboard/ChartsSection'
import { RecentPatrimonios } from '@/components/dashboard/RecentPatrimonios'
import { AlertsSection } from '@/components/dashboard/AlertsSection'

const STATS_FALLBACK = {
  totalCount: 0,
  totalValue: 0,
  activePercentage: 0,
  maintenanceCount: 0,
  baixadosLastMonth: 0,
  antigosCount: 0,
  setoresCount: 0,
}

const UnifiedDashboard = () => {
  const { imoveis } = useImovel()
  const { data: statsData } = usePatrimonioStats()
  // Apenas os bens recentes (consulta barata, paginada) para o painel "Recentes" —
  // não carrega todos os bens no dashboard.
  const { data: recentesResp } = useQuery({
    queryKey: ['patrimonios-recentes', 5],
    queryFn: () => api.get<{ patrimonios: Patrimonio[] }>('/patrimonios?limit=5'),
    staleTime: 60 * 1000,
  })
  const patrimonios = recentesResp?.patrimonios ?? []

  // Estatísticas provenientes do endpoint agregado (valores corretos, sem limite de página)
  const stats = statsData
    ? {
        totalCount: statsData.totalCount,
        totalValue: statsData.totalValue,
        activePercentage: statsData.activePercentage,
        maintenanceCount: statsData.maintenanceCount,
        baixadosLastMonth: statsData.baixadosLastMonth,
        antigosCount: statsData.antigosCount,
        setoresCount: statsData.setoresCount,
      }
    : STATS_FALLBACK

  // Dados para os gráficos — também do endpoint agregado
  const aggregatedChartData = statsData
    ? {
        porStatus: statsData.porStatus,
        porTipo: statsData.porTipo,
        porSetor: statsData.porSetor,
        porMes: statsData.porMes,
      }
    : undefined

  // Imóveis: contagem e valor total (continuam via useImovel)
  const totalImoveis = Array.isArray(imoveis) ? imoveis.length : 0
  const valorTotalImoveis = Array.isArray(imoveis)
    ? imoveis.reduce((sum, i) => {
        const valor = i.valor_aquisicao || 0
        return sum + (typeof valor === 'number' ? valor : parseFloat(String(valor)) || 0)
      }, 0)
    : 0

  // Array paginado de patrimônios — usado apenas para RecentPatrimonios e AlertsSection
  const dashboardData = Array.isArray(patrimonios)
    ? patrimonios.map(p => ({
        ...p,
        data_aquisicao: p.data_aquisicao
          ? p.data_aquisicao instanceof Date
            ? p.data_aquisicao.toISOString()
            : String(p.data_aquisicao)
          : undefined,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
        situacao_bem: p.situacao_bem || 'BOM',
        setor_responsavel: p.setor_responsavel || 'Sem Setor',
        historico_movimentacao: p.historico_movimentacao || [],
      }))
    : []

  const imoveisFormatted = Array.isArray(imoveis)
    ? imoveis.map(i => ({
        ...i,
        numero_patrimonio: i.numero_patrimonio,
        descricao_bem: i.denominacao || '',
        tipo: i.tipo_imovel || 'Imóvel',
        valor_aquisicao: i.valor_aquisicao || 0,
        status: i.situacao || 'ativo',
        situacao_bem: 'BOM',
        setor_responsavel: i.setor || 'Sem Setor',
        historico_movimentacao: i.historico || [],
        createdAt:
          i.data_aquisicao instanceof Date
            ? i.data_aquisicao.toISOString()
            : String(i.data_aquisicao || new Date()),
        marca: '',
        modelo: '',
        cor: '',
        numero_serie: '',
        quantidade: 1,
        numero_nota_fiscal: '',
        forma_aquisicao: '',
        local_objeto: '',
        fotos: i.fotos || [],
        documentos: i.documentos || [],
        entityName: '',
        municipalityId: i.municipalityId,
        createdBy: '',
      }))
    : []

  return (
    <ErrorBoundary type="dashboard">
      <div className="flex-1 p-3 sm:p-4 lg:p-6 min-h-screen relative overflow-hidden">
        {/* Background com gradiente */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"></div>

        {/* Padrão de pontos decorativo */}
        <div className="absolute inset-0 opacity-30 dark:opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_1px_1px,rgba(59,130,246,0.3)_1px,transparent_0)] bg-[length:24px_24px]"></div>
        </div>

        <div className="relative z-10 max-w-[1600px] mx-auto space-y-6 sm:space-y-8">
          {/* Breadcrumb */}
          <div className="relative">
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-sm"></div>
            <div className="relative p-3">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dashboard
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-gray-400" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400">
                      Visão Geral
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 dark:from-blue-500/20 dark:via-indigo-500/20 dark:to-purple-500/20 rounded-2xl blur-xl"></div>
              <div className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-lg border border-white/20 dark:border-gray-700/20">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent">
                        Dashboard - Visão Geral
                      </h1>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    Visão completa do sistema de patrimônio e imóveis com insights em tempo real
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5 rounded-3xl blur-xl"></div>
            <div className="relative">
              <ErrorBoundary type="list">
                <StatsCards
                  stats={stats}
                  totalImoveis={totalImoveis}
                  valorTotalImoveis={valorTotalImoveis}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Gráficos */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5 rounded-3xl blur-xl"></div>
            <div className="relative">
              <ErrorBoundary type="list">
                <ChartsSection
                  patrimonios={dashboardData}
                  imoveis={imoveis}
                  aggregated={aggregatedChartData}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Grid com Alertas e Patrimônios Recentes */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-emerald-500/5 rounded-3xl blur-xl"></div>
            <div className="relative">
              <div className="grid gap-6 sm:gap-8 grid-cols-1 lg:grid-cols-2">
                <ErrorBoundary type="list">
                  <AlertsSection stats={stats} />
                </ErrorBoundary>

                <ErrorBoundary type="list">
                  <RecentPatrimonios patrimonios={dashboardData} imoveis={imoveisFormatted} />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default UnifiedDashboard
