import { cn } from '@/lib/utils';
import React from 'react';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
};

const paddingClasses = {
  none: '',
  sm: 'px-3 py-1.5 sm:px-4 sm:py-2',
  md: 'px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4',
  lg: 'px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-6',
};

const spacingClasses = {
  none: '',
  sm: 'space-y-1.5 sm:space-y-2',
  md: 'space-y-2 sm:space-y-3 lg:space-y-4',
  lg: 'space-y-3 sm:space-y-4 lg:space-y-6',
};

export function ResponsiveContainer({
  children,
  className,
  maxWidth = 'full',
  padding = 'md',
  spacing = 'md',
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        'w-full mx-auto',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        spacingClasses[spacing],
        className
      )}
    >
      {children}
    </div>
  );
}

// Hook para detectar breakpoints
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<
    'sm' | 'md' | 'lg' | 'xl' | '2xl'
  >('md');

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint('sm');
      else if (width < 768) setBreakpoint('md');
      else if (width < 1024) setBreakpoint('lg');
      else if (width < 1280) setBreakpoint('xl');
      else setBreakpoint('2xl');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: ['lg', 'xl', '2xl'].includes(breakpoint),
    isLarge: ['xl', '2xl'].includes(breakpoint),
  };
}

// Componente para grid responsivo
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

const gapClasses = {
  sm: 'gap-1.5 sm:gap-2',
  md: 'gap-2 sm:gap-3 lg:gap-4',
  lg: 'gap-3 sm:gap-4 lg:gap-6',
};

export function ResponsiveGrid({
  children,
  className,
  cols = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 'md',
}: ResponsiveGridProps) {
  const gridCols = cn(
    'grid',
    cols.sm && `grid-cols-${cols.sm}`,
    cols.md && `sm:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    gapClasses[gap]
  );

  return <div className={cn(gridCols, className)}>{children}</div>;
}

// Componente para stack responsivo (flex column/row)
interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  direction?: {
    sm?: 'row' | 'col';
    md?: 'row' | 'col';
    lg?: 'row' | 'col';
  };
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: 'sm' | 'md' | 'lg';
}

export function ResponsiveStack({
  children,
  className,
  direction = { sm: 'col', md: 'row' },
  align = 'start',
  justify = 'start',
  gap = 'md',
}: ResponsiveStackProps) {
  const flexClasses = cn(
    'flex',
    direction.sm === 'col' ? 'flex-col' : 'flex-row',
    direction.md === 'col' ? 'sm:flex-col' : 'sm:flex-row',
    direction.lg === 'col' ? 'lg:flex-col' : 'lg:flex-row',
    {
      'items-start': align === 'start',
      'items-center': align === 'center',
      'items-end': align === 'end',
      'items-stretch': align === 'stretch',
    },
    {
      'justify-start': justify === 'start',
      'justify-center': justify === 'center',
      'justify-end': justify === 'end',
      'justify-between': justify === 'between',
      'justify-around': justify === 'around',
    },
    gapClasses[gap]
  );

  return <div className={cn(flexClasses, className)}>{children}</div>;
}
