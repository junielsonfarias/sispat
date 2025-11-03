import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
} from 'react'
import { FormFieldConfig } from '@/types'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'

interface FormFieldManagerContextType {
  fields: FormFieldConfig[]
  addField: (field: Omit<FormFieldConfig, 'id'>) => void
  updateField: (fieldId: string, updates: Partial<FormFieldConfig>) => void
  deleteField: (fieldId: string) => void
  reorderFields: (fields: FormFieldConfig[]) => void
}

const FormFieldManagerContext =
  createContext<FormFieldManagerContextType | null>(null)

export const FormFieldManagerProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [fields, setFields] = useState<FormFieldConfig[]>([])
  const { user } = useAuth()

  const fetchFields = useCallback(async () => {
    if (!user) return
    
    try {
      const fieldsData = await api.get<FormFieldConfig[]>('/config/form-field-configs')
      setFields(fieldsData)
    } catch (error) {
      // Silenciar erro se não houver campos
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchFields()
    }
  }, [user, fetchFields])

  const addField = useCallback(
    async (field: Omit<FormFieldConfig, 'id'>) => {
      try {
        await api.post('/config/form-field-configs', field)
        await fetchFields()
        toast({ description: 'Campo adicionado com sucesso.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao adicionar campo.',
        })
      }
    },
    [fetchFields],
  )

  const updateField = useCallback(
    async (fieldId: string, updates: Partial<FormFieldConfig>) => {
      try {
        await api.put(`/config/form-field-configs/${fieldId}`, updates)
        await fetchFields()
        toast({ description: 'Campo atualizado com sucesso.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao atualizar campo.',
        })
      }
    },
    [fetchFields],
  )

  const deleteField = useCallback(
    async (fieldId: string) => {
      try {
        await api.delete(`/config/form-field-configs/${fieldId}`)
        await fetchFields()
        toast({ description: 'Campo excluído com sucesso.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao excluir campo.',
        })
      }
    },
    [fetchFields],
  )

  const reorderFields = useCallback(
    async (newFields: FormFieldConfig[]) => {
      // Atualizar ordem no banco
      try {
        for (let i = 0; i < newFields.length; i++) {
          // Nota: Este é um placeholder - pode precisar de endpoint específico
        }
        setFields(newFields)
      } catch (error) {
        // Rollback
        await fetchFields()
      }
    },
    [fetchFields],
  )

  return (
    <FormFieldManagerContext.Provider
      value={{
        fields,
        addField,
        updateField,
        deleteField,
        reorderFields,
      }}
    >
      {children}
    </FormFieldManagerContext.Provider>
  )
}

export const useFormFieldManager = () => {
  const context = useContext(FormFieldManagerContext)
  if (!context) {
    throw new Error(
      'useFormFieldManager must be used within a FormFieldManagerProvider',
    )
  }
  return context
}
