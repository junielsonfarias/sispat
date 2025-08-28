import {
  createContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { LabelTemplate } from '@/types';
import { generateId } from '@/lib/utils';
import { useAuth } from './AuthContext';

interface LabelTemplateContextType {
  templates: LabelTemplate[];
  getTemplateById: (id: string) => LabelTemplate | undefined;
  saveTemplate: (template: LabelTemplate) => void;
  deleteTemplate: (templateId: string) => void;
}

const LabelTemplateContext = createContext<LabelTemplateContextType | null>(
  null
);

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
      id: 'entityName',
      type: 'PATRIMONIO_FIELD',
      content: 'entityName',
      x: 35,
      y: 5,
      width: 60,
      height: 10,
      fontSize: 8,
      fontWeight: 'bold',
      textAlign: 'right',
    },
    {
      id: 'setor',
      type: 'PATRIMONIO_FIELD',
      content: 'setor_responsavel',
      x: 35,
      y: 15,
      width: 60,
      height: 10,
      fontSize: 7,
      textAlign: 'right',
    },
    {
      id: 'descricao',
      type: 'PATRIMONIO_FIELD',
      content: 'descricao',
      x: 5,
      y: 30,
      width: 90,
      height: 25,
      fontSize: 10,
      fontWeight: 'normal',
      textAlign: 'left',
    },
    {
      id: 'qrcode',
      type: 'QR_CODE',
      x: 65,
      y: 60,
      width: 30,
      height: 35,
      content: 'qrcode',
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
};

const initialTemplates = [defaultTemplate];

export const LabelTemplateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [allTemplates, setAllTemplates] =
    useState<LabelTemplate[]>(initialTemplates);
  const { user } = useAuth();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sispat_label_templates');
      if (stored) {
        setAllTemplates(JSON.parse(stored));
      } else {
        localStorage.setItem(
          'sispat_label_templates',
          JSON.stringify(initialTemplates)
        );
      }
    } catch (error) {
      console.error('Failed to load label templates from localStorage', error);
      setAllTemplates(initialTemplates);
    }
  }, []);

  const templates = useMemo(() => {
    if (user?.role === 'superuser') return allTemplates;
    if (user?.municipalityId) {
      return allTemplates.filter(t => t.municipalityId === user.municipalityId);
    }
    return [];
  }, [allTemplates, user]);

  const getTemplateById = useCallback(
    (id: string) => templates.find(t => t.id === id),
    [templates]
  );

  const saveTemplate = useCallback(
    (template: LabelTemplate) => {
      if (!user?.municipalityId && user?.role !== 'superuser') return;

      setAllTemplates(prev => {
        const newTemplates = [...prev];
        const index = newTemplates.findIndex(t => t.id === template.id);
        const templateToSave = {
          ...template,
          municipalityId: template.municipalityId || user?.municipalityId!,
        };
        if (index > -1) {
          newTemplates[index] = templateToSave;
        } else {
          newTemplates.push(templateToSave);
        }
        localStorage.setItem(
          'sispat_label_templates',
          JSON.stringify(newTemplates)
        );
        return newTemplates;
      });
    },
    [user]
  );

  const deleteTemplate = useCallback((templateId: string) => {
    setAllTemplates(prev => {
      const newTemplates = prev.filter(t => t.id !== templateId);
      localStorage.setItem(
        'sispat_label_templates',
        JSON.stringify(newTemplates)
      );
      return newTemplates;
    });
  }, []);

  return (
    <LabelTemplateContext.Provider
      value={{ templates, getTemplateById, saveTemplate, deleteTemplate }}
    >
      {children}
    </LabelTemplateContext.Provider>
  );
};

export const useLabelTemplates = () => {
  const context = useContext(LabelTemplateContext);
  if (!context) {
    throw new Error(
      'useLabelTemplates must be used within a LabelTemplateProvider'
    );
  }
  return context;
};
