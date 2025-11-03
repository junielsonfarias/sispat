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
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'

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

  // ✅ Buscar templates da API
  const fetchTemplates = useCallback(async () => {
    if (!user) return
    
    try {
      const response = await api.get<LabelTemplate[]>('/label-templates')
      const templatesData = Array.isArray(response) ? response : []
      
      if (templatesData.length > 0) {
        setAllTemplates(templatesData)
      } else {
        setAllTemplates(initialTemplates)
      }
    } catch (error) {
      // Em caso de erro, usar template padrão
      setAllTemplates(initialTemplates)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchTemplates()
    }
  }, [user, fetchTemplates])

  const templates = useMemo(() => {
    // ✅ CORREÇÃO: Aplicação é para um único município, não precisa filtrar
    // Retornar todos os templates já que é um sistema single-municipality
    return allTemplates
  }, [allTemplates])

  // ✅ Removido persist do localStorage - agora usa API

  const getTemplateById = useCallback(
    (id: string) => templates.find((t) => t.id === id),
    [templates],
  )

  const saveTemplate = useCallback(
    async (template: LabelTemplate) => {
      if (!user) return
      
      try {
        // ✅ CORREÇÃO: Verificar se é template padrão (que pode não existir no backend)
        const isDefaultTemplate = template.id?.startsWith('default-') || template.id === 'default-60x40'
        
        // Verificar se existe no estado local
        const existingIndex = allTemplates.findIndex(t => t.id === template.id)
        
        // Se existe localmente e não é template padrão, tentar atualizar
        if (existingIndex > -1 && !isDefaultTemplate) {
          try {
            // Tentar atualizar template existente
            const updated = await api.put<LabelTemplate>(
              `/label-templates/${template.id}`,
              {
                name: template.name,
                width: template.width,
                height: template.height,
                isDefault: template.isDefault,
                elements: template.elements,
              }
            )
            
            // Atualizar estado local
            setAllTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
            
            toast({
              title: 'Sucesso',
              description: 'Template atualizado com sucesso.',
            })
            return
          } catch (updateError: any) {
            // Se der 404, o template não existe no backend, então criar
            if (updateError?.response?.status === 404) {
              // Continua para criar como novo
            } else {
              throw updateError
            }
          }
        }
        
        // Criar novo template (ou recriar se era padrão)
        const created = await api.post<LabelTemplate>('/label-templates', {
          name: template.name,
          width: template.width,
          height: template.height,
          isDefault: template.isDefault || false,
          elements: template.elements,
        })
        
        // Atualizar estado local com o novo ID do backend
        if (existingIndex > -1) {
          // Se existia localmente, substituir pelo criado no backend
          setAllTemplates(prev => prev.map(t => t.id === template.id ? created : t))
        } else {
          // Adicionar como novo
          setAllTemplates(prev => [...prev, created])
        }
        
        toast({
          title: 'Sucesso',
          description: 'Template criado com sucesso.',
        })
        
      } catch (error: any) {
        // ✅ CORREÇÃO: Se for erro 404 ou backend indisponível, salvar apenas localmente
        if (error?.response?.status === 404 || error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
          // Salvar apenas no estado local
          const existingIndex = allTemplates.findIndex(t => t.id === template.id)
          if (existingIndex > -1) {
            setAllTemplates(prev => prev.map(t => t.id === template.id ? template : t))
          } else {
            // Gerar novo ID se necessário
            const templateToSave = template.id?.startsWith('default-') 
              ? { ...template, id: generateId() }
              : template
            setAllTemplates(prev => [...prev, templateToSave])
          }
          
          toast({
            title: 'Aviso',
            description: 'Template salvo localmente (backend indisponível).',
            variant: 'default',
          })
          return
        }
        
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: error?.response?.data?.error || 'Falha ao salvar template. Tente novamente.',
        })
      }
    },
    [user, allTemplates],
  )

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      if (!user) return
      
      try {
        await api.delete(`/label-templates/${templateId}`)
        
        // Remover do estado local
        setAllTemplates(prev => prev.filter(t => t.id !== templateId))
        
        toast({
          title: 'Sucesso',
          description: 'Template excluído com sucesso.',
        })
      } catch (error) {
        // ✅ CORREÇÃO: Se for erro 404, deletar apenas localmente
        if (error?.response?.status === 404) {
          // Remover apenas do estado local
          setAllTemplates(prev => prev.filter(t => t.id !== templateId))
          
          toast({
            title: 'Aviso',
            description: 'Template removido localmente (backend indisponível).',
            variant: 'default',
          })
          return
        }
        
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao excluir template. Tente novamente.',
        })
      }
    },
    [user],
  )

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
