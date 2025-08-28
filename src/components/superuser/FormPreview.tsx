import { FormFieldConfig } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/ui/currency-input'

interface FormPreviewProps {
  fields: FormFieldConfig[]
}

export const FormPreview = ({ fields }: FormPreviewProps) => {
  const renderField = (field: FormFieldConfig) => {
    const { id, label, type, required, options } = field
    const inputId = `preview-${id}`

    return (
      <div key={id} className="space-y-2">
        <Label htmlFor={inputId}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        {type === 'TEXT' && <Input id={inputId} disabled />}
        {type === 'TEXTAREA' && <Textarea id={inputId} disabled />}
        {type === 'NUMBER' && <Input id={inputId} type="number" disabled />}
        {type === 'CURRENCY' && <CurrencyInput disabled />}
        {type === 'DATE' && <Input id={inputId} type="date" disabled />}
        {type === 'SELECT' && (
          <Select disabled>
            <SelectTrigger id={inputId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-background">
      {fields.map(renderField)}
    </div>
  )
}
