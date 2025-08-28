import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { formatCurrency, formatDate, getCloudImageUrl } from '@/lib/utils'
import { Patrimonio } from '@/types'
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
                      <OptimizedImage
                        src={getCloudImageUrl(fotoId)}
                        alt={`${patrimonio.descricao} - Foto ${index + 1}`}
                        size="large"
                        aspectRatio="video"
                        className="rounded-lg w-full h-full"
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
          <DetailItem label="Descrição" value={patrimonio.descricao} />
          <DetailItem label="Tipo" value={patrimonio.tipo} />
          <DetailItem
            label="Marca / Modelo"
            value={`${patrimonio.marca || 'N/A'} / ${patrimonio.modelo || 'N/A'}`}
          />
          <DetailItem
            label="Cor"
            value={patrimonio.cor || 'N/A'}
          />
          <DetailItem
            label="Quantidade"
            value={patrimonio.quantidade || 1}
          />
          <DetailItem
            label="Status"
            value={<Badge>{patrimonio.status || 'ativo'}</Badge>}
          />
          <DetailItem
            label="Situação do Bem"
            value={<Badge variant="secondary">{patrimonio.situacao_bem || 'N/A'}</Badge>}
          />
        </div>
        <div className="space-y-4">
          <DetailItem
            label="Setor Responsável"
            value={patrimonio.setor_responsavel || 'N/A'}
          />
          <DetailItem label="Localização" value={patrimonio.local_objeto || 'N/A'} />
          <DetailItem
            label="Data de Aquisição"
            value={formatDate(new Date(patrimonio.data_aquisicao))}
          />
          <DetailItem
            label="Valor de Aquisição"
            value={formatCurrency(patrimonio.valor_aquisicao)}
          />
          <DetailItem
            label="Forma de Aquisição"
            value={patrimonio.forma_aquisicao || 'N/A'}
          />
          <DetailItem
            label="Nota Fiscal"
            value={patrimonio.numero_nota_fiscal || 'N/A'}
          />
        </div>
      </div>
    </div>
  )
}
