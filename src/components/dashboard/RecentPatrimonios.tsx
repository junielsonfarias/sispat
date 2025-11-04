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
  descricao_bem?: string
  denominacao?: string
  tipo: string
  valor_aquisicao?: number
  valorAquisicao?: number
  valor?: number
  status: string
  setor_responsavel?: string
  setorId?: string
  createdAt: string
  // ✅ Campo para diferenciar bem de imóvel
  tipoItem?: 'bem' | 'imovel'
}

interface RecentPatrimoniosProps {
  patrimonios: Patrimonio[]
  imoveis?: Patrimonio[] // ✅ Aceitar também imóveis
}

export const RecentPatrimonios = ({ patrimonios = [], imoveis = [] }: RecentPatrimoniosProps) => {
  // ✅ CORREÇÃO: Combinar bens e imóveis, marcar tipo e ordenar por data de criação
  const allItems = React.useMemo(() => {
    const bens = patrimonios.map(p => ({
      ...p,
      tipoItem: 'bem' as const,
      descricao_bem: p.descricao_bem || 'Bem',
      createdAt: p.createdAt || (p as any).created_at || new Date().toISOString()
    }))
    
    const imoveisFormatados = (imoveis || []).map(i => ({
      ...i,
      tipoItem: 'imovel' as const,
      descricao_bem: i.denominacao || i.descricao_bem || 'Imóvel', // Para imóveis, usar denominacao como descrição
      status: i.status || (i as any).situacao || 'ativo', // Usar situacao como status para imóveis
      createdAt: (i as any).createdAt || (i as any).created_at || new Date().toISOString()
    }))
    
    return [...bens, ...imoveisFormatados]
  }, [patrimonios, imoveis])

  // ✅ CORREÇÃO: Pegar os 5 mais recentes (bens + imóveis)
  const recentPatrimonios = React.useMemo(() => {
    return allItems
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        if (isNaN(dateA) || isNaN(dateB)) return 0
        return dateB - dateA
      })
      .slice(0, 5)
  }, [allItems])

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ativo':
        return <Badge variant="default" className="bg-green-100 text-green-800">Ativo</Badge>
      case 'manutencao':
        return <Badge variant="destructive" className="bg-orange-100 text-orange-800">Manutenção</Badge>
      case 'baixado':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Baixado</Badge>
      case 'alugado':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Alugado</Badge>
      case 'desativado':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Desativado</Badge>
      default:
        return <Badge variant="outline">{status || 'N/A'}</Badge>
    }
  }

  const formatValue = (item: Patrimonio) => {
    const valor = item.valor_aquisicao || item.valorAquisicao || item.valor || 0
    return formatCurrency(valor)
  }

  // ✅ CORREÇÃO: Função para obter o link correto baseado no tipo (rota correta conforme App.tsx)
  const getViewLink = (item: Patrimonio) => {
    // ✅ Validação: garantir que o ID existe
    if (!item.id) {
      console.warn('Item sem ID:', item)
      return '#'
    }
    
    if (item.tipoItem === 'imovel') {
      return `/imoveis/ver/${item.id}`
    }
    // ✅ CORREÇÃO: Rota correta para visualizar bens (conforme App.tsx)
    return `/bens-cadastrados/ver/${item.id}`
  }

  // ✅ CORREÇÃO: Função para obter descrição (bem ou imóvel)
  const getDescription = (item: Patrimonio) => {
    if (item.tipoItem === 'imovel') {
      return item.denominacao || item.descricao_bem || 'Imóvel'
    }
    return item.descricao_bem || 'Bem'
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
            {recentPatrimonios
              .filter((item) => item.id) // ✅ Filtrar itens sem ID
              .map((item) => (
                <TableRow key={`${item.tipoItem}-${item.id}`}>
                  <TableCell className="font-medium text-xs sm:text-sm">
                    {item.numero_patrimonio || 'N/A'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs sm:text-sm hidden md:table-cell">
                    {getDescription(item)}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                    {item.tipoItem === 'imovel' ? 'Imóvel' : (item.tipo || 'Bem')}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    {formatValue(item)}
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>
                    {/* ✅ CORREÇÃO: Link correto com ícone Eye visível e estilizado */}
                    <Link to={getViewLink(item)}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                        title="Visualizar detalhes"
                      >
                        <Eye className="h-4 w-4 text-primary hover:text-primary/80" />
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
