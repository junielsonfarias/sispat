/**
 * Botões Mobile Otimizados para SISPAT 2.0
 * 
 * Este componente fornece botões otimizados para dispositivos móveis
 * com melhor acessibilidade e UX
 */

import React from 'react'
import { useMobile } from '@/hooks/useMobile'
import { cn } from '@/lib/utils'
import { Button, ButtonProps } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface MobileButtonProps extends ButtonProps {
  icon?: React.ReactNode
  badge?: number | string
  loading?: boolean
  fullWidth?: boolean
  touchOptimized?: boolean
}

export const MobileButton = React.forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    icon, 
    badge, 
    loading, 
    fullWidth = false,
    touchOptimized = true,
    children, 
    ...props 
  }, ref) => {
    const { isMobile, touchDevice } = useMobile()
    
    // Ajustar tamanho para mobile
    const getSize = () => {
      if (isMobile && touchOptimized) {
        return size === 'sm' ? 'default' : size === 'lg' ? 'lg' : 'default'
      }
      return size
    }

    // Ajustar padding para touch
    const getPadding = () => {
      if (isMobile && touchOptimized && touchDevice) {
        return 'px-6 py-3' // Maior área de toque
      }
      return undefined
    }

    return (
      <Button
        className={cn(
          'relative',
          fullWidth && 'w-full',
          getPadding(),
          className
        )}
        variant={variant}
        size={getSize()}
        ref={ref}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {!loading && icon && (
          <span className="mr-2">{icon}</span>
        )}
        {children}
        {badge && (
          <Badge 
            variant="secondary" 
            className="ml-2 h-5 min-w-[20px] text-xs"
          >
            {badge}
          </Badge>
        )}
      </Button>
    )
  }
)

MobileButton.displayName = 'MobileButton'

// Botão de ação flutuante para mobile
interface FloatingActionButtonProps {
  icon: React.ReactNode
  onClick: () => void
  label?: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  className?: string
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onClick,
  label,
  position = 'bottom-right',
  className
}) => {
  const { isMobile } = useMobile()

  if (!isMobile) return null

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  }

  return (
    <Button
      className={cn(
        'fixed z-50 h-14 w-14 rounded-full shadow-lg',
        positionClasses[position],
        className
      )}
      onClick={onClick}
      aria-label={label}
    >
      {icon}
    </Button>
  )
}

// Grupo de botões mobile
interface MobileButtonGroupProps {
  children: React.ReactNode
  orientation?: 'horizontal' | 'vertical'
  spacing?: 'sm' | 'md' | 'lg'
  className?: string
}

export const MobileButtonGroup: React.FC<MobileButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  spacing = 'md',
  className
}) => {
  const { isMobile } = useMobile()

  const spacingClasses = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-4'
  }

  const orientationClasses = {
    horizontal: 'flex-row',
    vertical: 'flex-col'
  }

  return (
    <div
      className={cn(
        'flex',
        orientationClasses[orientation],
        spacingClasses[spacing],
        isMobile && 'w-full',
        className
      )}
    >
      {children}
    </div>
  )
}

// Botão de toggle para mobile
interface MobileToggleButtonProps extends Omit<MobileButtonProps, 'onClick'> {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  pressedIcon?: React.ReactNode
  unpressedIcon?: React.ReactNode
}

export const MobileToggleButton: React.FC<MobileToggleButtonProps> = ({
  pressed,
  onPressedChange,
  pressedIcon,
  unpressedIcon,
  icon,
  children,
  className,
  ...props
}) => {
  const { isMobile, touchDevice } = useMobile()

  const handleClick = () => {
    onPressedChange(!pressed)
  }

  const displayIcon = pressed ? pressedIcon : unpressedIcon || icon

  return (
    <MobileButton
      {...props}
      className={cn(
        pressed && 'bg-primary text-primary-foreground',
        className
      )}
      onClick={handleClick}
      icon={displayIcon}
      touchOptimized={isMobile && touchDevice}
    >
      {children}
    </MobileButton>
  )
}

export default MobileButton
