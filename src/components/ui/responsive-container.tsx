import * as React from 'react'
import { cn } from '@/lib/utils'

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, children, size = 'lg', padding = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'max-w-2xl',
      md: 'max-w-4xl',
      lg: 'max-w-6xl',
      xl: 'max-w-7xl',
      full: 'max-w-full',
    }

    const paddingClasses = {
      none: 'p-0',
      sm: 'p-fluid-sm',
      md: 'p-fluid-md',
      lg: 'p-fluid-lg',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'container-fluid w-full mx-auto',
          sizeClasses[size],
          paddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Container.displayName = 'Container'

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
  background?: 'default' | 'muted' | 'accent' | 'none'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, children, background = 'default', padding = 'md', ...props }, ref) => {
    const backgroundClasses = {
      default: 'bg-background',
      muted: 'bg-muted/50',
      accent: 'bg-accent/50',
      none: 'bg-transparent',
    }

    const paddingClasses = {
      none: 'py-0',
      sm: 'py-fluid-sm',
      md: 'py-fluid-md',
      lg: 'py-fluid-lg',
      xl: 'py-fluid-xl',
    }

    return (
      <section
        ref={ref}
        className={cn(
          'w-full',
          backgroundClasses[background],
          paddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </section>
    )
  }
)
Section.displayName = 'Section'

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  responsive?: boolean
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, children, cols = 3, gap = 'md', responsive = true, ...props }, ref) => {
    const gapClasses = {
      sm: 'gap-4',
      md: 'gap-6 md:gap-8',
      lg: 'gap-8 md:gap-10',
      xl: 'gap-10 md:gap-12',
    }

    const colsClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
      6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          responsive ? 'grid-responsive' : colsClasses[cols],
          gapClasses[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Grid.displayName = 'Grid'

interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse'
  wrap?: boolean
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  responsive?: boolean
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ 
    className, 
    children, 
    direction = 'row', 
    wrap = false,
    justify = 'start',
    align = 'start',
    gap = 'md',
    responsive = true,
    ...props 
  }, ref) => {
    const directionClasses = {
      row: responsive ? 'flex-col sm:flex-row' : 'flex-row',
      col: 'flex-col',
      'row-reverse': responsive ? 'flex-col-reverse sm:flex-row-reverse' : 'flex-row-reverse',
      'col-reverse': 'flex-col-reverse',
    }

    const justifyClasses = {
      start: 'justify-start',
      end: 'justify-end',
      center: 'justify-center',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    }

    const alignClasses = {
      start: 'items-start',
      end: 'items-end',
      center: 'items-center',
      baseline: 'items-baseline',
      stretch: 'items-stretch',
    }

    const gapClasses = {
      sm: 'gap-2 sm:gap-4',
      md: 'gap-4 sm:gap-6',
      lg: 'gap-6 sm:gap-8',
      xl: 'gap-8 sm:gap-10',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          directionClasses[direction],
          justifyClasses[justify],
          alignClasses[align],
          gapClasses[gap],
          wrap && 'flex-wrap',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Flex.displayName = 'Flex'

export { Container, Section, Grid, Flex }
