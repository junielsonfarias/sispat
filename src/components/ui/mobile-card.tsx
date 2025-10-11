/* Mobile Card Component - Card responsivo otimizado para listagens mobile */
import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Título principal do card
   */
  title: string
  /**
   * Subtítulo ou descrição
   */
  subtitle?: string
  /**
   * Badge ou status
   */
  badge?: {
    label: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
  }
  /**
   * Ícone à esquerda
   */
  icon?: React.ReactNode
  /**
   * Imagem thumbnail
   */
  image?: string
  /**
   * Ação ao clicar
   */
  onClick?: () => void
  /**
   * Conteúdo adicional do card
   */
  children?: React.ReactNode
  /**
   * Mostrar chevron à direita
   */
  showChevron?: boolean
  /**
   * Se o card está ativo/selecionado
   */
  isActive?: boolean
}

export const MobileCard = React.forwardRef<HTMLDivElement, MobileCardProps>(
  (
    {
      title,
      subtitle,
      badge,
      icon,
      image,
      onClick,
      children,
      showChevron = true,
      isActive = false,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <Card
        ref={ref}
        className={cn(
          'transition-all duration-200 touch-target cursor-pointer',
          'hover:shadow-md active:scale-[0.98]',
          isActive && 'ring-2 ring-primary bg-primary/5',
          className
        )}
        onClick={onClick}
        {...props}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Ícone ou Imagem */}
            {(icon || image) && (
              <div className="flex-shrink-0">
                {image ? (
                  <img
                    src={image}
                    alt={title}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {icon}
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo principal */}
            <div className="flex-1 min-w-0 space-y-1">
              {/* Título e Badge */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base leading-tight truncate">
                  {title}
                </h3>
                {badge && (
                  <Badge
                    variant={badge.variant || 'default'}
                    className={cn('flex-shrink-0 text-xs', badge.className)}
                  >
                    {badge.label}
                  </Badge>
                )}
              </div>

              {/* Subtítulo */}
              {subtitle && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {subtitle}
                </p>
              )}

              {/* Conteúdo adicional */}
              {children && <div className="mt-2">{children}</div>}
            </div>

            {/* Chevron */}
            {showChevron && onClick && (
              <div className="flex-shrink-0 self-center">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)
MobileCard.displayName = 'MobileCard'

interface MobileCardFieldProps {
  label: string
  value: React.ReactNode
  className?: string
}

export const MobileCardField = ({ label, value, className }: MobileCardFieldProps) => {
  return (
    <div className={cn('flex justify-between items-center py-1', className)}>
      <span className="text-sm text-muted-foreground font-medium">{label}:</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}

interface MobileCardListProps {
  children: React.ReactNode
  className?: string
}

export const MobileCardList = ({ children, className }: MobileCardListProps) => {
  return (
    <div className={cn('space-y-3', className)}>
      {children}
    </div>
  )
}

interface MobileCardSkeletonProps {
  count?: number
}

export const MobileCardSkeleton = ({ count = 3 }: MobileCardSkeletonProps) => {
  return (
    <MobileCardList>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 bg-muted rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </MobileCardList>
  )
}

export { MobileCardProps, MobileCardFieldProps, MobileCardListProps }

