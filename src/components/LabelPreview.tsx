import { forwardRef, useState, useEffect } from 'react'
import { Patrimonio, Imovel, LabelTemplate, LabelElement } from '@/types'
import { useCustomization } from '@/contexts/CustomizationContext'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/utils'
import { generatePatrimonioQRCode } from '@/lib/qr-code-utils'

type Asset = (Patrimonio | Imovel) & { assetType: 'bem' | 'imovel' }

interface LabelPreviewProps {
  asset?: Asset | null
  template: LabelTemplate
  className?: string
  onElementClick?: (element: LabelElement) => void
  selectedElementId?: string
}

const PIXELS_PER_MM = 4

export const LabelPreview = forwardRef<HTMLDivElement, LabelPreviewProps>(
  ({ asset, template, className, onElementClick, selectedElementId }, ref) => {
    const { settings } = useCustomization()
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

    // Gerar QR code local quando o asset mudar
    useEffect(() => {
      if (asset?.id) {
        generatePatrimonioQRCode(asset.id, asset.assetType)
          .then(setQrCodeUrl)
          .catch(() => {
            // Fallback para QR code externo se falhar
            const baseUrl = window.location.origin
            const path = asset.assetType === 'imovel'
              ? `/consulta-publica/imovel/${asset.id}`
              : `/consulta-publica/${asset.numero_patrimonio ?? 'sem-numero'}`
            const publicUrl = `${baseUrl}${path}`
            setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}&q=H`)
          })
      }
    }, [asset?.id, asset?.assetType, asset?.numero_patrimonio])

    const getFieldValue = (field: keyof Patrimonio | keyof Imovel | string) => {
      const value = asset?.[field as keyof Asset]
      if (value instanceof Date) return formatDate(value)
      if (typeof value === 'number' && field === 'valor_aquisicao')
        return formatCurrency(value)
      if (Array.isArray(value)) return String(value.length)
      return String(value ?? 'N/A')
    }

    const renderElement = (element: LabelElement) => {
      let content: React.ReactNode
      switch (element.type) {
        case 'LOGO':
          content = (
            <img
              src={settings.activeLogoUrl}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          )
          break
        case 'QR_CODE': {
          content = qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt="QR Code"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-xs">
              Carregando QR Code...
            </div>
          )
          break
        }
        case 'PATRIMONIO_FIELD':
          content = getFieldValue(element.content)
          break
        case 'TEXT':
          content = element.content
          break
        default:
          content = null
      }

      return (
        <div
          key={element.id}
          className={cn(
            'absolute p-0.5 box-border',
            onElementClick &&
              'cursor-pointer hover:outline-dashed hover:outline-1 hover:outline-primary',
            selectedElementId === element.id &&
              'outline outline-2 outline-primary',
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
          onClick={(e) => {
            e.stopPropagation()
            onElementClick?.(element)
          }}
        >
          {content}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white text-black font-sans relative overflow-hidden shadow-md',
          'print:shadow-none print:border print:border-black',
          className,
        )}
        style={{
          width: `${template.width * PIXELS_PER_MM}px`,
          height: `${template.height * PIXELS_PER_MM}px`,
        }}
      >
        {template.elements.map(renderElement)}
      </div>
    )
  },
)

LabelPreview.displayName = 'LabelPreview'
