/**
 * Componentes de Loading Padronizados
 */

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Loading Spinner básico
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner = ({
  size = 'md',
  className,
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2
      className={cn(
        'animate-spin text-muted-foreground',
        sizeClasses[size],
        className
      )}
    />
  );
};

// Loading Button
interface LoadingButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
}

export const LoadingButton = ({
  loading = false,
  children,
  className,
  disabled,
  onClick,
  type = 'button',
  variant = 'default',
}: LoadingButtonProps) => {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2';

  const variantClasses = {
    default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
    destructive:
      'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
    outline:
      'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
    secondary:
      'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(baseClasses, variantClasses[variant], className)}
    >
      {loading && <LoadingSpinner size='sm' />}
      {children}
    </button>
  );
};

// Loading Card
interface LoadingCardProps {
  className?: string;
  children?: React.ReactNode;
}

export const LoadingCard = ({ className, children }: LoadingCardProps) => (
  <div
    className={cn(
      'rounded-lg border bg-card text-card-foreground shadow-sm p-6',
      className
    )}
  >
    <div className='flex flex-col items-center justify-center space-y-4'>
      <LoadingSpinner size='lg' />
      {children || (
        <p className='text-sm text-muted-foreground'>Carregando...</p>
      )}
    </div>
  </div>
);

// Loading Skeleton
interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div className={cn('animate-pulse rounded-md bg-muted', className)} />
);

// Loading Table Skeleton
export const TableSkeleton = ({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) => (
  <div className='w-full'>
    <div className='rounded-md border'>
      <div className='border-b p-4'>
        <div className='flex space-x-4'>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className='h-4 w-24' />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className='border-b p-4 last:border-b-0'>
          <div className='flex space-x-4'>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className='h-4 w-20' />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Loading List Skeleton
export const ListSkeleton = ({ items = 5 }: { items?: number }) => (
  <div className='space-y-3'>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className='rounded-lg border p-4'>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-3/4' />
          <Skeleton className='h-3 w-1/2' />
        </div>
      </div>
    ))}
  </div>
);

// Loading Page
interface LoadingPageProps {
  message?: string;
  className?: string;
}

export const LoadingPage = ({
  message = 'Carregando...',
  className,
}: LoadingPageProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center min-h-[400px] space-y-4',
      className
    )}
  >
    <LoadingSpinner size='lg' />
    <p className='text-lg font-medium text-muted-foreground'>{message}</p>
  </div>
);

// Loading Overlay
interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  message?: string;
}

export const LoadingOverlay = ({
  loading,
  children,
  message = 'Carregando...',
}: LoadingOverlayProps) => (
  <div className='relative'>
    {children}
    {loading && (
      <div className='absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50'>
        <div className='flex flex-col items-center space-y-4'>
          <LoadingSpinner size='lg' />
          <p className='text-sm font-medium'>{message}</p>
        </div>
      </div>
    )}
  </div>
);

// Loading States para formulários
export const FormLoadingSkeleton = () => (
  <div className='space-y-4'>
    <div className='space-y-2'>
      <Skeleton className='h-4 w-20' />
      <Skeleton className='h-10 w-full' />
    </div>
    <div className='space-y-2'>
      <Skeleton className='h-4 w-24' />
      <Skeleton className='h-10 w-full' />
    </div>
    <div className='space-y-2'>
      <Skeleton className='h-4 w-28' />
      <Skeleton className='h-20 w-full' />
    </div>
    <Skeleton className='h-10 w-24' />
  </div>
);

// Loading States para cards de estatísticas
export const StatsCardSkeleton = () => (
  <div className='rounded-lg border bg-card text-card-foreground shadow-sm p-6'>
    <div className='space-y-2'>
      <Skeleton className='h-4 w-20' />
      <Skeleton className='h-8 w-16' />
      <Skeleton className='h-3 w-24' />
    </div>
  </div>
);
