import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Clock, Loader2, Zap } from 'lucide-react';
import React from 'react';

// Skeleton components
export interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-muted rounded-md',
        animate && 'animate-pulse',
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className='p-4 space-y-3 border rounded-lg'>
      <div className='flex items-center space-x-3'>
        <Skeleton className='h-10 w-10 rounded-full' />
        <div className='space-y-2 flex-1'>
          <Skeleton className='h-4 w-3/4' />
          <Skeleton className='h-3 w-1/2' />
        </div>
      </div>
      <Skeleton className='h-3 w-full' />
      <Skeleton className='h-3 w-2/3' />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className='space-y-3'>
      {/* Header */}
      <div className='flex space-x-4'>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className='h-4 flex-1' />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className='flex space-x-4'>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className='h-8 flex-1' />
          ))}
        </div>
      ))}
    </div>
  );
}

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({
  size = 'md',
  className,
  text,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && <span className='text-sm text-muted-foreground'>{text}</span>}
    </div>
  );
}

export interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  blur?: boolean;
}

export function LoadingOverlay({
  isLoading,
  children,
  loadingText = 'Carregando...',
  className,
  blur = true,
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          isLoading && blur && 'blur-sm transition-all duration-200'
        )}
      >
        {children}
      </div>

      {isLoading && (
        <div className='absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10'>
          <div className='bg-card p-6 rounded-lg shadow-lg border'>
            <LoadingSpinner size='lg' text={loadingText} />
          </div>
        </div>
      )}
    </div>
  );
}

// Progress indicators
export interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showPercentage?: boolean;
  color?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  max = 100,
  className,
  showPercentage = true,
  color = 'default',
  size = 'md',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colorClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('space-y-1', className)}>
      {showPercentage && (
        <div className='flex justify-between text-sm text-muted-foreground'>
          <span>Progresso</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-muted rounded-full overflow-hidden',
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Status indicators
export interface StatusIndicatorProps {
  status: LoadingState;
  className?: string;
  messages?: {
    idle?: string;
    loading?: string;
    success?: string;
    error?: string;
  };
}

export function StatusIndicator({
  status,
  className,
  messages = {
    idle: 'Pronto',
    loading: 'Processando...',
    success: 'Concluído',
    error: 'Erro',
  },
}: StatusIndicatorProps) {
  const statusConfig = {
    idle: {
      icon: Clock,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
    loading: {
      icon: Loader2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      animate: true,
    },
    success: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className={cn('p-1 rounded-full', config.bgColor)}>
        <Icon
          className={cn(
            'h-4 w-4',
            config.color,
            config.animate && 'animate-spin'
          )}
        />
      </div>
      <span className={cn('text-sm', config.color)}>{messages[status]}</span>
    </div>
  );
}

// Enhanced button with loading states
export interface LoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'h-10 px-4 py-2',
        className
      )}
    >
      {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
      {loading ? loadingText || 'Carregando...' : children}
    </button>
  );
}

// Performance indicator
export interface PerformanceIndicatorProps {
  loadTime?: number;
  itemCount?: number;
  className?: string;
}

export function PerformanceIndicator({
  loadTime,
  itemCount,
  className,
}: PerformanceIndicatorProps) {
  const getPerformanceColor = (time?: number) => {
    if (!time) return 'text-muted-foreground';
    if (time < 100) return 'text-green-600';
    if (time < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={cn('flex items-center space-x-4 text-xs', className)}>
      {loadTime !== undefined && (
        <div className='flex items-center space-x-1'>
          <Zap className='h-3 w-3' />
          <span className={getPerformanceColor(loadTime)}>{loadTime}ms</span>
        </div>
      )}

      {itemCount !== undefined && (
        <div className='text-muted-foreground'>
          {itemCount.toLocaleString()} itens
        </div>
      )}
    </div>
  );
}

// Loading states for specific components
export function TableLoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className='border rounded-lg overflow-hidden'>
      <div className='bg-muted/50 p-4'>
        <div className='flex space-x-4'>
          <Skeleton className='h-4 w-32' />
          <Skeleton className='h-4 w-48' />
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-4 w-36' />
        </div>
      </div>
      <div className='p-4 space-y-3'>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className='flex space-x-4'>
            <Skeleton className='h-8 w-32' />
            <Skeleton className='h-8 w-48' />
            <Skeleton className='h-8 w-24' />
            <Skeleton className='h-8 w-36' />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardLoadingState() {
  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function DashboardLoadingState() {
  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='space-y-2'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-4 w-96' />
      </div>

      {/* Stats cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='p-6 border rounded-lg space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-8 w-16' />
            <Skeleton className='h-3 w-32' />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className='border rounded-lg p-6'>
        <Skeleton className='h-6 w-48 mb-4' />
        <Skeleton className='h-64 w-full' />
      </div>
    </div>
  );
}
