import { toast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';
import { ActivityLogAction, FormFieldConfig } from '@/types';
import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { useActivityLog } from './ActivityLogContext';
import { useAuth } from './AuthContext';

interface FormFieldManagerContextType {
  fields: FormFieldConfig[];
  addField: (field: Omit<FormFieldConfig, 'id'>) => void;
  updateField: (fieldId: string, updates: Partial<FormFieldConfig>) => void;
  deleteField: (fieldId: string) => void;
  reorderFields: (fields: FormFieldConfig[]) => void;
  rollbackFields: () => void;
  canRollback: boolean;
}

const FormFieldManagerContext =
  createContext<FormFieldManagerContextType | null>(null);

const initialFields: FormFieldConfig[] = [
  {
    id: '1',
    key: 'descricao',
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
  {
    id: '3',
    key: 'valor_aquisicao',
    label: 'Valor de Aquisição',
    type: 'CURRENCY',
    required: true,
    isCustom: false,
    isSystem: true,
  },
  {
    id: '4',
    key: 'data_aquisicao',
    label: 'Data de Aquisição',
    type: 'DATE',
    required: true,
    isCustom: false,
    isSystem: true,
  },
  {
    id: '5',
    key: 'situacao_bem',
    label: 'Situação do Bem',
    type: 'SELECT',
    required: true,
    options: ['ÓTIMO', 'BOM', 'REGULAR', 'RUIM', 'PÉSSIMO'],
    isCustom: false,
    isSystem: true,
  },
];

export const FormFieldManagerProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [fields, setFields] = useState<FormFieldConfig[]>(initialFields);
  const [canRollback, setCanRollback] = useState(false);
  const { logActivity } = useActivityLog();
  const { user } = useAuth();

  useEffect(() => {
    const storedFields = localStorage.getItem('sispat_form_fields');
    if (storedFields) {
      setFields(JSON.parse(storedFields));
    }
    const backupExists = !!localStorage.getItem('sispat_form_fields_backup');
    setCanRollback(backupExists);
  }, []);

  const persistFields = (
    newFields: FormFieldConfig[],
    action: ActivityLogAction,
    details: string
  ) => {
    localStorage.setItem('sispat_form_fields_backup', JSON.stringify(fields));
    localStorage.setItem('sispat_form_fields', JSON.stringify(newFields));
    setFields(newFields);
    setCanRollback(true);
    if (user) {
      logActivity(user, action, details);
    }
  };

  const addField = useCallback(
    (field: Omit<FormFieldConfig, 'id'>) => {
      const newField = { ...field, id: generateId() };
      persistFields(
        [...fields, newField],
        'FORM_FIELD_CREATE',
        `Campo "${field.label}" criado.`
      );
      toast({ description: 'Campo adicionado com sucesso.' });
    },
    [fields, user, logActivity]
  );

  const updateField = useCallback(
    (fieldId: string, updates: Partial<FormFieldConfig>) => {
      const newFields = fields.map(f =>
        f.id === fieldId ? { ...f, ...updates } : f
      );
      persistFields(
        newFields,
        'FORM_FIELD_UPDATE',
        `Campo "${updates.label || fields.find(f => f.id === fieldId)?.label}" atualizado.`
      );
      toast({ description: 'Campo atualizado com sucesso.' });
    },
    [fields, user, logActivity]
  );

  const deleteField = useCallback(
    (fieldId: string) => {
      const fieldLabel = fields.find(f => f.id === fieldId)?.label;
      persistFields(
        fields.filter(f => f.id !== fieldId),
        'FORM_FIELD_DELETE',
        `Campo "${fieldLabel}" excluído.`
      );
      toast({ description: 'Campo excluído com sucesso.' });
    },
    [fields, user, logActivity]
  );

  const reorderFields = useCallback(
    (newFields: FormFieldConfig[]) => {
      persistFields(
        newFields,
        'FORM_FIELD_REORDER',
        'Ordem dos campos foi alterada.'
      );
    },
    [user, logActivity]
  );

  const rollbackFields = useCallback(() => {
    const backup = localStorage.getItem('sispat_form_fields_backup');
    if (backup) {
      const backupFields = JSON.parse(backup);
      localStorage.setItem('sispat_form_fields', JSON.stringify(backupFields));
      setFields(backupFields);
      localStorage.removeItem('sispat_form_fields_backup');
      setCanRollback(false);
      if (user) {
        logActivity(
          user,
          'FORM_FIELD_ROLLBACK',
          'Alterações nos campos do formulário foram revertidas.'
        );
      }
      toast({ description: 'Alterações revertidas com sucesso.' });
    } else {
      toast({
        variant: 'destructive',
        description: 'Nenhum backup encontrado para reverter.',
      });
    }
  }, [user, logActivity]);

  return (
    <FormFieldManagerContext.Provider
      value={{
        fields,
        addField,
        updateField,
        deleteField,
        reorderFields,
        rollbackFields,
        canRollback,
      }}
    >
      {children}
    </FormFieldManagerContext.Provider>
  );
};

export const useFormFieldManager = () => {
  const context = useContext(FormFieldManagerContext);
  if (!context) {
    throw new Error(
      'useFormFieldManager must be used within a FormFieldManagerProvider'
    );
  }
  return context;
};
