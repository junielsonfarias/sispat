import React from 'react'
import { Link } from 'react-router-dom'
import { Eye, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

interface Patrimonio {
  id: string
  numero_patrimonio: string
  descricao_bem: string
  tipo: string
  valor_aquisicao?: number
  valorAquisicao?: number
  valor?: number
  status: string
  setor_responsavel?: string
  setorId?: string
  createdAt: string
}

interface RecentPatrimoniosProps {
  patrimonios: Patrimonio[]
}

export const RecentPatrimonios = ({ patrimonios }: RecentPatrimoniosProps) => {
  // Pegar os 5 patrimônios mais recentes
  const recentPatrimonios = patrimonios
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="default" className="bg-green-100 text-green-800">Ativo</Badge>
      case 'manutencao':
        return <Badge variant="destructive" className="bg-orange-100 text-orange-800">Manutenção</Badge>
      case 'baixado':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Baixado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatValue = (patrimonio: Patrimonio) => {
    const valor = patrimonio.valor_aquisicao || patrimonio.valorAquisicao || patrimonio.valor || 0
    return formatCurrency(valor)
  }

  if (recentPatrimonios.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white dark:bg-gray-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            Patrimônios Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm sm:text-base mb-4">Nenhum patrimônio cadastrado ainda.</p>
            <Link to="/patrimonios/novo">
              <Button className="text-sm">Cadastrar Primeiro Patrimônio</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm bg-white dark:bg-gray-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            Patrimônios Recentes
          </CardTitle>
          <Link to="/patrimonios">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              Ver Todos
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs sm:text-sm">Patrimônio</TableHead>
              <TableHead className="text-xs sm:text-sm hidden md:table-cell">Descrição</TableHead>
              <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Tipo</TableHead>
              <TableHead className="text-xs sm:text-sm">Valor</TableHead>
              <TableHead className="text-xs sm:text-sm">Status</TableHead>
              <TableHead className="text-xs sm:text-sm">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentPatrimonios.map((patrimonio) => (
              <TableRow key={patrimonio.id}>
                <TableCell className="font-medium text-xs sm:text-sm">
                  {patrimonio.numero_patrimonio}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-xs sm:text-sm hidden md:table-cell">
                  {patrimonio.descricao_bem}
                </TableCell>
                <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                  {patrimonio.tipo}
                </TableCell>
                <TableCell className="text-xs sm:text-sm">
                  {formatValue(patrimonio)}
                </TableCell>
                <TableCell>{getStatusBadge(patrimonio.status)}</TableCell>
                <TableCell>
                  <Link to={`/patrimonios/${patrimonio.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
