import { useCustomization } from '@/contexts/CustomizationContext';
import { useGlobalLogo } from '@/contexts/GlobalLogoContext';
import { useLabelTemplates } from '@/contexts/LabelTemplateContext';
import { toast } from '@/hooks/use-toast';
import { generatePublicQRUrl } from '@/lib/public-sync';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LabelElement, LabelTemplate, Patrimonio } from '@/types';

interface LabelGeneratorProps {
  patrimonio: Patrimonio;
  templateId: string;
}

export const useLabelGenerator = () => {
  const { getTemplateById } = useLabelTemplates();
  const { getSettingsForMunicipality } = useCustomization();
  const { getLogoForSystem } = useGlobalLogo();

  const generateLabel = ({ patrimonio, templateId }: LabelGeneratorProps) => {
    const template = getTemplateById(templateId);
    if (!template) {
      toast({
        title: 'Erro',
        description: 'Template de etiqueta não encontrado',
        variant: 'destructive',
      });
      return;
    }

    const settings = getSettingsForMunicipality(patrimonio.municipality_id);

    const getFieldValue = (field: string) => {
      switch (field) {
        case 'numero_patrimonio':
          return patrimonio.numero_patrimonio;
        case 'descricao':
          return patrimonio.descricao;
        case 'tipo':
          return patrimonio.tipo || 'N/A';
        case 'marca':
          return patrimonio.marca || 'N/A';
        case 'modelo':
          return patrimonio.modelo || 'N/A';
        case 'valor_aquisicao':
          return patrimonio.valor_aquisicao
            ? formatCurrency(patrimonio.valor_aquisicao)
            : 'N/A';
        case 'data_aquisicao':
          return patrimonio.data_aquisicao
            ? formatDate(new Date(patrimonio.data_aquisicao))
            : 'N/A';
        case 'setor_responsavel':
          return patrimonio.setor_responsavel || 'N/A';
        case 'local_objeto':
          return patrimonio.local_objeto || 'N/A';
        case 'status':
          return patrimonio.status || 'N/A';
        case 'situacao_bem':
          return patrimonio.situacao_bem || 'N/A';
        case 'entityName':
          return settings.entityName || 'PREFEITURA MUNICIPAL';
        case 'municipalityName':
          return settings.municipalityName || 'MUNICÍPIO';
        default:
          return 'N/A';
      }
    };

    const renderElement = (element: LabelElement) => {
      switch (element.type) {
        case 'LOGO':
          return `<div class="logo-element" style="
          position: absolute;
          left: ${element.x}%;
          top: ${element.y}%;
          width: ${element.width}%;
          height: ${element.height}%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          border: 1px solid #ccc;
        ">
          <img src="${getLogoForSystem('etiqueta')}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
        </div>`;

        case 'QR_CODE': {
          const publicUrl = generatePublicQRUrl({
            id: patrimonio.id,
            assetType: 'bem',
            numero_patrimonio: patrimonio.numero_patrimonio,
          });
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}&q=H`;

          return `<div class="qrcode-element" style="
          position: absolute;
          left: ${element.x}%;
          top: ${element.y}%;
          width: ${element.width}%;
          height: ${element.height}%;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
        </div>`;
        }

        case 'PATRIMONIO_FIELD':
          return `<div class="field-element" style="
          position: absolute;
          left: ${element.x}%;
          top: ${element.y}%;
          width: ${element.width}%;
          height: ${element.height}%;
          font-size: ${element.fontSize || 10}px;
          font-weight: ${element.fontWeight || 'normal'};
          text-align: ${element.textAlign || 'left'};
          display: flex;
          align-items: center;
          ${element.fontWeight === 'bold' ? 'font-weight: bold;' : ''}
        ">
          ${getFieldValue(element.content)}
        </div>`;

        case 'TEXT':
          return `<div class="text-element" style="
          position: absolute;
          left: ${element.x}%;
          top: ${element.y}%;
          width: ${element.width}%;
          height: ${element.height}%;
          font-size: ${element.fontSize || 10}px;
          font-weight: ${element.fontWeight || 'normal'};
          text-align: ${element.textAlign || 'left'};
          display: flex;
          align-items: center;
        ">
          ${element.content}
        </div>`;

        default:
          return '';
      }
    };

    const generateLabelHTML = (template: LabelTemplate) => {
      const elementsHTML = template.elements.map(renderElement).join('\n');

      return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta - ${patrimonio.numero_patrimonio}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 5px;
            font-size: 10px;
          }
          .label {
            width: ${template.width * 4}px; /* ${template.width}mm * 4px */
            height: ${template.height * 4}px; /* ${template.height}mm * 4px */
            border: 1px solid #000;
            position: relative;
            background: white;
            box-sizing: border-box;
          }
          @media print {
            body { margin: 0; }
            .label { border: 1px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          ${elementsHTML}
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 1000);
          }
        </script>
      </body>
      </html>
    `;
    };

    try {
      // Criar uma nova janela para impressão da etiqueta
      const labelWindow = window.open('', '_blank', 'width=400,height=600');
      if (!labelWindow) {
        toast({
          title: 'Erro ao gerar etiqueta',
          description: 'Permita pop-ups para gerar a etiqueta',
          variant: 'destructive',
        });
        return;
      }

      const labelContent = generateLabelHTML(template);
      labelWindow.document.write(labelContent);
      labelWindow.document.close();

      toast({ description: 'Etiqueta gerada com sucesso!' });
    } catch (error) {
      console.error('Erro ao gerar etiqueta:', error);
      toast({
        title: 'Erro ao gerar etiqueta',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  return { generateLabel };
};
