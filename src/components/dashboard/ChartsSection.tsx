import React, { useMemo } from 'react'
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
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

interface Patrimonio {
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

interface ChartsSectionProps {
  patrimonios: Patrimonio[]
  imoveis: any[]
}

export const ChartsSection = ({ patrimonios, imoveis }: ChartsSectionProps) => {
  // Dados para gráficos
  const chartData = useMemo(() => {
    if (patrimonios.length === 0) return { tipoChart: [], statusChart: [], valorChart: [], setorChart: [] }

    // Gráfico por tipo
    const tipoData = patrimonios.reduce((acc: any, p) => {
      const tipo = p.tipo || 'Não especificado'
      const valor = p.valor_aquisicao || p.valorAquisicao || p.valor || 0
      const numValor = typeof valor === 'number' ? valor : parseFloat(String(valor)) || 0
      
      if (!acc[tipo]) {
        acc[tipo] = { count: 0, value: 0 }
      }
      acc[tipo].count++
      acc[tipo].value += numValor
      return acc
    }, {})

    const tipoChart = Object.entries(tipoData).map(([tipo, data]: [string, any]) => ({
      tipo,
      quantidade: data.count,
      valor: data.value,
    }))

    // Gráfico por status
    const statusData = patrimonios.reduce((acc: any, p) => {
      const status = p.status || 'ativo'
      if (!acc[status]) acc[status] = 0
      acc[status]++
      return acc
    }, {})

    const statusChart = Object.entries(statusData).map(([status, count]: [string, any]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      quantidade: count,
    }))

    // Gráfico de valores por mês (últimos 6 meses)
    const valorChart = patrimonios
      .filter(p => p.data_aquisicao || p.dataAquisicao)
      .map(p => ({
        mes: new Date(p.data_aquisicao || p.dataAquisicao || '').toLocaleDateString('pt-BR', { month: 'short' }),
        valor: p.valor_aquisicao || p.valorAquisicao || p.valor || 0,
      }))
      .reduce((acc: any, item) => {
        if (!acc[item.mes]) acc[item.mes] = 0
        acc[item.mes] += item.valor
        return acc
      }, {})

    const valorChartData = Object.entries(valorChart).map(([mes, valor]: [string, any]) => ({
      mes,
      valor,
    }))

    // Gráfico por setor
    const setorData = patrimonios.reduce((acc: any, p) => {
      const setor = p.setor_responsavel || p.setorId || 'Sem Setor'
      if (!acc[setor]) acc[setor] = 0
      acc[setor]++
      return acc
    }, {})

    const setorChart = Object.entries(setorData).map(([setor, count]: [string, any]) => ({
      setor,
      quantidade: count,
    }))

    return { tipoChart, statusChart, valorChartData, setorChart }
  }, [patrimonios])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

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
                  <Tooltip content={<ChartTooltipContent />} />
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
                    label={({ status, quantidade }) => `${status}: ${quantidade}`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="quantidade"
                  >
                    {chartData.statusChart.map((entry, index) => (
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

      {/* Gráfico de Valores */}
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
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="valor" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Line type="monotone" dataKey="valor" stroke="#f59e0b" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Gráfico por Setor - Layout Vertical para melhor visualização */}
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
                  <Tooltip content={<ChartTooltipContent />} />
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
