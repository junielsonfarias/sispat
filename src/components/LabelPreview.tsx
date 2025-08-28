import { LabelImage } from '@/components/ui/optimized-image';
import { useCustomization } from '@/contexts/CustomizationContext';
import { useGlobalLogo } from '@/contexts/GlobalLogoContext';
import { generatePublicQRUrl } from '@/lib/public-sync';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Imovel, LabelElement, LabelTemplate, Patrimonio } from '@/types';
import { forwardRef } from 'react';

type Asset = (Patrimonio | Imovel) & { assetType: 'bem' | 'imovel' };

interface LabelPreviewProps {
  patrimonio?: Patrimonio | null;
  asset?: Asset | null;
  template: LabelTemplate;
  className?: string;
  onElementClick?: (element: LabelElement) => void;
  selectedElementId?: string;
}

const PIXELS_PER_MM = 4;

export const LabelPreview = forwardRef<HTMLDivElement, LabelPreviewProps>(
  (
    {
      patrimonio,
      asset,
      template,
      className,
      onElementClick,
      selectedElementId,
    },
    ref
  ) => {
    const { getSettingsForMunicipality } = useCustomization();
    const { getLogoForSystem } = useGlobalLogo();

    // Use asset if provided, otherwise use patrimonio
    const finalAsset =
      asset ||
      (patrimonio ? { ...patrimonio, assetType: 'bem' as const } : null);
    const settings = getSettingsForMunicipality(
      finalAsset?.municipalityId || null
    );

    const getFieldValue = (field: keyof Patrimonio | keyof Imovel | string) => {
      const value = finalAsset?.[field as keyof Asset];
      if (value instanceof Date) return formatDate(value);
      if (typeof value === 'number' && field === 'valor_aquisicao')
        return formatCurrency(value);
      if (Array.isArray(value)) return String(value.length);
      return String(value ?? 'N/A');
    };

    const renderElement = (element: LabelElement) => {
      let content: React.ReactNode;
      switch (element.type) {
        case 'LOGO':
          content = (
            <div className='w-full h-full flex items-center justify-center'>
              <LabelImage
                src={getLogoForSystem('etiqueta')}
                alt='Logo'
                className='max-w-full max-h-full object-contain'
              />
            </div>
          );
          break;
        case 'QR_CODE': {
          const publicUrl = finalAsset
            ? generatePublicQRUrl({
                id: finalAsset.id,
                assetType: finalAsset.assetType,
                numero_patrimonio:
                  finalAsset.assetType === 'bem'
                    ? (finalAsset as Patrimonio).numero_patrimonio
                    : undefined,
              })
            : `${window.location.origin}/consulta-publica`;

          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
            publicUrl
          )}&q=H`;
          content = (
            <img
              src={qrCodeUrl}
              alt='QR Code'
              className='w-full h-full object-contain'
            />
          );
          break;
        }
        case 'PATRIMONIO_FIELD':
          content = getFieldValue(element.content);
          break;
        case 'TEXT':
          content = element.content;
          break;
        default:
          content = null;
      }

      return (
        <div
          key={element.id}
          className={cn(
            'absolute p-0.5 box-border border border-solid border-gray-300',
            onElementClick &&
              'cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary',
            selectedElementId === element.id &&
              'outline outline-2 outline-primary'
          )}
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.width}%`,
            height: `${element.height}%`,
            fontSize: `${element.fontSize}px`,
            fontWeight: element.fontWeight,
            textAlign: element.textAlign,
            lineHeight: 1.2,
          }}
          onClick={e => {
            e.stopPropagation();
            onElementClick?.(element);
          }}
        >
          {content}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white text-black font-sans relative overflow-hidden shadow-md',
          'print:shadow-none print:border print:border-black',
          className
        )}
        style={{
          width: `${template.width * PIXELS_PER_MM}px`,
          height: `${template.height * PIXELS_PER_MM}px`,
        }}
      >
        {template.elements.map(renderElement)}
      </div>
    );
  }
);

LabelPreview.displayName = 'LabelPreview';
