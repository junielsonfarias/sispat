import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Plus, Minus, ArrowRight, Wrench } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { formatDate } from '@/lib/utils'
import { useSectorFilter } from '@/hooks/useSectorFilter'

const AnaliseTemporal = () => {
  const { patrimonios } = usePatrimonio()
  const { filterPatrimonios, accessInfo } = useSectorFilter()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const timelineEvents = useMemo(() => {
    // ✅ CORREÇÃO: Verificar se patrimonios existe e é array
    if (!patrimonios || !Array.isArray(patrimonios)) {
      console.warn('⚠️ [AnaliseTemporal] patrimonios não está disponível ou não é array:', patrimonios)
      return []
    }

    // ✅ CORREÇÃO: Filtrar patrimônios por setor do usuário
    const filteredPatrimonios = filterPatrimonios(patrimonios)
    console.log('🔍 [AnaliseTemporal] Patrimônios filtrados:', {
      total: patrimonios.length,
      filtrados: filteredPatrimonios.length,
      accessInfo
    })

    const events = filteredPatrimonios.flatMap((p) => {
      // ✅ CORREÇÃO: Verificar se historico_movimentacao existe e é array
      if (!p.historico_movimentacao || !Array.isArray(p.historico_movimentacao)) {
        console.warn('⚠️ [AnaliseTemporal] historico_movimentacao não está disponível para patrimônio:', p.numero_patrimonio || p.numeroPatrimonio)
        return [] // Retorna array vazio se não há histórico
      }

      return p.historico_movimentacao.map((h) => ({
        ...h,
        patrimonio: p.numero_patrimonio || p.numeroPatrimonio,
      }))
    })

    console.log('🔍 [AnaliseTemporal] Eventos encontrados:', events.length)

    return events
      .filter((event) => event && event.date) // ✅ Filtrar eventos válidos
      .sort((a, b) => {
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 20)
  }, [patrimonios, filterPatrimonios, accessInfo])

  const getEventIcon = (action: string) => {
    if (action.toLowerCase().includes('criação'))
      return { icon: Plus, color: 'bg-blue-500' }
    if (action.toLowerCase().includes('baixa'))
      return { icon: Minus, color: 'bg-red-500' }
    if (action.toLowerCase().includes('transferência'))
      return { icon: ArrowRight, color: 'bg-yellow-500' }
    if (action.toLowerCase().includes('manutenção'))
      return { icon: Wrench, color: 'bg-purple-500' }
    return { icon: Plus, color: 'bg-gray-500' }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Análise Temporal</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Análise Temporal</h1>
        {!accessInfo.canViewAllData && (
          <div className="text-sm text-muted-foreground bg-blue-50 px-3 py-2 rounded-lg">
            📊 Visualizando dados dos setores: {accessInfo.userSectors.join(', ') || 'Nenhum setor atribuído'}
          </div>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Linha do Tempo de Eventos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 after:absolute after:inset-y-0 after:w-0.5 after:bg-border after:left-0">
                {timelineEvents.length > 0 ? (
                  timelineEvents.map((event, index) => {
                    const { icon: Icon, color } = getEventIcon(event.action)
                    return (
                      <div key={index} className="relative mb-8 pl-8">
                        <div
                          className={`absolute -left-2.5 mt-1.5 h-5 w-5 rounded-full ${color} flex items-center justify-center`}
                        >
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        <time className="mb-1 text-sm font-normal leading-none text-muted-foreground">
                          {formatDate(
                            new Date(event.date),
                            "dd/MM/yyyy 'às' HH:mm",
                          )}
                        </time>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                          {event.action} - {event.patrimonio}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {event.details}
                        </p>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="mb-4 rounded-full bg-gray-100 p-4">
                      <Calendar className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                      Nenhum evento encontrado
                    </h3>
                    <p className="text-sm text-gray-500">
                      Não há movimentações registradas no sistema ainda.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Calendário de Atividades</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AnaliseTemporal
