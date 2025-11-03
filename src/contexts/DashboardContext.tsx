import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
} from 'react'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'
import { generateId } from '@/lib/utils'

export interface WidgetConfig {
  id: string
  component:
    | 'StatsCardsWidget'
    | 'StatusChartWidget'
    | 'TypeChartWidget'
    | 'RecentActivityWidget'
    | 'PendingTasksWidget'
    | 'ImoveisWidget'
  title: string
  description: string
}

interface DashboardContextType {
  widgets: WidgetConfig[]
  availableWidgets: WidgetConfig[]
  addWidget: (component: WidgetConfig['component']) => void
  removeWidget: (widgetId: string) => void
  moveWidget: (dragIndex: number, hoverIndex: number) => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined,
)

const ALL_WIDGETS: WidgetConfig[] = [
  {
    id: 'stats',
    component: 'StatsCardsWidget',
    title: 'Estatísticas de Bens',
    description: 'Visão geral dos números do patrimônio móvel.',
  },
  {
    id: 'imoveis',
    component: 'ImoveisWidget',
    title: 'Resumo de Imóveis',
    description: 'Visão geral dos imóveis cadastrados.',
  },
  {
    id: 'status',
    component: 'StatusChartWidget',
    title: 'Distribuição por Status',
    description: 'Gráfico de barras com o status dos bens.',
  },
  {
    id: 'type',
    component: 'TypeChartWidget',
    title: 'Distribuição por Categoria',
    description: 'Gráfico de pizza com os tipos de bens.',
  },
  {
    id: 'activity',
    component: 'RecentActivityWidget',
    title: 'Atividade Recente',
    description: 'Últimas atividades registradas no sistema.',
  },
  {
    id: 'pending',
    component: 'PendingTasksWidget',
    title: 'Pendências e Alertas',
    description: 'Bens em manutenção e inventários em andamento.',
  },
]

const DEFAULT_WIDGETS: WidgetConfig[] = [
  ALL_WIDGETS[0],
  ALL_WIDGETS[1],
  ALL_WIDGETS[2],
  ALL_WIDGETS[4],
]

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS)
  const { user } = useAuth()

  const fetchDashboard = useCallback(async () => {
    if (!user) return
    
    try {
      const dashboard = await api.get<any>('/config/user-dashboard')
      if (dashboard && dashboard.widgets) {
        const validWidgets = dashboard.widgets
          .map((saved: any) => {
            const baseWidget = ALL_WIDGETS.find(
              (w) => w.component === saved.component,
            )
            return baseWidget ? { ...baseWidget, id: saved.id } : null
          })
          .filter(Boolean) as WidgetConfig[]
        setWidgets(validWidgets)
      }
    } catch (error) {
      // Usar widgets padrão se falhar
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchDashboard()
    }
  }, [user, fetchDashboard])

  const saveWidgets = useCallback(
    async (newWidgets: WidgetConfig[]) => {
      setWidgets(newWidgets)
      
      if (user) {
        try {
          await api.put('/config/user-dashboard', { widgets: newWidgets })
        } catch (error) {
          // Silenciar erro
        }
      }
    },
    [user],
  )

  const addWidget = useCallback(
    (component: WidgetConfig['component']) => {
      const widgetToAdd = ALL_WIDGETS.find((w) => w.component === component)
      if (widgetToAdd && !widgets.some((w) => w.component === component)) {
        const newWidget = { ...widgetToAdd, id: generateId() }
        saveWidgets([...widgets, newWidget])
      }
    },
    [widgets, saveWidgets],
  )

  const removeWidget = useCallback(
    (widgetId: string) => {
      saveWidgets(widgets.filter((w) => w.id !== widgetId))
    },
    [widgets, saveWidgets],
  )

  const moveWidget = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const newWidgets = [...widgets]
      const [draggedItem] = newWidgets.splice(dragIndex, 1)
      newWidgets.splice(hoverIndex, 0, draggedItem)
      saveWidgets(newWidgets)
    },
    [widgets, saveWidgets],
  )

  const availableWidgets = ALL_WIDGETS.filter(
    (w) => !widgets.some((existing) => existing.component === w.component),
  )

  return (
    <DashboardContext.Provider
      value={{ widgets, availableWidgets, addWidget, removeWidget, moveWidget }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export const useDashboard = () => {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
