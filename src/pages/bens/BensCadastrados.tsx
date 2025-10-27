import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Edit, Trash, RefreshCw, Loader2, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useSync } from '@/contexts/SyncContext'
import { useAuth } from '@/hooks/useAuth'
import { LabelPreview } from '@/components/LabelPreview'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Patrimonio } from '@/types'
import { useLabelTemplates } from '@/hooks/useLabelTemplates'

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ÓTIMO':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'BOM':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'REGULAR':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'RUIM':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'EM_MANUTENCAO':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// Função auxiliar para renderizar a tabela de forma segura
const renderTable = (filteredData: Patrimonio[], isLoading: boolean, searchTerm: string) => {
  if (!Array.isArray(filteredData)) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Dados inválidos para exibição</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="text-gray-500">Carregando bens...</span>
        </div>
      </div>
    )
  }

  if (filteredData.length === 0) {
    return (
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
    )
  }

  return (
    <div className="hidden lg:block overflow-x-auto">
      <div className="rounded-lg border border-gray-200 overflow-hidden">
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
                <TableCell className="text-sm text-gray-700">{patrimonio.descricao_bem || patrimonio.descricaoBem}</TableCell>
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
                <TableCell className="text-sm text-gray-700">{patrimonio.setor_responsavel || patrimonio.setorResponsavel}</TableCell>
                <TableCell className="text-sm text-gray-700">{patrimonio.local_objeto || patrimonio.localObjeto}</TableCell>
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
                      title="QR Code"
                      className="touch-target min-h-[40px] min-w-[40px]"
                    >
                      <QrCode className="h-4 w-4" />
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
    </div>
  )
}

const BensCadastrados = () => {
  const { patrimonios, isLoading } = usePatrimonio()
  const { isSyncing, startSync } = useSync()
  const { user } = useAuth()
  const { templates: labelTemplates } = useLabelTemplates()
  const [searchTerm, setSearchTerm] = useState('')
  const [qrCodeAsset, setQrCodeAsset] = useState<Patrimonio | null>(null)
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)

  // Logs de debug
  console.log('🔍 [DEV] BensCadastrados - patrimonios:', patrimonios)
  console.log('📊 [DEV] BensCadastrados - Total:', Array.isArray(patrimonios) ? patrimonios.length : 0)
  console.log('📊 [DEV] BensCadastrados - isLoading:', isLoading)
  console.log('📊 [DEV] BensCadastrados - É array?:', Array.isArray(patrimonios))
  console.log('📊 [DEV] BensCadastrados - Primeiro item:', patrimonios[0])

  // Filtro simples sem useMemo para evitar problemas de renderização
  const filteredData = Array.isArray(patrimonios) ? patrimonios.filter((patrimonio) => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      (patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio)?.toLowerCase().includes(searchLower) ||
      (patrimonio.descricao_bem || patrimonio.descricaoBem)?.toLowerCase().includes(searchLower) ||
      (patrimonio.setor_responsavel || patrimonio.setorResponsavel)?.toLowerCase().includes(searchLower)
    )
  }) : []

  console.log('🔍 [DEV] BensCadastrados - filteredData:', filteredData.length)

  const handleShowQrCode = (patrimonio: Patrimonio) => {
    setQrCodeAsset(patrimonio)
    setSelectedTemplate(null) // Reset template selection
    setIsQrDialogOpen(true)
  }

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template)
  }

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
            
            <div className="flex flex-col sm:flex-row gap-3">
              {user && (user.role === 'supervisor' || user.role === 'usuario') && (
                <Button 
                  onClick={startSync} 
                  disabled={isSyncing}
                  variant="outline"
                  className="touch-target min-h-[48px] sm:min-h-[44px] lg:min-h-[40px]"
                >
                  {isSyncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </Button>
              )}
              <Button asChild variant="outline" className="touch-target min-h-[48px] sm:min-h-[44px] lg:min-h-[40px]">
                <Link to="/bens-cadastrados/novo-lote">
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastro em Lote
                </Link>
              </Button>
              <Button asChild className="touch-target min-h-[48px] sm:min-h-[44px] lg:min-h-[40px]">
                <Link to="/bens-cadastrados/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Bem
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por número, descrição, setor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 min-h-[48px] sm:min-h-[44px] lg:min-h-[40px] text-sm sm:text-base"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table - Desktop */}
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Bens Cadastrados</CardTitle>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {filteredData.length} de {Array.isArray(patrimonios) ? patrimonios.length : 0} bens
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {/* Desktop Table */}
            {renderTable(filteredData, isLoading, searchTerm)}

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
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
                filteredData.map((patrimonio, index) => (
                  <Card key={`${patrimonio.id}-${index}`} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* Header com número e situação */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <Link 
                            to={`/bens-cadastrados/ver/${patrimonio.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm font-medium"
                          >
                            {patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}
                          </Link>
                          <p className="text-sm text-gray-600 mt-1">
                            {patrimonio.descricao_bem || patrimonio.descricaoBem}
                          </p>
                        </div>
                        <Badge 
                          className={`${getStatusColor(patrimonio.situacao_bem || patrimonio.situacaoBem)} border text-xs ml-2`}
                        >
                          {patrimonio.situacao_bem || patrimonio.situacaoBem}
                        </Badge>
                      </div>

                      {/* Informações principais */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Valor:</span>
                          <span className="text-sm font-medium text-gray-900">
                            R$ {(patrimonio.valor_aquisicao || patrimonio.valorAquisicao)?.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Setor:</span>
                          <span className="text-sm text-gray-700 text-right flex-1 ml-2">
                            {patrimonio.setor_responsavel || patrimonio.setorResponsavel}
                          </span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-gray-500">Local:</span>
                          <span className="text-sm text-gray-700 text-right flex-1 ml-2">
                            {patrimonio.local_objeto || patrimonio.localObjeto}
                          </span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 px-3 text-xs"
                          >
                            <Link to={`/bens-cadastrados/ver/${patrimonio.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              Ver
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 px-3 text-xs"
                          >
                            <Link to={`/bens-cadastrados/editar/${patrimonio.id}`}>
                              <Edit className="h-3 w-3 mr-1" />
                              Editar
                            </Link>
                          </Button>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleShowQrCode(patrimonio)}
                            title="QR Code"
                            className="h-8 w-8"
                          >
                            <QrCode className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir"
                            onClick={() => {
                              console.log('Excluir:', patrimonio.id)
                            }}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* QR Code Dialog */}
        <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerar Etiqueta - {qrCodeAsset?.numero_patrimonio}</DialogTitle>
              <DialogDescription>
                Selecione um modelo de etiqueta e visualize como ficará impressa.
              </DialogDescription>
            </DialogHeader>
            {qrCodeAsset && (
              <div className="space-y-6">
                {/* Template Selection */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Selecione o Modelo de Etiqueta</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {labelTemplates?.map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <div className="font-medium text-sm mb-2">{template.name}</div>
                        <div className="text-xs text-gray-500">
                          {template.width}x{template.height}mm
                        </div>
                      </div>
                    ))}
                    {/* Template Padrão */}
                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?.id === 'default'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleSelectTemplate({
                        id: 'default',
                        name: 'Etiqueta Padrão',
                        width: 100,
                        height: 60,
                        elements: [
                          { 
                            id: '1',
                            type: 'TEXT', 
                            content: 'numero_patrimonio', 
                            x: 5, y: 5, 
                            width: 50, 
                            height: 15, 
                            fontSize: 12,
                            fontWeight: 'bold',
                            textAlign: 'left'
                          },
                          { 
                            id: '2',
                            type: 'TEXT', 
                            content: 'descricao_bem', 
                            x: 5, y: 20, 
                            width: 50, 
                            height: 15, 
                            fontSize: 10,
                            fontWeight: 'normal',
                            textAlign: 'left'
                          },
                          { 
                            id: '3',
                            type: 'QR_CODE', 
                            x: 60, y: 5, 
                            width: 35, 
                            height: 35, 
                            content: 'numero_patrimonio',
                            fontSize: 8,
                            fontWeight: 'normal',
                            textAlign: 'center'
                          }
                        ],
                        municipalityId: '1'
                      })}
                    >
                      <div className="font-medium text-sm mb-2">Etiqueta Padrão</div>
                      <div className="text-xs text-gray-500">100x60mm</div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {selectedTemplate && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Visualização da Etiqueta</h3>
                    <div className="flex justify-center bg-gray-50 p-4 rounded-lg">
                      <LabelPreview 
                        asset={{ ...qrCodeAsset, assetType: 'bem' }} 
                        template={selectedTemplate}
                      />
                    </div>
                    <div className="flex justify-center gap-2 mt-4">
                      <Button onClick={() => {
                        // Implementar impressão
                        console.log('Imprimir etiqueta:', selectedTemplate, qrCodeAsset)
                      }}>
                        Imprimir Etiqueta
                      </Button>
                      <Button variant="outline" onClick={() => setIsQrDialogOpen(false)}>
                        Fechar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default BensCadastrados