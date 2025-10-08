import { forwardRef } from 'react'
import { Imovel } from '@/types'
import { formatCurrency, formatDate, getCloudImageUrl } from '@/lib/utils'
import { useCustomization } from '@/contexts/CustomizationContext'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { useImovelField } from '@/contexts/ImovelFieldContext'
import { getImovelFields } from '@/lib/imovel-fields'

interface ImovelPrintFormProps {
  imovel: Imovel
  fieldsToPrint: string[]
}

export const ImovelPrintForm = forwardRef<HTMLDivElement, ImovelPrintFormProps>(
  ({ imovel, fieldsToPrint }, ref) => {
    const { settings } = useCustomization()
    const { fields: customFieldConfigs } = useImovelField()
    const municipality = { name: MUNICIPALITY_NAME }

    const allFields = getImovelFields(customFieldConfigs)

    const shouldPrint = (fieldId: string) => fieldsToPrint.includes(fieldId)

    const DetailRow = ({
      label,
      value,
    }: {
      label: string
      value: React.ReactNode
    }) => (
      <div className="grid grid-cols-3 gap-2 py-1 border-b">
        <dt className="font-semibold text-gray-600">{label}</dt>
        <dd className="col-span-2 text-gray-800">{value}</dd>
      </div>
    )

    return (
      <div ref={ref} className="p-4 bg-white text-black font-sans text-sm">
        <header className="flex items-center justify-between pb-4 border-b-2 border-black">
          <div className="flex items-center gap-4">
            <img
              src={municipality?.logoUrl || settings.activeLogoUrl}
              alt="Logo"
              className="h-20 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold">{municipality?.name}</h1>
              <h2 className="text-lg">Ficha de Cadastro de Imóvel</h2>
            </div>
          </div>
          <div className="text-right">
            {shouldPrint('numero_patrimonio') && (
              <p className="font-bold text-lg">
                Nº: {imovel.numero_patrimonio}
              </p>
            )}
            <p>Data: {formatDate(new Date())}</p>
          </div>
        </header>

        <main className="mt-4">
          <section>
            <h3 className="font-bold text-base mb-2 border-b">
              INFORMAÇÕES DO IMÓVEL
            </h3>
            <dl>
              {shouldPrint('denominacao') && (
                <DetailRow label="Denominação" value={imovel.denominacao} />
              )}
              {shouldPrint('endereco') && (
                <DetailRow label="Endereço" value={imovel.endereco} />
              )}
            </dl>
          </section>

          <section className="mt-4">
            <h3 className="font-bold text-base mb-2 border-b">
              INFORMAÇÕES DE AQUISIÇÃO E MEDIDAS
            </h3>
            <dl>
              {shouldPrint('data_aquisicao') && (
                <DetailRow
                  label="Data de Aquisição"
                  value={formatDate(new Date(imovel.data_aquisicao))}
                />
              )}
              {shouldPrint('valor_aquisicao') && (
                <DetailRow
                  label="Valor de Aquisição"
                  value={formatCurrency(imovel.valor_aquisicao)}
                />
              )}
              {shouldPrint('area_terreno') && (
                <DetailRow
                  label="Área do Terreno (m²)"
                  value={imovel.area_terreno.toLocaleString('pt-BR')}
                />
              )}
              {shouldPrint('area_construida') && (
                <DetailRow
                  label="Área Construída (m²)"
                  value={imovel.area_construida.toLocaleString('pt-BR')}
                />
              )}
            </dl>
          </section>

          {customFieldConfigs.filter(
            (f) => f.isCustom && shouldPrint(`customFields.${f.key}`),
          ).length > 0 && (
            <section className="mt-4">
              <h3 className="font-bold text-base mb-2 border-b">
                CAMPOS PERSONALIZADOS
              </h3>
              <dl>
                {customFieldConfigs
                  .filter(
                    (f) => f.isCustom && shouldPrint(`customFields.${f.key}`),
                  )
                  .map((field) => (
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
            <section className="mt-4">
              <h3 className="font-bold text-base mb-2 border-b">FOTOS</h3>
              <div className="grid grid-cols-2 gap-4">
                {imovel.fotos.map((fotoId, index) => (
                  <div
                    key={index}
                    className="w-full h-40 border flex items-center justify-center bg-gray-100"
                  >
                    <img
                      src={getCloudImageUrl(fotoId)}
                      alt={`Foto ${index + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        <footer className="mt-12 space-y-8">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="border-t border-black w-2/3 mx-auto pt-1">
                <p>Responsável pelo Setor</p>
              </div>
            </div>
            <div>
              <div className="border-t border-black w-2/3 mx-auto pt-1">
                <p>Responsável pelo Patrimônio</p>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-500">
            Documento gerado por SISPAT em{' '}
            {formatDate(new Date(), "dd/MM/yyyy 'às' HH:mm")}
          </p>
        </footer>
      </div>
    )
  },
)
ImovelPrintForm.displayName = 'ImovelPrintForm'
