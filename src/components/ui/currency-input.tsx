import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: number
  onChange?: (value: number) => void
  currency?: string
  locale?: string
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, type, value = 0, onChange, currency = 'BRL', locale = 'pt-BR', ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('')
    const [isFocused, setIsFocused] = React.useState(false)

    // Função para formatar valor como moeda
    const formatCurrency = (val: number): string => {
      if (val === 0 && isFocused) return ''
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val)
    }

    // Função para extrair valor numérico da string formatada
    const parseCurrency = (formattedValue: string): number => {
      if (!formattedValue || formattedValue === '') return 0
      
      // Remove todos os caracteres não numéricos exceto vírgula e ponto
      const cleanValue = formattedValue.replace(/[^\d,.-]/g, '')
      
      // Se usar vírgula como separador decimal (pt-BR)
      if (locale === 'pt-BR') {
        // Remove pontos (separadores de milhares) e substitui vírgula por ponto
        const normalizedValue = cleanValue.replace(/\./g, '').replace(',', '.')
        return parseFloat(normalizedValue) || 0
      }
      
      // Para outros locales, usar ponto como separador decimal
      return parseFloat(cleanValue.replace(/,/g, '')) || 0
    }

    // Atualizar displayValue quando value prop muda
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatCurrency(value))
      }
    }, [value, currency, locale, isFocused])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      
      // Se o campo estiver vazio, definir como 0
      if (inputValue === '' || inputValue === 'R$') {
        setDisplayValue('')
        onChange?.(0)
        return
      }

      // Extrair valor numérico
      const numericValue = parseCurrency(inputValue)
      
      // Atualizar display com formatação apenas se não estiver focado
      if (!isFocused) {
        setDisplayValue(formatCurrency(numericValue))
      } else {
        setDisplayValue(inputValue)
      }
      
      // Chamar onChange com valor numérico
      onChange?.(numericValue)
    }

    const handleBlur = () => {
      setIsFocused(false)
      // Garantir que sempre tenha formatação ao sair do campo
      setDisplayValue(formatCurrency(value))
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      // Se o valor for 0, limpar o campo para facilitar digitação
      if (value === 0) {
        setDisplayValue('')
      } else {
        // Selecionar todo o texto ao focar para facilitar edição
        e.target.select()
      }
    }

    return (
      <input
        type="text"
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder="R$ 0,00"
        {...props}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'

export { CurrencyInput }