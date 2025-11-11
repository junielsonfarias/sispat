import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Edit, Trash, RefreshCw, Loader2, QrCode, Printer, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react'
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
import { useSync } from '@/contexts/SyncContext'
import { useAuth } from '@/hooks/useAuth'
import { usePatrimonio } from '@/hooks/usePatrimonio'
import { useSectors } from '@/contexts/SectorContext'
import { useTiposBens } from '@/contexts/TiposBensContext'
import { DatePickerWithRange } from '@/components/ui/date-picker'
import { DateRange } from 'react-day-picker'
import { toast } from '@/hooks/use-toast'
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
import { LabelPrintDialog } from '@/components/bens/LabelPrintDialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useDebounce } from '@/hooks/use-debounce'
import { api } from '@/services/api-adapter'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TableSkeleton, MobileCardSkeleton } from '@/components/ui/skeleton-list'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
const renderTable = (
  filteredData: Patrimonio[], 
  isLoading: boolean, 
  searchTerm: string,
  selectedAssets: string[],
  onToggleAsset: (id: string) => void,
  onToggleSelectAll: () => void,
  deletingId: string | null,
  setDeletingId: (id: string | null) => void,
  deletePatrimonio: (id: string) => Promise<void>,
  fetchPatrimonios: () => Promise<void>,
  currentPage: number,
  setCurrentPage: (page: number) => void,
  toast: any,
  setPatrimonios: React.Dispatch<React.SetStateAction<Patrimonio[]>>,
  setSelectedAssets: React.Dispatch<React.SetStateAction<string[]>>,
  setTotalItems: React.Dispatch<React.SetStateAction<number>>,
  handleShowQrCode: (patrimonio: Patrimonio) => void
) => {
  if (!Array.isArray(filteredData)) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Dados inválidos para exibição</div>
      </div>
    )
  }

  if (isLoading) {
    return <TableSkeleton count={10} />
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
              <TableHead className="w-12">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Checkbox
                          checked={filteredData.length > 0 && selectedAssets.length === filteredData.length}
                          onCheckedChange={onToggleSelectAll}
                          aria-label={selectedAssets.length === filteredData.length ? 'Desmarcar todos' : 'Selecionar todos'}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{selectedAssets.length === filteredData.length ? 'Desmarcar todos' : 'Selecionar todos'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
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
                <TableCell>
                  <Checkbox
                    checked={selectedAssets.includes(patrimonio.id)}
                    onCheckedChange={() => onToggleAsset(patrimonio.id)}
                    aria-label={`Selecionar patrimônio ${patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}`}
                  />
                </TableCell>
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            aria-label={`Visualizar patrimônio ${patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}`}
                            className="touch-target min-h-[40px] min-w-[40px] transition-all duration-200 hover:scale-110"
                          >
                            <Link to={`/bens-cadastrados/ver/${patrimonio.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Visualizar detalhes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleShowQrCode(patrimonio)}
                            aria-label={`Gerar QR Code para patrimônio ${patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}`}
                            className="touch-target min-h-[40px] min-w-[40px] transition-all duration-200 hover:scale-110"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Gerar QR Code</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            aria-label={`Editar patrimônio ${patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}`}
                            className="touch-target min-h-[40px] min-w-[40px] transition-all duration-200 hover:scale-110"
                          >
                            <Link to={`/bens-cadastrados/editar/${patrimonio.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Editar patrimônio</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (!window.confirm(`Tem certeza que deseja excluir o patrimônio ${patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}? Esta ação não pode ser desfeita.`)) {
                                return
                              }
                              
                              setDeletingId(patrimonio.id)
                              try {
                                await deletePatrimonio(patrimonio.id)
                                // Remover da lista local
                                setPatrimonios((prev) => prev.filter((p) => p.id !== patrimonio.id))
                                setSelectedAssets((prev) => prev.filter((id) => id !== patrimonio.id))
                                // Atualizar contagem total
                                setTotalItems((prev) => Math.max(0, prev - 1))
                                
                                toast({
                                  title: 'Patrimônio excluído',
                                  description: 'O patrimônio foi excluído com sucesso.',
                                })
                                
                                // Se a página ficou vazia e não é a primeira, voltar uma página
                                if (filteredData.length === 1 && currentPage > 1) {
                                  setCurrentPage(currentPage - 1)
                                } else {
                                  // Recarregar dados para atualizar paginação
                                  fetchPatrimonios()
                                }
                              } catch (error) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Erro ao excluir',
                                  description: 'Não foi possível excluir o patrimônio. Tente novamente.',
                                })
                              } finally {
                                setDeletingId(null)
                              }
                            }}
                            disabled={deletingId === patrimonio.id}
                            aria-label={`Excluir patrimônio ${patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}`}
                            className="touch-target min-h-[40px] min-w-[40px] text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 hover:scale-110"
                          >
                            {deletingId === patrimonio.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Excluir patrimônio</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
  const { isSyncing, startSync } = useSync()
  const { user } = useAuth()
  const { templates: labelTemplates } = useLabelTemplates()
  const { deletePatrimonio } = usePatrimonio()
  const sectorsContext = useSectors()
  const tiposBensContext = useTiposBens()
  const sectors = sectorsContext?.sectors || []
  const tiposBens = tiposBensContext?.tiposBens || []
  
  const [searchTerm, setSearchTerm] = useState('')
  
  // ✅ Filtros
  const [filters, setFilters] = useState({
    status: '',
    situacao_bem: '',
    sectorId: '',
    tipo: '',
    dataAquisicaoInicio: '',
    dataAquisicaoFim: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [qrCodeAsset, setQrCodeAsset] = useState<Patrimonio | null>(null)
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [isBulkPrintDialogOpen, setIsBulkPrintDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const labelPrintRef = useRef<HTMLDivElement>(null)
  
  // ✅ OTIMIZAÇÃO: Paginação server-side
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)

  // ✅ OTIMIZAÇÃO: Debounce na busca (300ms)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // ✅ OTIMIZAÇÃO: Buscar patrimônios com paginação server-side
  const fetchPatrimonios = useCallback(async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      })
      
      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm)
      }
      
      // ✅ Adicionar filtros
      if (filters.status) {
        params.append('status', filters.status)
      }
      if (filters.situacao_bem) {
        params.append('situacao_bem', filters.situacao_bem)
      }
      if (filters.sectorId) {
        params.append('sectorId', filters.sectorId)
      }
      if (filters.tipo) {
        params.append('tipo', filters.tipo)
      }
      if (filters.dataAquisicaoInicio) {
        params.append('dataAquisicaoInicio', filters.dataAquisicaoInicio)
      }
      if (filters.dataAquisicaoFim) {
        params.append('dataAquisicaoFim', filters.dataAquisicaoFim)
      }

      const response = await api.get<{
        patrimonios: Patrimonio[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      }>(`/patrimonios?${params.toString()}`)

      const data = response.patrimonios || []
      const pagination = response.pagination || {
        page: currentPage,
        limit: pageSize,
        total: 0,
        pages: 1,
      }

      setPatrimonios(data)
      setTotalItems(pagination.total)
      setTotalPages(pagination.pages)
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ [DEV] Erro ao buscar patrimônios:', error)
      }
      
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os patrimônios. Por favor, tente novamente.',
      })
      
      setPatrimonios([])
      setTotalItems(0)
      setTotalPages(1)
    } finally {
      setIsLoading(false)
    }
  }, [user, currentPage, pageSize, debouncedSearchTerm, filters])

  // ✅ OTIMIZAÇÃO: Resetar para página 1 quando busca ou filtros mudarem
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, filters])

  // ✅ OTIMIZAÇÃO: Buscar patrimônios quando parâmetros mudarem
  useEffect(() => {
    if (user) {
      fetchPatrimonios()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPage, pageSize, debouncedSearchTerm, filters])

  // ✅ OTIMIZAÇÃO: useMemo no filtro (agora client-side apenas para dados já carregados)
  const filteredData = useMemo(() => {
    if (!Array.isArray(patrimonios)) return []
    
    // Se não há termo de busca, retornar todos os patrimônios da página atual
    if (!debouncedSearchTerm) return patrimonios
    
    // Filtro client-side apenas para busca adicional (backend já filtra)
    const searchLower = debouncedSearchTerm.toLowerCase()
    return patrimonios.filter((patrimonio) => {
      return (
        (patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio)?.toLowerCase().includes(searchLower) ||
        (patrimonio.descricao_bem || patrimonio.descricaoBem)?.toLowerCase().includes(searchLower) ||
        (patrimonio.setor_responsavel || patrimonio.setorResponsavel)?.toLowerCase().includes(searchLower)
      )
    })
  }, [patrimonios, debouncedSearchTerm])

  // ✅ Contar filtros ativos (definido ANTES de ser usado no JSX)
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.status) count++
    if (filters.situacao_bem) count++
    if (filters.sectorId) count++
    if (filters.tipo) count++
    if (filters.dataAquisicaoInicio || filters.dataAquisicaoFim) count++
    return count
  }, [filters])

  // ✅ Limpar todos os filtros
  const clearFilters = useCallback(() => {
    setFilters({
      status: '',
      situacao_bem: '',
      sectorId: '',
      tipo: '',
      dataAquisicaoInicio: '',
      dataAquisicaoFim: '',
    })
    setCurrentPage(1)
  }, [])

  // ✅ Filtrar setores baseado em role e responsibleSectors
  const allowedSectors = useMemo(() => {
    if (!user) return []
    // Admin e Supervisor veem TODOS os setores
    if (user.role === 'admin' || user.role === 'supervisor' || user.role === 'superuser') {
      return sectors
    }
    // Usuário normal vê apenas seus setores responsáveis
    const userSectors = user.responsibleSectors || []
    return sectors.filter((s) => userSectors.includes(s.name))
  }, [sectors, user])

  // ✅ Handler para data de aquisição
  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    setFilters((prev) => ({
      ...prev,
      dataAquisicaoInicio: range?.from ? format(range.from, 'yyyy-MM-dd') : '',
      dataAquisicaoFim: range?.to ? format(range.to, 'yyyy-MM-dd') : '',
    }))
  }, [])

  // ✅ Converter range de data para DateRange
  const dateRange: DateRange | undefined = useMemo(() => {
    if (filters.dataAquisicaoInicio || filters.dataAquisicaoFim) {
      return {
        from: filters.dataAquisicaoInicio ? new Date(filters.dataAquisicaoInicio) : undefined,
        to: filters.dataAquisicaoFim ? new Date(filters.dataAquisicaoFim) : undefined,
      }
    }
    return undefined
  }, [filters.dataAquisicaoInicio, filters.dataAquisicaoFim])

  // Handlers de paginação
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage)
    setSelectedAssets([]) // Limpar seleção ao mudar de página
  }, [])

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1) // Resetar para primeira página
    setSelectedAssets([]) // Limpar seleção
  }, [])

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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={startSync} 
                        disabled={isSyncing}
                        variant="outline"
                        className="touch-target min-h-[48px] sm:min-h-[44px] lg:min-h-[40px] transition-all duration-200"
                        aria-label={isSyncing ? 'Sincronizando dados' : 'Sincronizar dados do sistema'}
                      >
                        {isSyncing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isSyncing ? 'Sincronizando dados com o servidor...' : 'Sincroniza todos os dados do sistema'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {selectedAssets.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={() => setIsBulkPrintDialogOpen(true)}
                        variant="default"
                        className="touch-target min-h-[48px] sm:min-h-[44px] lg:min-h-[40px] transition-all duration-200 hover:scale-105"
                        aria-label={`Imprimir etiquetas para ${selectedAssets.length} patrimônio(s) selecionado(s)`}
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir Etiquetas ({selectedAssets.length})
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Imprimir etiquetas para {selectedAssets.length} patrimônio(s) selecionado(s)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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

        {/* Search e Filtros */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por número, descrição, setor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 min-h-[48px] sm:min-h-[44px] lg:min-h-[40px] text-sm sm:text-base transition-all duration-200"
                  aria-label="Buscar patrimônios"
                  aria-describedby="search-description"
                />
              </div>
              <p id="search-description" className="sr-only">
                Digite para buscar patrimônios por número, descrição ou setor
              </p>
            </div>
            {/* ✅ Botão de Filtros - SEMPRE VISÍVEL */}
            <div className="flex-shrink-0">
              <Button
                type="button"
                variant={activeFiltersCount > 0 ? 'default' : 'outline'}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowFilters(prev => !prev)
                }}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px] lg:min-h-[40px] flex items-center justify-center gap-2 whitespace-nowrap"
                aria-label="Abrir filtros"
              >
                <Filter className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Filtros</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-blue-200">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ✅ Painel de Filtros */}
        {showFilters && (
          <Card className="mb-4 sm:mb-6 border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Filtros</CardTitle>
                <div className="flex gap-2">
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-8"
                    >
                      <X className="mr-1 h-3 w-3" />
                      Limpar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                    className="h-8"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Filtro de Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value === 'all' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="baixado">Baixado</SelectItem>
                      <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
                      <SelectItem value="cedido">Cedido</SelectItem>
                      <SelectItem value="em_uso">Em Uso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Situação do Bem */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Situação</label>
                  <Select
                    value={filters.situacao_bem || 'all'}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, situacao_bem: value === 'all' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="ÓTIMO">Ótimo</SelectItem>
                      <SelectItem value="BOM">Bom</SelectItem>
                      <SelectItem value="REGULAR">Regular</SelectItem>
                      <SelectItem value="RUIM">Ruim</SelectItem>
                      <SelectItem value="EM_MANUTENCAO">Em Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Setor */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Setor</label>
                  <Select
                    value={filters.sectorId || 'all'}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, sectorId: value === 'all' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {allowedSectors.length > 0 ? (
                        allowedSectors.map((sector) => (
                          <SelectItem key={sector.id} value={sector.id}>
                            {sector.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Nenhum setor disponível
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Tipo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Tipo</label>
                  <Select
                    value={filters.tipo || 'all'}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, tipo: value === 'all' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {tiposBens.length > 0 ? (
                        tiposBens.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.nome}>
                            {tipo.nome}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Nenhum tipo disponível
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Data de Aquisição */}
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <label className="text-sm font-medium text-gray-700">Data de Aquisição</label>
                  <DatePickerWithRange
                    date={dateRange}
                    onDateChange={handleDateRangeChange}
                  />
                </div>
              </div>

              {/* Filtros Ativos */}
              {activeFiltersCount > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium text-gray-700">Filtros ativos:</span>
                    {filters.status && (
                      <Badge variant="secondary" className="gap-1">
                        Status: {filters.status}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilters((prev) => ({ ...prev, status: '' }))}
                        />
                      </Badge>
                    )}
                    {filters.situacao_bem && (
                      <Badge variant="secondary" className="gap-1">
                        Situação: {filters.situacao_bem}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilters((prev) => ({ ...prev, situacao_bem: '' }))}
                        />
                      </Badge>
                    )}
                    {filters.sectorId && (
                      <Badge variant="secondary" className="gap-1">
                        Setor: {allowedSectors.find((s) => s.id === filters.sectorId)?.name || filters.sectorId}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilters((prev) => ({ ...prev, sectorId: '' }))}
                        />
                      </Badge>
                    )}
                    {filters.tipo && (
                      <Badge variant="secondary" className="gap-1">
                        Tipo: {filters.tipo}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilters((prev) => ({ ...prev, tipo: '' }))}
                        />
                      </Badge>
                    )}
                    {(filters.dataAquisicaoInicio || filters.dataAquisicaoFim) && (
                      <Badge variant="secondary" className="gap-1">
                        Data: {filters.dataAquisicaoInicio || '...'} até {filters.dataAquisicaoFim || '...'}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilters((prev) => ({ ...prev, dataAquisicaoInicio: '', dataAquisicaoFim: '' }))}
                        />
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Table - Desktop */}
        <Card className="border-0 shadow-lg bg-white transition-all duration-300 hover:shadow-xl">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Bens Cadastrados</CardTitle>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Mostrando {filteredData.length} de {totalItems} bens • Página {currentPage} de {totalPages}
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {/* Desktop Table */}
            {renderTable(
              filteredData, 
              isLoading, 
              searchTerm,
              selectedAssets,
              (id) => {
                setSelectedAssets((prev) =>
                  prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                )
              },
              () => {
                if (selectedAssets.length === filteredData.length) {
                  setSelectedAssets([])
                } else {
                  setSelectedAssets(filteredData.map((p) => p.id))
                }
              },
              deletingId,
              setDeletingId,
              deletePatrimonio,
              fetchPatrimonios,
              currentPage,
              setCurrentPage,
              toast,
              setPatrimonios,
              setSelectedAssets,
              setTotalItems,
              handleShowQrCode
            )}

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
              {isLoading ? (
                <MobileCardSkeleton count={5} />
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
                      <Button 
                        asChild 
                        className="mt-2 transition-all duration-200 hover:scale-105"
                        aria-label="Cadastrar primeiro bem patrimonial"
                      >
                        <Link to="/bens-cadastrados/novo">
                          <Plus className="mr-2 h-4 w-4" />
                          Cadastrar Primeiro Bem
                        </Link>
                      </Button>
                    )}
                    {searchTerm && (
                      <Button
                        variant="outline"
                        onClick={() => setSearchTerm('')}
                        className="mt-2 transition-all duration-200"
                        aria-label="Limpar busca"
                      >
                        Limpar Busca
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                filteredData.map((patrimonio, index) => (
                  <Card 
                    key={`${patrimonio.id}-${index}`} 
                    className="border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                    role="article"
                    aria-label={`Patrimônio ${patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}`}
                  >
                    <CardContent className="p-4">
                      {/* Header com checkbox, número e situação */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-2 flex-1">
                          <Checkbox
                            checked={selectedAssets.includes(patrimonio.id)}
                            onCheckedChange={() => {
                              setSelectedAssets((prev) =>
                                prev.includes(patrimonio.id)
                                  ? prev.filter((i) => i !== patrimonio.id)
                                  : [...prev, patrimonio.id]
                              )
                            }}
                            className="mt-1"
                          />
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleShowQrCode(patrimonio)}
                            aria-label={`Gerar QR Code para patrimônio ${patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}`}
                            className="h-8 w-8 transition-all duration-200 hover:scale-110"
                          >
                            <QrCode className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Gerar QR Code</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (!window.confirm(`Tem certeza que deseja excluir o patrimônio ${patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}? Esta ação não pode ser desfeita.`)) {
                                return
                              }
                              
                              setDeletingId(patrimonio.id)
                              try {
                                await deletePatrimonio(patrimonio.id)
                                // Remover da lista local
                                setPatrimonios((prev) => prev.filter((p) => p.id !== patrimonio.id))
                                setSelectedAssets((prev) => prev.filter((id) => id !== patrimonio.id))
                                // Atualizar contagem total
                                setTotalItems((prev) => Math.max(0, prev - 1))
                                
                                toast({
                                  title: 'Patrimônio excluído',
                                  description: 'O patrimônio foi excluído com sucesso.',
                                })
                                
                                // Se a página ficou vazia e não é a primeira, voltar uma página
                                if (filteredData.length === 1 && currentPage > 1) {
                                  setCurrentPage(currentPage - 1)
                                } else {
                                  // Recarregar dados para atualizar paginação
                                  fetchPatrimonios()
                                }
                              } catch (error) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Erro ao excluir',
                                  description: 'Não foi possível excluir o patrimônio. Tente novamente.',
                                })
                              } finally {
                                setDeletingId(null)
                              }
                            }}
                            disabled={deletingId === patrimonio.id}
                            aria-label={`Excluir patrimônio ${patrimonio.numero_patrimonio || patrimonio.numeroPatrimonio}`}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 hover:scale-110"
                          >
                            {deletingId === patrimonio.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash className="h-3 w-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Excluir patrimônio</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
          
          {/* ✅ OTIMIZAÇÃO: Controles de Paginação */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Itens por página:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => handlePageSizeChange(Number(value))}
                  >
                    <SelectTrigger className="w-20 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1 || isLoading}
                          className="h-9 transition-all duration-200"
                          aria-label="Página anterior"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Anterior
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ir para página anterior</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={isLoading}
                          className="h-9 w-9 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages || isLoading}
                          className="h-9 transition-all duration-200"
                          aria-label="Próxima página"
                        >
                          Próxima
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ir para próxima página</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </div>
              </div>
            </div>
          )}
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
                      <div ref={labelPrintRef}>
                        <LabelPreview 
                          asset={{ ...qrCodeAsset, assetType: 'bem' }} 
                          template={selectedTemplate}
                        />
                      </div>
                    </div>
                    <div className="flex justify-center gap-2 mt-4">
                      <Button onClick={async () => {
                        if (!selectedTemplate || !qrCodeAsset) {
                          toast({
                            variant: 'destructive',
                            title: 'Erro',
                            description: 'Por favor, selecione um modelo de etiqueta.',
                          })
                          return
                        }
                        
                        // Aguardar um pouco para garantir que o QR code seja carregado
                        await new Promise(resolve => setTimeout(resolve, 500))
                        
                        // Abrir janela de impressão
                        const printWindow = window.open('', '_blank')
                        if (printWindow && labelPrintRef.current) {
                          printWindow.document.write(
                            '<html><head><title>Imprimir Etiqueta</title>',
                          )
                          
                          // Copiar estilos
                          document.head
                            .querySelectorAll('link[rel="stylesheet"], style')
                            .forEach((el) => {
                              printWindow.document.head.appendChild(el.cloneNode(true))
                            })
                          
                          // Estilos de impressão para A4 com etiqueta no topo
                          const pageWidth = 210 // A4 portrait width
                          const pageHeight = 297 // A4 portrait height
                          
                          printWindow.document.write(`
                            <style>
                              @media print {
                                @page { 
                                  size: A4;
                                  margin: 0;
                                }
                                * {
                                  margin: 0;
                                  padding: 0;
                                  box-sizing: border-box;
                                }
                                body { 
                                  margin: 0;
                                  padding: 0;
                                  width: ${pageWidth}mm;
                                  min-height: ${pageHeight}mm;
                                  position: relative;
                                  -webkit-print-color-adjust: exact !important;
                                  print-color-adjust: exact !important;
                                }
                                .label-print-container {
                                  width: ${selectedTemplate?.width || 100}mm;
                                  height: ${selectedTemplate?.height || 60}mm;
                                  position: absolute;
                                  top: 0;
                                  left: 0;
                                  overflow: hidden;
                                  page-break-inside: avoid;
                                }
                              }
                              @media screen {
                                body {
                                  width: ${pageWidth}mm;
                                  min-height: ${pageHeight}mm;
                                  margin: 20px auto;
                                  padding: 0;
                                  background: #f0f0f0;
                                }
                                .label-print-container {
                                  width: ${selectedTemplate?.width || 100}mm;
                                  height: ${selectedTemplate?.height || 60}mm;
                                  position: relative;
                                  background: white;
                                  box-shadow: 0 0 10px rgba(0,0,0,0.1);
                                }
                              }
                            </style>
                          `)
                          
                          printWindow.document.write('</head><body>')
                          printWindow.document.write('<div class="label-print-container">')
                          printWindow.document.write(labelPrintRef.current.innerHTML)
                          printWindow.document.write('</div>')
                          printWindow.document.write('</body></html>')
                          
                          printWindow.document.close()
                          
                          // Aguardar carregamento e imprimir
                          printWindow.onload = () => {
                            setTimeout(() => {
                              printWindow.print()
                              printWindow.close()
                            }, 250)
                          }
                        } else {
                          toast({
                            variant: 'destructive',
                            title: 'Erro',
                            description: 'Não foi possível abrir a janela de impressão. Verifique se os pop-ups estão bloqueados.',
                          })
                        }
                      }}>
                        <Printer className="mr-2 h-4 w-4" />
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

        {/* Dialog de Impressão em Lote */}
        {selectedAssets.length > 0 && labelTemplates.length > 0 && (
          <LabelPrintDialog
            open={isBulkPrintDialogOpen}
            onOpenChange={setIsBulkPrintDialogOpen}
            assets={filteredData.filter((p) => selectedAssets.includes(p.id))}
            templates={labelTemplates}
            defaultTemplate={labelTemplates.find((t: any) => t.isDefault) || labelTemplates[0]}
          />
        )}
      </div>
    </div>
  )
}

export default BensCadastrados
