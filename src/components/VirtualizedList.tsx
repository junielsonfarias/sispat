import React, { useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'
import { cn } from '@/lib/utils'

interface VirtualizedListProps<T> {
  items: T[]
  height: number
  itemHeight: number
  renderItem: (props: { index: number; style: React.CSSProperties; item: T }) => React.ReactNode
  className?: string
  overscanCount?: number
}

export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className,
  overscanCount = 5,
}: VirtualizedListProps<T>) {
  const itemData = useMemo(() => items, [items])

  if (items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ height }}>
        <p className="text-muted-foreground">Nenhum item encontrado</p>
      </div>
    )
  }

  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      itemData={itemData}
      overscanCount={overscanCount}
      className={className}
    >
      {({ index, style, data }) => renderItem({ index, style, item: data[index] })}
    </List>
  )
}

interface VirtualizedTableProps<T> {
  items: T[]
  height: number
  itemHeight: number
  columns: Array<{
    key: string
    label: string
    width?: string | number
    render?: (item: T) => React.ReactNode
  }>
  className?: string
}

export function VirtualizedTable<T>({
  items,
  height,
  itemHeight,
  columns,
  className,
}: VirtualizedTableProps<T>) {
  const renderItem = ({ index, style, item }: { index: number; style: React.CSSProperties; item: T }) => (
    <div style={style} className="flex border-b border-border">
      {columns.map((column) => (
        <div
          key={column.key}
          className="px-4 py-2 flex items-center"
          style={{ width: column.width || 'auto' }}
        >
          {column.render ? column.render(item) : (item as any)[column.key]}
        </div>
      ))}
    </div>
  )

  return (
    <div className={cn("border border-border rounded-md", className)}>
      {/* Header */}
      <div className="flex bg-muted/50 border-b border-border">
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-2 font-medium text-sm"
            style={{ width: column.width || 'auto' }}
          >
            {column.label}
          </div>
        ))}
      </div>
      
      {/* Virtualized Body */}
      <VirtualizedList
        items={items}
        height={height - 40} // Subtrai altura do header
        itemHeight={itemHeight}
        renderItem={renderItem}
      />
    </div>
  )
}
