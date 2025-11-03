import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { ImovelReportTemplate } from '@/types'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'

interface ImovelReportTemplateContextType {
  templates: ImovelReportTemplate[]
  getTemplateById: (id: string) => ImovelReportTemplate | undefined
  saveTemplate: (
    template: Omit<ImovelReportTemplate, 'id'> | ImovelReportTemplate,
  ) => void
  deleteTemplate: (templateId: string) => void
}

const ImovelReportTemplateContext =
  createContext<ImovelReportTemplateContextType | null>(null)

export const ImovelReportTemplateProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [allTemplates, setAllTemplates] = useState<ImovelReportTemplate[]>([])
  const { user } = useAuth()

  const fetchTemplates = useCallback(async () => {
    if (!user) return
    
    try {
      const templates = await api.get<ImovelReportTemplate[]>('/config/imovel-report-templates')
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
    (id: string) => templates.find((t) => t.id === id),
    [templates],
  )

  const saveTemplate = useCallback(
    async (template: Omit<ImovelReportTemplate, 'id'> | ImovelReportTemplate) => {
      if (!user) return

      try {
        if ('id' in template && template.id) {
          await api.put(`/config/imovel-report-templates/${template.id}`, template)
        } else {
          await api.post('/config/imovel-report-templates', template)
        }
        await fetchTemplates()
        toast({ description: 'Template de relatório salvo com sucesso.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao salvar template de relatório.',
        })
      }
    },
    [user, fetchTemplates],
  )

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      try {
        await api.delete(`/config/imovel-report-templates/${templateId}`)
        await fetchTemplates()
        toast({ description: 'Template excluído com sucesso.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao excluir template.',
        })
      }
    },
    [fetchTemplates],
  )

  return (
    <ImovelReportTemplateContext.Provider
      value={{ templates, getTemplateById, saveTemplate, deleteTemplate }}
    >
      {children}
    </ImovelReportTemplateContext.Provider>
  )
}

export const useImovelReportTemplates = () => {
  const context = useContext(ImovelReportTemplateContext)
  if (!context) {
    throw new Error(
      'useImovelReportTemplates must be used within a ImovelReportTemplateProvider',
    )
  }
  return context
}
