import { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useAuth } from '@/hooks/useAuth'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { User, Patrimonio } from '@/types'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, FileDigit } from 'lucide-react'

interface AssetWithCreator extends Patrimonio {
  creator: {
    id: string
    name: string
  }
}

export default function AssetsByUser() {
  const { users } = useAuth()
  const { patrimonios } = usePatrimonio()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const userOptions: SearchableSelectOption[] = users.map((u) => ({
    value: u.id,
    label: u.name,
  }))

  const assetsWithCreators = useMemo(() => {
    return patrimonios
      .map((p) => {
        const creationEvent = p.historico_movimentacao.find(
          (h) => h.action === 'Criação',
        )
        const creatorUser = users.find((u) => u.name === creationEvent?.user)
        return {
          ...p,
          creator: {
            id: creatorUser?.id || 'unknown',
            name: creationEvent?.user || 'Desconhecido',
          },
        }
      })
      .filter(
        (p): p is AssetWithCreator => p.creator.id !== 'unknown',
      ) as AssetWithCreator[]
  }, [patrimonios, users])

  const groupedAssets = useMemo(() => {
    const data = assetsWithCreators.reduce(
      (acc, asset) => {
        const userId = asset.creator.id
        if (!acc[userId]) {
          acc[userId] = {
            user: asset.creator,
            assets: [],
          }
        }
        acc[userId].assets.push(asset)
        return acc
      },
      {} as Record<
        string,
        { user: { id: string; name: string }; assets: Patrimonio[] }
      >,
    )
    return Object.values(data)
  }, [assetsWithCreators])

  const filteredGroupedAssets = useMemo(() => {
    if (!selectedUserId) return groupedAssets
    return groupedAssets.filter((group) => group.user.id === selectedUserId)
  }, [groupedAssets, selectedUserId])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Bens por Usuário de Cadastro</h1>
      <Card>
        <CardHeader>
          <CardTitle>Filtros e Ações</CardTitle>
          <div className="flex justify-between items-center pt-4">
            <div className="w-full max-w-sm">
              <SearchableSelect
                options={userOptions}
                value={selectedUserId}
                onChange={setSelectedUserId}
                placeholder="Filtrar por usuário..."
                isClearable
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar XLSX
              </Button>
              <Button variant="outline" size="sm">
                <FileDigit className="mr-2 h-4 w-4" /> Exportar PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {filteredGroupedAssets.map(({ user, assets }) => (
              <AccordionItem value={user.id} key={user.id}>
                <AccordionTrigger>
                  {user.name} ({assets.length} bens)
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Patrimônio</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Data de Aquisição</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell>{asset.numero_patrimonio}</TableCell>
                          <TableCell>{asset.descricao_bem}</TableCell>
                          <TableCell>
                            {formatDate(asset.data_aquisicao)}
                          </TableCell>
                          <TableCell>
                            <Badge>{asset.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
