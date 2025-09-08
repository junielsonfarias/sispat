import { PrintHeader } from '@/components/PrintHeader';
import { PrintImage } from '@/components/ui/optimized-image';
import { useCustomization } from '@/contexts/CustomizationContext';
import { useGlobalLogo } from '@/contexts/GlobalLogoContext';
import { useMunicipalities } from '@/contexts/MunicipalityContext';
import { formatCurrency, formatDate, getCloudImageUrl } from '@/lib/utils';
import { Patrimonio } from '@/types';
import { forwardRef } from 'react';

interface BensPrintFormProps {
  patrimonio: Patrimonio;
  fieldsToPrint: string[];
}

export const BensPrintForm = forwardRef<HTMLDivElement, BensPrintFormProps>(
  ({ patrimonio, fieldsToPrint }, ref) => {
    const { getSettingsForMunicipality } = useCustomization();
    const { getLogoForSystem } = useGlobalLogo();
    const { getMunicipalityById } = useMunicipalities();
    const municipality = getMunicipalityById(patrimonio.municipalityId);
    const settings = getSettingsForMunicipality(patrimonio.municipalityId);

    const shouldPrint = (fieldId: keyof Patrimonio) =>
      fieldsToPrint.includes(fieldId);

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

    const CompactDetailRow = ({
      label,
      value,
    }: {
      label: string;
      value: React.ReactNode;
    }) => (
      <div className='flex items-center gap-2 py-1 border-b'>
        <dt className='font-semibold text-gray-600 min-w-fit'>{label}:</dt>
        <dd className='text-gray-800'>{value}</dd>
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
            <p className='font-bold text-lg'>
              Nº: {patrimonio.numero_patrimonio}
            </p>
          </div>
        )}

        <main className='mt-4 grid grid-cols-3 gap-4'>
          <section className='col-span-2'>
            <h3 className='font-bold text-base mb-2 border-b'>
              INFORMAÇÕES DO BEM
            </h3>
            <dl>
              {shouldPrint('descricao') && (
                <DetailRow
                  label='Descrição'
                  value={patrimonio.descricao || 'NÃO INFORMADO'}
                />
              )}
              {shouldPrint('tipo') && (
                <DetailRow
                  label='Tipo'
                  value={patrimonio.tipo || 'NÃO INFORMADO'}
                />
              )}
              {shouldPrint('marca') && shouldPrint('modelo') && (
                <TwoColumnRow
                  leftLabel='Marca'
                  leftValue={patrimonio.marca || 'NÃO INFORMADO'}
                  rightLabel='Modelo'
                  rightValue={patrimonio.modelo || 'NÃO INFORMADO'}
                />
              )}
              {shouldPrint('marca') && !shouldPrint('modelo') && (
                <DetailRow
                  label='Marca'
                  value={patrimonio.marca || 'NÃO INFORMADO'}
                />
              )}
              {!shouldPrint('marca') && shouldPrint('modelo') && (
                <DetailRow
                  label='Modelo'
                  value={patrimonio.modelo || 'NÃO INFORMADO'}
                />
              )}
              {shouldPrint('numero_serie') && shouldPrint('cor') && (
                <TwoColumnRow
                  leftLabel='Nº de Série'
                  leftValue={patrimonio.numero_serie || 'NÃO INFORMADO'}
                  rightLabel='Cor'
                  rightValue={patrimonio.cor || 'NÃO INFORMADO'}
                />
              )}
              {shouldPrint('numero_serie') && !shouldPrint('cor') && (
                <DetailRow
                  label='Nº de Série'
                  value={patrimonio.numero_serie || 'NÃO INFORMADO'}
                />
              )}
              {!shouldPrint('numero_serie') && shouldPrint('cor') && (
                <DetailRow
                  label='Cor'
                  value={patrimonio.cor || 'NÃO INFORMADO'}
                />
              )}
            </dl>
          </section>

          {shouldPrint('fotos') && (
            <section className='col-span-1'>
              <h3 className='font-bold text-base mb-2 border-b'>FOTO</h3>
              <div className='w-full h-40'>
                {patrimonio.fotos && patrimonio.fotos.length > 0 ? (
                  <PrintImage
                    src={getCloudImageUrl(patrimonio.fotos[0])}
                    alt='Foto do bem'
                    className='w-full h-full'
                  />
                ) : (
                  <div className='w-full h-40 border flex items-center justify-center bg-gray-100'>
                    <span className='text-gray-500'>Sem foto</span>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className='col-span-3'>
            <h3 className='font-bold text-base mb-2 mt-2 border-b'>
              INFORMAÇÕES DE AQUISIÇÃO
            </h3>
            <dl>
              {shouldPrint('data_aquisicao') &&
                shouldPrint('valor_aquisicao') && (
                  <TwoColumnRow
                    leftLabel='Data de Aquisição'
                    leftValue={
                      patrimonio.data_aquisicao
                        ? formatDate(new Date(patrimonio.data_aquisicao))
                        : 'NÃO INFORMADO'
                    }
                    rightLabel='Valor de Aquisição'
                    rightValue={
                      patrimonio.valor_aquisicao
                        ? formatCurrency(patrimonio.valor_aquisicao)
                        : 'NÃO INFORMADO'
                    }
                  />
                )}
              {shouldPrint('data_aquisicao') &&
                !shouldPrint('valor_aquisicao') && (
                  <DetailRow
                    label='Data de Aquisição'
                    value={
                      patrimonio.data_aquisicao
                        ? formatDate(new Date(patrimonio.data_aquisicao))
                        : 'NÃO INFORMADO'
                    }
                  />
                )}
              {!shouldPrint('data_aquisicao') &&
                shouldPrint('valor_aquisicao') && (
                  <DetailRow
                    label='Valor de Aquisição'
                    value={
                      patrimonio.valor_aquisicao
                        ? formatCurrency(patrimonio.valor_aquisicao)
                        : 'NÃO INFORMADO'
                    }
                  />
                )}
              {shouldPrint('numero_nota_fiscal') &&
                shouldPrint('forma_aquisicao') && (
                  <TwoColumnRow
                    leftLabel='Nota Fiscal'
                    leftValue={patrimonio.numero_nota_fiscal || 'NÃO INFORMADO'}
                    rightLabel='Forma de Aquisição'
                    rightValue={patrimonio.forma_aquisicao || 'NÃO INFORMADO'}
                  />
                )}
              {shouldPrint('numero_nota_fiscal') &&
                !shouldPrint('forma_aquisicao') && (
                  <DetailRow
                    label='Nota Fiscal'
                    value={patrimonio.numero_nota_fiscal || 'NÃO INFORMADO'}
                  />
                )}
              {!shouldPrint('numero_nota_fiscal') &&
                shouldPrint('forma_aquisicao') && (
                  <DetailRow
                    label='Forma de Aquisição'
                    value={patrimonio.forma_aquisicao || 'NÃO INFORMADO'}
                  />
                )}
            </dl>
          </section>

          <section className='col-span-3'>
            <h3 className='font-bold text-base mb-2 mt-2 border-b'>
              LOCALIZAÇÃO E ESTADO
            </h3>
            <dl>
              {shouldPrint('setor_responsavel') &&
                shouldPrint('local_objeto') && (
                  <TwoColumnRow
                    leftLabel='Setor Responsável'
                    leftValue={patrimonio.setor_responsavel || 'NÃO INFORMADO'}
                    rightLabel='Localização'
                    rightValue={patrimonio.local_objeto || 'NÃO INFORMADO'}
                  />
                )}
              {shouldPrint('setor_responsavel') &&
                !shouldPrint('local_objeto') && (
                  <DetailRow
                    label='Setor Responsável'
                    value={patrimonio.setor_responsavel || 'NÃO INFORMADO'}
                  />
                )}
              {!shouldPrint('setor_responsavel') &&
                shouldPrint('local_objeto') && (
                  <DetailRow
                    label='Localização'
                    value={patrimonio.local_objeto || 'NÃO INFORMADO'}
                  />
                )}
              {shouldPrint('status') && shouldPrint('situacao_bem') && (
                <TwoColumnRow
                  leftLabel='Status'
                  leftValue={
                    patrimonio.status?.toUpperCase() || 'NÃO INFORMADO'
                  }
                  rightLabel='Situação do Bem'
                  rightValue={patrimonio.situacao_bem || 'NÃO INFORMADO'}
                />
              )}
              {shouldPrint('status') && !shouldPrint('situacao_bem') && (
                <DetailRow
                  label='Status'
                  value={patrimonio.status?.toUpperCase() || 'NÃO INFORMADO'}
                />
              )}
              {!shouldPrint('status') && shouldPrint('situacao_bem') && (
                <DetailRow
                  label='Situação do Bem'
                  value={patrimonio.situacao_bem || 'NÃO INFORMADO'}
                />
              )}
            </dl>
          </section>
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
BensPrintForm.displayName = 'BensPrintForm';
