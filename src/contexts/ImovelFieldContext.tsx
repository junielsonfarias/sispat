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

  useEffect(() => {
    const stored = localStorage.getItem('sispat_imovel_fields')
    if (stored) {
      setAllFields(JSON.parse(stored))
    } else {
      localStorage.setItem(
        'sispat_imovel_fields',
        JSON.stringify(initialFields),
      )
    }
  }, [])

  const fields = useMemo(() => {
    // In a real multi-tenant app, you'd filter by municipalityId
    return allFields
  }, [allFields])

  const persist = (newFields: ImovelFieldConfig[]) => {
    localStorage.setItem('sispat_imovel_fields', JSON.stringify(newFields))
    setAllFields(newFields)
  }

  const addField = useCallback(
    (field: Omit<ImovelFieldConfig, 'id'>) => {
      const newField = { ...field, id: generateId() }
      persist([...allFields, newField])
      toast({ description: 'Campo personalizado adicionado.' })
    },
    [allFields],
  )

  const updateField = useCallback(
    (fieldId: string, updates: Partial<ImovelFieldConfig>) => {
      const newFields = allFields.map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f,
      )
      persist(newFields)
      toast({ description: 'Campo personalizado atualizado.' })
    },
    [allFields],
  )

  const deleteField = useCallback(
    (fieldId: string) => {
      persist(allFields.filter((f) => f.id !== fieldId))
      toast({ description: 'Campo personalizado excluído.' })
    },
    [allFields],
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
