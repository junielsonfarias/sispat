import {
  createContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import { LabelTemplate } from '@/types'
import { generateId } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

interface LabelTemplateContextType {
  templates: LabelTemplate[]
  getTemplateById: (id: string) => LabelTemplate | undefined
  saveTemplate: (template: LabelTemplate) => void
  deleteTemplate: (templateId: string) => void
}

const LabelTemplateContext = createContext<LabelTemplateContextType | null>(
  null,
)

const defaultTemplate: LabelTemplate = {
  id: 'default-60x40',
  name: 'Padrão 60x40mm',
  width: 60,
  height: 40,
  isDefault: true,
  elements: [
    {
      id: 'logo',
      type: 'LOGO',
      x: 5,
      y: 5,
      width: 25,
      height: 20,
      content: 'logo',
      fontSize: 12,
      fontWeight: 'normal',
      textAlign: 'left',
    },
    {
      id: 'patrimonio',
      type: 'PATRIMONIO_FIELD',
      content: 'numero_patrimonio',
      x: 5,
      y: 70,
      width: 55,
      height: 25,
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'left',
    },
  ],
  municipalityId: '1',
}

const initialTemplates = [defaultTemplate]

export const LabelTemplateProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [allTemplates, setAllTemplates] =
    useState<LabelTemplate[]>(initialTemplates)
  const { user } = useAuth()
  
  // ✅ CORREÇÃO: Só logar quando há usuário logado
  if (user) {
    console.log('LabelTemplateContext user:', user)
  }

  useEffect(() => {
    // ✅ CORREÇÃO: Só carregar templates quando há usuário logado
    if (!user) return
    
    // In a real app, this would fetch from an API
    console.log('Loading templates from localStorage...')
    const stored = localStorage.getItem('sispat_label_templates')
    if (stored) {
      console.log('Found stored templates:', stored)
      const parsedTemplates = JSON.parse(stored)
      console.log('Parsed templates:', parsedTemplates)
      setAllTemplates(parsedTemplates)
    } else {
      console.log('No stored templates found, using initial templates')
      console.log('Initial templates:', initialTemplates)
    }
  }, [user])

  const templates = useMemo(() => {
    // ✅ CORREÇÃO: Só logar quando há usuário logado
    if (user) {
      console.log('LabelTemplateContext templates useMemo:', { 
        user, 
        allTemplates: allTemplates.length,
        userRole: user?.role,
        userMunicipalityId: user?.municipalityId,
        allTemplatesData: allTemplates.map(t => ({ id: t.id, name: t.name, municipalityId: t.municipalityId }))
      })
      console.log('Single municipality system - returning all templates:', allTemplates.length)
    }
    
    // ✅ CORREÇÃO: Aplicação é para um único município, não precisa filtrar
    // Retornar todos os templates já que é um sistema single-municipality
    return allTemplates
  }, [allTemplates, user])

  const persist = (newTemplates: LabelTemplate[]) => {
    console.log('Persisting templates to localStorage:', newTemplates)
    // In a real app, this would be an API call
    localStorage.setItem('sispat_label_templates', JSON.stringify(newTemplates))
    setAllTemplates(newTemplates)
    console.log('Templates persisted successfully')
  }

  const getTemplateById = useCallback(
    (id: string) => templates.find((t) => t.id === id),
    [templates],
  )

  const saveTemplate = useCallback(
    (template: LabelTemplate) => {
      console.log('saveTemplate called:', { template, user, municipalityId: user?.municipalityId, role: user?.role })
      
      // ✅ CORREÇÃO: Aplicação é para um único município, não precisa verificar municipalityId

      console.log('Saving template...')
      setAllTemplates((prev) => {
        const newTemplates = [...prev]
        const index = newTemplates.findIndex((t) => t.id === template.id)
        const templateToSave = {
          ...template,
          municipalityId: '1', // ✅ CORREÇÃO: Sempre usar '1' para o município único
        }
        console.log('Template to save:', { 
          originalTemplate: template,
          templateToSave,
          userMunicipalityId: user?.municipalityId,
          finalMunicipalityId: templateToSave.municipalityId
        })
        
        if (index > -1) {
          console.log('Updating existing template at index:', index)
          newTemplates[index] = templateToSave
        } else {
          console.log('Adding new template')
          newTemplates.push(templateToSave)
        }
        
        console.log('New templates array:', newTemplates)
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
    <LabelTemplateContext.Provider
      value={{ templates, getTemplateById, saveTemplate, deleteTemplate }}
    >
      {children}
    </LabelTemplateContext.Provider>
  )
}

export const useLabelTemplates = () => {
  const context = useContext(LabelTemplateContext)
  if (!context) {
    throw new Error(
      'useLabelTemplates must be used within a LabelTemplateProvider',
    )
  }
  return context
}
