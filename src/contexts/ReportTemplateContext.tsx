import {
  createContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import { ReportTemplate, ReportComponent } from '@/types'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'

interface ReportTemplateContextType {
  templates: ReportTemplate[]
  getTemplateById: (id: string) => ReportTemplate | undefined
  saveTemplate: (template: Omit<ReportTemplate, 'id'> | ReportTemplate) => void
  deleteTemplate: (templateId: string) => void
}

const ReportTemplateContext = createContext<ReportTemplateContextType | null>(
  null,
)

const tabularLayout: ReportComponent[] = [
  {
    id: 'header',
    type: 'HEADER',
    x: 0,
    y: 0,
    w: 12,
    h: 1,
    styles: { paddingBottom: 16, borderBottomWidth: 2, borderStyle: 'solid' },
  },
  {
    id: 'table',
    type: 'TABLE',
    x: 0,
    y: 1,
    w: 12,
    h: 10,
    styles: { fontSize: 10 },
  },
  {
    id: 'footer',
    type: 'FOOTER',
    x: 0,
    y: 11,
    w: 12,
    h: 1,
    styles: {
      paddingTop: 16,
      fontSize: 8,
      textAlign: 'center',
      borderTopWidth: 1,
      borderStyle: 'solid',
    },
  },
]

const summaryLayout: ReportComponent[] = [
  { id: 'header', type: 'HEADER', x: 0, y: 0, w: 12, h: 1 },
  {
    id: 'summary_text',
    type: 'TEXT',
    x: 0,
    y: 1,
    w: 6,
    h: 4,
    props: {
      content:
        'Este relatório apresenta um resumo dos bens patrimoniais, destacando a distribuição por tipo e status. A tabela a seguir detalha cada item individualmente.',
    },
    styles: { padding: 12, backgroundColor: '#f9fafb', fontSize: 12 },
  },
  { id: 'summary_chart', type: 'CHART', x: 6, y: 1, w: 6, h: 4 },
  { id: 'details_table', type: 'TABLE', x: 0, y: 5, w: 12, h: 6 },
  {
    id: 'footer',
    type: 'FOOTER',
    x: 0,
    y: 11,
    w: 12,
    h: 1,
    styles: { paddingTop: 16, fontSize: 8, textAlign: 'center' },
  },
]

export const ReportTemplateProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [allTemplates, setAllTemplates] = useState<ReportTemplate[]>([])
  const { user } = useAuth()

  const fetchTemplates = useCallback(async () => {
    if (!user) return
    
    try {
      const templates = await api.get<ReportTemplate[]>('/config/report-templates')
      setAllTemplates(templates)
    } catch (error) {
      // Silenciar erro se não houver templates
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchTemplates()
    }
  }, [user, fetchTemplates])

  const templates = useMemo(() => {
    return allTemplates
  }, [allTemplates])

  const getTemplateById = useCallback(
    (id: string) => {
      return templates.find((t) => t.id === id)
    },
    [templates],
  )

  const saveTemplate = useCallback(
    async (template: Omit<ReportTemplate, 'id'> | ReportTemplate) => {
      if (!user) return

      try {
        if ('id' in template && template.id) {
          await api.put(`/config/report-templates/${template.id}`, template)
          toast({ description: 'Modelo de relatório atualizado com sucesso.' })
        } else {
          await api.post('/config/report-templates', template)
          toast({ description: 'Modelo de relatório criado com sucesso.' })
        }
        await fetchTemplates()
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao salvar modelo de relatório.',
        })
      }
    },
    [user, fetchTemplates],
  )

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      try {
        await api.delete(`/config/report-templates/${templateId}`)
        await fetchTemplates()
        toast({ description: 'Modelo de relatório excluído com sucesso.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao excluir modelo de relatório.',
        })
      }
    },
    [fetchTemplates],
  )

  return (
    <ReportTemplateContext.Provider
      value={{ templates, getTemplateById, saveTemplate, deleteTemplate }}
    >
      {children}
    </ReportTemplateContext.Provider>
  )
}

export const useReportTemplates = () => {
  const context = useContext(ReportTemplateContext)
  if (!context) {
    throw new Error(
      'useReportTemplates must be used within a ReportTemplateProvider',
    )
  }
  return context
}
