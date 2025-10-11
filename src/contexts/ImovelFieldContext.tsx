import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { ImovelFieldConfig } from '@/types'
import { generateId } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'

interface ImovelFieldContextType {
  fields: ImovelFieldConfig[]
  addField: (field: Omit<ImovelFieldConfig, 'id'>) => void
  updateField: (fieldId: string, updates: Partial<ImovelFieldConfig>) => void
  deleteField: (fieldId: string) => void
}

const ImovelFieldContext = createContext<ImovelFieldContextType | null>(null)

const initialFields: ImovelFieldConfig[] = [
  {
    id: 'imovel-sys-1',
    key: 'denominacao',
    label: 'Denominação',
    type: 'TEXT',
    required: true,
    isCustom: false,
    isSystem: true,
  },
  {
    id: 'imovel-sys-2',
    key: 'endereco',
    label: 'Endereço',
    type: 'TEXTAREA',
    required: true,
    isCustom: false,
    isSystem: true,
  },
  {
    id: 'imovel-custom-1',
    key: 'matricula_imovel',
    label: 'Matrícula do Imóvel',
    type: 'TEXT',
    required: false,
    isCustom: true,
    isSystem: false,
  },
  {
    id: 'imovel-custom-2',
    key: 'cartorio',
    label: 'Cartório de Registro',
    type: 'TEXT',
    required: false,
    isCustom: true,
    isSystem: false,
  },
]

export const ImovelFieldProvider = ({ children }: { children: ReactNode }) => {
  const [allFields, setAllFields] = useState<ImovelFieldConfig[]>(initialFields)
  const { user } = useAuth()

  const fetchFields = useCallback(async () => {
    if (!user) return
    try {
      const response = await api.get<ImovelFieldConfig[]>('/imovel-fields')
      const fieldsData = Array.isArray(response) ? response : []
      setAllFields(fieldsData)
    } catch (error) {
      console.error('Failed to load imovel fields:', error)
      // Tentar carregar do localStorage como fallback
      const stored = localStorage.getItem('sispat_imovel_fields')
      if (stored) {
        setAllFields(JSON.parse(stored))
      } else {
        setAllFields(initialFields)
      }
    }
  }, [user])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const fields = useMemo(() => {
    return allFields
  }, [allFields])

  const addField = useCallback(
    async (field: Omit<ImovelFieldConfig, 'id'>) => {
      try {
        const newField = await api.post<ImovelFieldConfig>('/imovel-fields', field)
        setAllFields(prev => [...prev, newField])
        toast({ description: 'Campo personalizado adicionado.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao adicionar campo personalizado.',
        })
      }
    },
    [],
  )

  const updateField = useCallback(
    async (fieldId: string, updates: Partial<ImovelFieldConfig>) => {
      try {
        const updatedField = await api.put<ImovelFieldConfig>(`/imovel-fields/${fieldId}`, updates)
        setAllFields(prev => prev.map(f => f.id === fieldId ? updatedField : f))
        toast({ description: 'Campo personalizado atualizado.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao atualizar campo personalizado.',
        })
      }
    },
    [],
  )

  const deleteField = useCallback(
    async (fieldId: string) => {
      try {
        await api.delete(`/imovel-fields/${fieldId}`)
        setAllFields(prev => prev.filter(f => f.id !== fieldId))
        toast({ description: 'Campo personalizado excluído.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao excluir campo personalizado.',
        })
      }
    },
    [],
  )

  const value = useMemo(
    () => ({ fields, addField, updateField, deleteField }),
    [fields, addField, updateField, deleteField],
  )

  return (
    <ImovelFieldContext.Provider value={value}>
      {children}
    </ImovelFieldContext.Provider>
  )
}

export const useImovelField = () => {
  const context = useContext(ImovelFieldContext)
  if (!context) {
    throw new Error('useImovelField must be used within an ImovelFieldProvider')
  }
  return context
}
