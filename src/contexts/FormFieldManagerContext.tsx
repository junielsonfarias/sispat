import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
} from 'react'
import { FormFieldConfig, ActivityLogAction, User } from '@/types'
import { generateId } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { useActivityLog } from './ActivityLogContext'
import { useAuth } from './AuthContext'

interface FormFieldManagerContextType {
  fields: FormFieldConfig[]
  addField: (field: Omit<FormFieldConfig, 'id'>) => void
  updateField: (fieldId: string, updates: Partial<FormFieldConfig>) => void
  deleteField: (fieldId: string) => void
  reorderFields: (fields: FormFieldConfig[]) => void
}

const FormFieldManagerContext =
  createContext<FormFieldManagerContextType | null>(null)

const initialFields: FormFieldConfig[] = [
  {
    id: '1',
    key: 'descricao_bem',
    label: 'Descrição do Bem',
    type: 'TEXTAREA',
    required: true,
    isCustom: false,
    isSystem: true,
  },
  {
    id: '2',
    key: 'tipo',
    label: 'Tipo',
    type: 'TEXT',
    required: true,
    isCustom: false,
    isSystem: false,
  },
]

export const FormFieldManagerProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [fields, setFields] = useState<FormFieldConfig[]>(initialFields)
  const { logActivity } = useActivityLog()
  const { user } = useAuth()

  useEffect(() => {
    // In a real app, this would fetch from an API
    const storedFields = localStorage.getItem('sispat_form_fields')
    if (storedFields) {
      setFields(JSON.parse(storedFields))
    }
  }, [])

  const persistFields = (
    newFields: FormFieldConfig[],
    action: ActivityLogAction,
    details: string,
  ) => {
    // In a real app, this would be an API call
    localStorage.setItem('sispat_form_fields', JSON.stringify(newFields))
    setFields(newFields)
    if (user) {
      logActivity(user, action, details)
    }
  }

  const addField = useCallback(
    (field: Omit<FormFieldConfig, 'id'>) => {
      const newField = { ...field, id: generateId() }
      persistFields(
        [...fields, newField],
        'FORM_FIELD_CREATE',
        `Campo "${field.label}" criado.`,
      )
      toast({ description: 'Campo adicionado com sucesso.' })
    },
    [fields, user, logActivity],
  )

  const updateField = useCallback(
    (fieldId: string, updates: Partial<FormFieldConfig>) => {
      const newFields = fields.map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f,
      )
      persistFields(
        newFields,
        'FORM_FIELD_UPDATE',
        `Campo "${updates.label || fields.find((f) => f.id === fieldId)?.label}" atualizado.`,
      )
      toast({ description: 'Campo atualizado com sucesso.' })
    },
    [fields, user, logActivity],
  )

  const deleteField = useCallback(
    (fieldId: string) => {
      const fieldLabel = fields.find((f) => f.id === fieldId)?.label
      persistFields(
        fields.filter((f) => f.id !== fieldId),
        'FORM_FIELD_DELETE',
        `Campo "${fieldLabel}" excluído.`,
      )
      toast({ description: 'Campo excluído com sucesso.' })
    },
    [fields, user, logActivity],
  )

  const reorderFields = useCallback(
    (newFields: FormFieldConfig[]) => {
      persistFields(
        newFields,
        'FORM_FIELD_REORDER',
        'Ordem dos campos foi alterada.',
      )
    },
    [user, logActivity],
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
