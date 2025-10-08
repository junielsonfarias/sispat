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
import { generateId } from '@/lib/utils'
import { useAuth } from './AuthContext'
import { toast } from '@/hooks/use-toast'

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

const defaultTemplates: ExcelCsvTemplate[] = [
  {
    id: 'default-simple',
    name: 'Relatório Simples',
    municipalityId: '1',
    columns: [
      { key: 'numero_patrimonio', header: 'Nº Patrimônio' },
      { key: 'descricao_bem', header: 'Descrição' },
    ],
  },
]

export const ExcelCsvTemplateProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [allTemplates, setAllTemplates] =
    useState<ExcelCsvTemplate[]>(defaultTemplates)
  const { user } = useAuth()

  useEffect(() => {
    // In a real app, this would fetch from an API
    const stored = localStorage.getItem('sispat_excel_templates')
    if (stored) {
      setAllTemplates(JSON.parse(stored))
    }
  }, [])

  const templates = useMemo(() => {
    // ✅ CORREÇÃO: Sistema single-municipality, retornar todos os templates
    return allTemplates
  }, [allTemplates, user])

  const persist = (newTemplates: ExcelCsvTemplate[]) => {
    // In a real app, this would be an API call
    localStorage.setItem('sispat_excel_templates', JSON.stringify(newTemplates))
    setAllTemplates(newTemplates)
  }

  const getTemplateById = useCallback(
    (id: string) => templates.find((t) => t.id === id),
    [templates],
  )

  const saveTemplate = useCallback(
    (template: Omit<ExcelCsvTemplate, 'id'> | ExcelCsvTemplate) => {
      if (!user?.municipalityId && user?.role !== 'superuser') return

      setAllTemplates((prev) => {
        let newTemplates
        if ('id' in template && template.id) {
          const index = prev.findIndex((t) => t.id === template.id)
          newTemplates = [...prev]
          newTemplates[index] = template as ExcelCsvTemplate
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
        toast({ description: 'Modelo de exportação salvo com sucesso.' })
        return newTemplates
      })
    },
    [user],
  )

  const deleteTemplate = useCallback((templateId: string) => {
    setAllTemplates((prev) => {
      const newTemplates = prev.filter((t) => t.id !== templateId)
      persist(newTemplates)
      toast({ description: 'Modelo de exportação excluído.' })
      return newTemplates
    })
  }, [])

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
