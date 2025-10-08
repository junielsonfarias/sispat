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

const AnaliseTemporal = () => {
  const { patrimonios } = usePatrimonio()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const timelineEvents = useMemo(() => {
    const events = patrimonios.flatMap((p) =>
      p.historico_movimentacao.map((h) => ({
        ...h,
        patrimonio: p.numero_patrimonio || p.numeroPatrimonio,
      })),
    )
    return events
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)
  }, [patrimonios])

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
      <h1 className="text-2xl font-bold">Análise Temporal</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Linha do Tempo de Eventos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 after:absolute after:inset-y-0 after:w-0.5 after:bg-border after:left-0">
                {timelineEvents.map((event, index) => {
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
                })}
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
