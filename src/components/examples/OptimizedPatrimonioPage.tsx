import { OptimizedPatrimonioList } from '@/components/patrimonio/OptimizedPatrimonioList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingOverlay, PerformanceIndicator } from '@/components/ui/loading-states';
import { MobileOptimizedTable } from '@/components/ui/mobile-optimized-table';
import { useBreakpoint } from '@/components/ui/responsive-container';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePatrimonio } from '@/hooks/usePatrimonio';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { Patrimonio } from '@/types';
import {
    BarChart3,
    Edit,
    Eye,
    Filter,
    RefreshCw,
    Search,
    Trash2,
    Zap
} from 'lucide-react';
import { useMemo, useState } from 'react';

export function OptimizedPatrimonioPage() {
  const { patrimonios, isLoading, updatePatrimonio, deletePatrimonio } = usePatrimonio();
  const { isMobile, isTablet } = useBreakpoint();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'table' | 'cards'>('list');
  
  // Filtros aplicados
  const filteredData = useMemo(() => {
    return patrimonios.filter(item => {
      const matchesSearch = !searchTerm || 
        item.numero_patrimonio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.setor_responsavel.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !statusFilter || item.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [patrimonios, searchTerm, statusFilter]);

  // Otimização de performance
  const {
    data: optimizedData,
    totalCount,
    isLoading: optimizationLoading,
    isVirtualized,
    metrics,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
    invalidateCache,
    optimize
  } = usePerformanceOptimization(filteredData, {
    enableCache: true,
    enableVirtualization: true,
    enableMemoization: true,
    cacheKey: `patrimonio_list_${searchTerm}_${statusFilter}`,
    cacheTTL: 10 * 60 * 1000, // 10 minutos
    virtualizationThreshold: 50,
    itemHeight: 60,
    containerHeight: 600
  });

  const handleView = (patrimonio: Patrimonio) => {
    console.log('Visualizar:', patrimonio.id);
  };

  const handleEdit = (patrimonio: Patrimonio) => {
    console.log('Editar:', patrimonio.id);
  };

  const handleDelete = async (patrimonio: Patrimonio) => {
    if (window.confirm('Tem certeza que deseja excluir este patrimônio?')) {
      await deletePatrimonio(patrimonio.id);
      invalidateCache(); // Invalidar cache após alteração
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'ATIVO': 'default',
      'INATIVO': 'secondary',
      'EM_MANUTENCAO': 'outline',
      'BAIXADO': 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  // Configuração para tabela mobile
  const tableColumns = [
    {
      key: 'numero_patrimonio' as keyof Patrimonio,
      header: 'Nº Patrimônio',
      mobileLabel: 'Número',
      priority: 'high' as const,
      render: (item: Patrimonio) => (
        <span className="font-mono font-medium">{item.numero_patrimonio}</span>
      )
    },
    {
      key: 'descricao' as keyof Patrimonio,
      header: 'Descrição',
      mobileLabel: 'Descrição',
      priority: 'high' as const,
      render: (item: Patrimonio) => (
        <div>
          <p className="font-medium truncate">{item.descricao}</p>
          {item.marca && (
            <p className="text-xs text-muted-foreground">{item.marca}</p>
          )}
        </div>
      )
    },
    {
      key: 'setor_responsavel' as keyof Patrimonio,
      header: 'Setor',
      mobileLabel: 'Setor',
      priority: 'medium' as const
    },
    {
      key: 'status' as keyof Patrimonio,
      header: 'Status',
      mobileLabel: 'Status',
      priority: 'high' as const,
      render: (item: Patrimonio) => getStatusBadge(item.status)
    },
    {
      key: 'valor_aquisicao' as keyof Patrimonio,
      header: 'Valor',
      mobileLabel: 'Valor',
      priority: 'low' as const,
      render: (item: Patrimonio) => (
        <span className="font-mono text-sm">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(item.valor_aquisicao)}
        </span>
      )
    }
  ];

  const tableActions = [
    {
      label: 'Visualizar',
      icon: <Eye className="h-4 w-4" />,
      onClick: handleView
    },
    {
      label: 'Editar',
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit
    },
    {
      label: 'Excluir',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: 'destructive' as const
    }
  ];

  return (
    <LoadingOverlay isLoading={isLoading} loadingText="Carregando patrimônios...">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Patrimônios Cadastrados</h1>
            <p className="text-muted-foreground">
              Gerencie todos os patrimônios do sistema com performance otimizada
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={optimize}
              className="hidden sm:flex"
            >
              <Zap className="h-4 w-4 mr-2" />
              Otimizar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={invalidateCache}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Métricas de Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Renderização</p>
                <p className="font-medium">{metrics.renderTime.toFixed(1)}ms</p>
              </div>
              <div>
                <p className="text-muted-foreground">Processamento</p>
                <p className="font-medium">{metrics.dataProcessingTime.toFixed(1)}ms</p>
              </div>
              <div>
                <p className="text-muted-foreground">Itens</p>
                <p className="font-medium">
                  {metrics.visibleItems}/{metrics.totalItems}
                  {isVirtualized && <Badge variant="outline" className="ml-1 text-xs">Virtual</Badge>}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Memória</p>
                <p className="font-medium">{metrics.memoryUsage.toFixed(1)}MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, descrição ou setor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                  <SelectItem value="EM_MANUTENCAO">Em Manutenção</SelectItem>
                  <SelectItem value="BAIXADO">Baixado</SelectItem>
                </SelectContent>
              </Select>

              {!isMobile && (
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                  <TabsList>
                    <TabsTrigger value="list">Lista</TabsTrigger>
                    <TabsTrigger value="table">Tabela</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Indicator */}
        <PerformanceIndicator 
          loadTime={metrics.renderTime + metrics.dataProcessingTime}
          itemCount={totalCount}
          className="justify-end"
        />

        {/* Lista Otimizada */}
        <div className="space-y-4">
          {viewMode === 'list' || isMobile ? (
            <OptimizedPatrimonioList
              patrimonios={optimizedData}
              onItemClick={handleView}
              loading={optimizationLoading}
              height={600}
              showSearch={false} // Já temos busca global
              showFilters={false} // Já temos filtros globais
              showPagination={isVirtualized}
            />
          ) : (
            <MobileOptimizedTable
              data={optimizedData}
              columns={tableColumns}
              actions={tableActions}
              loading={optimizationLoading}
              onRowClick={handleView}
              showRowNumbers
              highlightRow={(item) => item.status === 'EM_MANUTENCAO'}
            />
          )}

          {/* Paginação customizada para dados grandes */}
          {isVirtualized && totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} • {totalCount.toLocaleString()} itens
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={!hasPrevPage}
                >
                  Anterior
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={!hasNextPage}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </LoadingOverlay>
  );
}
