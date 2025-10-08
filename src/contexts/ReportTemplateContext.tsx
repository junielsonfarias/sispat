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
import { generateId } from '@/lib/utils'
import { useAuth } from './AuthContext'

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

const defaultTemplates: ReportTemplate[] = [
  {
    id: 'geral',
    name: 'Relatório Tabular Padrão',
    fields: [
      'numero_patrimonio',
      'descricao_bem',
      'setor_responsavel',
      'status',
      'valor_aquisicao',
    ],
    filters: {},
    layout: tabularLayout,
    municipalityId: '1',
  },
  {
    id: 'summary-chart',
    name: 'Relatório Resumido com Gráfico',
    fields: [
      'numero_patrimonio',
      'descricao_bem',
      'tipo',
      'status',
      'valor_aquisicao',
    ],
    filters: {},
    layout: summaryLayout,
    municipalityId: '1',
  },
]

export const ReportTemplateProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [allTemplates, setAllTemplates] =
    useState<ReportTemplate[]>(defaultTemplates)
  const { user } = useAuth()

  useEffect(() => {
    try {
      const storedTemplates = localStorage.getItem('sispat_report_templates')
      if (storedTemplates) {
        const parsedTemplates = JSON.parse(storedTemplates)
        const templatesWithLayout = parsedTemplates.map((t: ReportTemplate) =>
          t.layout ? t : { ...t, layout: tabularLayout },
        )
        setAllTemplates(templatesWithLayout)
      } else {
        localStorage.setItem(
          'sispat_report_templates',
          JSON.stringify(defaultTemplates),
        )
      }
    } catch (error) {
      // Failed to load report templates from localStorage - using defaults
      setAllTemplates(defaultTemplates)
    }
  }, [])

  const templates = useMemo(() => {
    // Agora todos os templates são visíveis para todos os usuários
    // pois temos apenas um município
    return allTemplates
  }, [allTemplates])

  const getTemplateById = useCallback(
    (id: string) => {
      return templates.find((t) => t.id === id)
    },
    [templates],
  )

  const saveTemplate = useCallback(
    (template: Omit<ReportTemplate, 'id'> | ReportTemplate) => {
      // ✅ CORREÇÃO: Sistema single-municipality, não precisa verificar municipalityId

      setAllTemplates((prevTemplates) => {
        let newTemplates
        if ('id' in template && template.id) {
          const existingIndex = prevTemplates.findIndex(
            (t) => t.id === template.id,
          )
          if (existingIndex > -1) {
            newTemplates = [...prevTemplates]
            newTemplates[existingIndex] = template as ReportTemplate
          } else {
            newTemplates = [...prevTemplates, template as ReportTemplate]
          }
        } else {
          newTemplates = [
            ...prevTemplates,
            {
              ...template,
              id: generateId(),
              layout: tabularLayout,
              municipalityId: '1', // ✅ CORREÇÃO: Sempre usar '1' para o município único
            },
          ]
        }
        localStorage.setItem(
          'sispat_report_templates',
          JSON.stringify(newTemplates),
        )
        return newTemplates
      })
    },
    [user],
  )

  const deleteTemplate = useCallback((templateId: string) => {
    setAllTemplates((prevTemplates) => {
      const newTemplates = prevTemplates.filter((t) => t.id !== templateId)
      localStorage.setItem(
        'sispat_report_templates',
        JSON.stringify(newTemplates),
      )
      return newTemplates
    })
  }, [])

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
