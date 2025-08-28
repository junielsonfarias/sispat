import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { ImovelMap } from '@/components/imoveis/ImovelMap'

export default function ImoveisMapa() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Mapa Interativo de Imóveis</h1>
      <Card>
        <CardHeader>
          <CardTitle>Visualização no Mapa</CardTitle>
          <CardDescription>
            Filtre e explore os imóveis cadastrados diretamente no mapa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImovelMap />
        </CardContent>
      </Card>
    </div>
  )
}
