import { PrintImage } from '@/components/ui/optimized-image';
import { useCustomization } from '@/contexts/CustomizationContext';
import { useGlobalLogo } from '@/contexts/GlobalLogoContext';
import { formatDate, formatTime } from '@/lib/utils';

interface PrintHeaderProps {
  type: 'report' | 'form';
  className?: string;
}

export const PrintHeader = ({ type, className = '' }: PrintHeaderProps) => {
  const { getSettingsForMunicipality } = useCustomization();
  const { getLogoForSystem } = useGlobalLogo();

  // Obter configurações do município atual
  const settings = getSettingsForMunicipality(null);
  const headerConfig =
    type === 'report' ? settings.reportHeader : settings.formHeader;

  const currentDate = new Date();
  const formattedDate = formatDate(currentDate);
  const formattedTime = formatTime(currentDate);

  return (
    <div className={`print-header ${className}`}>
      <div className='flex items-start justify-between mb-4'>
        {/* Logo */}
        {headerConfig.showLogo && (
          <div className='flex-shrink-0'>
            <PrintImage
              src={getLogoForSystem(type === 'report' ? 'relatorio' : 'ficha')}
              alt='Logo'
              className='h-16 w-auto'
            />
          </div>
        )}

        {/* Informações principais */}
        <div className='flex-1 text-center'>
          {headerConfig.showTitle && headerConfig.title && (
            <h1 className='text-xl font-bold text-gray-900 mb-1'>
              {headerConfig.title}
            </h1>
          )}

          {headerConfig.showSubtitle && headerConfig.subtitle && (
            <h2 className='text-lg font-semibold text-gray-700 mb-2'>
              {headerConfig.subtitle}
            </h2>
          )}
        </div>

        {/* Data e hora */}
        <div className='flex-shrink-0 text-right'>
          {headerConfig.showDate && (
            <div className='text-sm text-gray-600 mb-1'>
              <strong>Data:</strong> {formattedDate}
            </div>
          )}
          {headerConfig.showTime && (
            <div className='text-sm text-gray-600'>
              <strong>Gerado em:</strong> {formattedTime}
            </div>
          )}
        </div>
      </div>

      {/* ORDEM PADRÃO: Município, Setor, Local */}
      <div className='border-t border-gray-300 pt-3 mb-4'>
        <div className='text-center space-y-1'>
          {/* Nome do Município */}
          {headerConfig.showMunicipality && headerConfig.municipality && (
            <div className='text-base font-medium text-gray-800'>
              {headerConfig.municipality}
            </div>
          )}

          {/* Setor que está gerando o relatório */}
          {headerConfig.showAddress && headerConfig.address && (
            <div className='text-sm font-medium text-gray-700'>
              {headerConfig.address}
            </div>
          )}

          {/* Local */}
          {headerConfig.showPhone && headerConfig.phone && (
            <div className='text-sm text-gray-600'>{headerConfig.phone}</div>
          )}
        </div>
      </div>

      {/* Informações de contato adicionais */}
      {(headerConfig.showEmail || headerConfig.showWebsite) && (
        <div className='border-t border-gray-300 pt-3 mb-4'>
          <div className='grid grid-cols-2 gap-4 text-sm text-gray-600'>
            {headerConfig.showEmail && headerConfig.email && (
              <div>
                <strong>E-mail:</strong> {headerConfig.email}
              </div>
            )}
            {headerConfig.showWebsite && headerConfig.website && (
              <div>
                <strong>Website:</strong> {headerConfig.website}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Texto personalizado */}
      {headerConfig.customText && (
        <div className='border-t border-gray-300 pt-3 mb-4'>
          <div className='text-sm text-gray-600 whitespace-pre-line'>
            {headerConfig.customText}
          </div>
        </div>
      )}
    </div>
  );
};
