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
import { generateId } from '@/lib/utils'
import { useAuth } from './AuthContext'

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

const defaultTemplates: ImovelReportTemplate[] = [
  {
    id: 'imovel-default-simple',
    name: 'Relatório Simples de Imóveis',
    municipalityId: '1',
    fields: ['numero_patrimonio', 'denominacao', 'endereco', 'area_construida'],
    filters: {},
  },
]

export const ImovelReportTemplateProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [allTemplates, setAllTemplates] =
    useState<ImovelReportTemplate[]>(defaultTemplates)
  const { user } = useAuth()

  useEffect(() => {
    // In a real app, this would fetch from an API
    const stored = localStorage.getItem('sispat_imovel_report_templates')
    if (stored) {
      setAllTemplates(JSON.parse(stored))
    }
  }, [])

  const templates = useMemo(() => {
    // ✅ CORREÇÃO: Sistema single-municipality, retornar todos os templates
    return allTemplates
  }, [allTemplates, user])

  const persist = (newTemplates: ImovelReportTemplate[]) => {
    // In a real app, this would be an API call
    localStorage.setItem(
      'sispat_imovel_report_templates',
      JSON.stringify(newTemplates),
    )
    setAllTemplates(newTemplates)
  }

  const getTemplateById = useCallback(
    (id: string) => templates.find((t) => t.id === id),
    [templates],
  )

  const saveTemplate = useCallback(
    (template: Omit<ImovelReportTemplate, 'id'> | ImovelReportTemplate) => {
      // ✅ CORREÇÃO: Sistema single-municipality, não precisa verificar municipalityId
      setAllTemplates((prev) => {
        let newTemplates
        if ('id' in template && template.id) {
          const index = prev.findIndex((t) => t.id === template.id)
          newTemplates = [...prev]
          newTemplates[index] = template as ImovelReportTemplate
        } else {
          newTemplates = [
            ...prev,
            {
              ...template,
              id: generateId(),
              municipalityId: '1', // ✅ CORREÇÃO: Sempre usar '1' para o município único
            },
          ]
        }
        persist(newTemplates)
        return newTemplates
      })
    },
    [user],
  )

  const deleteTemplate = useCallback((templateId: string) => {
    setAllTemplates((prev) => {
      const newTemplates = prev.filter((t) => t.id !== templateId)
      persist(newTemplates)
      return newTemplates
    })
  }, [])

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
