/* Skeleton List Component - Loading states universais para listas */
import * as React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface SkeletonListProps {
  /**
   * Número de itens skeleton a renderizar
   */
  count?: number
  /**
   * Tipo de skeleton
   */
  type?: 'card' | 'table' | 'grid' | 'list'
  /**
   * Classes CSS adicionais
   */
  className?: string
}

export const SkeletonList = ({ 
  count = 5, 
  type = 'card',
  className 
}: SkeletonListProps) => {
  const items = Array.from({ length: count }, (_, i) => i)

  if (type === 'table') {
    return (
      <div className={cn('w-full', className)}>
        <div className="rounded-lg border">
          {/* Header */}
          <div className="border-b bg-muted/50 p-4">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 flex-1" />
            </div>
          </div>
          {/* Rows */}
          {items.map((i) => (
            <div key={i} className="border-b last:border-0 p-4">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'grid') {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
        {items.map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (type === 'list') {
    return (
      <div className={cn('space-y-2', className)}>
        {items.map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-16 flex-shrink-0" />
          </div>
        ))}
      </div>
    )
  }

  // Default: card type
  return (
    <div className={cn('space-y-3', className)}>
      {items.map((i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon/Image skeleton */}
              <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
              {/* Content skeleton */}
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
              {/* Chevron skeleton */}
              <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Skeleton específico para Mobile Cards
export const MobileCardSkeleton = ({ count = 3 }: { count?: number }) => {
  return <SkeletonList count={count} type="card" />
}

// Skeleton específico para Tabelas
export const TableSkeleton = ({ count = 5 }: { count?: number }) => {
  return <SkeletonList count={count} type="table" />
}

// Skeleton específico para Grid
export const GridSkeleton = ({ count = 6 }: { count?: number }) => {
  return <SkeletonList count={count} type="grid" />
}

// Skeleton específico para Listas
export const ListSkeleton = ({ count = 5 }: { count?: number }) => {
  return <SkeletonList count={count} type="list" />
}

