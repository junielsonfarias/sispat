import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { ExcelCsvTemplate } from '@/types'
import { useAuth } from './AuthContext'
import { toast } from '@/hooks/use-toast'
import { api } from '@/services/api-adapter'

interface ExcelCsvTemplateContextType {
  templates: ExcelCsvTemplate[]
  getTemplateById: (id: string) => ExcelCsvTemplate | undefined
  saveTemplate: (
    template: Omit<ExcelCsvTemplate, 'id'> | ExcelCsvTemplate,
  ) => void
  deleteTemplate: (templateId: string) => void
}

const ExcelCsvTemplateContext =
  createContext<ExcelCsvTemplateContextType | null>(null)

export const ExcelCsvTemplateProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [allTemplates, setAllTemplates] = useState<ExcelCsvTemplate[]>([])
  const { user } = useAuth()

  const fetchTemplates = useCallback(async () => {
    if (!user) return
    
    try {
      const templates = await api.get<ExcelCsvTemplate[]>('/config/excel-csv-templates')
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
    async (template: Omit<ExcelCsvTemplate, 'id'> | ExcelCsvTemplate) => {
      if (!user) return

      try {
        if ('id' in template && template.id) {
          await api.put(`/config/excel-csv-templates/${template.id}`, template)
        } else {
          await api.post('/config/excel-csv-templates', template)
        }
        await fetchTemplates()
        toast({ description: 'Modelo de exportação salvo com sucesso.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao salvar modelo de exportação.',
        })
      }
    },
    [user, fetchTemplates],
  )

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      try {
        await api.delete(`/config/excel-csv-templates/${templateId}`)
        await fetchTemplates()
        toast({ description: 'Modelo de exportação excluído.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao excluir modelo de exportação.',
        })
      }
    },
    [fetchTemplates],
  )

  return (
    <ExcelCsvTemplateContext.Provider
      value={{ templates, getTemplateById, saveTemplate, deleteTemplate }}
    >
      {children}
    </ExcelCsvTemplateContext.Provider>
  )
}

export const useExcelCsvTemplates = () => {
  const context = useContext(ExcelCsvTemplateContext)
  if (!context) {
    throw new Error(
      'useExcelCsvTemplates must be used within a ExcelCsvTemplateProvider',
    )
  }
  return context
}
