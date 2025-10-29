import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useImovel } from '@/hooks/useImovel'
import { Button } from '@/components/ui/button'
import { generateMapUrl } from '@/lib/image-utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatCurrency } from '@/lib/utils'
import { MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const ImovelMap = () => {
  const { imoveis } = useImovel()
  const [filters, setFilters] = useState({
    denominacao: '',
    valorMin: '',
    valorMax: '',
  })

  const filteredImoveis = useMemo(() => {
    return imoveis.filter((imovel) => {
      const denominacaoMatch = imovel.denominacao
        .toLowerCase()
        .includes(filters.denominacao.toLowerCase())
      const valorMinMatch =
        !filters.valorMin || imovel.valor_aquisicao >= +filters.valorMin
      const valorMaxMatch =
        !filters.valorMax || imovel.valor_aquisicao <= +filters.valorMax
      return denominacaoMatch && valorMinMatch && valorMaxMatch
    })
  }, [imoveis, filters])

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[70vh]">
      <div className="lg:w-1/4 space-y-4">
        <h3 className="font-semibold">Filtros</h3>
        <Input
          name="denominacao"
          placeholder="Buscar por denominação..."
          value={filters.denominacao}
          onChange={handleFilterChange}
        />
        <div className="flex gap-2">
          <Input
            name="valorMin"
            type="number"
            placeholder="Valor Mín."
            value={filters.valorMin}
            onChange={handleFilterChange}
          />
          <Input
            name="valorMax"
            type="number"
            placeholder="Valor Máx."
            value={filters.valorMax}
            onChange={handleFilterChange}
          />
        </div>
      </div>
      <div className="flex-1 bg-muted rounded-lg relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover opacity-50" 
          style={{ backgroundImage: `url(${generateMapUrl()})` }}
        ></div>
        <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 gap-4 p-4">
          {filteredImoveis.slice(0, 25).map((imovel, index) => (
            <Popover key={`imovel-${imovel.id}-${index}`}>
              <PopoverTrigger asChild>
                <button
                  className="relative flex items-center justify-center"
                  style={{
                    gridColumn: `${(index % 5) + 1}`,
                    gridRow: `${Math.floor(index / 5) + 1}`,
                  }}
                >
                  <MapPin className="h-8 w-8 text-primary drop-shadow-lg animate-fade-in" />
                </button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="space-y-2">
                  <h4 className="font-semibold">{imovel.denominacao}</h4>
                  <p className="text-sm">{imovel.endereco}</p>
                  <p className="text-sm font-bold">
                    {formatCurrency(imovel.valor_aquisicao)}
                  </p>
                  <Button size="sm" asChild className="w-full">
                    <Link to={`/imoveis/ver/${imovel.id}`}>Ver Detalhes</Link>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      </div>
    </div>
  )
}
