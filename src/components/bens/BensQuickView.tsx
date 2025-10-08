import { Patrimonio } from '@/types'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency, getCloudImageUrl } from '@/lib/utils'
import { LOCAL_IMAGES } from '@/lib/image-utils'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Card, CardContent } from '@/components/ui/card'
import { Image as ImageIcon } from 'lucide-react'

const DetailItem = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-md">{value}</p>
  </div>
)

interface BensQuickViewProps {
  patrimonio: Patrimonio
}

export const BensQuickView = ({ patrimonio }: BensQuickViewProps) => {
  return (
    <div className="p-4 space-y-6">
      <div className="w-full">
        {patrimonio.fotos && patrimonio.fotos.length > 0 ? (
          <Carousel className="w-full max-w-md mx-auto">
            <CarouselContent>
              {patrimonio.fotos.map((fotoId, index) => (
                <CarouselItem key={index}>
                  <Card>
                    <CardContent className="flex aspect-video items-center justify-center p-0">
                      <img
                        src={getCloudImageUrl(fotoId)}
                        alt={`${patrimonio.descricao_bem} - Foto ${index + 1}`}
                        className="rounded-lg object-cover w-full h-full"
                        onError={(e) => {
                          e.currentTarget.src =
                            LOCAL_IMAGES.PLACEHOLDER_IMAGE
                        }}
                      />
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        ) : (
          <div className="aspect-video flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="mx-auto h-12 w-12" />
              <p>Nenhuma foto disponível</p>
            </div>
          </div>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <DetailItem
            label="Nº Patrimônio"
            value={patrimonio.numero_patrimonio}
          />
          <DetailItem label="Descrição" value={patrimonio.descricao_bem} />
          <DetailItem label="Tipo" value={patrimonio.tipo} />
          <DetailItem
            label="Marca / Modelo"
            value={`${patrimonio.marca} / ${patrimonio.modelo}`}
          />
          <DetailItem
            label="Status"
            value={<Badge>{patrimonio.status}</Badge>}
          />
          <DetailItem
            label="Situação do Bem"
            value={<Badge variant="secondary">{patrimonio.situacao_bem}</Badge>}
          />
        </div>
        <div className="space-y-4">
          <DetailItem
            label="Setor Responsável"
            value={patrimonio.setor_responsavel}
          />
          <DetailItem label="Localização" value={patrimonio.local_objeto} />
          <DetailItem
            label="Data de Aquisição"
            value={formatDate(new Date(patrimonio.data_aquisicao))}
          />
          <DetailItem
            label="Valor de Aquisição"
            value={formatCurrency(patrimonio.valor_aquisicao)}
          />
          <DetailItem
            label="Nota Fiscal"
            value={patrimonio.numero_nota_fiscal}
          />
        </div>
      </div>
    </div>
  )
}
