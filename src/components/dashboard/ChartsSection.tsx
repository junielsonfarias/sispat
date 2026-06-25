import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  Line,
  Pie,
  PieChart,
  ComposedChart,
  Cell,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from '@/lib/recharts-compat'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

/** Shape mínimo para o modo legado (array paginado). */
interface LegacyPatrimonio {
  id: string
  tipo: string
  valor_aquisicao?: number
  valorAquisicao?: number
  valor?: number
  data_aquisicao?: string
  dataAquisicao?: string
  status: string
  setor_responsavel?: string
  setorId?: string
}

/** Dados agregados vindos do endpoint /patrimonios/stats. */
export interface AggregatedChartData {
  porStatus: { status: string; quantidade: number }[]
  porTipo: { tipo: string; quantidade: number; valor: number }[]
  porSetor: { setor: string; quantidade: number }[]
  porMes: { mes: string; valor: number }[]
}

interface ChartsSectionProps {
  /** Lista paginada — usada apenas quando `aggregated` não está presente. */
  patrimonios?: LegacyPatrimonio[]
  imoveis?: unknown[]
  /** Dados pré-agregados do backend; quando presentes têm prioridade. */
  aggregated?: AggregatedChartData
}

/** Converte 'YYYY-MM' → 'jan', 'fev', ... */
const mesAbreviado = (mesSrting: string): string => {
  const [ano, mes] = mesSrting.split('-')
  if (!mes) return mesSrting
  const data = new Date(Number(ano), Number(mes) - 1, 1)
  return data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

export const ChartsSection = ({ patrimonios = [], aggregated }: ChartsSectionProps) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  const chartData = useMemo(() => {
    // --- Caminho 1: dados agregados do endpoint (correto, completo) ---
    if (aggregated) {
      const tipoChart = aggregated.porTipo.map(({ tipo, quantidade, valor }) => ({
        tipo,
        quantidade,
        valor,
      }))

      const statusChart = aggregated.porStatus.map(({ status, quantidade }) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        quantidade,
      }))

      const valorChartData = aggregated.porMes.map(({ mes, valor }) => ({
        mes: mesAbreviado(mes),
        valor,
      }))

      const setorChart = aggregated.porSetor.map(({ setor, quantidade }) => ({
        setor,
        quantidade,
      }))

      return { tipoChart, statusChart, valorChartData, setorChart }
    }

    // --- Caminho 2: legado — array paginado (limitado a 50) ---
    if (patrimonios.length === 0) {
      return { tipoChart: [], statusChart: [], valorChartData: [], setorChart: [] }
    }

    const tipoMap = patrimonios.reduce<Record<string, { count: number; value: number }>>((acc, p) => {
      const tipo = p.tipo || 'Não especificado'
      const rawValor = p.valor_aquisicao ?? p.valorAquisicao ?? p.valor ?? 0
      const numValor = typeof rawValor === 'number' ? rawValor : parseFloat(String(rawValor)) || 0
      if (!acc[tipo]) acc[tipo] = { count: 0, value: 0 }
      acc[tipo].count++
      acc[tipo].value += numValor
      return acc
    }, {})

    const tipoChart = Object.entries(tipoMap).map(([tipo, data]) => ({
      tipo,
      quantidade: data.count,
      valor: data.value,
    }))

    const statusMap = patrimonios.reduce<Record<string, number>>((acc, p) => {
      const status = p.status || 'ativo'
      acc[status] = (acc[status] ?? 0) + 1
      return acc
    }, {})

    const statusChart = Object.entries(statusMap).map(([status, quantidade]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      quantidade,
    }))

    const valorMap = patrimonios
      .filter(p => p.data_aquisicao || p.dataAquisicao)
      .reduce<Record<string, number>>((acc, p) => {
        const mes = new Date(p.data_aquisicao || p.dataAquisicao || '').toLocaleDateString('pt-BR', { month: 'short' })
        const rawValor = p.valor_aquisicao ?? p.valorAquisicao ?? p.valor ?? 0
        const numValor = typeof rawValor === 'number' ? rawValor : parseFloat(String(rawValor)) || 0
        acc[mes] = (acc[mes] ?? 0) + numValor
        return acc
      }, {})

    const valorChartData = Object.entries(valorMap).map(([mes, valor]) => ({ mes, valor }))

    const setorMap = patrimonios.reduce<Record<string, number>>((acc, p) => {
      const setor = p.setor_responsavel || p.setorId || 'Sem Setor'
      acc[setor] = (acc[setor] ?? 0) + 1
      return acc
    }, {})

    const setorChart = Object.entries(setorMap).map(([setor, quantidade]) => ({
      setor,
      quantidade,
    }))

    return { tipoChart, statusChart, valorChartData, setorChart }
  }, [aggregated, patrimonios])

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
      {/* Gráfico por Tipo */}
      <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Patrimônios por Tipo
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ChartContainer config={{}}>
            <div className="w-full min-w-[300px] h-[280px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.tipoChart} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis
                    dataKey="tipo"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    className="text-xs sm:text-sm"
                  />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip content={<ChartTooltipContent payload={[]} />} />
                  <Bar dataKey="quantidade" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gráfico por Status */}
      <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-semibold bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent">
            Status dos Bens
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ChartContainer config={{}}>
            <div className="w-full min-w-[300px] h-[280px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.statusChart}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, quantidade }: { status: string; quantidade: number }) =>
                      `${status}: ${quantidade}`
                    }
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="quantidade"
                  >
                    {chartData.statusChart.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Valores por Mês */}
      <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
            Valor de Aquisição por Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ChartContainer config={{}}>
            <div className="w-full min-w-[300px] h-[280px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData.valorChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 10 }}
                    className="text-xs sm:text-sm"
                  />
                  <YAxis tick={{ fontSize: 10 }} width={50} />
                  <Tooltip content={<ChartTooltipContent payload={[]} />} />
                  <Bar dataKey="valor" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Line type="monotone" dataKey="valor" stroke="#f59e0b" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gráfico por Setor */}
      <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Distribuição por Setor
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ChartContainer config={{}}>
            <div className="w-full min-w-[300px] h-[280px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.setorChart}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    width={50}
                  />
                  <YAxis
                    type="category"
                    dataKey="setor"
                    tick={{ fontSize: 10 }}
                    width={80}
                    angle={0}
                    textAnchor="end"
                    className="text-xs sm:text-sm"
                  />
                  <Tooltip content={<ChartTooltipContent payload={[]} />} />
                  <Bar dataKey="quantidade" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
