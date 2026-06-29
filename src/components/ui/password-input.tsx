import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input, type InputProps } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  /** Classe extra para o contêiner relativo que envolve o input + botão. */
  wrapperClassName?: string
}

/**
 * Campo de senha com botão "mostrar/ocultar" sempre visível.
 *
 * Consolida o padrão antes duplicado em telas de login, redefinição e troca de
 * senha. O botão fica em `z-10` (acima do input), reserva espaço com `pr-10`,
 * usa `tabIndex={-1}` para não atrapalhar a navegação por teclado e tem
 * `aria-label` dinâmico para acessibilidade.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, wrapperClassName, ...props }, ref) => {
    const [show, setShow] = React.useState(false)

    return (
      <div className={cn('relative', wrapperClassName)}>
        <Input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={cn('pr-10', className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          tabIndex={-1}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          // Cor fixa (não dependente do tema): o ícone precisa ser visível tanto
          // em cards claros quanto no card branco forçado da tela de login.
          className="absolute right-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          onClick={() => setShow((prev) => !prev)}
        >
          {show ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </Button>
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
