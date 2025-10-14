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
  
  // ✅ CORREÇÃO: Só logar quando há usuário logado
  if (user) {
    console.log('LabelTemplateContext user:', user)
  }

  // ✅ Buscar templates da API
  const fetchTemplates = useCallback(async () => {
    if (!user) return
    
    try {
      console.log('🔍 Buscando templates da API...')
      const response = await api.get<LabelTemplate[]>('/label-templates')
      const templatesData = Array.isArray(response) ? response : []
      
      console.log('✅ Templates carregados da API:', templatesData.length)
      
      if (templatesData.length > 0) {
        setAllTemplates(templatesData)
      } else {
        console.log('⚠️  Nenhum template no banco, usando template padrão inicial')
        setAllTemplates(initialTemplates)
      }
    } catch (error) {
      console.error('❌ Erro ao buscar templates:', error)
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

  // ✅ Removido persist do localStorage - agora usa API

  const getTemplateById = useCallback(
    (id: string) => templates.find((t) => t.id === id),
    [templates],
  )

  const saveTemplate = useCallback(
    async (template: LabelTemplate) => {
      if (!user) return
      
      try {
        console.log('💾 Salvando template na API:', template.name)
        
        // Verificar se é atualização ou criação
        const existingIndex = allTemplates.findIndex(t => t.id === template.id)
        
        if (existingIndex > -1) {
          // Atualizar template existente
          console.log('🔄 Atualizando template existente:', template.id)
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
        } else {
          // Criar novo template
          console.log('➕ Criando novo template')
          const created = await api.post<LabelTemplate>('/label-templates', {
            name: template.name,
            width: template.width,
            height: template.height,
            isDefault: template.isDefault || false,
            elements: template.elements,
          })
          
          // Adicionar ao estado local
          setAllTemplates(prev => [...prev, created])
          
          toast({
            title: 'Sucesso',
            description: 'Template criado com sucesso.',
          })
        }
        
        console.log('✅ Template salvo com sucesso')
      } catch (error) {
        console.error('❌ Erro ao salvar template:', error)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao salvar template. Tente novamente.',
        })
      }
    },
    [user, allTemplates],
  )

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      if (!user) return
      
      try {
        console.log('🗑️  Deletando template:', templateId)
        
        await api.delete(`/label-templates/${templateId}`)
        
        // Remover do estado local
        setAllTemplates(prev => prev.filter(t => t.id !== templateId))
        
        toast({
          title: 'Sucesso',
          description: 'Template excluído com sucesso.',
        })
        
        console.log('✅ Template deletado com sucesso')
      } catch (error) {
        console.error('❌ Erro ao deletar template:', error)
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
