import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useLabelTemplates } from '@/contexts/LabelTemplateContext';
import { Patrimonio } from '@/types';
import { QrCode } from 'lucide-react';
import { useMemo, useState } from 'react';

interface LabelTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patrimonio: Patrimonio;
  onGenerate: (templateId: string) => void;
}

export const LabelTemplateSelector = ({
  open,
  onOpenChange,
  patrimonio,
  onGenerate,
}: LabelTemplateSelectorProps) => {
  const { templates, getTemplateById } = useLabelTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const templateOptions = templates.map(template => ({
    value: template.id,
    label: template.name,
  }));

  const selectedTemplate = useMemo(() => {
    return getTemplateById(selectedTemplateId);
  }, [selectedTemplateId, getTemplateById]);

  const handleGenerate = () => {
    if (selectedTemplateId) {
      onGenerate(selectedTemplateId);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setSelectedTemplateId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <QrCode className='h-5 w-5' />
            Gerar Etiqueta
          </DialogTitle>
          <DialogDescription>
            Selecione o modelo de etiqueta para o patrimônio{' '}
            <strong>{patrimonio.numero_patrimonio}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='template-select'>Modelo de Etiqueta</Label>
            <SearchableSelect
              id='template-select'
              options={templateOptions}
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              placeholder='Selecione um modelo de etiqueta'
            />
          </div>

          {selectedTemplate && (
            <div className='rounded-lg border p-3 bg-gray-50'>
              <h4 className='font-medium text-sm mb-2'>Preview do Modelo:</h4>
              <div className='space-y-2'>
                <p className='text-sm text-gray-600'>
                  <strong>Nome:</strong> {selectedTemplate.name}
                </p>
                <p className='text-sm text-gray-600'>
                  <strong>Dimensões:</strong> {selectedTemplate.width}mm x{' '}
                  {selectedTemplate.height}mm
                </p>
                <p className='text-sm text-gray-600'>
                  <strong>Elementos:</strong> {selectedTemplate.elements.length}{' '}
                  elementos
                </p>
                <div className='mt-3'>
                  <div
                    className='border border-gray-300 bg-white mx-auto'
                    style={{
                      width: `${Math.min(selectedTemplate.width * 2, 200)}px`,
                      height: `${Math.min(selectedTemplate.height * 2, 120)}px`,
                      position: 'relative',
                    }}
                  >
                    {selectedTemplate.elements.map((element, index) => (
                      <div
                        key={element.id || index}
                        className='absolute border border-blue-300 bg-blue-50 text-xs flex items-center justify-center overflow-hidden'
                        style={{
                          left: `${element.x}%`,
                          top: `${element.y}%`,
                          width: `${element.width}%`,
                          height: `${element.height}%`,
                          fontSize: '6px',
                          padding: '1px',
                          minHeight: '8px',
                          minWidth: '8px',
                        }}
                        title={`${element.type}: ${element.content}`}
                      >
                        {element.type === 'LOGO' && '🏛️'}
                        {element.type === 'QR_CODE' && '📱'}
                        {element.type === 'TEXT' && (
                          <span className='truncate'>{element.content}</span>
                        )}
                        {element.type === 'PATRIMONIO_FIELD' && (
                          <span className='truncate'>[{element.content}]</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedTemplateId}
            className='flex items-center gap-2'
          >
            <QrCode className='h-4 w-4' />
            Gerar Etiqueta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
