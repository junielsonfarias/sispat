import {
  createContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import { ReportTemplate, Patrimonio } from '@/types'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

interface ReportTemplateContextType {
  templates: ReportTemplate[]
  getTemplateById: (id: string) => ReportTemplate | undefined
  saveTemplate: (template: Omit<ReportTemplate, 'id'> | ReportTemplate) => void
  deleteTemplate: (templateId: string) => void
}

const ReportTemplateContext = createContext<ReportTemplateContextType | null>(
  null,
)

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
      // Adaptar templates do backend para o formato esperado pelo frontend
      const adaptedTemplates = templates.map(template => {
        // Se o template tem layout mas não tem fields, extrair fields do layout
        if (!template.fields && template.layout && Array.isArray(template.layout)) {
          const tableComponent = template.layout.find(c => c.type === 'TABLE')
          const fields = tableComponent?.props?.fields || []
          return {
            ...template,
            fields: fields as (keyof Patrimonio)[],
          }
        }
        return template
      })
      setAllTemplates(adaptedTemplates)
    } catch (error: any) {
      // Log do erro para debug, mas não quebrar a aplicação
      logger.error('Erro ao buscar templates de relatório:', error)
      // Se for erro 404 ou lista vazia, não é problema crítico
      if (error?.response?.status === 404) {
        setAllTemplates([])
      } else {
        // Para outros erros, manter templates vazios mas logar
        setAllTemplates([])
      }
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
