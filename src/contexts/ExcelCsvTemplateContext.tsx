import { toast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';
import { ExcelCsvTemplate } from '@/types';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';

interface ExcelCsvTemplateContextType {
  templates: ExcelCsvTemplate[];
  getTemplateById: (id: string) => ExcelCsvTemplate | undefined;
  saveTemplate: (
    template: Omit<ExcelCsvTemplate, 'id'> | ExcelCsvTemplate
  ) => void;
  deleteTemplate: (templateId: string) => void;
}

const ExcelCsvTemplateContext =
  createContext<ExcelCsvTemplateContextType | null>(null);

const defaultTemplates: ExcelCsvTemplate[] = [
  {
    id: 'default-simple',
    name: 'Relatório Simples',
    municipalityId: '1',
    columns: [
      { key: 'numero_patrimonio', header: 'Nº Patrimônio' },
      { key: 'descricao', header: 'Descrição' },
      { key: 'setor_responsavel', header: 'Setor' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    id: 'default-full',
    name: 'Relatório Completo',
    municipalityId: '1',
    columns: [
      { key: 'numero_patrimonio', header: 'Nº Patrimônio' },
      { key: 'descricao', header: 'Descrição' },
      { key: 'tipo', header: 'Tipo' },
      { key: 'marca', header: 'Marca' },
      { key: 'modelo', header: 'Modelo' },
      { key: 'valor_aquisicao', header: 'Valor de Aquisição' },
      { key: 'data_aquisicao', header: 'Data de Aquisição' },
      { key: 'setor_responsavel', header: 'Setor' },
      { key: 'local_objeto', header: 'Localização' },
      { key: 'status', header: 'Status' },
      { key: 'situacao_bem', header: 'Situação' },
    ],
    conditionalFormatting: [
      {
        id: '1',
        column: 'status',
        operator: 'equals',
        value: 'baixado',
        style: 'highlight_red',
      },
    ],
  },
];

export const ExcelCsvTemplateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [allTemplates, setAllTemplates] =
    useState<ExcelCsvTemplate[]>(defaultTemplates);
  const { user } = useAuth();

  useEffect(() => {
    const stored = localStorage.getItem('sispat_excel_templates');
    if (stored) {
      setAllTemplates(JSON.parse(stored));
    } else {
      localStorage.setItem(
        'sispat_excel_templates',
        JSON.stringify(defaultTemplates)
      );
    }
  }, []);

  const templates = useMemo(() => {
    if (user?.role === 'superuser') return allTemplates;
    if (user?.municipalityId) {
      return allTemplates.filter(t => t.municipalityId === user.municipalityId);
    }
    return [];
  }, [allTemplates, user]);

  const persist = (newTemplates: ExcelCsvTemplate[]) => {
    localStorage.setItem(
      'sispat_excel_templates',
      JSON.stringify(newTemplates)
    );
    setAllTemplates(newTemplates);
  };

  const getTemplateById = useCallback(
    (id: string) => templates.find(t => t.id === id),
    [templates]
  );

  const saveTemplate = useCallback(
    (template: Omit<ExcelCsvTemplate, 'id'> | ExcelCsvTemplate) => {
      if (!user?.municipalityId && user?.role !== 'superuser') return;

      setAllTemplates(prev => {
        let newTemplates;
        if ('id' in template && template.id) {
          const index = prev.findIndex(t => t.id === template.id);
          newTemplates = [...prev];
          newTemplates[index] = template;
        } else {
          newTemplates = [
            ...prev,
            {
              ...template,
              id: generateId(),
              municipalityId: user.municipalityId!,
            },
          ];
        }
        persist(newTemplates);
        toast({ description: 'Modelo de exportação salvo com sucesso.' });
        return newTemplates;
      });
    },
    [user]
  );

  const deleteTemplate = useCallback((templateId: string) => {
    setAllTemplates(prev => {
      const newTemplates = prev.filter(t => t.id !== templateId);
      persist(newTemplates);
      toast({ description: 'Modelo de exportação excluído.' });
      return newTemplates;
    });
  }, []);

  return (
    <ExcelCsvTemplateContext.Provider
      value={{ templates, getTemplateById, saveTemplate, deleteTemplate }}
    >
      {children}
    </ExcelCsvTemplateContext.Provider>
  );
};

export const useExcelCsvTemplates = () => {
  const context = useContext(ExcelCsvTemplateContext);
  if (!context) {
    throw new Error(
      'useExcelCsvTemplates must be used within a ExcelCsvTemplateProvider'
    );
  }
  return context;
};
