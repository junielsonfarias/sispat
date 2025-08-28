import { forwardRef, useState, useEffect } from 'react'
import { Input, type InputProps } from '@/components/ui/input'

interface CurrencyInputProps
  extends Omit<InputProps, 'onChange' | 'value' | 'type'> {
  value?: number
  onValueChange?: (value: number | undefined) => void
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('')

    const format = (num: number | undefined) => {
      if (num === undefined || num === null) return ''
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num)
    }

    useEffect(() => {
      if (value !== undefined) {
        setDisplayValue(format(value))
      } else {
        setDisplayValue('')
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value: inputValue } = e.target
      const digits = inputValue.replace(/\D/g, '')
      if (digits) {
        const num = Number(digits) / 100
        setDisplayValue(format(num))
        onValueChange?.(num)
      } else {
        setDisplayValue('')
        onValueChange?.(undefined)
      }
    }

    return (
      <Input
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        placeholder="0,00"
        inputMode="decimal"
      />
    )
  },
)
CurrencyInput.displayName = 'CurrencyInput'

export { CurrencyInput }
