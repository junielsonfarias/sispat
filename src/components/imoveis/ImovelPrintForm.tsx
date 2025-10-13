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
      <>
        <style>
          {`
            @media print {
              #printable-content {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: static !important;
                left: auto !important;
                top: auto !important;
                width: 100% !important;
                height: auto !important;
                page-break-inside: avoid;
                z-index: 9999 !important;
                background: white !important;
                color: black !important;
              }
              
              body * {
                visibility: hidden;
              }
              
              #printable-content, #printable-content * {
                visibility: visible;
              }
            }

            /* Melhorias de qualidade de fonte */
            .print-form {
              font-family: 'Arial', 'Helvetica', sans-serif !important;
              font-smooth: always !important;
              -webkit-font-smoothing: antialiased !important;
              -moz-osx-font-smoothing: grayscale !important;
              text-rendering: optimizeLegibility !important;
            }

            .print-form h1, .print-form h2, .print-form h3 {
              font-weight: 700 !important;
              letter-spacing: 0.025em !important;
            }

            .print-form dt {
              font-weight: 600 !important;
              letter-spacing: 0.025em !important;
            }

            .print-form dd {
              font-weight: 400 !important;
              letter-spacing: 0.01em !important;
            }

            /* Melhor contraste para impressão */
            .print-form .text-gray-700 {
              color: #1f2937 !important;
            }

            .print-form .text-gray-900 {
              color: #000000 !important;
            }

            /* Bordas mais definidas para impressão */
            .print-form .border-b-2 {
              border-bottom-width: 2px !important;
              border-bottom-color: #000000 !important;
            }

            .print-form .border-2 {
              border-width: 2px !important;
              border-color: #374151 !important;
            }

            /* Otimização para A4 */
            @media print {
              .print-form {
                width: 100% !important;
                max-width: 180mm !important;
                margin: 0 !important;
                padding: 40mm 15mm 20mm 15mm !important;
              }
            }
          `}
        </style>
        <div ref={ref} className="print-form pt-12 pb-8 px-4 bg-white text-black font-sans text-sm">
        {/* Header Principal */}
        <header className="pb-4 border-b-2 border-black">
          {/* Logo e Nome do Município */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <img
                src={municipality?.logoUrl || settings.activeLogoUrl}
                alt="Logo"
                className="h-24 w-auto"
              />
              <div className="flex-1">
                <h1 className="text-2xl font-bold leading-tight">{municipality?.name}</h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Data de Emissão</p>
              <p className="text-sm">{formatDate(new Date())}</p>
            </div>
          </div>

          {/* Informações da Secretaria Gestora */}
          <div className="mb-3">
            <p className="text-sm font-medium text-center">SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO E FINANÇAS</p>
            <p className="text-sm font-medium text-center">DEPARTAMENTO DE GESTÃO E CONTROLE DE PATRIMÔNIO</p>
            <p className="text-base font-bold text-center mt-1">Ficha de Cadastro de Imóvel</p>
          </div>

          {/* Linha Separadora */}
          <div className="border-t border-gray-300 pt-2">
            <p className="text-base font-bold text-center">
              {imovel.setor_responsavel ? `${imovel.setor_responsavel.toUpperCase()}` : 'SECRETARIA RESPONSÁVEL'}
            </p>
          </div>
        </header>

        {/* Número do Patrimônio e Dados de Cadastro/Atualização */}
        <div className="mt-6 mb-8">
          <div className="grid grid-cols-3 gap-6">
            {/* Número do Patrimônio - Reduzido */}
            {shouldPrint('numero_patrimonio') && (
              <div className="p-3 bg-gray-100 border-l-4 border-blue-500 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-blue-600">#</span>
                  <div>
                    <p className="text-xs font-medium text-gray-600">NÚMERO DO PATRIMÔNIO</p>
                    <p className="text-lg font-bold text-gray-900">{imovel.numero_patrimonio}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Dados de Cadastro */}
            <div className="p-3 bg-gray-50 border rounded">
              <div className="text-center">
                <p className="text-xs font-medium text-gray-600 mb-1">CADASTRADO EM</p>
                <p className="text-sm font-semibold text-gray-800">{formatDate(new Date(imovel.createdAt))}</p>
              </div>
            </div>
            
            {/* Dados de Atualização */}
            <div className="p-3 bg-gray-50 border rounded">
              <div className="text-center">
                <p className="text-xs font-medium text-gray-600 mb-1">ÚLTIMA ATUALIZAÇÃO</p>
                <p className="text-sm font-semibold text-gray-800">{formatDate(new Date(imovel.updatedAt))}</p>
              </div>
            </div>
          </div>
        </div>

        <main className="mt-4">
          {/* Seção de Identificação do Imóvel */}
          <section className="mb-6">
            <h3 className="font-bold text-base mb-3 border-b pb-1">
              IDENTIFICAÇÃO DO IMÓVEL
            </h3>
            
            <div className="grid grid-cols-3 gap-6">
              {/* Informações do Imóvel */}
              <div className="col-span-2">
                <dl className="space-y-3">
                  {shouldPrint('denominacao') && (
                    <div className="py-2">
                      <dt className="font-semibold text-gray-700 text-sm mb-1">DENOMINAÇÃO</dt>
                      <dd className="text-gray-900 text-base">{imovel.denominacao}</dd>
                    </div>
                  )}
                  {shouldPrint('endereco') && (
                    <div className="py-2">
                      <dt className="font-semibold text-gray-700 text-sm mb-1">ENDEREÇO</dt>
                      <dd className="text-gray-900 text-base">{imovel.endereco}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Foto - Altura Aumentada */}
              <div className="col-span-1">
                <div className="text-center">
                  <dt className="font-semibold text-gray-700 text-sm mb-3">FOTO</dt>
                  <div className="w-full h-64 border-2 border-gray-300 flex items-center justify-center bg-gray-50 rounded-lg shadow-sm">
                    {shouldPrint('fotos') && imovel.fotos && imovel.fotos.length > 0 ? (
                      <img
                        src={getCloudImageUrl(imovel.fotos[0])}
                        alt="Foto do imóvel"
                        className="w-full h-full object-cover rounded"
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<span class="text-gray-500 text-sm">Sem foto</span>';
                          }
                        }}
                      />
                    ) : (
                      <span className="text-gray-500 text-sm">Sem foto</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Seção de Informações de Aquisição e Medidas */}
          <section className="mb-6">
            <h3 className="font-bold text-lg mb-4 border-b-2 border-gray-300 pb-2 text-gray-800">
              INFORMAÇÕES DE AQUISIÇÃO E MEDIDAS
            </h3>
            <div className="grid grid-cols-2 gap-8">
              <dl className="space-y-3">
                {shouldPrint('data_aquisicao') && (
                  <div className="py-2">
                    <dt className="font-semibold text-gray-700 text-sm mb-1">DATA DE AQUISIÇÃO</dt>
                    <dd className="text-gray-900 text-base">{formatDate(new Date(imovel.data_aquisicao))}</dd>
                  </div>
                )}
                {shouldPrint('valor_aquisicao') && (
                  <div className="py-2">
                    <dt className="font-semibold text-gray-700 text-sm mb-1">VALOR DE AQUISIÇÃO</dt>
                    <dd className="text-gray-900 text-base font-bold">{formatCurrency(imovel.valor_aquisicao)}</dd>
                  </div>
                )}
              </dl>
              <dl className="space-y-3">
                {shouldPrint('area_terreno') && (
                  <div className="py-2">
                    <dt className="font-semibold text-gray-700 text-sm mb-1">ÁREA DO TERRENO (m²)</dt>
                    <dd className="text-gray-900 text-base">{imovel.area_terreno.toLocaleString('pt-BR')}</dd>
                  </div>
                )}
                {shouldPrint('area_construida') && (
                  <div className="py-2">
                    <dt className="font-semibold text-gray-700 text-sm mb-1">ÁREA CONSTRUÍDA (m²)</dt>
                    <dd className="text-gray-900 text-base">{imovel.area_construida.toLocaleString('pt-BR')}</dd>
                  </div>
                )}
              </dl>
            </div>
          </section>

          {/* Campos Personalizados */}
          {customFieldConfigs.filter(
            (f) => f.isCustom && shouldPrint(`customFields.${f.key}`),
          ).length > 0 && (
            <section className="mb-6">
              <h3 className="font-bold text-base mb-3 border-b pb-1">
                INFORMAÇÕES ADICIONAIS
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <dl className="space-y-1">
                  {customFieldConfigs
                    .filter(
                      (f) => f.isCustom && shouldPrint(`customFields.${f.key}`),
                    )
                    .slice(0, Math.ceil(customFieldConfigs.filter(f => f.isCustom && shouldPrint(`customFields.${f.key}`)).length / 2))
                    .map((field) => (
                      <div key={field.id} className="py-1">
                        <dt className="font-semibold text-gray-600 text-xs">{field.label.toUpperCase()}</dt>
                        <dd className="text-gray-800 text-sm">{imovel.customFields?.[field.key] || 'N/A'}</dd>
                      </div>
                    ))}
                </dl>
                <dl className="space-y-1">
                  {customFieldConfigs
                    .filter(
                      (f) => f.isCustom && shouldPrint(`customFields.${f.key}`),
                    )
                    .slice(Math.ceil(customFieldConfigs.filter(f => f.isCustom && shouldPrint(`customFields.${f.key}`)).length / 2))
                    .map((field) => (
                      <div key={field.id} className="py-1">
                        <dt className="font-semibold text-gray-600 text-xs">{field.label.toUpperCase()}</dt>
                        <dd className="text-gray-800 text-sm">{imovel.customFields?.[field.key] || 'N/A'}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            </section>
          )}
        </main>

        {/* Linhas para Assinaturas */}
        <div className="mt-16 space-y-10">
          <div className="grid grid-cols-2 gap-12">
            <div className="text-center">
              <div className="border-t border-black w-full pt-2">
                <p className="text-sm font-medium">Responsável pelo Setor</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black w-full pt-2">
                <p className="text-sm font-medium">Responsável pelo Patrimônio</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-12 mt-6">
            <div className="text-center">
              <div className="border-t border-black w-full pt-2">
                <p className="text-sm font-medium">Data: ___/___/_______</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black w-full pt-2">
                <p className="text-sm font-medium">Data: ___/___/_______</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <footer className="mt-8 pt-4 border-t border-gray-300">
          <p className="text-center text-xs text-gray-500">
            Documento gerado por SISPAT em{' '}
            {formatDate(new Date(), "dd/MM/yyyy 'às' HH:mm")}
          </p>
        </footer>
        </div>
      </>
    )
  },
)
ImovelPrintForm.displayName = 'ImovelPrintForm'
