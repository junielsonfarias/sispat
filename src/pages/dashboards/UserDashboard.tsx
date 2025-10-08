import { useMemo } from 'react'
import { Folder, UserCheck, AlertCircle, PlusCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { useAuth } from '@/hooks/useAuth'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { subMonths, isAfter } from 'date-fns'

const UserDashboard = () => {
  const { user } = useAuth()
  const { patrimonios } = usePatrimonio()

  const userPatrimonios = useMemo(() => {
    if (!user || !user.sector) return []
    // Excluir bens baixados dos cálculos
    return patrimonios.filter((p) => 
      (p.setor_responsavel || p.setorResponsavel) === user.sector && 
      p.status !== 'baixado'
    )
  }, [patrimonios, user])

  const stats = useMemo(() => {
    const oneMonthAgo = subMonths(new Date(), 1)
    const addedThisMonth = userPatrimonios.filter((p) => {
      try {
        const data = new Date(p.dataAquisicao)
        if (isNaN(data.getTime())) return false
        return isAfter(data, oneMonthAgo)
      } catch {
        return false
      }
    }).length
    const needsAttention = userPatrimonios.filter(
      (p) => (p.situacao_bem || p.situacaoBem) === 'RUIM' || (p.situacao_bem || p.situacaoBem) === 'PESSIMO',
    ).length

    return {
      total: userPatrimonios.length,
      responsible: userPatrimonios.length, // Simplified for now
      needsAttention,
      addedThisMonth,
    }
  }, [userPatrimonios])

  const statsCards = [
    {
      title: 'Bens no Setor',
      value: stats.total.toString(),
      icon: Folder,
      color: 'text-blue-500',
    },
    {
      title: 'Sob Minha Responsabilidade',
      value: stats.responsible.toString(),
      icon: UserCheck,
      color: 'text-green-500',
    },
    {
      title: 'Necessitam Atenção',
      value: stats.needsAttention.toString(),
      icon: AlertCircle,
      color: 'text-yellow-500',
    },
    {
      title: 'Adicionados Este Mês',
      value: stats.addedThisMonth.toString(),
      icon: PlusCircle,
      color: 'text-green-500',
    },
  ]

  const statusData = useMemo(() => {
    const counts = userPatrimonios.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    return [
      {
        name: 'Ativo',
        value: counts.ativo || 0,
        fill: 'hsl(var(--chart-2))',
      },
      {
        name: 'Manutenção',
        value: counts.manutencao || 0,
        fill: 'hsl(var(--chart-3))',
      },
      {
        name: 'Inativo',
        value: counts.inativo || 0,
        fill: 'hsl(var(--muted))',
      },
      {
        name: 'Baixado',
        value: counts.baixado || 0,
        fill: 'hsl(var(--chart-4))',
      },
    ]
  }, [userPatrimonios])

  const typesData = useMemo(() => {
    const counts = userPatrimonios.reduce(
      (acc, p) => {
        acc[p.tipo] = (acc[p.tipo] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [userPatrimonios])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard do Usuário</h1>
      <p className="text-muted-foreground">
        Visão geral do setor: {user?.sector}
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card) => (
          <Card
            key={card.title}
            className="hover:shadow-elevation transition-shadow duration-300"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status dos Meus Bens</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <PieChart>
                <Tooltip content={<ChartTooltipContent />} />
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Bens no Setor</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <BarChart
                data={typesData}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="value"
                  fill="hsl(var(--chart-1))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default UserDashboard
