import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

export interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (props: {
    index: number;
    style: React.CSSProperties;
    item: T;
  }) => React.ReactNode;
  className?: string;
  loading?: boolean;
  emptyState?: React.ReactNode;
  loadingState?: React.ReactNode;
  overscan?: number;
}

export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className,
  loading = false,
  emptyState,
  loadingState,
  overscan = 5,
}: VirtualizedListProps<T>) {
  // Componente de item da lista
  const ListItem = useMemo(
    () =>
      ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const item = items[index];
        if (!item) return null;

        return <div style={style}>{renderItem({ index, style, item })}</div>;
      },
    [items, renderItem]
  );

  // Estados de loading e vazio
  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center border rounded-md',
          className
        )}
        style={{ height }}
      >
        {loadingState || (
          <div className='flex items-center space-x-2 text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            <span>Carregando...</span>
          </div>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center border rounded-md',
          className
        )}
        style={{ height }}
      >
        {emptyState || (
          <div className='text-center text-muted-foreground'>
            <p className='text-sm'>Nenhum item encontrado</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('border rounded-md', className)}>
      <List
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        overscanCount={overscan}
        className='scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent'
      >
        {ListItem}
      </List>
    </div>
  );
}

// Hook para facilitar o uso com dados paginados
export interface UseVirtualizedPaginationOptions {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
}

export function useVirtualizedPagination({
  totalItems,
  itemsPerPage,
  currentPage,
}: UseVirtualizedPaginationOptions) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return {
    totalPages,
    startIndex,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    visibleRange: `${startIndex + 1}-${endIndex} de ${totalItems}`,
  };
}

// Componente para listas de tabelas virtualizadas
export interface VirtualizedTableProps<T> {
  items: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    width?: string;
    render?: (item: T) => React.ReactNode;
  }>;
  height: number;
  itemHeight?: number;
  className?: string;
  loading?: boolean;
  onRowClick?: (item: T) => void;
}

export function VirtualizedTable<T extends { id: string | number }>({
  items,
  columns,
  height,
  itemHeight = 52,
  className,
  loading = false,
  onRowClick,
}: VirtualizedTableProps<T>) {
  const renderTableRow = ({
    index,
    style,
    item,
  }: {
    index: number;
    style: React.CSSProperties;
    item: T;
  }) => (
    <div
      style={style}
      className={cn(
        'flex items-center border-b hover:bg-muted/50 cursor-pointer transition-colors',
        index % 2 === 0 && 'bg-muted/20'
      )}
      onClick={() => onRowClick?.(item)}
    >
      {columns.map((column, colIndex) => (
        <div
          key={String(column.key)}
          className={cn('px-4 py-2 text-sm truncate', colIndex === 0 && 'pl-6')}
          style={{
            width: column.width || `${100 / columns.length}%`,
            minWidth: '120px',
          }}
        >
          {column.render ? column.render(item) : String(item[column.key] || '')}
        </div>
      ))}
    </div>
  );

  const headerHeight = 40;
  const listHeight = height - headerHeight;

  return (
    <div className={cn('border rounded-md overflow-hidden', className)}>
      {/* Header */}
      <div
        className='flex items-center bg-muted/50 border-b font-medium text-sm'
        style={{ height: headerHeight }}
      >
        {columns.map((column, index) => (
          <div
            key={String(column.key)}
            className={cn('px-4 py-2 truncate', index === 0 && 'pl-6')}
            style={{
              width: column.width || `${100 / columns.length}%`,
              minWidth: '120px',
            }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Lista virtualizada */}
      <VirtualizedList
        items={items}
        height={listHeight}
        itemHeight={itemHeight}
        renderItem={renderTableRow}
        loading={loading}
        emptyState={
          <div className='text-center py-8'>
            <p className='text-muted-foreground'>Nenhum registro encontrado</p>
          </div>
        }
      />
    </div>
  );
}
