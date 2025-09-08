import { PrintHeader } from '@/components/PrintHeader';
import { PrintImage } from '@/components/ui/optimized-image';
import { useCustomization } from '@/contexts/CustomizationContext';
import { useGlobalLogo } from '@/contexts/GlobalLogoContext';
import { useImovelField } from '@/contexts/ImovelFieldContext';
import { useMunicipalities } from '@/contexts/MunicipalityContext';
import { getImovelFields } from '@/lib/imovel-fields';
import { formatCurrency, formatDate, getCloudImageUrl } from '@/lib/utils';
import { Imovel } from '@/types';
import { forwardRef } from 'react';

interface ImovelPrintFormProps {
  imovel: Imovel;
  fieldsToPrint: string[];
}

export const ImovelPrintForm = forwardRef<HTMLDivElement, ImovelPrintFormProps>(
  ({ imovel, fieldsToPrint }, ref) => {
    const { settings } = useCustomization();
    const { getLogoForSystem } = useGlobalLogo();
    const { getMunicipalityById } = useMunicipalities();
    const { fields: customFieldConfigs } = useImovelField();
    const municipality = getMunicipalityById(imovel.municipalityId);

    const allFields = getImovelFields(customFieldConfigs);

    const shouldPrint = (fieldId: string) => fieldsToPrint.includes(fieldId);

    const DetailRow = ({
      label,
      value,
    }: {
      label: string;
      value: React.ReactNode;
    }) => (
      <div className='grid grid-cols-3 gap-2 py-1 border-b'>
        <dt className='font-semibold text-gray-600'>{label}</dt>
        <dd className='col-span-2 text-gray-800'>{value}</dd>
      </div>
    );

    const TwoColumnRow = ({
      leftLabel,
      leftValue,
      rightLabel,
      rightValue,
    }: {
      leftLabel: string;
      leftValue: React.ReactNode;
      rightLabel: string;
      rightValue: React.ReactNode;
    }) => (
      <div className='grid grid-cols-2 gap-4 py-1 border-b'>
        <div className='flex items-center gap-2'>
          <dt className='font-semibold text-gray-600 min-w-fit'>
            {leftLabel}:
          </dt>
          <dd className='text-gray-800'>{leftValue}</dd>
        </div>
        <div className='flex items-center gap-2'>
          <dt className='font-semibold text-gray-600 min-w-fit'>
            {rightLabel}:
          </dt>
          <dd className='text-gray-800'>{rightValue}</dd>
        </div>
      </div>
    );

    return (
      <div ref={ref} className='p-4 bg-white text-black font-sans text-sm'>
        <PrintHeader type='form' className='pb-4 border-b-2 border-black' />

        {/* Número do patrimônio */}
        {shouldPrint('numero_patrimonio') && (
          <div className='text-right mb-4'>
            <p className='font-bold text-lg'>Nº: {imovel.numero_patrimonio}</p>
          </div>
        )}

        <main className='mt-4'>
          <section>
            <h3 className='font-bold text-base mb-2 border-b'>
              INFORMAÇÕES DO IMÓVEL
            </h3>
            <dl>
              {shouldPrint('denominacao') && (
                <DetailRow label='Denominação' value={imovel.denominacao} />
              )}
              {shouldPrint('endereco') && (
                <DetailRow label='Endereço' value={imovel.endereco} />
              )}
            </dl>
          </section>

          <section className='mt-4'>
            <h3 className='font-bold text-base mb-2 border-b'>
              INFORMAÇÕES DE AQUISIÇÃO E MEDIDAS
            </h3>
            <dl>
              {shouldPrint('data_aquisicao') &&
                shouldPrint('valor_aquisicao') && (
                  <TwoColumnRow
                    leftLabel='Data de Aquisição'
                    leftValue={formatDate(new Date(imovel.data_aquisicao))}
                    rightLabel='Valor de Aquisição'
                    rightValue={formatCurrency(imovel.valor_aquisicao)}
                  />
                )}
              {shouldPrint('data_aquisicao') &&
                !shouldPrint('valor_aquisicao') && (
                  <DetailRow
                    label='Data de Aquisição'
                    value={formatDate(new Date(imovel.data_aquisicao))}
                  />
                )}
              {!shouldPrint('data_aquisicao') &&
                shouldPrint('valor_aquisicao') && (
                  <DetailRow
                    label='Valor de Aquisição'
                    value={formatCurrency(imovel.valor_aquisicao)}
                  />
                )}
              {shouldPrint('area_terreno') &&
                shouldPrint('area_construida') && (
                  <TwoColumnRow
                    leftLabel='Área do Terreno (m²)'
                    leftValue={imovel.area_terreno.toLocaleString('pt-BR')}
                    rightLabel='Área Construída (m²)'
                    rightValue={imovel.area_construida.toLocaleString('pt-BR')}
                  />
                )}
              {shouldPrint('area_terreno') &&
                !shouldPrint('area_construida') && (
                  <DetailRow
                    label='Área do Terreno (m²)'
                    value={imovel.area_terreno.toLocaleString('pt-BR')}
                  />
                )}
              {!shouldPrint('area_terreno') &&
                shouldPrint('area_construida') && (
                  <DetailRow
                    label='Área Construída (m²)'
                    value={imovel.area_construida.toLocaleString('pt-BR')}
                  />
                )}
            </dl>
          </section>

          {customFieldConfigs.filter(
            f => f.isCustom && shouldPrint(`customFields.${f.key}`)
          ).length > 0 && (
            <section className='mt-4'>
              <h3 className='font-bold text-base mb-2 border-b'>
                CAMPOS PERSONALIZADOS
              </h3>
              <dl>
                {customFieldConfigs
                  .filter(
                    f => f.isCustom && shouldPrint(`customFields.${f.key}`)
                  )
                  .map(field => (
                    <DetailRow
                      key={field.id}
                      label={field.label}
                      value={imovel.customFields?.[field.key] || 'N/A'}
                    />
                  ))}
              </dl>
            </section>
          )}

          {shouldPrint('fotos') && imovel.fotos.length > 0 && (
            <section className='mt-4'>
              <h3 className='font-bold text-base mb-2 border-b'>FOTOS</h3>
              <div className='grid grid-cols-2 gap-4'>
                {imovel.fotos.map((fotoId, index) => (
                  <PrintImage
                    key={index}
                    src={getCloudImageUrl(fotoId)}
                    alt={`Foto ${index + 1}`}
                    className='w-full h-40'
                  />
                ))}
              </div>
            </section>
          )}
        </main>

        <footer className='mt-12 space-y-8'>
          <div className='grid grid-cols-2 gap-8 text-center'>
            <div>
              <div className='border-t border-black w-2/3 mx-auto pt-1'>
                <p>Responsável pelo Setor</p>
              </div>
            </div>
            <div>
              <div className='border-t border-black w-2/3 mx-auto pt-1'>
                <p>Responsável pelo Patrimônio</p>
              </div>
            </div>
          </div>
          <p className='text-center text-xs text-gray-500'>
            Documento gerado por SISPAT em{' '}
            {formatDate(new Date(), "dd/MM/yyyy 'às' HH:mm")}
          </p>
        </footer>
      </div>
    );
  }
);
ImovelPrintForm.displayName = 'ImovelPrintForm';
