import * as React from 'react'
import { Input, InputProps } from '@/components/ui/input'

type MaskType = 'cpf' | 'cnpj'

const masks: Record<MaskType, (value: string) => string> = {
  cpf: (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .substring(0, 14)
  },
  cnpj: (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
      .substring(0, 18)
  },
}

export interface MaskedInputProps extends InputProps {
  mask: MaskType
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onChange, ...props }, ref) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target
      const maskedValue = masks[mask](value)
      e.target.value = maskedValue
      if (onChange) {
        onChange(e)
      }
    }

    return <Input {...props} onChange={handleInputChange} ref={ref} />
  },
)

MaskedInput.displayName = 'MaskedInput'

export { MaskedInput }
