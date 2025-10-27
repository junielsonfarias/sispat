import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Edit, Trash, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePatrimonio } from '@/hooks/usePatrimonio'
import { useSync } from '@/hooks/useSync'
import { useAuth } from '@/hooks/useAuth'
import { Patrimonio } from '@/types'

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'ativo':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'inativo':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'manutenção':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const BensCadastradosSimplificado = () => {
  const { patrimonios, isLoading } = usePatrimonio()
  const { isSyncing, startSync } = useSync()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')

  // Filtro simples
  const filteredData = Array.isArray(patrimonios) ? patrimonios.filter((patrimonio) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      (patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio)?.toLowerCase().includes(searchLower) ||
      (patrimonio.descricao_bem || patrimonio.descricaoBem)?.toLowerCase().includes(searchLower) ||
      (patrimonio.setor_responsavel || patrimonio.setorResponsavel)?.toLowerCase().includes(searchLower)
    )
  }) : []

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-1 sm:mb-2">
                Bens Cadastrados
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600">
                Gerencie todos os bens patrimoniais cadastrados no sistema
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={startSync}
                disabled={isSyncing}
                className="w-full sm:w-auto"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sincronizar
                  </>
                )}
              </Button>
              <Button asChild className="w-full sm:w-auto">
                <Link to="/bens-cadastrados/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Bem
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por número, descrição ou setor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Lista de Bens
            </CardTitle>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {filteredData.length} de {Array.isArray(patrimonios) ? patrimonios.length : 0} bens
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="text-gray-500">Carregando bens...</span>
                </div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-gray-100 p-3">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">
                      {searchTerm ? 'Nenhum bem encontrado' : 'Nenhum bem cadastrado'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {searchTerm 
                        ? 'Tente ajustar os termos de busca' 
                        : 'Comece cadastrando um novo bem'}
                    </p>
                  </div>
                  {!searchTerm && (
                    <Button asChild className="mt-2">
                      <Link to="/bens-cadastrados/novo">
                        <Plus className="mr-2 h-4 w-4" />
                        Cadastrar Primeiro Bem
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow className="border-gray-200">
                      <TableHead className="text-sm font-semibold text-gray-700">Número</TableHead>
                      <TableHead className="text-sm font-semibold text-gray-700">Descrição</TableHead>
                      <TableHead className="text-sm font-semibold text-gray-700">Situação</TableHead>
                      <TableHead className="text-sm font-semibold text-gray-700">Valor</TableHead>
                      <TableHead className="text-sm font-semibold text-gray-700">Setor</TableHead>
                      <TableHead className="text-sm font-semibold text-gray-700">Local</TableHead>
                      <TableHead className="text-right text-sm font-semibold text-gray-700">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((patrimonio, index) => (
                      <TableRow 
                        key={`patrimonio-${patrimonio.id}-${index}`} 
                        className="hover:bg-gray-50 border-gray-200"
                      >
                        <TableCell className="font-medium font-mono text-sm text-gray-900">
                          <Link 
                            to={`/bens-cadastrados/ver/${patrimonio.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {patrimonio.descricao_bem || patrimonio.descricaoBem}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`${getStatusColor(patrimonio.situacao_bem || patrimonio.situacaoBem)} border text-xs`}
                          >
                            {patrimonio.situacao_bem || patrimonio.situacaoBem}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          R$ {(patrimonio.valor_aquisicao || patrimonio.valorAquisicao)?.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {patrimonio.setor_responsavel || patrimonio.setorResponsavel}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {patrimonio.local_objeto || patrimonio.localObjeto}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="Visualizar"
                              className="touch-target min-h-[40px] min-w-[40px]"
                            >
                              <Link to={`/bens-cadastrados/ver/${patrimonio.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="Editar"
                              className="touch-target min-h-[40px] min-w-[40px]"
                            >
                              <Link to={`/bens-cadastrados/editar/${patrimonio.id}`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Excluir"
                              className="touch-target min-h-[40px] min-w-[40px]"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default BensCadastradosSimplificado
