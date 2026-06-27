import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { FormFieldType, ImovelFieldConfig } from '@/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'
import { logger } from '@/lib/logger'
import { extractApiError } from '@/lib/api-error'

interface ImovelFieldContextType {
  fields: ImovelFieldConfig[]
  addField: (field: Omit<ImovelFieldConfig, 'id'>) => void
  updateField: (fieldId: string, updates: Partial<ImovelFieldConfig>) => void
  deleteField: (fieldId: string) => void
}

// O backend (Prisma `model ImovelCustomField` + schemas @sispat/shared) fala um
// contrato diferente do modelo do frontend (`ImovelFieldConfig`):
//   front  ->  back
//   key    ->  name        (identificador técnico)
//   type   ->  type        (MAIÚSCULO -> minúsculo: CURRENCY -> currency)
//   isCustom (derivado)    isSystem
//   options: string[]  ->  options: JSON string
// O `zodValidate` substitui o req.body, então enviar o objeto cru do front
// resultava em 400 (name/label undefined, enum minúsculo). Adaptamos aqui, no
// boundary, mantendo o backend canônico e sem mexer em FormFieldConfig/editor.

// Linha crua devolvida pelo backend.
interface ApiImovelField {
  id: string
  name: string
  label: string
  type: string
  required?: boolean
  defaultValue?: string | null
  options?: string | null
  isSystem?: boolean
}

const FRONT_TYPES: FormFieldType[] = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'DATE',
  'SELECT',
  'CURRENCY',
]

export const fromApi = (row: ApiImovelField): ImovelFieldConfig => {
  let options: string[] | undefined
  if (row.options) {
    try {
      const parsed = JSON.parse(row.options)
      if (Array.isArray(parsed)) options = parsed.map((o) => String(o))
    } catch {
      options = undefined
    }
  }
  const upper = (row.type || 'text').toUpperCase() as FormFieldType
  return {
    id: row.id,
    key: row.name,
    label: row.label,
    type: FRONT_TYPES.includes(upper) ? upper : 'TEXT',
    required: !!row.required,
    defaultValue: row.defaultValue ?? undefined,
    options,
    isSystem: !!row.isSystem,
    isCustom: !row.isSystem,
  }
}

// Body para POST /imovel-fields (createImovelFieldSchema aceita isSystem).
export const toCreateBody = (field: Omit<ImovelFieldConfig, 'id'>) => ({
  name: field.key,
  label: field.label,
  type: String(field.type).toLowerCase(),
  required: field.required ?? false,
  ...(field.defaultValue !== undefined ? { defaultValue: field.defaultValue } : {}),
  ...(field.options !== undefined ? { options: field.options } : {}),
  isSystem: field.isSystem ?? false,
})

// Body para PUT /imovel-fields/:id. updateImovelFieldSchema é .strict() e NÃO
// aceita isSystem/isCustom — só mapeamos os campos editáveis presentes.
export const toUpdateBody = (updates: Partial<ImovelFieldConfig>) => {
  const body: Record<string, unknown> = {}
  if (updates.key !== undefined) body.name = updates.key
  if (updates.label !== undefined) body.label = updates.label
  if (updates.type !== undefined) body.type = String(updates.type).toLowerCase()
  if (updates.required !== undefined) body.required = updates.required
  if (updates.defaultValue !== undefined) body.defaultValue = updates.defaultValue
  if (updates.options !== undefined) body.options = updates.options
  return body
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
      const response = await api.get<ApiImovelField[]>('/imovel-fields')
      const fieldsData = Array.isArray(response) ? response.map(fromApi) : []
      setAllFields(fieldsData)
    } catch (error) {
      // Silenciar erro 500 - tabela pode não existir ainda
      if (extractApiError(error).status === 500) {
        // imovel-fields endpoint não disponível, usando dados iniciais
      } else {
        logger.error('Failed to load imovel fields:', error)
      }
      
      // Usar fallback
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
        const created = await api.post<ApiImovelField>(
          '/imovel-fields',
          toCreateBody(field),
        )
        setAllFields(prev => [...prev, fromApi(created)])
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
        const updated = await api.put<ApiImovelField>(
          `/imovel-fields/${fieldId}`,
          toUpdateBody(updates),
        )
        setAllFields(prev => prev.map(f => (f.id === fieldId ? fromApi(updated) : f)))
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
