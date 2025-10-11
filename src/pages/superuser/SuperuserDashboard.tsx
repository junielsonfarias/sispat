import { Building, Users, Database } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { useAuth } from '@/hooks/useAuth'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { Badge } from '@/components/ui/badge'

export default function SuperuserDashboard() {
  const { users } = useAuth()
  const { patrimonios } = usePatrimonio()

  // Sistema simplificado para município único

  const statsCards = [
    {
      title: 'Sistema Ativo',
      value: MUNICIPALITY_NAME,
      icon: Building,
      color: 'text-blue-500',
    },
    {
      title: 'Total de Usuários',
      value: users.length,
      icon: Users,
      color: 'text-green-500',
    },
    {
      title: 'Total de Bens',
      value: patrimonios.length,
      icon: Database,
      color: 'text-yellow-500',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard do Superusuário</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statsCards.map((card) => (
          <Card
            key={card.title}
            className="hover:shadow-elevation transition-shadow duration-300"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 md:pb-2">
              <CardTitle className="text-base md:text-lg lg:text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 md:h-4 md:w-4 ${card.color}`} />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-3xl md:text-4xl lg:text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-500" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Município Ativo:</span>
              <Badge variant="default" className="bg-green-500">
                {MUNICIPALITY_NAME}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status do Sistema:</span>
              <Badge variant="default" className="bg-green-500">
                Ativo
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total de Usuários:</span>
              <span className="font-bold">{users.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total de Bens:</span>
              <span className="font-bold">{patrimonios.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
