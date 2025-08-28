import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VirtualizedTable } from '@/components/ui/virtualized-list';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { cn } from '@/lib/utils';
import { Patrimonio } from '@/types';
import { ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface OptimizedPatrimonioListProps {
  patrimonios: Patrimonio[];
  onItemClick?: (patrimonio: Patrimonio) => void;
  onItemSelect?: (patrimonios: Patrimonio[]) => void;
  loading?: boolean;
  height?: number;
  className?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
}

export function OptimizedPatrimonioList({
  patrimonios,
  onItemClick,
  onItemSelect,
  loading = false,
  height = 600,
  className,
  showSearch = true,
  showFilters = true,
  showPagination = true,
}: OptimizedPatrimonioListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    field: keyof Patrimonio;
    direction: 'asc' | 'desc';
  }>({
    field: 'numero_patrimonio',
    direction: 'asc',
  });

  const filters = useMemo(
    () => ({
      ...(statusFilter && { status: statusFilter }),
    }),
    [statusFilter]
  );

  const {
    visibleItems,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
    shouldVirtualize,
    isLargeDataset,
  } = useVirtualizedList({
    data: patrimonios,
    itemHeight: 60,
    containerHeight: height,
    searchTerm,
    searchFields: [
      'numero_patrimonio',
      'descricao',
      'setor_responsavel',
      'local_objeto',
    ],
    sortConfig,
    filters,
    pageSize: 100,
  });

  const handleSort = useCallback((field: keyof Patrimonio) => {
    setSortConfig(prev => ({
      field,
      direction:
        prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      ATIVO: 'default',
      INATIVO: 'secondary',
      EM_MANUTENCAO: 'outline',
      BAIXADO: 'destructive',
    };

    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const columns = [
    {
      key: 'numero_patrimonio' as keyof Patrimonio,
      header: 'Nº Patrimônio',
      width: '140px',
      render: (item: Patrimonio) => (
        <span className='font-mono font-medium'>{item.numero_patrimonio}</span>
      ),
    },
    {
      key: 'descricao' as keyof Patrimonio,
      header: 'Descrição',
      width: '300px',
      render: (item: Patrimonio) => (
        <div className='max-w-[280px]'>
          <p className='truncate font-medium'>{item.descricao}</p>
          <p className='text-xs text-muted-foreground truncate'>{item.marca}</p>
        </div>
      ),
    },
    {
      key: 'setor_responsavel' as keyof Patrimonio,
      header: 'Setor',
      width: '180px',
    },
    {
      key: 'local_objeto' as keyof Patrimonio,
      header: 'Local',
      width: '160px',
    },
    {
      key: 'status' as keyof Patrimonio,
      header: 'Status',
      width: '120px',
      render: (item: Patrimonio) => getStatusBadge(item.status),
    },
    {
      key: 'valor_aquisicao' as keyof Patrimonio,
      header: 'Valor',
      width: '140px',
      render: (item: Patrimonio) => (
        <span className='font-mono text-sm'>
          {formatCurrency(item.valor_aquisicao)}
        </span>
      ),
    },
    {
      key: 'data_aquisicao' as keyof Patrimonio,
      header: 'Aquisição',
      width: '120px',
      render: (item: Patrimonio) => (
        <span className='text-sm'>{formatDate(item.data_aquisicao)}</span>
      ),
    },
  ];

  const controlsHeight = showSearch || showFilters ? 80 : 0;
  const paginationHeight = showPagination ? 60 : 0;
  const tableHeight = height - controlsHeight - paginationHeight;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Performance Info */}
      {isLargeDataset && (
        <div className='flex items-center justify-between text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md'>
          <span>
            {shouldVirtualize ? '🚀 Lista virtualizada' : '📋 Lista padrão'} •
            {totalCount.toLocaleString()} itens •
            {visibleItems.length.toLocaleString()} visíveis
          </span>
          <Badge variant='outline' className='text-xs'>
            Performance Otimizada
          </Badge>
        </div>
      )}

      {/* Controles */}
      {(showSearch || showFilters) && (
        <div className='flex flex-col sm:flex-row gap-4'>
          {showSearch && (
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Buscar por número, descrição, setor ou local...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
          )}

          {showFilters && (
            <div className='flex gap-2'>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-[140px]'>
                  <Filter className='h-4 w-4 mr-2' />
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>Todos</SelectItem>
                  <SelectItem value='ATIVO'>Ativo</SelectItem>
                  <SelectItem value='INATIVO'>Inativo</SelectItem>
                  <SelectItem value='EM_MANUTENCAO'>Em Manutenção</SelectItem>
                  <SelectItem value='BAIXADO'>Baixado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Lista Virtualizada */}
      <VirtualizedTable
        items={visibleItems}
        columns={columns}
        height={tableHeight}
        itemHeight={60}
        loading={loading}
        onRowClick={onItemClick}
        className='border-0 rounded-lg shadow-sm'
      />

      {/* Paginação */}
      {showPagination && shouldVirtualize && totalPages > 1 && (
        <div className='flex items-center justify-between px-2'>
          <div className='text-sm text-muted-foreground'>
            Página {currentPage} de {totalPages} • {totalCount.toLocaleString()}{' '}
            itens
          </div>

          <div className='flex items-center space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={prevPage}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className='h-4 w-4' />
              Anterior
            </Button>

            <div className='flex items-center space-x-1'>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + Math.max(1, currentPage - 2);
                if (page > totalPages) return null;

                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => goToPage(page)}
                    className='w-8 h-8 p-0'
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant='outline'
              size='sm'
              onClick={nextPage}
              disabled={!hasNextPage}
            >
              Próxima
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
