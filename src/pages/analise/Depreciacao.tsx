import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { usePatrimonio } from '@/hooks/usePatrimonio'
import { Patrimonio } from '@/types'
import { calculateDepreciation } from '@/lib/depreciation-utils'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react'

type SortConfig = {
  column: keyof Patrimonio | 'bookValue'
  direction: 'asc' | 'desc'
}

const Depreciacao = () => {
  const { patrimonios } = usePatrimonio()
  const [sorting, setSorting] = useState<SortConfig>({
    column: 'numero_patrimonio',
    direction: 'asc',
  })

  const processedData = useMemo(() => {
    const dataWithDepreciation = patrimonios.map((p) => ({
      ...p,
      depreciationInfo: calculateDepreciation(p),
    }))

    dataWithDepreciation.sort((a, b) => {
      let aValue: any
      let bValue: any

      if (sorting.column === 'bookValue') {
        aValue = a.depreciationInfo.bookValue
        bValue = b.depreciationInfo.bookValue
      } else {
        aValue = a[sorting.column as keyof Patrimonio]
        bValue = b[sorting.column as keyof Patrimonio]
      }

      if (aValue < bValue) return sorting.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sorting.direction === 'asc' ? 1 : -1
      return 0
    })

    return dataWithDepreciation
  }, [patrimonios, sorting])

  const handleSort = (column: SortConfig['column']) => {
    setSorting((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const SortableHeader = ({
    column,
    label,
  }: {
    column: SortConfig['column']
    label: string
  }) => {
    const isSorted = sorting.column === column
    const Icon = isSorted
      ? sorting.direction === 'asc'
        ? ArrowUp
        : ArrowDown
      : ChevronsUpDown
    return (
      <Button variant="ghost" onClick={() => handleSort(column)}>
        {label}
        <Icon className="ml-2 h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Depreciação</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="text-2xl font-bold">Análise de Depreciação</h1>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Bens e Depreciação</CardTitle>
          <CardDescription>
            Acompanhe o valor contábil e a depreciação de todos os bens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader
                    column="numero_patrimonio"
                    label="Nº Patrimônio"
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader column="descricao_bem" label="Descrição" />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    column="valor_aquisicao"
                    label="Valor de Aquisição"
                  />
                </TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Vida Útil</TableHead>
                <TableHead>Depreciação Acumulada</TableHead>
                <TableHead>
                  <SortableHeader column="bookValue" label="Valor Contábil" />
                </TableHead>
                <TableHead>Último Cálculo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      to={`/bens-cadastrados/ver/${item.id}`}
                      className="text-primary hover:underline"
                    >
                      {item.numero_patrimonio || item.numeroPatrimonio}
                    </Link>
                  </TableCell>
                  <TableCell>{item.descricao_bem || item.descricaoBem}</TableCell>
                  <TableCell>{formatCurrency(item.valor_aquisicao || item.valorAquisicao)}</TableCell>
                  <TableCell>{item.metodo_depreciacao || 'N/A'}</TableCell>
                  <TableCell>{item.vida_util_anos || 0} anos</TableCell>
                  <TableCell>
                    {formatCurrency(
                      item.depreciationInfo.accumulatedDepreciation,
                    )}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(item.depreciationInfo.bookValue)}
                  </TableCell>
                  <TableCell>
                    {formatDate(item.depreciationInfo.lastDepreciationDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default Depreciacao
