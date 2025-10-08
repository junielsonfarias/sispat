import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Municipality, User } from '@/types'
import { Loader2 } from 'lucide-react'
import { MaskedInput } from '@/components/ui/masked-input'
import { useAuth } from '@/hooks/useAuth'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { format } from 'date-fns'
import { SearchableSelect } from '@/components/ui/searchable-select'

const unmask = (value: string) => value.replace(/[^\d]/g, '')

const cpfValidator = (cpf: string) => {
  cpf = unmask(cpf)
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false
  const digits = cpf.split('').map(Number)
  const validator = (n: number) =>
    digits
      .slice(0, n)
      .reduce((sum, digit, index) => sum + digit * (n + 1 - index), 0) % 11
  const rest = (n: number) => (validator(n) < 2 ? 0 : 11 - validator(n))
  return rest(9) === digits[9] && rest(10) === digits[10]
}

const cnpjValidator = (cnpj: string) => {
  cnpj = unmask(cnpj)
  if (cnpj.length !== 14 || !!cnpj.match(/(\d)\1{13}/)) return false
  const digits = cnpj.split('').map(Number)
  const validator = (slice: number[]) => {
    let factor = slice.length === 12 ? 5 : 6
    const sum = slice.reduce((sum, digit) => {
      sum += digit * factor
      factor = factor === 2 ? 9 : factor - 1
      return sum
    }, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return (
    validator(digits.slice(0, 12)) === digits[12] &&
    validator(digits.slice(0, 13)) === digits[13]
  )
}

const municipalitySchema = z
  .object({
    name: z.string().min(1, 'O nome do município é obrigatório.'),
    logoUrl: z
      .string()
      .url('URL do logo inválida.')
      .optional()
      .or(z.literal('')),
    fullAddress: z.string().min(1, 'O endereço completo é obrigatório.'),
    cnpj: z.string().refine(cnpjValidator, 'CNPJ inválido.'),
    contactEmail: z.string().email('Formato de e-mail inválido.'),
    mayorName: z.string().min(1, 'O nome do prefeito é obrigatório.'),
    mayorCpf: z.string().refine(cpfValidator, 'CPF inválido.'),
    accessStartDate: z.date().optional(),
    accessEndDate: z.date().optional(),
    supervisorId: z.string().optional(),
    supervisorName: z.string().optional(),
    supervisorEmail: z
      .string()
      .email('Formato de e-mail inválido.')
      .optional()
      .or(z.literal('')),
    supervisorPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (
        data.supervisorName ||
        data.supervisorEmail ||
        data.supervisorPassword
      ) {
        return (
          data.supervisorName &&
          data.supervisorEmail &&
          data.supervisorPassword &&
          data.supervisorPassword.length >= 8
        )
      }
      return true
    },
    {
      message:
        'Todos os campos do supervisor são obrigatórios e a senha deve ter no mínimo 8 caracteres.',
      path: ['supervisorName'],
    },
  )

type MunicipalityFormValues = z.infer<typeof municipalitySchema>

interface MunicipalityFormProps {
  municipality?: Municipality
  onSave: (data: any, user: User) => Promise<void>
  onClose: () => void
}

export const MunicipalityForm = ({
  municipality,
  onSave,
  onClose,
}: MunicipalityFormProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const { user: adminUser, users } = useAuth()

  const supervisorOptions = useMemo(
    () =>
      users
        .filter((u) => u.role === 'supervisor')
        .map((u) => ({ value: u.id, label: u.name })),
    [users],
  )

  const form = useForm<MunicipalityFormValues>({
    resolver: zodResolver(municipalitySchema),
    defaultValues: {
      name: municipality?.name || '',
      logoUrl: municipality?.logoUrl || '',
      fullAddress: municipality?.fullAddress || '',
      cnpj: municipality?.cnpj || '',
      contactEmail: municipality?.contactEmail || '',
      mayorName: municipality?.mayorName || '',
      mayorCpf: municipality?.mayorCpf || '',
      accessStartDate: municipality?.accessStartDate
        ? new Date(municipality.accessStartDate)
        : undefined,
      accessEndDate: municipality?.accessEndDate
        ? new Date(municipality.accessEndDate)
        : undefined,
      supervisorId: municipality?.supervisorId || '',
      supervisorName: '',
      supervisorEmail: '',
      supervisorPassword: '',
    },
  })

  const handleSubmit = async (data: MunicipalityFormValues) => {
    if (!adminUser) return
    setIsLoading(true)
    const dataToSave = {
      ...data,
      accessStartDate: data.accessStartDate
        ? format(data.accessStartDate, 'yyyy-MM-dd')
        : undefined,
      accessEndDate: data.accessEndDate
        ? format(data.accessEndDate, 'yyyy-MM-dd')
        : undefined,
    }
    await onSave(dataToSave, adminUser)
    setIsLoading(false)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Município</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: São Sebastião da Boa Vista"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL do Logo</FormLabel>
              <FormControl>
                <Input placeholder="https://exemplo.com/logo.png" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fullAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço Completo</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Endereço completo da prefeitura"
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ</FormLabel>
                <FormControl>
                  <MaskedInput
                    mask="cnpj"
                    placeholder="00.000.000/0000-00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail de Contato</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="contato@municipio.gov.br"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="mayorName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Prefeito</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo do prefeito" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mayorCpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF do Prefeito</FormLabel>
                <FormControl>
                  <MaskedInput
                    mask="cpf"
                    placeholder="000.000.000-00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="accessStartDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Início do Acesso</FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value}
                    onDateChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accessEndDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fim do Acesso</FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value}
                    onDateChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {municipality ? (
          <FormField
            control={form.control}
            name="supervisorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supervisor Responsável</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={supervisorOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Selecione um supervisor"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <>
            <h3 className="text-lg font-semibold pt-4 border-t mt-6">
              Usuário Supervisor Inicial
            </h3>
            <FormField
              control={form.control}
              name="supervisorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do supervisor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supervisorEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="supervisor@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supervisorPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha Provisória</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="********"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </form>
    </Form>
  )
}
