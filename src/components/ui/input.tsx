import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  responsive?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, responsive = true, value, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          responsive && 'form-input-responsive',
          className
        )}
        ref={ref}
        // Coage null -> '' (campos nullable do backend) para evitar o aviso do
        // React de "value null"; preserva undefined (input não-controlado).
        value={value === null ? '' : value}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
